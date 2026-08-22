# ⚡ CodeLoom — Private Local AI Coding Assistant

> A professional desktop AI assistant for developers. Runs **100% offline** using Ollama and Whisper — your code, your model, your machine.

[![Release](https://img.shields.io/github/v/release/samarthsemwal/offline-ai-coder?color=brightgreen&label=Download%20Latest%20Release)](https://github.com/samarthsemwal/offline-ai-coder/releases)
![Platform](https://img.shields.io/badge/platform-macOS-blue?logo=apple)
![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Ollama](https://img.shields.io/badge/Ollama-local%20inference-black)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 📥 Download & Install

Get the latest standalone packaged builds for your platform from [GitHub Releases](https://github.com/samarthsemwal/offline-ai-coder/releases):

- **macOS (Apple Silicon)**: Download `CodeLoom-1.0.0-arm64.dmg` or `CodeLoom-1.0.0-arm64-mac.zip`
- **macOS (Intel)** / **Windows** / **Linux**: Packaged builds available under Releases

### Quick Prerequisites
1. Install and start [Ollama](https://ollama.com/download)
2. Pull your preferred coding model: `ollama pull qwen2.5-coder:7b`
3. Launch CodeLoom — it will automatically detect Ollama and your local models!

---

## ✨ Features

### 🤖 AI Capabilities
| Feature | Details |
|---|---|
| **Local AI inference** | Powered by [Ollama](https://ollama.com) — no API keys, no subscriptions |
| **Model agnostic** | Switch between any Ollama model mid-session (Qwen2.5-Coder, Llama 3.2, Mistral…) |
| **Streaming responses** | NDJSON token-by-token streaming with live rendering |
| **Temperature control** | Precise presets: Deterministic → Balanced → Creative → Custom |
| **System prompt editor** | Full custom system prompt with live preview |

### 💻 Developer Workflow
| Feature | Details |
|---|---|
| **7 Coding Actions** | Explain · Fix · Refactor · Debug · Document · Review · Generate Tests |
| **File Import** | Attach any code file with automatic language detection (60+ extensions) |
| **Context Budget** | Intelligent token counting and truncation (configurable 2k–16k tokens) |
| **Drag & Drop** | Drop files directly into the chat |
| **Markdown + Syntax Highlighting** | 40+ language code blocks with copy button |
| **Prompt Library** | 12 built-in prompts across 4 categories + unlimited custom prompts |

### 🎙️ Voice Input
| Feature | Details |
|---|---|
| **Whisper tiny.en** | Local speech-to-text via `@huggingface/transformers` + WebAssembly |
| **100% offline** | ~42 MB model cached locally, no audio sent externally |
| **Live waveform** | Real-time recording animation with duration counter |
| **Shortcut** | `⌘⌥V` to start/stop — transcript placed in input for review |

### 💬 Chat Management
| Feature | Details |
|---|---|
| **Session history** | Persistent sessions saved as local JSON |
| **Search** | Debounced full-text search across all session titles |
| **Pin sessions** | Keep important chats at the top |
| **Inline rename** | Double-click or right-click → Rename |
| **Export as Markdown** | One-click export via native save dialog |
| **Message actions** | Copy · Regenerate · Delete on every message (on hover) |

### ⌨️ Keyboard-First
| Shortcut | Action |
|---|---|
| `⌘N` | New chat |
| `⌘B` | Toggle sidebar |
| `⌘,` | Open settings |
| `⌘/` | Focus input |
| `⌘F` | Search conversations |
| `⌘K` | Clear current chat |
| `⌘⌥C` | Toggle Coding Actions toolbar |
| `⌘⌥V` | Voice input |
| `⌘⌥P` | Prompt Library |

### 🔒 Privacy Model

Every part of CodeLoom processes data locally:
- **AI inference** → Ollama on your machine (localhost:11434)
- **Voice transcription** → Whisper WASM (no audio sent externally)
- **Conversations** → Local JSON files in your app data directory
- **File context** → Sent only to your local Ollama instance
- **Settings** → Local JSON config file

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────┐
│                    Electron Shell                       │
│  ┌─────────────────┐      ┌──────────────────────────┐ │
│  │   Main Process   │      │      Renderer (React)     │ │
│  │   (Node.js)      │ IPC  │   Vite + React 18 + CSS  │ │
│  │                  │◄────►│                           │ │
│  │  • IPC handlers  │      │  • App.jsx                │ │
│  │  • Ollama mgmt   │      │  • Sidebar / Header       │ │
│  │  • File I/O      │      │  • ChatPanel              │ │
│  │  • Session CRUD  │      │  • InputBar               │ │
│  │  • Settings I/O  │      │  • Settings / Onboarding  │ │
│  │  • CSP headers   │      │  • PromptLibrary          │ │
│  └─────────────────┘      └──────────────────────────┘ │
│          │                          │                   │
│   ┌──────▼──────┐           ┌───────▼──────┐           │
│   │   Preload   │           │  Whisper WASM │           │
│   │  (IPC bridge)│          │  (Web Worker) │           │
│   └─────────────┘           └──────────────┘           │
└────────────────────────────────────────────────────────┘
         │
  ┌──────▼───────┐
  │  Ollama REST  │   localhost:11434
  │  (any model)  │
  └──────────────┘
```

### Key Architectural Decisions

| Decision | Rationale |
|---|---|
| `contextIsolation: true` + `nodeIntegration: false` | Electron security best practices |
| Secure preload IPC bridge | Renderer never touches Node APIs directly |
| NDJSON streaming | Token-by-token delivery without buffering the full response |
| Session ID UUID validation | Path-traversal attack prevention |
| Token budget + explicit truncation | Prevents model context overflow on large files |
| `React.memo` on `MessageBubble` | Prevents re-renders during streaming of other messages |
| CSS design tokens | Single source of truth for the entire visual system |

---

## 🚀 Getting Started (Development)

### Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | ≥ 18 | `node --version` |
| npm | ≥ 9 | bundled with Node |
| [Ollama](https://ollama.com/download) | latest | Must be running on `localhost:11434` |
| An Ollama model | — | `ollama pull qwen2.5-coder:7b` |

### Install & Run

```bash
# 1 — Clone the project
git clone https://github.com/samarthsemwal/offline-ai-coder.git
cd offline-ai-coder

# 2 — Install dependencies
npm install

# 3 — Start Ollama (in a separate terminal or as a service)
ollama serve

# 4 — Pull your preferred model
ollama pull qwen2.5-coder:7b        # Recommended coding model
# ollama pull llama3.2:3b           # Lighter alternative
# ollama pull mistral:7b            # General purpose

# 5 — Launch CodeLoom
npm run dev
```

### Build for Distribution

```bash
# Production build + electron-builder package
npm run package
# → release/ directory contains platform-specific installer (.dmg / .zip)
```

---

## 📁 Project Structure

```
src/
├── main/
│   └── index.js              # Electron main process (IPC, Ollama, file I/O, CSP)
├── preload/
│   └── index.js              # Secure IPC bridge (contextBridge)
└── renderer/
    └── src/
        ├── components/
        │   ├── App.jsx            # Root component, keyboard shortcuts, state
        │   ├── Header.jsx         # Branding, model selector, action buttons
        │   ├── Sidebar.jsx        # Session list, search, pin, rename, context menu
        │   ├── ChatPanel.jsx      # Message list, auto-scroll, error+retry
        │   ├── MessageBubble.jsx  # Individual message with action bar (memo)
        │   ├── InputBar.jsx       # Textarea, file attach, voice, coding actions
        │   ├── CodingActions.jsx  # 7-action quick toolbar
        │   ├── EmptyState.jsx     # Home screen with action cards + quick prompts
        │   ├── Settings.jsx       # 6-section settings panel
        │   ├── PromptLibrary.jsx  # Built-in + custom prompt browser
        │   ├── Onboarding.jsx     # 3-step first-run experience
        │   ├── Toast.jsx          # IPC-driven notification system
        │   └── TypingIndicator.jsx / MarkdownRenderer.jsx
        ├── hooks/
        │   ├── useChat.js         # Message state, streaming, delete, regenerate
        │   └── useSettings.js     # Settings load/save with IPC, defaults, reset
        ├── services/
        │   ├── ollamaService.js   # NDJSON streaming, health check, model list
        │   ├── storageService.js  # Session CRUD, rename, pin, markdown export
        │   ├── codingPrompts.js   # 7 prompt builders + CODING_ACTIONS registry
        │   ├── languageDetector.js # 60+ extensions + content heuristics
        │   ├── contextBuilder.js  # Token budget, truncation, formatCodeBlock
        │   └── promptLibraryService.js # 12 built-ins + custom CRUD
        ├── styles/
        │   ├── index.css          # Design tokens + global utilities (500+ lines)
        │   ├── chat.css           # Message bubbles, chat panel
        │   ├── input.css          # Input bar, voice, file attachment
        │   ├── sidebar.css        # Sidebar, session items, search
        │   ├── header.css         # App header
        │   ├── settings.css       # Settings overlay panel
        │   ├── prompt-library.css # Prompt library panel
        │   ├── onboarding.css     # Onboarding overlay
        │   ├── modals.css         # Shared modal utilities
        │   └── animations.css     # Keyframes and transitions
        └── config.js              # App-wide constants, quick prompts, defaults
```

---

## 🧪 Testing

```bash
# Run all unit tests
npm test

# Run in watch mode (re-runs on file changes)
npm run test:watch

# Run with code coverage report
npm run test:coverage
```

### Test Coverage

| Test File | What's Tested |
|---|---|
| `languageDetector.test.js` | 25+ extension mappings, special files, content heuristics, edge cases |
| `contextBuilder.test.js` | Token estimation, truncation, line alignment, formatCodeBlock output |
| `codingPrompts.test.js` | All 7 builders, CODING_ACTIONS registry, language-specific prompts |
| `sessionIdSecurity.test.js` | UUID validation, path traversal, null bytes, injection attacks |
| `useSettings.test.js` | IPC load/save, defaults merging, updateSetting, resetSettings |
| `MessageBubble.test.jsx` | Rendering, streaming state, clipboard copy, action callbacks |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | [Electron 33](https://electronjs.org) |
| Frontend framework | [React 18](https://react.dev) |
| Build tool | [Vite 5](https://vitejs.dev) via [electron-vite](https://electron-vite.org) |
| AI inference | [Ollama](https://ollama.com) (local REST API) |
| Speech-to-text | [@huggingface/transformers](https://huggingface.co/docs/transformers.js) — Whisper tiny.en |
| Markdown rendering | [react-markdown](https://github.com/remarkjs/react-markdown) + [remark-gfm](https://github.com/remarkjs/remark-gfm) |
| Syntax highlighting | [react-syntax-highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter) |
| Unique IDs | [uuid v9](https://github.com/uuidjs/uuid) |
| Styling | Vanilla CSS with a full design token system |
| Testing | [Vitest](https://vitest.dev) + [Testing Library](https://testing-library.com) |
| Typography | [Inter](https://fonts.google.com/specimen/Inter) + [JetBrains Mono](https://www.jetbrains.com/lp/mono/) |

---

## 📝 Recommended Models

| Model | Size | Best for |
|---|---|---|
| `qwen2.5-coder:7b` | ~4.7 GB | **Recommended** — coding specialist |
| `qwen2.5-coder:3b` | ~2.0 GB | Fast, lightweight coding |
| `llama3.2:3b` | ~2.0 GB | General conversation, low VRAM |
| `llama3.1:8b` | ~4.9 GB | High-quality general purpose |
| `mistral:7b` | ~4.1 GB | General purpose, solid code support |
| `deepseek-coder-v2:16b` | ~9.1 GB | Advanced coding, needs 16+ GB VRAM |

```bash
ollama pull <model-name>
```

Models appear automatically in the model dropdown once pulled.

---

## 🔑 Security

CodeLoom follows Electron security best practices:

- **Context Isolation** enabled (`contextIsolation: true`)
- **Node Integration** disabled (`nodeIntegration: false`)
- **Preload IPC bridge** — renderer never accesses Node APIs directly
- **Session ID validation** — UUID-only, blocks path traversal attacks
- **File read sandbox** — extension allowlist + 2 MB size limit
- **Content Security Policy** — strict CSP via response headers

---

## 📄 License

MIT © CodeLoom Contributors
