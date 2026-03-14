import { create } from 'zustand'
import type { Envelope, Song, Track, NoteCell, InstrumentType, NoiseType } from '../types/song'

const HISTORY_LIMIT = 100
const TRACK_LIMIT = 16
const MEASURE_COUNT = 4

export type GeneratorMood =
  | 'random'
  | 'major'
  | 'minor'
  | 'ionian'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'aeolian'
  | 'locrian'

export type GeneratorPreset =
  | 'balanced'
  | 'chill'
  | 'upbeat'
  | 'dark'
  | 'arp-heavy'
  | 'menu'
  | 'battle'
  | 'background'
  | 'cutscene'

interface GenerateTheoryOptions {
  mood: GeneratorMood
  preset: GeneratorPreset
}

interface ModeDef {
  mood: Exclude<GeneratorMood, 'random' | 'major' | 'minor'>
  scale: number[]
  family: 'major' | 'minor'
}

const MODE_DEFS: ModeDef[] = [
  { mood: 'ionian', scale: [0, 2, 4, 5, 7, 9, 11], family: 'major' },
  { mood: 'dorian', scale: [0, 2, 3, 5, 7, 9, 10], family: 'minor' },
  { mood: 'phrygian', scale: [0, 1, 3, 5, 7, 8, 10], family: 'minor' },
  { mood: 'lydian', scale: [0, 2, 4, 6, 7, 9, 11], family: 'major' },
  { mood: 'mixolydian', scale: [0, 2, 4, 5, 7, 9, 10], family: 'major' },
  { mood: 'aeolian', scale: [0, 2, 3, 5, 7, 8, 10], family: 'minor' },
  { mood: 'locrian', scale: [0, 1, 3, 5, 6, 8, 10], family: 'minor' }
]

const PRESET_BPM: Record<GeneratorPreset, number[]> = {
  balanced: [96, 104, 112, 120, 128, 136, 144, 152],
  chill: [82, 88, 92, 96, 100, 104],
  upbeat: [132, 140, 148, 156, 164, 172],
  dark: [90, 96, 102, 108, 114, 120],
  'arp-heavy': [112, 120, 128, 136, 144, 152],
  menu: [96, 104, 112, 120, 124, 128],
  battle: [148, 156, 164, 172, 180],
  background: [76, 82, 88, 92, 96],
  cutscene: [68, 74, 80, 86, 92]
}

function findOwningStep(row: NoteCell[], step: number): number | null {
  for (let index = 0; index < row.length; index += 1) {
    const cell = row[index]
    if (!cell) continue
    if (index <= step && step < index + cell.length) {
      return index
    }
  }

  return null
}

function maxLengthAtStep(row: NoteCell[], startStep: number): number {
  let maxLength = row.length - startStep

  for (let index = 0; index < row.length; index += 1) {
    const cell = row[index]
    if (!cell || index === startStep) continue
    if (index > startStep) {
      maxLength = Math.min(maxLength, index - startStep)
      break
    }
  }

  return Math.max(1, maxLength)
}

function trimRowToStepCount(row: NoteCell[], stepCount: number): NoteCell[] {
  const nextRow = Array<NoteCell>(stepCount).fill(null)

  for (let step = 0; step < Math.min(row.length, stepCount); step += 1) {
    const cell = row[step]
    if (!cell) continue
    const nextLength = Math.max(1, Math.min(cell.length, stepCount - step))
    nextRow[step] = { ...cell, length: nextLength }
  }

  return nextRow
}

function emptyGrid(tracks: Track[], stepCount: number): Record<string, NoteCell[]> {
  return Object.fromEntries(tracks.map((t) => [t.id, Array<NoteCell>(stepCount).fill(null)]))
}

function cloneSong(song: Song): Song {
  return JSON.parse(JSON.stringify(song)) as Song
}

function withHistory(song: Song, nextSong: Song, past: Song[]) {
  const nextPast = [...past, cloneSong(song)].slice(-HISTORY_LIMIT)
  return {
    song: nextSong,
    past: nextPast,
    future: [],
    canUndo: nextPast.length > 0,
    canRedo: false
  }
}

function clampMidi(pitch: number): number {
  return Math.max(0, Math.min(127, Math.round(pitch)))
}

function randItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function degreeSemitone(scale: number[], degree: number): number {
  const wrapped = ((degree % scale.length) + scale.length) % scale.length
  const octave = Math.floor(degree / scale.length)
  return scale[wrapped] + octave * 12
}

function resolveMode(mood: GeneratorMood): ModeDef {
  if (mood === 'random') return randItem(MODE_DEFS)
  if (mood === 'major') return randItem(MODE_DEFS.filter((mode) => mode.family === 'major'))
  if (mood === 'minor') return randItem(MODE_DEFS.filter((mode) => mode.family === 'minor'))

  return MODE_DEFS.find((mode) => mode.mood === mood) ?? MODE_DEFS[0]
}

function placeGeneratedNote(row: NoteCell[], startStep: number, length: number, pitch: number, velocity: number): void {
  if (startStep < 0 || startStep >= row.length) return

  const boundedLength = Math.max(1, Math.min(length, row.length - startStep))
  const endStep = startStep + boundedLength - 1

  for (let index = 0; index < row.length; index += 1) {
    const cell = row[index]
    if (!cell) continue
    const cellEnd = index + cell.length - 1

    if (index < startStep && startStep <= cellEnd) {
      row[index] = { ...cell, length: startStep - index }
      continue
    }

    if (startStep <= index && index <= endStep) {
      row[index] = null
    }
  }

  row[startStep] = {
    pitch: clampMidi(pitch),
    velocity: Math.max(1, Math.min(127, Math.round(velocity))),
    length: boundedLength
  }
}

function generateTheoryGrid(song: Song, options: GenerateTheoryOptions): Record<string, NoteCell[]> {
  const nextGrid = emptyGrid(song.tracks, song.stepCount)
  const stepsPerMeasure = Math.max(1, Math.floor(song.stepCount / MEASURE_COUNT))
  const quarter = Math.max(1, Math.floor(stepsPerMeasure / 4))
  const eighth = Math.max(1, Math.floor(stepsPerMeasure / 8))

  const mode = resolveMode(options.mood)
  const keyRoot = randItem([0, 2, 4, 5, 7, 9, 11])

  const majorProgressions = [
    [0, 4, 5, 3],
    [0, 3, 4, 0],
    [5, 3, 0, 4],
    [0, 5, 1, 4]
  ]
  const minorProgressions = [
    [0, 5, 6, 4],
    [0, 3, 6, 5],
    [0, 6, 5, 4],
    [0, 4, 6, 3]
  ]
  const progressions = mode.family === 'major' ? majorProgressions : minorProgressions

  const progressionByPreset: Record<GeneratorPreset, number[][]> = {
    balanced: progressions,
    chill: mode.family === 'major' ? [[0, 5, 3, 4], [0, 3, 4, 0]] : [[0, 5, 6, 4], [0, 3, 6, 5]],
    upbeat: mode.family === 'major' ? [[0, 4, 5, 3], [0, 4, 0, 5]] : [[0, 6, 5, 4], [0, 4, 6, 5]],
    dark: [[0, 6, 5, 4], [0, 4, 6, 3], [0, 6, 3, 5]],
    'arp-heavy': mode.family === 'major' ? [[0, 4, 5, 3], [0, 5, 1, 4]] : [[0, 5, 6, 4], [0, 3, 6, 5]],
    menu: mode.family === 'major' ? [[0, 3, 5, 4], [0, 5, 3, 4]] : [[0, 5, 6, 4], [0, 3, 6, 5]],
    battle: [[0, 6, 5, 4], [0, 4, 6, 5], [0, 6, 3, 5]],
    background: mode.family === 'major' ? [[0, 3, 5, 3], [0, 5, 3, 4]] : [[0, 5, 6, 5], [0, 3, 6, 3]],
    cutscene: [[0, 6, 4, 5], [0, 3, 6, 5], [0, 5, 4, 3]]
  }
  const progression = randItem(progressionByPreset[options.preset])

  const presetLeadRestChance: Record<GeneratorPreset, number> = {
    balanced: 0.35,
    chill: 0.5,
    upbeat: 0.2,
    dark: 0.42,
    'arp-heavy': 0.12,
    menu: 0.28,
    battle: 0.12,
    background: 0.62,
    cutscene: 0.55
  }
  const presetDrumDensity: Record<GeneratorPreset, number> = {
    balanced: 0.72,
    chill: 0.52,
    upbeat: 0.85,
    dark: 0.62,
    'arp-heavy': 0.7,
    menu: 0.58,
    battle: 0.92,
    background: 0.35,
    cutscene: 0.24
  }
  const presetLeadLongNoteChance: Record<GeneratorPreset, number> = {
    balanced: 0.35,
    chill: 0.5,
    upbeat: 0.18,
    dark: 0.4,
    'arp-heavy': 0.08,
    menu: 0.22,
    battle: 0.14,
    background: 0.7,
    cutscene: 0.82
  }
  const presetBassFifthChance: Record<GeneratorPreset, number> = {
    balanced: 0.3,
    chill: 0.22,
    upbeat: 0.34,
    dark: 0.28,
    'arp-heavy': 0.4,
    menu: 0.25,
    battle: 0.48,
    background: 0.15,
    cutscene: 0.12
  }

  for (let trackIndex = 0; trackIndex < song.tracks.length; trackIndex += 1) {
    const track = song.tracks[trackIndex]
    const row = nextGrid[track.id]

    if (track.instrument === 'noise') {
      for (let measure = 0; measure < MEASURE_COUNT; measure += 1) {
        const base = measure * stepsPerMeasure
        placeGeneratedNote(row, base, 1, track.defaultPitch, 115)
        placeGeneratedNote(row, base + quarter * 2, 1, track.defaultPitch, 112)
        placeGeneratedNote(row, base + quarter, 1, track.defaultPitch, 90)
        placeGeneratedNote(row, base + quarter * 3, 1, track.defaultPitch, 92)

        for (let hit = 0; hit < 8; hit += 1) {
          const step = base + hit * eighth
          if (step >= song.stepCount) continue
          if (Math.random() < presetDrumDensity[options.preset]) {
            placeGeneratedNote(row, step, 1, track.defaultPitch, hit % 2 === 0 ? 72 : 58)
          }
        }
      }
      continue
    }

    const role = track.instrument === 'sawtooth' || /bass/i.test(track.name) ? 'bass' : trackIndex === 0 ? 'lead' : 'harmony'

    for (let measure = 0; measure < MEASURE_COUNT; measure += 1) {
      const degree = progression[measure % progression.length]
      const base = measure * stepsPerMeasure
      const chordDegrees = [degree, degree + 2, degree + 4]
      const chordSemitones = chordDegrees.map((value) => degreeSemitone(mode.scale, value))

      if (role === 'bass') {
        const bassRoot = clampMidi((2 + 1) * 12 + keyRoot + chordSemitones[0])
        const sustainSplit = options.preset === 'background' || options.preset === 'cutscene' ? quarter * 4 : quarter * 2
        placeGeneratedNote(row, base, sustainSplit, bassRoot, 102)
        if (sustainSplit < quarter * 4) {
          placeGeneratedNote(
            row,
            base + quarter * 2,
            quarter * 2,
            bassRoot + (Math.random() < presetBassFifthChance[options.preset] ? 7 : 0),
            96
          )
        }
        continue
      }

      if (role === 'harmony') {
        const harmonyRoot = clampMidi((4 + 1) * 12 + keyRoot + chordSemitones[0])
        const harmonyThird = clampMidi((4 + 1) * 12 + keyRoot + chordSemitones[1])
        const longPad = options.preset === 'background' || options.preset === 'cutscene'
        if (longPad) {
          placeGeneratedNote(row, base, Math.max(quarter * 4, 1), harmonyRoot, 82)
        } else {
          placeGeneratedNote(row, base, Math.max(quarter * 2, 1), harmonyRoot, 90)
          placeGeneratedNote(row, base + Math.max(quarter * 2, 1), Math.max(quarter * 2, 1), harmonyThird, 84)
        }
        continue
      }

      const leadOctave = 5
      const phrasePositions =
        options.preset === 'arp-heavy' || options.preset === 'battle'
          ? [0, eighth, eighth * 2, eighth * 3, quarter * 2, quarter * 2 + eighth, quarter * 3]
          : options.preset === 'background' || options.preset === 'cutscene'
            ? [0, quarter * 2]
            : [0, eighth * 2, quarter, quarter + eighth, quarter * 2, quarter * 3]
      for (const offset of phrasePositions) {
        const step = base + offset
        if (step >= song.stepCount) continue
        if (Math.random() < presetLeadRestChance[options.preset]) continue

        const useChordTone = Math.random() < (options.preset === 'arp-heavy' ? 0.88 : 0.7)
        const semitone = useChordTone ? randItem(chordSemitones) : degreeSemitone(mode.scale, degree + randItem([1, 3, 5, 6]))
        const pitch = clampMidi((leadOctave + 1) * 12 + keyRoot + semitone)
        const noteLength =
          Math.random() < presetLeadLongNoteChance[options.preset] ? Math.max(1, eighth * 2) : Math.max(1, eighth)
        placeGeneratedNote(row, step, noteLength, pitch, 100)
      }
    }
  }

  return nextGrid
}

function createTrack(index: number, instrument: InstrumentType): Track {
  const basePitchByInstrument: Record<InstrumentType, number> = {
    square: 67,
    triangle: 60,
    sawtooth: 48,
    noise: 69
  }

  return {
    id: `track-${index}`,
    name: `Track ${index}`,
    instrument,
    settings: {
      envelope: {
        attack: 0.001,
        decay: instrument === 'noise' ? 0.1 : 0.08,
        sustain: instrument === 'noise' ? 0 : 0.25,
        release: 0.05
      },
      noiseType: 'white'
    },
    defaultPitch: basePitchByInstrument[instrument],
    volume: 0.72,
    muted: false,
    solo: false
  }
}

const DEFAULT_TRACKS: Track[] = [
  {
    id: 'track-1',
    name: 'Pulse 1',
    instrument: 'square',
    settings: { envelope: { attack: 0.001, decay: 0.06, sustain: 0.15, release: 0.04 }, noiseType: 'white' },
    defaultPitch: 67,
    volume: 0.78,
    muted: false,
    solo: false
  },
  {
    id: 'track-2',
    name: 'Pulse 2',
    instrument: 'triangle',
    settings: { envelope: { attack: 0.001, decay: 0.07, sustain: 0.2, release: 0.05 }, noiseType: 'white' },
    defaultPitch: 60,
    volume: 0.7,
    muted: false,
    solo: false
  },
  {
    id: 'track-3',
    name: 'Bass',
    instrument: 'sawtooth',
    settings: { envelope: { attack: 0.001, decay: 0.1, sustain: 0.3, release: 0.06 }, noiseType: 'white' },
    defaultPitch: 43,
    volume: 0.74,
    muted: false,
    solo: false
  },
  {
    id: 'track-4',
    name: 'Drums',
    instrument: 'noise',
    settings: { envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.03 }, noiseType: 'white' },
    defaultPitch: 69,
    volume: 0.52,
    muted: false,
    solo: false
  }
]

const DEFAULT_STEP_COUNT = 64

export function createDefaultSong(): Song {
  return {
    version: 1,
    bpm: 150,
    stepCount: DEFAULT_STEP_COUNT,
    tracks: DEFAULT_TRACKS,
    grid: emptyGrid(DEFAULT_TRACKS, DEFAULT_STEP_COUNT)
  }
}

interface ProjectState {
  song: Song
  past: Song[]
  future: Song[]
  canUndo: boolean
  canRedo: boolean
  generateTheorySong: (options: GenerateTheoryOptions) => void
  addTrack: (instrument: InstrumentType) => void
  removeTrack: (trackId: string) => void
  placeNote: (trackId: string, step: number, pitch: number, length: number) => void
  setNoteLength: (trackId: string, startStep: number, length: number) => void
  removeNoteAtStep: (trackId: string, step: number) => void
  setStepCount: (stepCount: number) => void
  setBpm: (bpm: number) => void
  setTrackMute: (trackId: string, muted: boolean) => void
  setTrackSolo: (trackId: string, solo: boolean) => void
  setTrackVolume: (trackId: string, volume: number) => void
  setTrackInstrument: (trackId: string, instrument: InstrumentType) => void
  setTrackNoiseType: (trackId: string, noiseType: NoiseType) => void
  setTrackEnvelope: (trackId: string, field: keyof Envelope, value: number) => void
  replaceSong: (song: Song) => void
  resetSong: () => void
  undo: () => void
  redo: () => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  song: createDefaultSong(),
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,

  generateTheorySong: (options) =>
    set((state) => {
      const nextGrid = generateTheoryGrid(state.song, options)
      const nextBpm = randItem(PRESET_BPM[options.preset])

      return withHistory(
        state.song,
        {
          ...state.song,
          bpm: nextBpm,
          grid: nextGrid
        },
        state.past
      )
    }),

  addTrack: (instrument) =>
    set((state) => {
      if (state.song.tracks.length >= TRACK_LIMIT) return state

      const nextIndex = state.song.tracks.length + 1
      const nextTrack = createTrack(nextIndex, instrument)
      const nextTracks = [...state.song.tracks]
      const insertIndex = state.song.tracks.length > 0 ? 1 : 0
      nextTracks.splice(insertIndex, 0, nextTrack)
      const nextGrid = {
        ...state.song.grid,
        [nextTrack.id]: Array<NoteCell>(state.song.stepCount).fill(null)
      }

      return withHistory(
        state.song,
        {
          ...state.song,
          tracks: nextTracks,
          grid: nextGrid
        },
        state.past
      )
    }),

  removeTrack: (trackId) =>
    set((state) => {
      if (state.song.tracks.length <= 1) return state
      if (!state.song.tracks.some((track) => track.id === trackId)) return state

      const nextTracks = state.song.tracks.filter((track) => track.id !== trackId)
      const nextGrid = { ...state.song.grid }
      delete nextGrid[trackId]

      return withHistory(
        state.song,
        {
          ...state.song,
          tracks: nextTracks,
          grid: nextGrid
        },
        state.past
      )
    }),

  placeNote: (trackId, step, pitch, length) =>
    set((state) => {
      const row = state.song.grid[trackId]
      if (!row || step < 0 || step >= row.length) return state

      const newRow = [...row]
      const requestedLength = Math.max(1, Math.floor(length))
      const provisionalEnd = Math.min(row.length - 1, step + requestedLength - 1)

      // Trim or remove overlapping notes so placement always lands exactly at the clicked cell.
      for (let index = 0; index < newRow.length; index += 1) {
        const cell = newRow[index]
        if (!cell) continue
        const noteEnd = index + cell.length - 1

        if (index <= step && step <= noteEnd) {
          if (index === step) {
            newRow[index] = null
          } else {
            newRow[index] = { ...cell, length: step - index }
          }
          continue
        }

        if (step < index && index <= provisionalEnd) {
          newRow[index] = null
        }
      }

      const maxLength = maxLengthAtStep(newRow, step)
      const nextLength = Math.max(1, Math.min(requestedLength, maxLength))
      newRow[step] = { pitch, velocity: 100, length: nextLength }

      return withHistory(state.song, { ...state.song, grid: { ...state.song.grid, [trackId]: newRow } }, state.past)
    }),

  setNoteLength: (trackId, startStep, length) =>
    set((state) => {
      const row = state.song.grid[trackId]
      const note = row?.[startStep]
      if (!row || !note) return state

      const maxLength = maxLengthAtStep(row, startStep)
      const nextLength = Math.max(1, Math.min(Math.floor(length), maxLength))
      if (note.length === nextLength) return state

      const newRow = [...row]
      newRow[startStep] = { ...note, length: nextLength }

      return withHistory(state.song, { ...state.song, grid: { ...state.song.grid, [trackId]: newRow } }, state.past)
    }),

  removeNoteAtStep: (trackId, step) =>
    set((state) => {
      const row = state.song.grid[trackId]
      if (!row || step < 0 || step >= row.length) return state

      const owningStep = findOwningStep(row, step)
      if (owningStep === null) return state

      const newRow = [...row]
      newRow[owningStep] = null

      return withHistory(state.song, { ...state.song, grid: { ...state.song.grid, [trackId]: newRow } }, state.past)
    }),

  setStepCount: (stepCount) =>
    set((state) => {
      const boundedStepCount = Math.max(16, Math.min(256, stepCount))
      if (state.song.stepCount === boundedStepCount) return state

      const nextGrid = Object.fromEntries(
        state.song.tracks.map((track) => [track.id, trimRowToStepCount(state.song.grid[track.id] ?? [], boundedStepCount)])
      )

      return withHistory(
        state.song,
        {
          ...state.song,
          stepCount: boundedStepCount,
          grid: nextGrid
        },
        state.past
      )
    }),

  setBpm: (bpm) =>
    set((state) => {
      if (state.song.bpm === bpm) return state
      return withHistory(state.song, { ...state.song, bpm }, state.past)
    }),

  setTrackMute: (trackId, muted) =>
    set((state) => ({
      ...withHistory(
        state.song,
        {
          ...state.song,
          tracks: state.song.tracks.map((t) => (t.id === trackId ? { ...t, muted } : t))
        },
        state.past
      )
    })),

  setTrackSolo: (trackId, solo) =>
    set((state) => ({
      ...withHistory(
        state.song,
        {
          ...state.song,
          tracks: state.song.tracks.map((t) => (t.id === trackId ? { ...t, solo } : t))
        },
        state.past
      )
    })),

  setTrackVolume: (trackId, volume) =>
    set((state) => ({
      ...withHistory(
        state.song,
        {
          ...state.song,
          tracks: state.song.tracks.map((t) => (t.id === trackId ? { ...t, volume } : t))
        },
        state.past
      )
    })),

  setTrackInstrument: (trackId, instrument) =>
    set((state) => ({
      ...withHistory(
        state.song,
        {
          ...state.song,
          tracks: state.song.tracks.map((track) =>
            track.id === trackId
              ? {
                  ...track,
                  instrument,
                  settings:
                    instrument === 'noise'
                      ? {
                          ...track.settings,
                          envelope: {
                            ...track.settings.envelope,
                            sustain: 0
                          }
                        }
                      : track.settings
                }
              : track
          )
        },
        state.past
      )
    })),

  setTrackNoiseType: (trackId, noiseType) =>
    set((state) => ({
      ...withHistory(
        state.song,
        {
          ...state.song,
          tracks: state.song.tracks.map((track) =>
            track.id === trackId ? { ...track, settings: { ...track.settings, noiseType } } : track
          )
        },
        state.past
      )
    })),

  setTrackEnvelope: (trackId, field, value) =>
    set((state) => ({
      ...withHistory(
        state.song,
        {
          ...state.song,
          tracks: state.song.tracks.map((track) =>
            track.id === trackId
              ? {
                  ...track,
                  settings: {
                    ...track.settings,
                    envelope: {
                      ...track.settings.envelope,
                      [field]: value
                    }
                  }
                }
              : track
          )
        },
        state.past
      )
    })),

  replaceSong: (song) => set({ song, past: [], future: [], canUndo: false, canRedo: false }),

  resetSong: () => set({ song: createDefaultSong(), past: [], future: [], canUndo: false, canRedo: false }),

  undo: () =>
    set((state) => {
      if (state.past.length === 0) return state
      const previous = state.past[state.past.length - 1]
      const nextFuture = [cloneSong(state.song), ...state.future]
      const nextPast = state.past.slice(0, -1)
      return {
        song: previous,
        past: nextPast,
        future: nextFuture,
        canUndo: nextPast.length > 0,
        canRedo: true
      }
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return state
      const next = state.future[0]
      const nextPast = [...state.past, cloneSong(state.song)].slice(-HISTORY_LIMIT)
      const nextFuture = state.future.slice(1)
      return {
        song: next,
        past: nextPast,
        future: nextFuture,
        canUndo: true,
        canRedo: nextFuture.length > 0
      }
    })
}))
