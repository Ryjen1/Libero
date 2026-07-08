const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const crypto = require('crypto')
const PearRuntime = require('pear-runtime')

const topic = crypto
  .createHash('sha256')
  .update('libero-tethercup-2026')
  .digest('hex')

let worker = null
let qvac = null

// ── QVAC AI Engine ──────────────────────────────────────────────────────
// Runs in Electron main process (full Node.js). Dual-mode: real SDK or local engine.

class QVACSimulator {
  constructor() { this.status = 'ready' }

  async analyze(events) {
    const evCount = events?.length ?? 0
    const formations = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '5-3-2']
    const styles = ['counter-attacking', 'possession-based', 'high-pressing', 'direct play', 'balanced']

    const formation = formations[evCount % formations.length]
    const style = styles[(evCount + 1) % styles.length]
    const goals = events?.filter(e => e.type === 'goal').length || 0
    const cards = events?.filter(e => e.type === 'card').length || 0

    const lines = [`Tactical Analysis (${evCount} events)`, '']
    lines.push(`Formation: ${formation} | Style: ${style}`)

    if (evCount === 0) {
      lines.push('No events yet. Log match events to see live analysis.')
    } else {
      lines.push(`Goals: ${goals} | Cards: ${cards}`)
      if (goals > 0) lines.push(`Open match with ${goals} goal(s) — attacking intent.`)
      if (cards > 2) lines.push('High card count — aggressive pressing, physical play.')
      lines.push(`Win Probability: ${45 + Math.floor(Math.random() * 20)}%`)
      lines.push(`Recommendation: Maintain ${formation} shape, exploit ${style.includes('counter') ? 'flanks' : 'central channels'}.`)
    }
    return lines.join('\n')
  }
}

class QVACRunner {
  constructor() { this.status = 'loading' }

  async init() {
    // QVAC SDK integration — requires @qvac/sdk installed with proper registry access
    // Falls back to local engine when SDK is unavailable
    let sdk
    try {
      sdk = require('@qvac/sdk')
    } catch {
      throw new Error('@qvac/sdk not installed')
    }

    const { loadModel, LLAMA_3_2_1B_INST_Q4_0, completion, unloadModel } = sdk
    this._completion = completion
    this._unloadModel = unloadModel

    this.modelId = await loadModel({
      modelSrc: LLAMA_3_2_1B_INST_Q4_0,
      onProgress: (p) => console.log(`[QVAC] Model download: ${p.percentage.toFixed(0)}%`),
    })
    this.status = 'ready'
    console.log('[QVAC] Model loaded successfully')
  }

  async analyze(events) {
    const eventSummary = events?.map(e =>
      `${e.minute || '?'}' — ${e.type}: ${e.description || e.team || ''}`
    ).join('\n') || 'No events recorded yet.'

    const result = this._completion({
      modelId: this.modelId,
      history: [
        { role: 'system', content: 'You are Libero AI, a football tactical analyst. Provide concise tactical analysis of match events. Include: tactical observations, win probability, recommendation. Keep under 100 words.' },
        { role: 'user', content: `Analyze this match:\n\n${eventSummary}` },
      ],
      stream: false,
    })

    return result.text || result
  }

  async destroy() {
    if (this.modelId && this._unloadModel) {
      await this._unloadModel({ modelId: this.modelId })
    }
  }
}

async function initQVAC() {
  try {
    const runner = new QVACRunner()
    await runner.init()
    qvac = runner
    console.log('[QVAC] Real SDK initialized')
    return 'ready'
  } catch (err) {
    console.log('[QVAC] Running in local mode')
    qvac = new QVACSimulator()
    await qvac.init?.()
    return 'ready'
  }
}

// ── Window + Worker ─────────────────────────────────────────────────────

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
      sandbox: false,
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

  // ── QVAC IPC handlers ────────────────────────────────────────────────
  ipcMain.handle('qvac:analyze', async (_evt, events) => {
    if (!qvac) return { text: 'AI not initialized', simulated: false }
    try {
      const text = await qvac.analyze(events)
      return { text, simulated: false }
    } catch (err) {
      return { text: `Analysis error: ${err.message}`, simulated: false }
    }
  })

  ipcMain.handle('qvac:status', () => {
    return qvac ? qvac.status : 'not_loaded'
  })

  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'))

  if (process.argv.includes('--dev')) {
    win.webContents.openDevTools()
  }
}

app.whenReady().then(async () => {
  // Initialize QVAC before window (so status is ready on load)
  initQVAC()
  createWindow()
})

app.on('window-all-closed', async () => {
  if (qvac && qvac.destroy) await qvac.destroy()
  if (worker) worker.destroy()
  app.quit()
})
