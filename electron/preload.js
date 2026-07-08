const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('libero', {
  send(msg) {
    return ipcRenderer.invoke('worker:send', msg)
  },
  onMessage(listener) {
    const wrap = (_evt, payload) => listener(JSON.parse(payload))
    ipcRenderer.on('worker:msg', wrap)
    return () => ipcRenderer.removeListener('worker:msg', wrap)
  },
  analyze(events) {
    return ipcRenderer.invoke('qvac:analyze', events)
  },
  qvacStatus() {
    return ipcRenderer.invoke('qvac:status')
  }
})
