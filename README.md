# Libero

**Decentralized Football Operating System** — built for the Tether Developers Cup.

Libero is a peer-to-peer football platform where fans, coaches, and clubs manage tournaments, analyze matches with local AI, and predict outcomes — all without a central server.

## What it does

- **League Coordinator**: Create tournaments, manage brackets, log match events. All data replicates peer-to-peer via Hypercore/Hyperswarm.
- **Tactical AI Whiteboard**: Drag players into formations on a pitch canvas, then get AI-powered tactical analysis running entirely on your device via QVAC SDK.
- **Prediction Market**: Peer-to-peer predictions resolved by local AI. Scoreboard tracks accuracy across fans.
- **P2P Sync Logs**: Real-time stream showing Hypercore/Autobase replication activity — proof that data is flowing peer-to-peer.

## Tech Stack

| Track | Technology | Purpose |
|-------|-----------|---------|
| Pears (P2P) | Hyperswarm + Hypercore | Peer discovery, event replication |
| QVAC (Local AI) | @qvac/sdk (LLaMA 3.2 1B) | On-device tactical analysis |

## Setup

Requires [pnpm](https://pnpm.io/) and [Pear CLI](https://docs.pears.com/reference/pear/cli/).

```bash
# Install dependencies
pnpm install

# Run the app
pnpm start

# Run with dev tools
pnpm dev
```

## Architecture

```
libero/
  package.json            # Pear runtime config
  src/
    frontend/             # UI layer
      index.html          # Main window
      styles.css          # Dark stadium theme
      app.js              # Directly imports backend modules
    backend/              # Local logic (P2P, AI)
      sdk-helpers.js      # QVAC abstraction (dual-mode)
      p2p/
        hyperswarm-manager.js  # Hyperswarm peer discovery
        hypercore-feed.js      # Match event feed + bracket state
      prediction-market.js     # P2P predictions resolved by AI
  website/                # Marketing site (deploy to Vercel/GitHub Pages)
    index.html
    styles.css
    app.js
```

**Key architectural choice**: The frontend `app.js` directly imports from `../backend/` — no IPC bridge needed. Pear Runtime provides Node.js in the browser, so P2P networking and AI inference run as native imports in the renderer.

## Dual-Mode Execution

QVAC uses a dual-mode pattern:
- **Real mode**: Loads the actual SDK, runs LLM inference on-device
- **Simulation mode**: Falls back to deterministic mock responses when hardware/dependencies aren't available

This ensures the demo works on any machine while still showcasing the real SDK integration.

## How the Prediction Market Works

1. Fan creates a prediction (e.g. "Next goal before 70'?")
2. Prediction is broadcast to peers via Hyperswarm
3. P2P feed confirms the match event
4. AI detects the event and resolves the prediction
5. Scoreboard updates — no crypto, no escrow, pure P2P reputation

## Theme

Built for the global football tournament moment. Every feature serves the match experience — from live event tracking to tactical analysis to fan predictions.

## License

MIT
