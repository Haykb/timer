// EMBA Exam Timer: macOS desktop shell around ../index.html.
//
// What the desktop app adds on top of the web page:
//  - a small always-on-top window that also floats over full-screen apps (e.g. Google Sheets in full screen)
//  - a countdown in the menu bar
//  - system-wide shortcuts: ⌃⌥⌘N next stage, ⌃⌥⌘U undo, ⌃⌥⌘M show/hide the mini window
//  - timers are never throttled in the background, and macOS is kept from napping/sleeping during a run
//
// The timer logic itself lives only in index.html (main window). The main window must stay alive,
// so closing it only hides it; Quit (⌘Q) ends the app.

const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, powerSaveBlocker, nativeImage, screen, shell } = require('electron');
const path = require('path');

const SMOKE = process.argv.includes('--smoke-test');
const PRELOAD = path.join(__dirname, 'preload.js');

// Beeps must play even though the alert is not triggered by a click.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWin = null, miniWin = null, tray = null;
let quitting = false;
let miniWanted = true;     // user can hide the mini window; we respect that
let last = { running: false };
let blockerId = null;
let menuKey = '';

if (!SMOKE && !app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => showMain());
  app.whenReady().then(start);
}

function start() {
  createMain();
  createMini();
  createTray();
  registerShortcuts();
  if (SMOKE) runSmokeTest();
}

function webPrefs() {
  return { preload: PRELOAD, contextIsolation: true, sandbox: true, nodeIntegration: false, backgroundThrottling: false };
}

function createMain() {
  mainWin = new BrowserWindow({
    width: 980, height: 920, minWidth: 420, minHeight: 500,
    title: 'EMBA Exam Timer', show: false, backgroundColor: '#141414',
    webPreferences: webPrefs(),
  });
  mainWin.loadFile(path.join(__dirname, '..', 'index.html'));
  mainWin.once('ready-to-show', () => { if (!SMOKE) mainWin.show(); });
  mainWin.on('close', (e) => {
    if (quitting) return;
    e.preventDefault();   // keep the timer running; only hide
    mainWin.hide();
  });
  // Never navigate away from the app or open links inside it.
  mainWin.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  mainWin.webContents.on('will-navigate', (e) => e.preventDefault());
}

function createMini() {
  const { workArea } = screen.getPrimaryDisplay();
  const W = 300, H = 132;
  miniWin = new BrowserWindow({
    width: W, height: H, x: workArea.x + workArea.width - W - 16, y: workArea.y + 16,
    frame: false, transparent: true, backgroundColor: '#00000000', hasShadow: true,
    resizable: false, minimizable: false, maximizable: false, fullscreenable: false,
    alwaysOnTop: true, skipTaskbar: true, show: false,
    webPreferences: webPrefs(),
  });
  // 'screen-saver' level + visibleOnFullScreen = stays visible over full-screen apps on macOS.
  miniWin.setAlwaysOnTop(true, 'screen-saver');
  miniWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  miniWin.loadFile(path.join(__dirname, 'mini.html'));
  miniWin.on('close', (e) => {
    if (quitting) return;
    e.preventDefault();
    hideMini();
  });
}

function showMain() {
  if (!mainWin) return;
  if (mainWin.isMinimized()) mainWin.restore();
  mainWin.show();
  mainWin.focus();
}
function showMini() {
  miniWanted = true;
  if (miniWin && !miniWin.isVisible()) miniWin.showInactive();   // don't steal focus from Sheets
  refreshMenu(true);
}
function hideMini() {
  miniWanted = false;
  if (miniWin && miniWin.isVisible()) miniWin.hide();
  refreshMenu(true);
}
function toggleMini() { (miniWin && miniWin.isVisible()) ? hideMini() : showMini(); }

function sendToMain(cmd) { if (mainWin) mainWin.webContents.send('command', cmd); }

// ---------- Menu bar (tray) ----------
function createTray() {
  const img = nativeImage.createFromPath(path.join(__dirname, 'assets', 'trayTemplate.png'));
  img.setTemplateImage(true);   // adapts to light/dark menu bar
  tray = new Tray(img);
  tray.setToolTip('EMBA Exam Timer');
  refreshMenu(true);
}

function refreshMenu(force) {
  if (!tray) return;
  const key = [last.running, last.canNext, last.canUndo, last.isLast, miniWin && miniWin.isVisible()].join('|');
  if (!force && key === menuKey) return;
  menuKey = key;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: last.isLast ? 'Finish' : 'Next stage', accelerator: 'Control+Alt+Command+N', enabled: !!last.canNext, click: () => sendToMain('next') },
    { label: 'Undo last move', accelerator: 'Control+Alt+Command+U', enabled: !!last.canUndo, click: () => sendToMain('undo') },
    { type: 'separator' },
    { label: (miniWin && miniWin.isVisible()) ? 'Hide floating timer' : 'Show floating timer', accelerator: 'Control+Alt+Command+M', click: toggleMini },
    { label: 'Open main window', click: showMain },
    { type: 'separator' },
    { label: 'Quit EMBA Exam Timer', accelerator: 'Command+Q', click: () => app.quit() },
  ]));
}

// ---------- Shortcuts ----------
function registerShortcuts() {
  const map = {
    'Control+Alt+Command+N': () => sendToMain('next'),
    'Control+Alt+Command+U': () => sendToMain('undo'),
    'Control+Alt+Command+M': toggleMini,
  };
  for (const [acc, fn] of Object.entries(map)) {
    if (!globalShortcut.register(acc, fn)) console.warn(`Shortcut ${acc} is taken by another app`);
  }
}

// ---------- IPC from the pages ----------
ipcMain.on('status', (e, s) => {
  if (!mainWin || e.sender !== mainWin.webContents || !s || typeof s !== 'object') return;
  last = s;
  if (tray) tray.setTitle(String(s.trayTitle || ''), { fontType: 'monospacedDigit' });
  if (miniWin) miniWin.webContents.send('status', s);
  refreshMenu(false);

  // Mini window follows the run, unless the user hid it.
  if (s.running && miniWanted && miniWin && !miniWin.isVisible()) miniWin.showInactive();
  if (!s.running && miniWin && miniWin.isVisible()) miniWin.hide();

  // Keep the Mac awake and the app un-napped while a run is active.
  const active = s.running && s.phase !== 'done';
  if (active && blockerId === null) blockerId = powerSaveBlocker.start('prevent-display-sleep');
  if (!active && blockerId !== null) { powerSaveBlocker.stop(blockerId); blockerId = null; }
});

ipcMain.on('alert', (e, a) => {
  if (!mainWin || e.sender !== mainWin.webContents || !a) return;
  if (miniWin) miniWin.webContents.send('alert', a);
  if (a.kind !== 'warn' && app.dock) app.dock.bounce('informational');
});

ipcMain.on('command', (e, c) => {
  if (!miniWin || e.sender !== miniWin.webContents) return;
  if (c === 'next' || c === 'undo') sendToMain(c);
  else if (c === 'show-main') showMain();
  else if (c === 'hide-mini') hideMini();
});

// ---------- App lifecycle ----------
app.on('activate', showMain);   // clicking the Dock icon brings the main window back
app.on('before-quit', () => { quitting = true; });
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => { /* stay alive; windows only hide */ });

// ---------- Smoke test (used by CI on a real macOS machine) ----------
// Starts a timer, presses Next through the same IPC path the mini window and shortcuts use,
// and checks that the mini window shows the new block. Exits 0 on success, 1 on failure.
function runSmokeTest() {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const fail = (msg) => { console.error('SMOKE FAIL:', msg); app.exit(1); };
  setTimeout(() => fail('timed out'), 45000);
  (async () => {
    await new Promise((r) => mainWin.webContents.isLoading() ? mainWin.webContents.once('did-finish-load', r) : r());
    await new Promise((r) => miniWin.webContents.isLoading() ? miniWin.webContents.once('did-finish-load', r) : r());
    await mainWin.webContents.executeJavaScript(`localStorage.clear(); true`);
    const reloaded = new Promise((r) => mainWin.webContents.once('did-finish-load', r));
    mainWin.webContents.reload();
    await reloaded;
    await wait(800);
    if (last.running !== false) return fail('expected idle status before start, got ' + JSON.stringify(last));
    await mainWin.webContents.executeJavaScript(`document.getElementById('startBtn').click(); true`);
    await wait(1500);
    if (!(last.running && last.phase === 'active' && last.blockName === 'Skim')) return fail('run did not start: ' + JSON.stringify(last));
    if (!miniWin.isVisible()) return fail('mini window not shown during run');
    const miniName1 = await miniWin.webContents.executeJavaScript(`document.getElementById('name').textContent`);
    if (miniName1 !== 'Skim') return fail('mini window shows ' + miniName1);
    miniWin.webContents.executeJavaScript(`document.getElementById('next').click(); true`);   // mini -> main -> page
    await wait(1500);
    if (last.blockName !== 'Reading and numbers') return fail('Next did not advance: ' + JSON.stringify(last));
    const miniName2 = await miniWin.webContents.executeJavaScript(`document.getElementById('name').textContent`);
    if (miniName2 !== 'Reading and numbers') return fail('mini window did not update: ' + miniName2);
    sendToMain('undo');
    await wait(1500);
    if (last.blockName !== 'Skim') return fail('Undo did not work: ' + JSON.stringify(last));
    if (blockerId === null || !powerSaveBlocker.isStarted(blockerId)) return fail('power save blocker not active');
    console.log('SMOKE OK', JSON.stringify({ tray: last.trayTitle, mini: miniName2, onAllSpaces: miniWin.isVisibleOnAllWorkspaces(), alwaysOnTop: miniWin.isAlwaysOnTop() }));
    await mainWin.webContents.executeJavaScript(`localStorage.clear(); true`);
    quitting = true;
    app.exit(0);
  })().catch((err) => fail(err && err.stack || String(err)));
}
