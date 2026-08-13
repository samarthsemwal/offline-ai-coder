# Offline Coder Chat

A fully offline, production-quality desktop chat application for **coding and DSA practice**, powered by a locally running [Ollama](https://ollama.com) instance. No internet connection required — no data leaves your machine.

![App Screenshot](./docs/screenshot.png)

---

## Features

- 🤖 **Local LLM chat** — Streams responses token-by-token via Ollama's REST API
- 💻 **Code-first UI** — Syntax-highlighted code blocks (30+ languages) with one-click copy
- 🗂️ **Persistent sessions** — Chat history saved as JSON files, survives app restarts
- 📥 **In-app model downloader** — Pull new Ollama models with a live progress bar
- 🎙️ **Voice input** — Speak your questions using the Web Speech API
- ⌨️ **Keyboard shortcuts** — `Enter` to send, `Cmd+N` for new chat
- 🟢 **Auto-start Ollama** — App launches `ollama serve` automatically if not running
- 🌑 **Dark theme** — Developer-tool aesthetic with Inter + JetBrains Mono fonts

---

## Prerequisites

1. **macOS** (arm64 or x86_64)
2. **Node.js 18+** — [Download here](https://nodejs.org) or via `brew install node`
3. **Ollama** — [Download here](https://ollama.com/download)
4. **At least one model pulled** (recommended: `qwen2.5-coder:7b`):

```bash
ollama pull qwen2.5-coder:7b
```

> **Note**: The app will auto-start `ollama serve` if it's not running, but you still need at least one model pulled before you can chat.

---

## Getting Started

### Development Mode

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/offline-coder-chat.git
cd offline-coder-chat

# 2. Install dependencies
npm install

# 3. Run in development mode (HMR enabled)
npm start
```

The app will open in a native window. The renderer hot-reloads on changes.

### Production Build

```bash
# Build the React app + package as macOS .app
npm run package
```

The output will be in `release/` — look for `Offline Coder Chat.dmg` or `Offline Coder Chat-mac.zip`.

---

## Project Structure

```
offlineapp/
├── electron.vite.config.js     # electron-vite build config
├── package.json                # Dependencies + electron-builder config
├── src/
│   ├── main/
│   │   └── index.js            # Electron main process
│   │                           #   - Ollama auto-start logic
│   │                           #   - IPC handlers for file storage
│   │                           #   - BrowserWindow creation
│   ├── preload/
│   │   └── index.js            # contextBridge (secure IPC bridge)
│   └── renderer/
│       ├── index.html
│       └── src/
│           ├── main.jsx         # React entry point
│           ├── App.jsx          # Root component, all state orchestration
│           ├── config.js        # All configurable values (URL, model, etc.)
│           ├── components/
│           │   ├── Header.jsx           # Title + model selector + status
│           │   ├── Sidebar.jsx          # Chat session list (collapsible)
│           │   ├── ChatPanel.jsx        # Message list + auto-scroll
│           │   ├── MessageBubble.jsx    # Individual message
│           │   ├── MarkdownRenderer.jsx # react-markdown + syntax highlight
│           │   ├── InputBar.jsx         # Textarea + mic + send
│           │   ├── TypingIndicator.jsx  # Animated dots while waiting
│           │   ├── AddModelModal.jsx    # Model pull with progress bar
│           │   ├── EmptyState.jsx       # Welcome + example prompts
│           │   └── ConfirmModal.jsx     # Generic delete confirmation
│           ├── hooks/
│           │   ├── useChat.js           # Chat state + streaming + save
│           │   └── useOllama.js         # Connection polling + model list
│           ├── services/
│           │   ├── ollamaService.js     # All Ollama API calls + NDJSON parsing
│           │   ├── storageService.js    # Thin IPC wrapper for session CRUD
│           │   └── voiceService.js      # Modular Web Speech API (swap for Whisper)
│           └── styles/
│               ├── index.css            # Design tokens + global reset
│               ├── header.css
│               ├── sidebar.css
│               ├── chat.css
│               ├── input.css
│               ├── modals.css
│               └── animations.css
```

---

## Configuration

All configurable values are in [`src/renderer/src/config.js`](./src/renderer/src/config.js):

| Key | Default | Description |
|---|---|---|
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama base URL |
| `DEFAULT_MODEL` | `qwen2.5-coder:7b` | Model used on first launch |
| `CONNECTION_POLL_INTERVAL_MS` | `5000` | How often to check Ollama connection |
| `SYSTEM_PROMPT` | (coding assistant) | System prompt injected in every chat |
| `EXAMPLE_PROMPTS` | (6 prompts) | Suggestions on the empty state screen |

---

## Adding More Models

1. Click **"+ Add Model"** in the top-right header
2. Type the model name (e.g. `qwen2.5-coder:14b`, `deepseek-coder:6.7b`)
3. Click **"Pull Model"** — a live progress bar shows download progress
4. The model appears in the dropdown when download completes

Alternatively, pull from the terminal:
```bash
ollama pull qwen2.5-coder:14b
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Enter` | Send message |
| `Shift + Enter` | New line in input |
| `Cmd + N` | New chat |
| `Escape` | Close modal |

---

## Data Storage

Chat sessions are stored as plain JSON files in your app's `userData` directory:

```
~/Library/Application Support/offline-coder-chat/sessions/<uuid>.json
```

Each file is a self-contained session with all messages. No database engine is used.

---

## Extending the App

This project is designed to be extended. Some ideas for future add-ons:

- **Local RAG** — Index personal notes/docs and inject relevant context into prompts
- **Multiple model comparison** — Run the same prompt on two models side by side
- **Local Whisper** — Replace the Web Speech API in `voiceService.js` with a local Whisper model
- **Custom system prompts** — Let users define per-session system prompts
- **Export chats** — Export sessions as Markdown or PDF

---

## License

MIT — do whatever you want with it.
