import { EventEmitter } from 'events';
import crypto from 'crypto';

/**
 * P2PManager — wraps Hyperswarm for peer discovery and messaging.
 *
 * In production, peers discover each other via a shared topic (a 32-byte key).
 * In local/test mode, two instances on the same machine find each other
 * automatically because Hyperswarm's DHT runs locally.
 */
export class P2PManager extends EventEmitter {
  constructor() {
    super();
    this.swarm = null;
    this.connections = new Map();
    this.topic = null;
    this.topicHex = null;
    this._msgHandlers = new Set();
  }

  async start() {
    // Try loading hyperswarm; fall back to simulation if native deps fail
    try {
      const hyperswarm = (await import('hyperswarm')).default;
      this.swarm = hyperswarm();

      // Generate a deterministic topic from a shared secret
      // In production, this would come from a QR code or invite link
      this.topic = crypto.createHash('sha256')
        .update('libero-tethercup-2026')
        .digest();
      this.topicHex = this.topic.toString('hex');

      this.swarm.join(this.topic, { server: true, client: true });

      this.swarm.on('connection', (socket, info) => {
        const peerId = crypto.randomBytes(4).toString('hex');
        this.connections.set(peerId, socket);

        this.emit('peer:connect', { id: peerId, remote: info.remotePublicKey?.toString('hex') });

        socket.on('data', (data) => {
          try {
            const msg = JSON.parse(data.toString());
            this.emit('message', msg);
          } catch {}
        });

        socket.on('close', () => {
          this.connections.delete(peerId);
          this.emit('peer:disconnect', { id: peerId });
        });

        socket.on('error', () => {
          this.connections.delete(peerId);
          this.emit('peer:disconnect', { id: peerId });
        });

        // Send a hello
        socket.write(JSON.stringify({ type: 'PEER_HELLO', peerId }));
      });

      this.emit('ready', { topic: this.topicHex });
    } catch (err) {
      // Fallback: simulate P2P with local event bus
      console.warn('[P2P] Hyperswarm unavailable, using local simulation:', err.message);
      this._startSimulation();
    }
  }

  _startSimulation() {
    this.topicHex = 'sim-' + crypto.randomBytes(4).toString('hex');
    // In simulation mode, messages are echoed back locally
    this.emit('ready', { topic: this.topicHex, simulated: true });
  }

  broadcast(msg) {
    const data = JSON.stringify(msg);
    if (this.connections.size === 0 && this._simMode) {
      // Echo in simulation
      this.emit('message', msg);
      return;
    }
    for (const socket of this.connections.values()) {
      try { socket.write(data); } catch {}
    }
  }

  get peerCount() {
    return this.connections.size;
  }

  get _simMode() {
    return !this.swarm;
  }

  async destroy() {
    if (this.swarm) {
      for (const socket of this.connections.values()) {
        socket.destroy();
      }
      this.connections.clear();
      await this.swarm.destroy();
    }
  }
}
