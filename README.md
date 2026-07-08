# Libero

**Decentralized Football Operating System**

Libero is a peer-to-peer football platform that eliminates centralized servers from league coordination, tactical analysis, and fan engagement. Built for the [Tether Developers Cup](https://dorahacks.io/tether) — combining Pears (P2P) + QVAC (Local AI) tracks.

---

## The Problem

Football is the world's most popular sport, yet the platforms fans and clubs depend on are centralized, siloed, and fragile:

- **League coordination** requires trusted intermediaries (Challonge, FIFA systems) — single points of failure, data lock-in.
- **Tactical analysis** lives behind cloud APIs and expensive subscriptions — data leaves the device, privacy is compromised.
- **Fan engagement** relies on centralized points systems or crypto wallets — either no ownership, or regulatory and UX complexity.
- **Match data** flows through servers that can go down, get shut down, or change terms — fans and clubs have no guarantees.

When the server breaks, the entire experience breaks with it.

## Our Solution

Libero replaces central servers with a **peer-to-peer network** and cloud AI with **on-device inference**. Fans, coaches, and clubs operate as equal peers — coordinating tournaments, analyzing tactics, and making predictions without trusting any single authority.

| Capability | Traditional Approach | Libero |
|-----------|---------------------|--------|
| League data | Centralized database | P2P replication via Hypercore |
| Tactical analysis | Cloud AI APIs | On-device LLM (LLaMA 3.2 1B) |
| Fan predictions | Points systems / crypto | P2P reputation, AI-resolved |
| Peer discovery | Server-mediated | Hyperswarm DHT |

---

## Features

### League Coordinator

Create tournaments, manage brackets, and log match events. All state replicates peer-to-peer — no central database required. Every peer holds a full copy of the tournament feed.

### Tactical AI Whiteboard

Drag players into formations on an interactive pitch canvas. Receive AI-powered tactical analysis running entirely on your device via the QVAC SDK — no data leaves your machine.

### Prediction Market

Fans create predictions ("Next goal before 70'?"), broadcast them via Hyperswarm, and have them resolved by local AI when match events occur. The scoreboard tracks accuracy across fans — pure P2P reputation, no tokens, no escrow.

### P2P Sync Logs

A real-time stream showing Hypercore and Autobase replication activity — verifiable proof that data is flowing peer-to-peer, not through a server.

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

1. **Create** — Fan places a prediction (e.g., "Red card in first half?")
2. **Broadcast** — Prediction propagates to peers via Hyperswarm
3. **Confirm** — P2P feed records the match event
4. **Resolve** — Local AI detects the event and resolves the prediction
5. **Score** — Accuracy scoreboard updates across all peers

No crypto. No escrow. Pure reputation.

---

## Tech Stack

| Track | Technology | Purpose |
|-------|-----------|---------|
| **Pears (P2P)** | Hyperswarm + Hypercore + Autobase | Peer discovery, event replication, mutable state |
| **QVAC (Local AI)** | @qvac/sdk (LLaMA 3.2 1B) | On-device tactical analysis and prediction resolution |
| **Runtime** | Pear Electron + Bare workers | App shell, worker isolation, IPC bridge |

### Dual-Mode Execution

QVAC operates in two modes to ensure the demo works on any hardware:

- **Real mode** — Loads the full SDK, runs LLM inference on-device
- **Simulation mode** — Falls back to deterministic mock responses when dependencies aren't available

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [pnpm](https://pnpm.io/)
- [Pear CLI](https://docs.pears.com/reference/pear/cli/)

### Installation

```bash
# Clone the repository
git clone git@github.com:Ryjen1/Libero.git
cd Libero

# Install dependencies
pnpm install

# Start the application
pnpm start

# Start with dev tools
pnpm dev
```

### Running a Multi-Peer Demo

```bash
# Terminal 1
pnpm start

# Terminal 2 (same machine, same topic = auto peer discovery)
pnpm start
```

Both instances connect via Hyperswarm DHT and begin replicating tournament data automatically.

---

## Project Structure

```
libero/
├── electron/
│   ├── main.js              # Electron main process, spawns Bare worker
│   └── preload.js           # IPC bridge (contextBridge)
├── workers/
│   └── main.mjs             # Bare worker — Hyperswarm, Hypercore, P2P logic
├── renderer/
│   ├── index.html           # 5-tab UI (League, Whiteboard, Predictions, Chat, Logs)
│   ├── styles.css           # Dark stadium theme
│   └── app.js               # UI logic, IPC communication
├── src/
│   └── backend/             # P2P and AI modules
│       ├── p2p/
│       │   ├── hyperswarm-manager.js
│       │   └── hypercore-feed.js
│       ├── prediction-market.js
│       └── sdk-helpers.js   # QVAC dual-mode abstraction
├── assets/                  # Logo, favicon, hero image
├── website/                 # Marketing site (Vercel/GitHub Pages)
└── package.json
```

---

## Why Libero Wins

| Criterion | How Libero Addresses It |
|-----------|------------------------|
| **Technical ambition** | Full P2P stack (Hyperswarm + Hypercore) + on-device LLM — no cloud, no server |
| **Real-world use** | Solves actual problems: decentralized league coordination, private tactical analysis |
| **Creativity** | P2P reputation-based predictions without crypto — a novel middle ground |
| **Track utilization** | Deep integration of both Pears and QVAC, not surface-level checkboxes |
| **UX** | Dark stadium theme, intuitive 5-tab interface, works offline |

---

## License

[MIT](LICENSE)

---

*Built for the Tether Developers Cup. 179 hackers. $8K USDt prize pool. One mission: make football decentralized.*
