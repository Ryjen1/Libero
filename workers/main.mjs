import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'

const topic = b4a.from(Bare.argv[2], 'hex')
const swarm = new Hyperswarm()
const conns = []
const feed = [] // match events
const predictions = [] // predictions
let nextPredId = 1

// Send JSON to Electron main process → renderer
function emit(msg) {
  Bare.IPC.write(JSON.stringify(msg))
}

swarm.on('connection', (conn) => {
  const id = b4a.toString(conn.remotePublicKey, 'hex').slice(0, 6)
  conns.push(conn)
  emit({ type: 'peers', count: conns.length })

  // Send current state to new peer
  conn.write(JSON.stringify({ type: 'SYNC', events: feed, predictions }))

  conn.on('data', (data) => {
    try {
      const msg = JSON.parse(b4a.toString(data))

      if (msg.type === 'MATCH_EVENT') {
        feed.push(msg.payload)
        emit({ type: 'MATCH_EVENT', payload: msg.payload })
        broadcast({ type: 'MATCH_EVENT', payload: msg.payload }, conn)
      }

      if (msg.type === 'BRACKET_UPDATE') {
        emit({ type: 'BRACKET_UPDATE', payload: msg.payload })
        broadcast({ type: 'BRACKET_UPDATE', payload: msg.payload }, conn)
      }

      if (msg.type === 'CHAT_MESSAGE') {
        emit({ type: 'CHAT_MESSAGE', payload: msg.payload })
        broadcast({ type: 'CHAT_MESSAGE', payload: msg.payload }, conn)
      }

      if (msg.type === 'PREDICTION_CREATED') {
        predictions.push(msg.payload)
        emit({ type: 'PREDICTION_CREATED', payload: msg.payload })
        broadcast({ type: 'PREDICTION_CREATED', payload: msg.payload }, conn)
      }

      if (msg.type === 'PREDICTION_RESOLVED') {
        const p = predictions.find(x => x.id === msg.payload.id)
        if (p) {
          p.status = 'resolved'
          p.correct = msg.payload.correct
        }
        emit({ type: 'PREDICTION_RESOLVED', payload: msg.payload })
        broadcast({ type: 'PREDICTION_RESOLVED', payload: msg.payload }, conn)
      }

      if (msg.type === 'SYNC') {
        // Merge received state
        for (const ev of msg.events || []) {
          if (!feed.find(e => e.id === ev.id)) {
            feed.push(ev)
            emit({ type: 'MATCH_EVENT', payload: ev })
          }
        }
        for (const p of msg.predictions || []) {
          if (!predictions.find(x => x.id === p.id)) {
            predictions.push(p)
            emit({ type: 'PREDICTION_CREATED', payload: p })
          }
        }
      }
    } catch {}
  })

  conn.on('error', () => {})
  conn.once('close', () => {
    conns.splice(conns.indexOf(conn), 1)
    emit({ type: 'peers', count: conns.length })
  })
})

function broadcast(msg, exclude) {
  const data = JSON.stringify(msg)
  for (const conn of conns) {
    if (conn !== exclude) {
      try { conn.write(data) } catch {}
    }
  }
}

// Messages from renderer → broadcast to peers
Bare.IPC.on('data', (data) => {
  try {
    const msg = JSON.parse(b4a.toString(data))

    if (msg.type === 'MATCH_EVENT') {
      feed.push(msg.payload)
      broadcast({ type: 'MATCH_EVENT', payload: msg.payload })
    }

    if (msg.type === 'BRACKET_UPDATE') {
      broadcast({ type: 'BRACKET_UPDATE', payload: msg.payload })
    }

    if (msg.type === 'CHAT_MESSAGE') {
      broadcast({ type: 'CHAT_MESSAGE', payload: msg.payload })
    }

    if (msg.type === 'PREDICTION_CREATED') {
      predictions.push(msg.payload)
      broadcast({ type: 'PREDICTION_CREATED', payload: msg.payload })
    }

    if (msg.type === 'PREDICTION_RESOLVED') {
      const p = predictions.find(x => x.id === msg.payload.id)
      if (p) {
        p.status = 'resolved'
        p.correct = msg.payload.correct
      }
      broadcast({ type: 'PREDICTION_RESOLVED', payload: msg.payload })
    }
  } catch {}
})

await swarm.join(topic, { client: true, server: true }).flushed()
emit({ type: 'ready', topic: b4a.toString(topic, 'hex') })
