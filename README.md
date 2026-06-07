# Sel me — open-source job hunt command center

A privacy-first, locally-runnable application to manage your job search end-to-end:
job tracking, AI-tailored resumes, cover letters, outreach templates, interview prep,
analytics, calendar, and ⌘K command palette.

Your data stays where **you** put it.

**🔗 Live demo:** https://scaneddork.github.io/sel-me/

## Features

- 📋 Job pipeline with kanban-style statuses, priorities, todos, attachments
- 📝 Resume builder with per-job field overrides
- 🤖 Bring-your-own AI: OpenAI, Anthropic, Ollama, LM Studio, any OpenAI-compatible endpoint
- ✉️ Cover letter & outreach studio with merge fields; PDF / DOCX export
- 📅 Interview command center, calendar view, `.ics` export
- 📈 Pipeline analytics, weekly goals
- 🔐 Encrypted JSON export / import (AES-256-GCM)
- ⌘K global command palette

## Storage — three modes, your choice

Settings → **Data & storage** lets you pick where state lives:

| Mode | Where it lives | Best for |
| --- | --- | --- |
| **Browser memory** | RAM only, cleared on reload | Demos, shared computers |
| **localStorage** (default) | This browser, persists across reloads | Solo use on one machine |
| **Remote server** | Your self-hosted endpoint | Sync across devices, full control |

The remote mode speaks a tiny REST contract — implement once, host anywhere:

```
GET    /<key>     → 200 with raw JSON body, or 404
PUT    /<key>     → body is raw JSON, store it verbatim
DELETE /<key>     → remove the key
```

Optionally protected by `Authorization: Bearer <token>`. A reference Node/Bun
server is ~30 lines; see `docs/self-hosted-server.md` for an example.

## Run locally

```bash
git clone https://github.com/ScanedDork/sel-me
cd sel-me
npm install      # or: bun install / pnpm install
npm run dev      # http://localhost:5173
```

Build a static-ish bundle:

```bash
bun run build
bun run preview
```

No backend is required — the default localStorage mode works fully offline.

## Author

**Ramar Ranjeet Skanda**

- GitHub: [@ScanedDork](https://github.com/ScanedDork)
- Portfolio: [ranjeetskanda.com](https://ranjeetskanda.com)

## License

[MIT](./LICENSE) © Ramar Ranjeet Skanda
