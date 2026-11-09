# EMBA Exam Timer

A single-file, offline web app that runs a timed exam plan block by block. It warns you before each block ends, tells you which block comes next, and shrinks or grows the remaining blocks when you run late or early so you still finish by the hard end time.

## Two ways to run it

- **Mac app (recommended for the exam):** adds a small timer window that floats on top of everything, including full-screen Google Sheets, a countdown in the menu bar, and shortcuts that work from any app. See [Mac app](#mac-app).
- **Web page:** open `index.html` in any browser. Same timer, but it can't float over full-screen apps.

## Use

Open the app (or `index.html` in Chrome, Edge, Firefox or Safari. You don't need a server or an internet connection.

1. Edit the plan: rename the two unlabeled blocks, change minutes, reorder blocks, and tick **Fixed** for blocks that must never shrink (Check is fixed by default).
2. Choose **Start now**, or **Exam starts at 10:00**. A start time that has already passed works too: the timer counts from that time.
3. Click **Test an alert** and **Enable desktop notifications** before the exam starts.
4. Press **N** (or **Next stage**) when you actually move on. Press **U** to undo a mistaken move.

## Alerts

| When | What |
|---|---|
| N min before a block ends (default 2) | Heads-up banner, naming the next block and its budget |
| Block budget reached | Full-screen "Move on → *next block*" prompt, with sound and a desktop notification |
| Every N min while over (default 2) | Repeat prompt showing how much later blocks are shrinking |
| 15 / 10 / 5 min before the hard end | End-of-exam warnings |

## How the rebalancing works

When you move to a new block, the time left before the hard end is split across the remaining blocks. Fixed blocks keep their planned minutes. The other blocks are scaled in proportion to their planned minutes. If you finish a block early, the time you saved goes to the later blocks. If you finish late, the later blocks get shorter.

## Mac app

### Install (Apple Silicon / M1+)

1. On GitHub, open **Actions → macOS app**, click the latest green run, and download **EMBA-Exam-Timer-macOS-arm64** under *Artifacts*.
2. Unzip it, open `EMBA-Exam-Timer-arm64.dmg`, and drag **EMBA Exam Timer** into **Applications**.
3. First launch: the app is not signed with a paid Apple Developer ID, so macOS blocks it. Open it once and click **Done**, then go to **System Settings → Privacy & Security** and click **Open Anyway**. Or run this once in Terminal:
   ```bash
   xattr -dr com.apple.quarantine "/Applications/EMBA Exam Timer.app"
   ```
4. Click **Test an alert** in the app. macOS asks to allow notifications: allow them. Then in **System Settings → Notifications → EMBA Exam Timer**, set the style to **Persistent** so "move on" alerts stay until you dismiss them.

### During the exam

- The **floating timer** appears in the top-right corner when a run starts. It stays on top of full-screen Google Sheets. Drag it anywhere; ✕ hides it, ⤢ opens the main window.
- Shortcuts work from any app, so you never have to leave Sheets:

  | Shortcut | Action |
  |---|---|
  | ⌃⌥⌘N | Next stage |
  | ⌃⌥⌘U | Undo last move |
  | ⌃⌥⌘M | Show / hide the floating timer |

- The menu bar shows the countdown and has the same actions. (macOS hides the menu bar while an app is full screen; the floating timer is the reliable view.)
- Closing the main window only hides it, and the timer keeps running. **⌘Q** quits.
- While a run is active the app keeps the Mac awake and is never slowed down in the background, so alerts fire on time.
- **Focus / Do Not Disturb hides notification banners.** The floating timer and sounds still work, but turn Focus off for the exam or allow this app in it.

### Build it yourself (on a Mac)

```bash
npm install
```
```bash
npm start
```
```bash
npm run dist:mac
```

## Limitations

- (Web page only) Browsers slow down timers in hidden tabs. After about 5 minutes hidden, Chrome can deliver an alert up to about 1 minute late. Keep the window visible, for example side by side with your exam, or run it on a phone.
- (Web page only) Desktop notifications need permission. Some browsers block them for pages opened directly as a file (`file://`). The on-page banner and sound work either way.
- Sound starts only after you have clicked something on the page. Clicking **Start** counts.
- The plan, settings and the running timer are saved in this browser (`localStorage`), so a reload or an accidental close keeps your progress.
