# 8bMzMKR — Copilot Instructions

## Project
Electron + React + TypeScript chiptune music editor.

## Stack
- **Electron** (main process) — window management, IPC, file I/O
- **React 18 + TypeScript** (renderer) — all UI
- **Tone.js** — audio scheduling and synthesis
- **Zustand** — UI + project state
- **Zod** — project file schema validation
- **electron-vite** — build tooling

## Conventions
- Context isolation ON, `nodeIntegration` OFF. All Node access goes through the preload IPC bridge in `src/preload/index.ts`.
- Renderer code lives under `src/renderer/src/`. Alias `@renderer/*` maps to that folder.
- Main process code lives under `src/main/`.
- Prefer functional React components with hooks.
- Keep audio scheduling logic out of React components — use a dedicated scheduler module.
- Use Zod schemas for any data that is serialised to disk or crosses IPC boundaries.
