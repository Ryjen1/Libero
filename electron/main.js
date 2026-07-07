const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const crypto = require('crypto')
const PearRuntime = require('pear-runtime')

const topic = crypto
  .createHash('sha256')
  .update('libero-tethercup-2026')
  .digest('hex')

let worker = null

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#080C0A',
    titleBarStyle: 'hiddenInset',
    title: 'Libero',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })

  const workerPath = path.join(__dirname, '..', 'workers', 'main.mjs')
  worker = PearRuntime.run(workerPath, [topic])

  worker.on('data', (data) => {
    if (!win.isDestroyed()) {
      win.webContents.send('worker:msg', data.toString())
    }
  })

  worker.stderr.on('data', (data) => {
    console.error('[worker]', data.toString())
  })

  ipcMain.handle('worker:send', (_evt, msg) => {
    worker.write(Buffer.from(JSON.stringify(msg)))
  })

  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'))

  if (process.argv.includes('--dev')) {
    win.webContents.openDevTools()
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (worker) worker.destroy()
  app.quit()
})
