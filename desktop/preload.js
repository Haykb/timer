// Bridge between the web pages (index.html, mini.html) and the Electron main process.
// Only these few named channels are exposed; the pages get no Node.js access.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  // index.html -> main
  status: (s) => ipcRenderer.send('status', s),
  alert: (a) => ipcRenderer.send('alert', a),
  // mini.html -> main ('next' | 'undo' | 'show-main' | 'hide-mini')
  command: (c) => ipcRenderer.send('command', c),
  // main -> pages
  onCommand: (cb) => ipcRenderer.on('command', (_e, c) => cb(c)),
  onStatus: (cb) => ipcRenderer.on('status', (_e, s) => cb(s)),
  onAlert: (cb) => ipcRenderer.on('alert', (_e, a) => cb(a)),
});
