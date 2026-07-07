import { EventEmitter } from 'events';

/**
 * PredictionMarket — P2P prediction scoring with AI validation.
 *
 * Fans predict outcomes. The P2P feed confirms events.
 * AI validates the result. Scores are tracked peer-to-peer.
 * No crypto, no escrow — pure P2P reputation.
 */
export class PredictionMarket extends EventEmitter {
  constructor({ p2p, feed, ai }) {
    super();
    this.p2p = p2p;
    this.feed = feed;
    this.ai = ai;
    this.predictions = new Map();
    this.scoreboard = new Map(); // address → score
    this._nextId = 1;

    this.p2p.on('message', (msg) => {
      if (msg.type === 'PREDICTION_CREATED') this._onRemoteCreate(msg.payload);
      if (msg.type === 'PREDICTION_RESOLVED') this._onRemoteResolve(msg.payload);
    });

    this.feed.on('event', (event) => this._checkResolutions(event));
  }

  create({ question, prediction, expiresAtEvent }) {
    const id = `pred-${this._nextId++}`;
    const creator = this._getOrCreatePlayer();

    const pred = {
      id,
      question,
      prediction,
      expiresAtEvent,
      creator,
      status: 'open',
      createdAt: Date.now(),
      resolvedAt: null,
      correct: null,
    };

    this.predictions.set(id, pred);
    this.emit('created', pred);
    this.p2p.broadcast({ type: 'PREDICTION_CREATED', payload: pred });
    this._log(`New prediction: "${question}" — ${prediction.toUpperCase()}`);

    return pred;
  }

  _checkResolutions(event) {
    for (const [id, pred] of this.predictions) {
      if (pred.status !== 'open') continue;
      if (!this._eventResolves(event, pred)) continue;

      const correct = this._isCorrect(pred, event);
      this._resolve(pred, correct);
    }
  }

  async resolveWithAI(predId) {
    const pred = this.predictions.get(predId);
    if (!pred || pred.status !== 'open') return { ok: false };

    const events = this.feed.getEvents();
    const result = await this.ai.runAnalysis(events,
      `Based on these match events, was this prediction correct: "${pred.question}" — predicted "${pred.prediction}"? Answer YES or NO only.`
    );

    const correct = result.text.toUpperCase().includes('YES');
    this._resolve(pred, correct);
    return { ok: true, prediction: pred };
  }

  _resolve(pred, correct) {
    pred.status = 'resolved';
    pred.resolvedAt = Date.now();
    pred.correct = correct;

    const player = this.scoreboard.get(pred.creator.id) || { correct: 0, total: 0, name: pred.creator.name };
    player.total++;
    if (correct) player.correct++;
    this.scoreboard.set(pred.creator.id, player);

    this.emit('resolved', pred);
    this.p2p.broadcast({ type: 'PREDICTION_RESOLVED', payload: { id: pred.id, correct } });
    this._log(`Resolved: "${pred.question}" — ${correct ? 'CORRECT' : 'WRONG'} (+${correct ? 1 : 0} pts)`);
  }

  _eventResolves(event, pred) {
    const exp = pred.expiresAtEvent;
    if (!exp) return false;
    if (exp.type && event.type !== exp.type) return false;
    if (exp.minute !== undefined && event.minute !== undefined) {
      if (exp.comparator === 'before' && event.minute >= exp.minute) return false;
      if (exp.comparator === 'after' && event.minute <= exp.minute) return false;
    }
    return true;
  }

  _isCorrect(pred, event) {
    // "yes" = event happens, "no" = event doesn't happen
    // Since event DID happen, "yes" is correct
    return pred.prediction === 'yes';
  }

  _getOrCreatePlayer() {
    const id = 'player-' + Math.random().toString(36).slice(2, 8);
    const name = 'Fan ' + id.slice(-4).toUpperCase();
    return { id, name };
  }

  getOpen() {
    return [...this.predictions.values()].filter(p => p.status === 'open');
  }

  getResolved() {
    return [...this.predictions.values()].filter(p => p.status === 'resolved');
  }

  getScoreboard() {
    return [...this.scoreboard.entries()]
      .map(([id, s]) => ({ id, ...s, accuracy: s.total > 0 ? Math.round(s.correct / s.total * 100) : 0 }))
      .sort((a, b) => b.correct - a.correct);
  }

  _log(msg) {
    this.emit('log', { source: 'market', message: msg, level: 'info' });
  }
}
