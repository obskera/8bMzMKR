# 8bMzMKR — Project Backlog

## Milestone 1 — Project Scaffolding ✅
- [x] Electron + React + TypeScript scaffold
- [x] electron-vite build config
- [x] Preload IPC bridge (contextBridge, contextIsolation ON)
- [x] npm install all dependencies
- [ ] Confirm `npm run dev` launches the app window

## Milestone 2 — Grid Editor
- [x] Define Song / Track / Pattern / NoteEvent domain types (Zod schemas)
- [x] Create Zustand store for project state
- [x] Render step-sequencer grid (16 steps × N tracks)
- [x] Click empty cell → add note
- [x] Click existing note → remove note
- [x] Multiple tracks in the grid
- [x] Track label + mute/solo buttons

## Milestone 3 — Playback Engine
- [x] Create dedicated scheduler module (Web Audio API, AudioContext time-based)
- [x] Start / Stop transport
- [x] Loop playback
- [x] BPM control
- [x] Playhead highlight advances across grid during playback
- [x] Basic chiptune instruments (square, triangle, noise via OscillatorNode)

## Milestone 4 — File Operations
- [x] New project (clear state)
- [x] Save project to JSON via IPC + fs
- [x] Open project from JSON via IPC + fs
- [x] Zod schema validation on load
- [x] Schema versioning field for forward compatibility

## Milestone 5 — Polish
- [x] Undo / Redo (Zustand middleware or immer patches)
- [x] Keyboard shortcuts (Space = play/stop, Cmd+Z/Y, Cmd+S/O)
- [x] Instrument preset editor (waveform, envelope controls)
- [x] Drag note to resize length (Phase 2)
- [ ] Performance pass — virtualise grid for large patterns
- [x] Basic onboarding / empty state prompt
