/**
 * Libero — Frontend Controller
 * Pears (P2P) + QVAC (Local AI) only.
 * No IPC — Node.js runs in the browser via Pear Runtime.
 */

import { P2PManager } from '../backend/p2p/hyperswarm-manager.js';
import { HypercoreFeed } from '../backend/p2p/hypercore-feed.js';
import { createSDKHelpers } from '../backend/sdk-helpers.js';
import { PredictionMarket } from '../backend/prediction-market.js';

// ── Global State ────────────────────────────────────────────────────────

let p2p;
let feed;
let sdk;
let market;
let localEvents = [];

// ── Tab Switching ──────────────────────────────────────────────────────

const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
  });
});

// ── Sync Log ───────────────────────────────────────────────────────────

const syncTerminal = document.getElementById('synclog-terminal');
const logCountEl = document.getElementById('log-count');
let logCount = 0;

function addSyncLog(source, msg, level = 'info') {
  const entry = document.createElement('div');
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  entry.className = `log-entry log-entry--${level}`;
  entry.innerHTML = `
    <span class="log-time">${time}</span>
    <span class="log-source">${source}</span>
    <span class="log-msg">${msg}</span>
  `;

  syncTerminal.appendChild(entry);
  syncTerminal.scrollTop = syncTerminal.scrollHeight;
  logCount++;
  logCountEl.textContent = `${logCount} entries`;
}

document.getElementById('btn-clear-logs').addEventListener('click', () => {
  syncTerminal.innerHTML = '';
  logCount = 0;
  logCountEl.textContent = '0 entries';
  addSyncLog('system', 'Logs cleared.');
});

// ── Bracket Rendering ──────────────────────────────────────────────────

function renderBracket() {
  const bracket = feed.getBracket();
  const container = document.getElementById('bracket');
  container.innerHTML = '';

  bracket.rounds.forEach(round => {
    const roundEl = document.createElement('div');
    roundEl.className = 'bracket-round';

    const titleEl = document.createElement('div');
    titleEl.className = 'bracket-round__title';
    titleEl.textContent = round.name;
    roundEl.appendChild(titleEl);

    round.matches.forEach(match => {
      const matchEl = document.createElement('div');
      matchEl.className = 'bracket-match';
      if (match.scoreA > match.scoreB) matchEl.classList.add('winner-a');
      if (match.scoreB > match.scoreA) matchEl.classList.add('winner-b');

      matchEl.innerHTML = `
        <div class="bracket-team">
          <span class="bracket-team__name">${match.teamA}</span>
          <span class="bracket-team__score">${match.scoreA}</span>
        </div>
        <div class="bracket-team">
          <span class="bracket-team__name">${match.teamB}</span>
          <span class="bracket-team__score">${match.scoreB}</span>
        </div>
      `;
      roundEl.appendChild(matchEl);
    });

    container.appendChild(roundEl);
  });
}

// ── Event Form ─────────────────────────────────────────────────────────

const eventForm = document.getElementById('event-form');
const feedList = document.getElementById('feed-list');

function event_type_label(type) {
  const labels = { goal: 'Goal', card: 'Card', substitution: 'Substitution', foul: 'Foul', chance: 'Chance' };
  return labels[type] || type;
}

function addFeedItem(ev) {
  if (localEvents.find(e => e.id === ev.id)) return;
  localEvents.push(ev);

  const item = document.createElement('div');
  item.className = `feed-item${ev.source === 'remote' ? ' remote' : ''}`;

  const iconMap = { goal: '⚽', card: '🟨', substitution: '🔄', foul: '⚠️', chance: '🎯' };

  item.innerHTML = `
    <span class="feed-item__minute">${ev.minute || '--'}'</span>
    <span class="feed-item__icon">${iconMap[ev.type] || '📝'}</span>
    <span class="feed-item__desc">${ev.description || ev.type} — ${ev.team || 'Unknown'}</span>
    <span class="feed-item__source">${ev.source || 'local'}</span>
  `;

  feedList.prepend(item);
  addSyncLog('event', `Event synced: ${ev.type} at ${ev.minute}' (${ev.source || 'local'})`);
}

eventForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const type = document.getElementById('evt-type').value;
  const team = document.getElementById('evt-team').value;
  const event = {
    type,
    minute: parseInt(document.getElementById('evt-minute').value, 10),
    team,
    description: document.getElementById('evt-desc').value || `${event_type_label(type)} by ${team}`,
  };

  feed.addLocal(event);
  document.getElementById('evt-desc').value = '';
});

// ── AI Analysis ────────────────────────────────────────────────────────

const btnAnalyze = document.getElementById('btn-analyze');
const aiOutput = document.getElementById('ai-output');

btnAnalyze.addEventListener('click', async () => {
  btnAnalyze.disabled = true;
  btnAnalyze.textContent = '🔄 Analyzing...';
  aiOutput.innerHTML = '<p class="ai-placeholder">Running local AI analysis...</p>';

  try {
    const result = await sdk.runAnalysis(localEvents, null);

    aiOutput.innerHTML = '';
    const html = result.text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    aiOutput.innerHTML = html;

    if (result.simulated) {
      aiOutput.innerHTML += '<br><br><em style="color: var(--text-muted); font-size: 11px;">[Simulated — QVAC SDK not available on this device]</em>';
    }
  } catch (err) {
    aiOutput.innerHTML = `<p style="color: var(--neon-error);">Analysis failed: ${err.message}</p>`;
  }

  btnAnalyze.disabled = false;
  btnAnalyze.textContent = '🧠 Analyze Tactics';
});

// ── Tactical Canvas ────────────────────────────────────────────────────

const canvas = document.getElementById('pitch-canvas');
const ctx = canvas.getContext('2d');
const formations = {
  '4-3-3': [
    { x: 0.5, y: 0.88, role: 'GK' },
    { x: 0.15, y: 0.7, role: 'LB' }, { x: 0.38, y: 0.72, role: 'CB' },
    { x: 0.62, y: 0.72, role: 'CB' }, { x: 0.85, y: 0.7, role: 'RB' },
    { x: 0.25, y: 0.48, role: 'CM' }, { x: 0.5, y: 0.45, role: 'CM' },
    { x: 0.75, y: 0.48, role: 'CM' },
    { x: 0.2, y: 0.22, role: 'LW' }, { x: 0.5, y: 0.18, role: 'ST' },
    { x: 0.8, y: 0.22, role: 'RW' },
  ],
  '4-4-2': [
    { x: 0.5, y: 0.88, role: 'GK' },
    { x: 0.15, y: 0.7, role: 'LB' }, { x: 0.38, y: 0.72, role: 'CB' },
    { x: 0.62, y: 0.72, role: 'CB' }, { x: 0.85, y: 0.7, role: 'RB' },
    { x: 0.15, y: 0.45, role: 'LM' }, { x: 0.38, y: 0.48, role: 'CM' },
    { x: 0.62, y: 0.48, role: 'CM' }, { x: 0.85, y: 0.45, role: 'RM' },
    { x: 0.35, y: 0.2, role: 'ST' }, { x: 0.65, y: 0.2, role: 'ST' },
  ],
  '3-5-2': [
    { x: 0.5, y: 0.88, role: 'GK' },
    { x: 0.25, y: 0.72, role: 'CB' }, { x: 0.5, y: 0.74, role: 'CB' },
    { x: 0.75, y: 0.72, role: 'CB' },
    { x: 0.08, y: 0.48, role: 'LWB' }, { x: 0.3, y: 0.45, role: 'CM' },
    { x: 0.5, y: 0.42, role: 'CM' }, { x: 0.7, y: 0.45, role: 'CM' },
    { x: 0.92, y: 0.48, role: 'RWB' },
    { x: 0.35, y: 0.2, role: 'ST' }, { x: 0.65, y: 0.2, role: 'ST' },
  ],
  '4-2-3-1': [
    { x: 0.5, y: 0.88, role: 'GK' },
    { x: 0.15, y: 0.7, role: 'LB' }, { x: 0.38, y: 0.72, role: 'CB' },
    { x: 0.62, y: 0.72, role: 'CB' }, { x: 0.85, y: 0.7, role: 'RB' },
    { x: 0.35, y: 0.52, role: 'CDM' }, { x: 0.65, y: 0.52, role: 'CDM' },
    { x: 0.2, y: 0.35, role: 'LAM' }, { x: 0.5, y: 0.32, role: 'CAM' },
    { x: 0.8, y: 0.35, role: 'RAM' }, { x: 0.5, y: 0.15, role: 'ST' },
  ],
  '5-3-2': [
    { x: 0.5, y: 0.88, role: 'GK' },
    { x: 0.1, y: 0.7, role: 'LWB' }, { x: 0.3, y: 0.72, role: 'CB' },
    { x: 0.5, y: 0.74, role: 'CB' }, { x: 0.7, y: 0.72, role: 'CB' },
    { x: 0.9, y: 0.7, role: 'RWB' },
    { x: 0.25, y: 0.45, role: 'CM' }, { x: 0.5, y: 0.42, role: 'CM' },
    { x: 0.75, y: 0.45, role: 'CM' },
    { x: 0.35, y: 0.2, role: 'ST' }, { x: 0.65, y: 0.2, role: 'ST' },
  ],
};

let currentFormation = '4-3-3';
let playerPositions = [];

function drawPitch() {
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#1a472a';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#1d5030';
  for (let i = 0; i < 10; i++) {
    if (i % 2 === 0) ctx.fillRect(0, i * (h / 10), w, h / 10);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.beginPath(); ctx.moveTo(10, h / 2); ctx.lineTo(w - 10, h / 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(w / 2, h / 2, 50, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(w / 2, h / 2, 4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill();
  const pw = 120, ph = 80;
  ctx.strokeRect(w / 2 - pw / 2, 10, pw, ph);
  ctx.strokeRect(w / 2 - pw / 2, h - 10 - ph, pw, ph);
  const gw = 50, gh = 30;
  ctx.strokeRect(w / 2 - gw / 2, 10, gw, gh);
  ctx.strokeRect(w / 2 - gw / 2, h - 10 - gh, gw, gh);

  playerPositions.forEach((pos) => {
    const px = pos.x * w, py = pos.y * h;
    ctx.beginPath(); ctx.arc(px, py, 18, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 230, 118, 0.15)'; ctx.fill();
    ctx.beginPath(); ctx.arc(px, py, 14, 0, Math.PI * 2);
    ctx.fillStyle = pos.role === 'GK' ? '#FFD740' : '#00E676';
    ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#080C0A'; ctx.font = 'bold 9px Inter, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(pos.role, px, py);
  });
}

function loadFormation(name) {
  currentFormation = name;
  playerPositions = formations[name].map(p => ({ ...p }));
  drawPitch();
}

document.getElementById('formation-select').addEventListener('change', (e) => loadFormation(e.target.value));
document.getElementById('btn-reset-positions').addEventListener('click', () => loadFormation(currentFormation));

let dragIndex = -1;
canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  dragIndex = playerPositions.findIndex(p =>
    Math.hypot(p.x - (e.clientX - rect.left) / canvas.width, p.y - (e.clientY - rect.top) / canvas.height) < 0.04
  );
});
canvas.addEventListener('mousemove', (e) => {
  if (dragIndex < 0) return;
  const rect = canvas.getBoundingClientRect();
  playerPositions[dragIndex].x = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / canvas.width));
  playerPositions[dragIndex].y = Math.max(0.05, Math.min(0.95, (e.clientY - rect.top) / canvas.height));
  drawPitch();
});
canvas.addEventListener('mouseup', () => { dragIndex = -1; });
canvas.addEventListener('mouseleave', () => { dragIndex = -1; });

// ── Prediction Market ──────────────────────────────────────────────────

function renderPredictions() {
  if (!market) return;

  const openList = document.getElementById('pred-open-list');
  const openPreds = market.getOpen();
  openList.innerHTML = openPreds.length === 0
    ? '<p class="empty-state">No open predictions. Create one to start.</p>'
    : openPreds.map(p => predCard(p, 'open')).join('');

  const resolvedList = document.getElementById('pred-resolved-list');
  const resolvedPreds = market.getResolved();
  resolvedList.innerHTML = resolvedPreds.length === 0
    ? '<p class="empty-state">No resolved predictions yet.</p>'
    : resolvedPreds.map(p => predCard(p, 'resolved')).join('');

  // Scoreboard
  const scoreList = document.getElementById('pred-scoreboard');
  const scores = market.getScoreboard();
  scoreList.innerHTML = scores.length === 0
    ? '<p class="empty-state">No scores yet.</p>'
    : scores.map(s => `
        <div class="score-row">
          <span class="score-name">${s.name}</span>
          <span class="score-pts">${s.correct}/${s.total}</span>
          <span class="score-pct">${s.accuracy}%</span>
        </div>
      `).join('');

  // Wire up resolve buttons
  openList.querySelectorAll('[data-resolve]').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = '🔄 Resolving...';
      await market.resolveWithAI(btn.dataset.resolve);
      renderPredictions();
    });
  });
}

function predCard(p, status) {
  const sideClass = p.prediction === 'yes' ? 'yes' : 'no';

  let actions = '';
  if (status === 'open') {
    actions = `<button class="btn btn--primary" data-resolve="${p.id}" style="padding:6px 12px;font-size:12px;">Resolve with AI</button>`;
  }
  if (status === 'resolved') {
    const icon = p.correct ? '✓' : '✗';
    const cls = p.correct ? 'win' : 'lose';
    actions = `<span class="pred-card__winner pred-card__winner--${cls}">${icon} ${p.correct ? 'CORRECT' : 'WRONG'}</span>`;
  }

  return `
    <div class="pred-card">
      <div class="pred-card__question">${p.question || 'Untitled'}</div>
      <div class="pred-card__meta">
        <span class="pred-card__side pred-card__side--${sideClass}">${p.prediction?.toUpperCase() || '?'}</span>
        <span>${p.status}</span>
      </div>
      <div class="pred-card__actions">${actions}</div>
    </div>
  `;
}

document.getElementById('pred-form').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!market) return;

  const question = document.getElementById('pred-question').value;
  const side = document.getElementById('pred-side').value;
  const eventType = document.getElementById('pred-event-type').value;
  const minute = parseInt(document.getElementById('pred-minute').value, 10);

  if (!question) return;

  market.create({
    question,
    prediction: side,
    expiresAtEvent: { type: eventType, minute, comparator: 'before' },
  });

  renderPredictions();
  document.getElementById('pred-question').value = '';
});

// ── Init ───────────────────────────────────────────────────────────────

async function init() {
  addSyncLog('system', 'Libero initializing...');

  // P2P layer
  p2p = new P2PManager();
  feed = new HypercoreFeed(p2p);

  p2p.on('ready', (info) => {
    addSyncLog('hyperswarm', `Connected — Topic: ${info.topic}`, 'success');
    document.getElementById('topic-hash').textContent = info.topic;
  });

  p2p.on('peer:connect', (peer) => {
    document.getElementById('peer-count').textContent = p2p.peerCount;
    addSyncLog('hyperswarm', `Peer connected: ${peer.id}`, 'success');
  });

  p2p.on('peer:disconnect', () => {
    document.getElementById('peer-count').textContent = p2p.peerCount;
    addSyncLog('hyperswarm', `Peer disconnected`, 'warning');
  });

  p2p.on('message', (msg) => {
    if (msg.type === 'MATCH_EVENT') {
      feed.appendRemote(msg.payload);
      addFeedItem(msg.payload);
    }
    if (msg.type === 'BRACKET_UPDATE') {
      feed.setBracket(msg.payload);
      renderBracket();
      addSyncLog('autobase', 'Bracket replicated from peer', 'success');
    }
  });

  feed.on('event', (event) => addFeedItem(event));

  await p2p.start();
  await feed.init();

  // QVAC AI
  addSyncLog('sdk', 'Initializing QVAC...');
  sdk = await createSDKHelpers();
  document.getElementById('ai-status').textContent = sdk.aiStatus;
  addSyncLog('sdk', `QVAC ready — ${sdk.aiStatus}`, 'success');

  // Prediction Market (P2P + AI)
  market = new PredictionMarket({ p2p, feed, ai: sdk });
  market.on('log', (data) => addSyncLog(data.source, data.message, data.level));
  market.on('created', () => renderPredictions());
  market.on('resolved', () => renderPredictions());
  addSyncLog('market', 'Prediction market ready', 'success');

  // Initial render
  renderBracket();
  loadFormation('4-3-3');
  renderPredictions();

  addSyncLog('system', 'Libero ready');
}

init();
