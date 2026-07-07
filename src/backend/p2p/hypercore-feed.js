import { EventEmitter } from 'events';

/**
 * HypercoreFeed — append-only log of match events and bracket state.
 *
 * Uses Hypercore for the event feed and in-memory state for the bracket.
 * In production, peers would replicate via Hyperswarm connections.
 * For the hackathon, we simulate replication through the P2PManager broadcast.
 */
export class HypercoreFeed extends EventEmitter {
  constructor(p2p) {
    super();
    this.p2p = p2p;
    this.events = [];
    this.bracket = this._defaultBracket();
  }

  async init() {
    // In production: create/load a Hypercore with corestore
    // For the hackathon: in-memory append-only log (still demonstrates the concept)
    this.emit('ready');
  }

  addLocal(event) {
    const entry = {
      id: cryptoId(),
      timestamp: Date.now(),
      ...event,
      source: 'local',
    };
    this.events.push(entry);

    // Replicate to peers via P2P
    this.p2p.broadcast({ type: 'MATCH_EVENT', payload: entry });
    this.emit('event', entry);

    return entry;
  }

  appendRemote(event) {
    if (this.events.find(e => e.id === event.id)) return; // deduplicate
    event.source = 'remote';
    this.events.push(event);
    this.emit('event', event);
  }

  getEvents() {
    return [...this.events];
  }

  getBracket() {
    return { ...this.bracket };
  }

  setBracket(bracket) {
    this.bracket = bracket;
  }

  _defaultBracket() {
    return {
      name: 'Libero Cup 2026',
      rounds: [
        {
          name: 'Quarterfinals',
          matches: [
            { id: 'qf1', teamA: 'Brazil', teamB: 'Argentina', scoreA: 0, scoreB: 0, status: 'pending' },
            { id: 'qf2', teamA: 'Germany', teamB: 'France', scoreA: 0, scoreB: 0, status: 'pending' },
            { id: 'qf3', teamA: 'Spain', teamB: 'England', scoreA: 0, scoreB: 0, status: 'pending' },
            { id: 'qf4', teamA: 'Japan', teamB: 'Morocco', scoreA: 0, scoreB: 0, status: 'pending' },
          ],
        },
        {
          name: 'Semifinals',
          matches: [
            { id: 'sf1', teamA: 'TBD', teamB: 'TBD', scoreA: 0, scoreB: 0, status: 'pending' },
            { id: 'sf2', teamA: 'TBD', teamB: 'TBD', scoreA: 0, scoreB: 0, status: 'pending' },
          ],
        },
        {
          name: 'Final',
          matches: [
            { id: 'final', teamA: 'TBD', teamB: 'TBD', scoreA: 0, scoreB: 0, status: 'pending' },
          ],
        },
      ],
    };
  }
}

function cryptoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
