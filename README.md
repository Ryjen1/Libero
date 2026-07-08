# Libero

**The football platform that doesn't need a server.**

Football is the world's most popular sport, yet every fan app — from live scores to tactical analysis — runs on centralized servers that can go down, lock you out, or harvest your data. Libero removes the server entirely. League coordination, tactical AI, and fan predictions run peer-to-peer on the devices of the people using them. No cloud. No API keys. No single point of failure.

Built for the **[Tether Developers Cup](https://dorahacks.io/hackathon/tether-developers-cup)** — claiming **Pears (P2P)** and **QVAC (Local AI)** tracks.

---

## Demo

| Resource | Link |
|----------|------|
| GitHub | [github.com/Ryjen1/Libero](https://github.com/Ryjen1/Libero) |
| Demo video | *added with submission* |

---

## Why This Matters

The global football fan engagement market is worth billions, yet every platform operates the same way: a company runs servers, fans connect to them, and the company decides who stays, who gets banned, and what data is kept. When the servers go down during a World Cup final, millions lose access. When a platform shuts down, years of match history vanish.

Two real problems block alternatives:

1. **Coordination requires trust.** Tournaments need a central authority to manage brackets, log results, and resolve disputes. Without a server, how do peers agree on state?
2. **AI requires the cloud.** Tactical analysis, match predictions, and smart insights all call external APIs — sending your data to servers you don't control.

Libero solves both: Hyperswarm + Hypercore for decentralized state replication, and QVAC SDK for on-device LLM inference. The server isn't replaced by a better server — it's eliminated.

---

## What Libero Does

### League Coordinator

Create tournaments, manage brackets, and log match events. Every state change replicates peer-to-peer via Hypercore — no central database. Two peers on the same network automatically discover each other through Hyperswarm DHT and begin syncing.

### Tactical AI Whiteboard

Drag players into formations on an interactive pitch canvas. Tap "Analyze" and the QVAC SDK runs LLaMA 3.2 1B locally to generate tactical insights — formation critique, win probability, and recommendations. Your data never leaves your machine.

### Prediction Market

Fans create predictions ("Goal before 70'?"), broadcast them via Hyperswarm, and have them resolved by local AI when match events occur. The scoreboard tracks accuracy across fans — pure P2P reputation. No tokens. No escrow. No house edge.

### Fan Chat

Peer-to-peer messaging with no accounts, no servers, no moderation layer. Messages propagate through the same Hyperswarm swarm as match data.

### P2P Sync Logs

A live terminal showing Hypercore and Autobase replication activity — verifiable proof that data flows peer-to-peer, not through a server.

---

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│                      Libero Peer                        │
├──────────────┬──────────────┬───────────────────────────┤
│   Renderer   │   Preload    │       Bare Worker         │
│  (HTML/CSS)  │  (IPC Bridge)│   (Hyperswarm/Hypercore)  │
│              │              │                           │
│  Tournament  │ window.      │   Peer discovery (DHT)    │
│  bracket UI  │ libero.send()│   Event feed replication  │
│  Tactical    │              │   Prediction broadcast    │
│  whiteboard  │ window.      │   Match event resolution  │
│  Predictions │ libero.      │                           │
│  Chat        │ onMessage()  │                           │
└──────┬───────┴──────┬───────┴─────────────┬─────────────┘
       │              │                     │
       │         Electron IPC          Hyperswarm DHT
       │              │                     │
       │              │              ┌──────┴──────┐
       │              │              │  Other Peers │
       │              │              └─────────────┘
       │              │
  ┌────┴──────────────┴────┐
  │   QVAC (Local AI)     │
  │   LLaMA 3.2 1B        │
  │   Tactical analysis    │
  │   Prediction resolve   │
  └────────────────────────┘
```

### Prediction Market Flow

1. **Create** — Fan places a prediction ("Red card in first half?")
2. **Broadcast** — Prediction propagates to peers via Hyperswarm
3. **Confirm** — P2P feed records the match event
4. **Resolve** — Local AI detects the event and resolves the prediction
5. **Score** — Accuracy scoreboard updates across all peers

---

## Why It's Different

| | Centralized platforms | Crypto prediction markets | **Libero** |
|---|---|---|---|
| **Infrastructure** | Company servers | Blockchain + servers | Pure P2P (Hyperswarm) |
| **AI analysis** | Cloud APIs | Cloud APIs | On-device (QVAC SDK) |
| **Fan reputation** | Points they can revoke | Tokens you must buy | P2P history, can't be taken |
| **Data ownership** | Platform owns it | On-chain but public | Your device, your data |
| **Settlement** | Platform decides | Smart contract | AI-resolved, peer-confirmed |
| **Onboarding** | Sign up, verify email | Create wallet, buy crypto | Open app, connect to peers |
| **Offline** | Doesn't work | Partially works | Full sync when peers reconnect |

---

## Tech Stack

| Track | Technology | Purpose |
|-------|-----------|---------|
| **Pears (P2P)** | Hyperswarm + Hypercore + Autobase | Peer discovery, event replication, mutable state |
| **QVAC (Local AI)** | @qvac/sdk (LLaMA 3.2 1B) | On-device tactical analysis and prediction resolution |
| **Runtime** | Pear Electron + Bare workers | App shell, worker isolation, IPC bridge |

### What Each Track Does

**Pears track:**
- Hyperswarm DHT for peer discovery — no central signaling server
- Hypercore append-only feeds for match event logs
- Autobase for mutable state (brackets, predictions)
- Fan chat via same swarm connection

**QVAC track:**
- LLaMA 3.2 1B loaded via @qvac/sdk
- Tactical analysis: formation critique, win probability, recommendations
- Prediction resolution: AI evaluates match events against predictions
- All inference runs locally — no data leaves the device

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v22.17+
- [pnpm](https://pnpm.io/)

### Installation

```bash
git clone git@github.com:Ryjen1/Libero.git
cd Libero
pnpm install
pnpm start
```

### Running a Multi-Peer Demo

```bash
# Terminal 1
pnpm start

# Terminal 2 (same machine = same topic = auto peer discovery)
pnpm start
```

Both instances connect via Hyperswarm DHT and begin replicating tournament data automatically.

---

## Project Structure

```
libero/
├── electron/
│   ├── main.js              # Electron main process + QVAC engine
│   └── preload.js           # IPC bridge (contextBridge)
├── workers/
│   └── main.mjs             # Bare worker — Hyperswarm, P2P logic
├── renderer/
│   ├── index.html           # 5-tab UI
│   ├── styles.css           # Dark stadium theme
│   └── app.js               # UI logic, IPC communication
├── src/backend/
│   ├── p2p/                 # Hyperswarm manager, Hypercore feed
│   ├── prediction-market.js # P2P prediction logic
│   └── sdk-helpers.js       # QVAC dual-mode abstraction
├── assets/                  # Logo, favicon
├── website/                 # Marketing site
└── package.json
```

---

## Known Limitations

- **QVAC model download** — First run downloads ~773MB LLaMA 3.2 1B model. Subsequent runs use cached model.
- **Vulkan requirement** — Linux requires Vulkan-capable GPU for QVAC acceleration. CPU fallback available.
- **Peer discovery scope** — Hyperswarm peers must be on the same network or have DHT relay access. LAN demo works out of the box.
- **Single-machine demo** — For hackathon demo, two terminals on one machine share the same topic automatically.

---

## License

[MIT](LICENSE)

---

*Built for the Tether Developers Cup. One mission: make football decentralized.*
