import { create } from 'zustand'
import type { Envelope, Song, Track, NoteCell, InstrumentType, NoiseType, TrackSoundSource } from '../types/song'
import {
  buildGenerationSeedToken,
  createAutoSeed,
  createSeededRandom,
  normalizeSeed,
  type SeededRandom
} from '../utils/seededRandom'

const HISTORY_LIMIT = 100
const TRACK_LIMIT = 16
const DEFAULT_BAR_COUNT = 4

const REAL_SAMPLE_INSTRUMENT_MAP: Record<InstrumentType, InstrumentType> = {
  square: 'violin',
  triangle: 'flute',
  sawtooth: 'cello',
  noise: 'drums',
  fm: 'piano',
  am: 'viola',
  duo: 'hurdy-gurdy',
  pluck: 'guitar',
  guitar: 'guitar',
  'electric-guitar': 'electric-guitar',
  'hurdy-gurdy': 'hurdy-gurdy',
  violin: 'violin',
  viola: 'viola',
  cello: 'cello',
  bass: 'bass',
  flute: 'flute',
  ocarina: 'ocarina',
  harmonica: 'harmonica',
  piano: 'piano',
  drums: 'drums',
  membrane: 'drums',
  metal: 'drums'
}

function toRealSampleInstrument(instrument: InstrumentType): InstrumentType {
  return REAL_SAMPLE_INSTRUMENT_MAP[instrument]
}

function normalizeTrackForSoundSource(track: Track): Track {
  if (track.soundSource !== 'real') return track
  const normalizedInstrument = toRealSampleInstrument(track.instrument)
  if (normalizedInstrument === track.instrument) return track
  return {
    ...track,
    instrument: normalizedInstrument
  }
}

function normalizeTracksForSoundSource(tracks: Track[]): Track[] {
  return tracks.map((track) => normalizeTrackForSoundSource(track))
}

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

export type GeneratorStyle =
  | 'chiptune'
  | 'kpop'
  | 'sea-shanty'
  | 'celtic'
  | 'hurdy-gurdy'
  | 'wind'
  | 'piano'
  | 'classical'
  | 'rock'
  | 'techno'

export type GeneratorVariation = 'conservative' | 'normal' | 'wild'
export type TechnoFlavor = 'random' | 'minimal' | 'melodic' | 'acid' | 'industrial'
export type RockFlavor = 'random' | 'classic' | 'hard' | 'metal-ish' | 'blues-rock'
export type SongForm = 'random' | 'auto' | 'aaaa' | 'aab' | 'aabb' | 'abab' | 'abba' | 'aaba' | 'abcb'
export type ChordStructure = 'random' | 'triads' | 'power' | 'seventh' | 'sus2' | 'sus4'
export type GeneratorSubstyle =
  | 'random'
  | 'arcade'
  | 'narrative'
  | 'dance'
  | 'ballad'
  | 'work-song'
  | 'anthemic'
  | 'reel'
  | 'air'
  | 'drone'
  | 'wheel-dance'
  | 'ensemble'
  | 'soloist'
  | 'etude'
  | 'nocturne'
  | 'sonata'
  | 'minuet'
  | 'arena'
  | 'garage'
  | 'club'
  | 'warehouse'
export type RockProgressionMode = 'auto' | 'riff-vamp' | 'anthem-lift' | 'blues-turnaround' | 'prog-suite'
export type RockSectionForm = Exclude<SongForm, 'random'>
export type RockRhythmPattern =
  | 'auto'
  | 'straight-8ths'
  | 'offbeat-push'
  | 'half-time'
  | 'punk-drive'
  | 'sync-16ths'
  | 'chug-16ths'
  | 'gallop'

export type GeneratorKey =
  | 'random'
  | 'c-major'
  | 'g-major'
  | 'd-major'
  | 'a-major'
  | 'e-major'
  | 'f-major'
  | 'bb-major'
  | 'a-minor'
  | 'e-minor'
  | 'd-minor'
  | 'g-minor'
  | 'c-minor'

interface GenerateTheoryOptions {
  style: GeneratorStyle
  substyle?: GeneratorSubstyle
  chordStructure?: ChordStructure
  songForm?: SongForm
  technoFlavor?: TechnoFlavor
  rockFlavor?: RockFlavor
  rockProgressionMode?: RockProgressionMode
  rockSectionForm?: RockSectionForm
  rockSectionProgressions?: Partial<Record<'A' | 'B' | 'C', number[]>>
  rockRhythmPattern?: RockRhythmPattern
  key: GeneratorKey
  variation: GeneratorVariation
  mood: GeneratorMood
  preset: GeneratorPreset
  repeatReady: boolean
  loopStyle: LoopStyle
  bpm?: number
  instrumentCount?: number
  seed?: string
  trackLayout?: Array<{ name: string; instrument: InstrumentType }>
}

export type LoopStyle = 'strong-cadence' | 'seamless-ambient'

interface ModeDef {
  mood: Exclude<GeneratorMood, 'random' | 'major' | 'minor'>
  scale: number[]
  family: 'major' | 'minor'
}

interface StyleProfile {
  trackLayout: Array<{ name: string; instrument: InstrumentType }>
  forceFamily?: 'major' | 'minor'
  bpm: number[]
  progressionMajor: number[][]
  progressionMinor: number[][]
  leadRestMultiplier: number
  drumDensityMultiplier: number
  leadLongMultiplier: number
  bassFifthMultiplier: number
  leadOctave: number
  harmonyOctave: number
  bassOctave: number
}

interface KeyDef {
  key: GeneratorKey
  root: number | null
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

const KEY_DEFS: KeyDef[] = [
  { key: 'random', root: null },
  { key: 'c-major', root: 0 },
  { key: 'g-major', root: 7 },
  { key: 'd-major', root: 2 },
  { key: 'a-major', root: 9 },
  { key: 'e-major', root: 4 },
  { key: 'f-major', root: 5 },
  { key: 'bb-major', root: 10 },
  { key: 'a-minor', root: 9 },
  { key: 'e-minor', root: 4 },
  { key: 'd-minor', root: 2 },
  { key: 'g-minor', root: 7 },
  { key: 'c-minor', root: 0 }
]

const STYLE_PROFILES: Record<GeneratorStyle, StyleProfile> = {
  chiptune: {
    trackLayout: [
      { name: 'Pulse 1', instrument: 'square' },
      { name: 'Pulse 2', instrument: 'triangle' },
      { name: 'Bass', instrument: 'sawtooth' },
      { name: 'Drums', instrument: 'noise' }
    ],
    bpm: [92, 104, 116, 128, 140, 152],
    progressionMajor: [[0, 4, 5, 3], [0, 5, 1, 4], [0, 3, 4, 0]],
    progressionMinor: [[0, 5, 6, 4], [0, 3, 6, 5], [0, 6, 5, 4]],
    leadRestMultiplier: 1,
    drumDensityMultiplier: 1,
    leadLongMultiplier: 1,
    bassFifthMultiplier: 1,
    leadOctave: 4,
    harmonyOctave: 3,
    bassOctave: 2
  },
  kpop: {
    trackLayout: [
      { name: 'Hook Lead', instrument: 'fm' },
      { name: 'Chords', instrument: 'piano' },
      { name: 'Sub Bass', instrument: 'bass' },
      { name: 'Beat', instrument: 'membrane' },
      { name: 'Top Perc', instrument: 'noise' }
    ],
    forceFamily: 'major',
    bpm: [96, 104, 112, 120, 124, 128],
    progressionMajor: [[0, 5, 3, 4], [0, 4, 5, 3], [0, 3, 4, 5]],
    progressionMinor: [[0, 5, 6, 4], [0, 6, 4, 5]],
    leadRestMultiplier: 0.75,
    drumDensityMultiplier: 1.1,
    leadLongMultiplier: 0.85,
    bassFifthMultiplier: 1.1,
    leadOctave: 5,
    harmonyOctave: 4,
    bassOctave: 2
  },
  'sea-shanty': {
    trackLayout: [
      { name: 'Shanty Lead', instrument: 'harmonica' },
      { name: 'Accordion', instrument: 'duo' },
      { name: 'Upright Bass', instrument: 'bass' },
      { name: 'Deck Perc', instrument: 'membrane' }
    ],
    forceFamily: 'major',
    bpm: [72, 80, 88, 96, 104],
    progressionMajor: [[0, 4, 0, 5], [0, 5, 4, 0], [0, 3, 4, 0]],
    progressionMinor: [[0, 5, 6, 4], [0, 3, 6, 5]],
    leadRestMultiplier: 0.9,
    drumDensityMultiplier: 0.65,
    leadLongMultiplier: 1.35,
    bassFifthMultiplier: 0.7,
    leadOctave: 4,
    harmonyOctave: 3,
    bassOctave: 2
  },
  celtic: {
    trackLayout: [
      { name: 'Tin Whistle', instrument: 'flute' },
      { name: 'Fiddle', instrument: 'violin' },
      { name: 'Bodhran', instrument: 'membrane' },
      { name: 'Reel Bass', instrument: 'bass' }
    ],
    bpm: [96, 104, 112, 120, 128],
    progressionMajor: [[0, 5, 4, 0], [0, 4, 5, 0], [0, 3, 4, 5]],
    progressionMinor: [[0, 6, 5, 4], [0, 5, 6, 4], [0, 3, 6, 5]],
    leadRestMultiplier: 0.7,
    drumDensityMultiplier: 0.88,
    leadLongMultiplier: 0.8,
    bassFifthMultiplier: 0.95,
    leadOctave: 5,
    harmonyOctave: 4,
    bassOctave: 2
  },
  'hurdy-gurdy': {
    trackLayout: [
      { name: 'Melody Wheel', instrument: 'hurdy-gurdy' },
      { name: 'Bourdon Drone', instrument: 'hurdy-gurdy' },
      { name: 'Trompette Buzz', instrument: 'hurdy-gurdy' },
      { name: 'Frame Drum', instrument: 'membrane' }
    ],
    bpm: [84, 92, 100, 108, 116],
    progressionMajor: [[0, 5, 4, 0], [0, 4, 5, 0], [0, 3, 4, 0]],
    progressionMinor: [[0, 5, 6, 4], [0, 4, 5, 3], [0, 3, 4, 5]],
    leadRestMultiplier: 0.55,
    drumDensityMultiplier: 0.48,
    leadLongMultiplier: 0.72,
    bassFifthMultiplier: 1.35,
    leadOctave: 5,
    harmonyOctave: 4,
    bassOctave: 3
  },
  wind: {
    trackLayout: [
      { name: 'Flute Lead', instrument: 'flute' },
      { name: 'Ocarina Counter', instrument: 'ocarina' },
      { name: 'Flute Harmony', instrument: 'flute' },
      { name: 'Ocarina Bass', instrument: 'ocarina' }
    ],
    bpm: [68, 74, 80, 86, 92, 98],
    progressionMajor: [[0, 4, 5, 3], [0, 5, 3, 4], [0, 2, 4, 0]],
    progressionMinor: [[0, 5, 6, 4], [0, 3, 6, 5], [0, 4, 6, 3]],
    leadRestMultiplier: 1.35,
    drumDensityMultiplier: 0.2,
    leadLongMultiplier: 1.5,
    bassFifthMultiplier: 0.7,
    leadOctave: 5,
    harmonyOctave: 4,
    bassOctave: 2
  },
  piano: {
    trackLayout: [
      { name: 'Piano Lead', instrument: 'piano' },
      { name: 'Piano Harmony', instrument: 'piano' },
      { name: 'Left Hand Bass', instrument: 'piano' },
      { name: 'Piano Counter', instrument: 'piano' }
    ],
    bpm: [68, 74, 80, 86, 92, 100],
    progressionMajor: [[0, 4, 5, 3], [0, 5, 3, 4], [0, 3, 4, 0]],
    progressionMinor: [[0, 5, 6, 4], [0, 3, 6, 5], [0, 6, 4, 5]],
    leadRestMultiplier: 1.1,
    drumDensityMultiplier: 0.35,
    leadLongMultiplier: 1.45,
    bassFifthMultiplier: 0.6,
    leadOctave: 5,
    harmonyOctave: 4,
    bassOctave: 2
  },
  classical: {
    trackLayout: [
      { name: 'Violin', instrument: 'violin' },
      { name: 'Viola', instrument: 'viola' },
      { name: 'Cello', instrument: 'cello' },
      { name: 'Double Bass', instrument: 'bass' }
    ],
    bpm: [64, 72, 80, 88, 96, 104],
    progressionMajor: [[0, 4, 5, 1], [0, 5, 3, 4], [0, 3, 4, 0]],
    progressionMinor: [[0, 6, 5, 4], [0, 3, 6, 5], [0, 4, 6, 3]],
    leadRestMultiplier: 1.2,
    drumDensityMultiplier: 0.25,
    leadLongMultiplier: 1.5,
    bassFifthMultiplier: 0.55,
    leadOctave: 5,
    harmonyOctave: 4,
    bassOctave: 2
  },
  rock: {
    trackLayout: [
      { name: 'Lead Guitar', instrument: 'electric-guitar' },
      { name: 'Rhythm Guitar', instrument: 'guitar' },
      { name: 'Bass Guitar', instrument: 'bass' },
      { name: 'Kit', instrument: 'drums' }
    ],
    bpm: [96, 108, 120, 132, 144, 156],
    progressionMajor: [[0, 3, 4, 0], [0, 4, 5, 3], [0, 5, 4, 3], [0, 4, 0, 5]],
    progressionMinor: [[0, 6, 5, 4], [0, 5, 6, 4], [0, 4, 6, 5], [0, 5, 4, 0]],
    leadRestMultiplier: 0.62,
    drumDensityMultiplier: 1.26,
    leadLongMultiplier: 0.56,
    bassFifthMultiplier: 1.3,
    leadOctave: 4,
    harmonyOctave: 4,
    bassOctave: 2
  },
  techno: {
    trackLayout: [
      { name: 'Kick', instrument: 'membrane' },
      { name: 'Hats', instrument: 'noise' },
      { name: 'Sub', instrument: 'fm' },
      { name: 'Chord Stab', instrument: 'duo' },
      { name: 'Arp', instrument: 'am' }
    ],
    forceFamily: 'minor',
    bpm: [120, 128, 132, 136, 140, 144],
    progressionMajor: [[0, 5, 4, 0], [0, 3, 4, 5], [0, 4, 5, 3]],
    progressionMinor: [[0, 6, 5, 4], [0, 5, 6, 4], [0, 3, 6, 5]],
    leadRestMultiplier: 0.58,
    drumDensityMultiplier: 1.28,
    leadLongMultiplier: 0.65,
    bassFifthMultiplier: 1.05,
    leadOctave: 5,
    harmonyOctave: 4,
    bassOctave: 2
  }
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

function randItem<T>(items: T[], random: SeededRandom): T {
  return items[Math.floor(random() * items.length)]
}

function degreeSemitone(scale: number[], degree: number): number {
  const wrapped = ((degree % scale.length) + scale.length) % scale.length
  const octave = Math.floor(degree / scale.length)
  return scale[wrapped] + octave * 12
}

function resolveMode(mood: GeneratorMood, random: SeededRandom): ModeDef {
  if (mood === 'random') return randItem(MODE_DEFS, random)
  if (mood === 'major') return randItem(MODE_DEFS.filter((mode) => mode.family === 'major'), random)
  if (mood === 'minor') return randItem(MODE_DEFS.filter((mode) => mode.family === 'minor'), random)

  return MODE_DEFS.find((mode) => mode.mood === mood) ?? MODE_DEFS[0]
}

function resolveModeForStyle(
  mood: GeneratorMood,
  styleProfile: StyleProfile,
  random: SeededRandom
): ModeDef {
  const forcedFamily = styleProfile.forceFamily

  if (forcedFamily && mood !== 'random') {
    if (mood === 'major' || mood === 'minor') {
      return randItem(MODE_DEFS.filter((mode) => mode.family === forcedFamily), random)
    }

    const explicitMode = MODE_DEFS.find((mode) => mode.mood === mood)
    if (!explicitMode || explicitMode.family !== forcedFamily) {
      return randItem(MODE_DEFS.filter((mode) => mode.family === forcedFamily), random)
    }
  }

  if (mood !== 'random') {
    return resolveMode(mood, random)
  }

  if (forcedFamily) {
    return randItem(MODE_DEFS.filter((mode) => mode.family === forcedFamily), random)
  }

  return resolveMode(mood, random)
}

function resolveKeyDef(key: GeneratorKey): KeyDef {
  return KEY_DEFS.find((item) => item.key === key) ?? KEY_DEFS[0]
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

function getActiveGeneratedNote(row: NoteCell[], step: number): NoteCell | null {
  if (step < 0 || step >= row.length) return null

  for (let index = step; index >= 0; index -= 1) {
    const cell = row[index]
    if (!cell) continue
    if (index + cell.length - 1 >= step) {
      return cell
    }
  }

  return null
}

function classifyGeneratorTrackRole(track: Track, trackIndex: number): 'drone' | 'bass' | 'lead' | 'harmony' {
  if (/drone|bourdon|trompette/i.test(track.name)) return 'drone'
  if (track.instrument === 'sawtooth' || /bass|sub|cello|left hand/i.test(track.name)) return 'bass'
  if (trackIndex === 0 || /lead|whistle|violin|hook|pluck|arp|flute/i.test(track.name)) return 'lead'
  return 'harmony'
}

function scoreHarmonyCandidate(candidate: number, leadPitches: number[], registerCenter: number): number {
  let score = Math.abs(candidate - registerCenter) * 0.45

  for (const leadPitch of leadPitches) {
    const distance = Math.abs(candidate - leadPitch)
    const intervalClass = distance % 12

    if (distance < 3) score += 220
    else if (distance < 5) score += 80

    if (candidate >= leadPitch - 2) score += 44

    if (intervalClass === 1 || intervalClass === 2 || intervalClass === 11) score += 140
    if (intervalClass === 6) score += 120
    if (intervalClass === 0) score += distance < 12 ? 70 : 12
    if (intervalClass === 3 || intervalClass === 4) score -= 26
    if (intervalClass === 7) score -= 24
    if (intervalClass === 8 || intervalClass === 9) score -= 30
    if (intervalClass === 5) score -= 8
  }

  return score
}

function chooseComplementaryHarmonyPitch(candidates: number[], leadPitches: number[], registerCenter: number): number {
  const expandedCandidates = candidates.flatMap((pitch) => [pitch - 12, pitch, pitch + 12]).map((pitch) => clampMidi(pitch))
  const uniqueCandidates = expandedCandidates.filter((pitch, index) => expandedCandidates.indexOf(pitch) === index)

  if (leadPitches.length === 0) {
    return uniqueCandidates.reduce(
      (best, candidate) =>
        Math.abs(candidate - registerCenter) < Math.abs(best - registerCenter) ? candidate : best,
      uniqueCandidates[0]
    )
  }

  return uniqueCandidates.reduce((best, candidate) => {
    const candidateScore = scoreHarmonyCandidate(candidate, leadPitches, registerCenter)
    const bestScore = scoreHarmonyCandidate(best, leadPitches, registerCenter)
    return candidateScore < bestScore ? candidate : best
  }, uniqueCandidates[0])
}

function chooseLeadRelativeHarmonyPitch(
  leadPitches: number[],
  fallbackCandidates: number[],
  registerCenter: number,
  preferredIntervals: number[]
): number {
  if (leadPitches.length === 0) {
    return chooseComplementaryHarmonyPitch(fallbackCandidates, [], registerCenter)
  }

  const leadPitch = leadPitches.reduce((highest, pitch) => (pitch > highest ? pitch : highest), leadPitches[0])
  const companionCandidates = preferredIntervals.map((interval) => clampMidi(leadPitch - interval))
  return chooseComplementaryHarmonyPitch([...fallbackCandidates, ...companionCandidates], leadPitches, registerCenter)
}

const DRUM_PITCHES = {
  kick: 35,
  tomLow: 36,
  snare: 38,
  openHat: 40,
  closedHat: 41,
  tomMid: 43,
  tomHigh: 45,
  crash: 47,
  ride: 48
} as const

function resolveSongForm(form: SongForm | undefined, random: SeededRandom): Exclude<SongForm, 'random'> {
  if (!form || form === 'random') {
    return randItem(['auto', 'aab', 'aabb', 'abab', 'aaba', 'abcb'], random)
  }
  return form
}

function resolveChordStructure(structure: ChordStructure | undefined, random: SeededRandom): Exclude<ChordStructure, 'random'> {
  if (!structure || structure === 'random') {
    return randItem(['triads', 'power', 'seventh', 'sus2', 'sus4'], random)
  }
  return structure
}

function resolveSubstyle(style: GeneratorStyle, substyle: GeneratorSubstyle | undefined, random: SeededRandom): GeneratorSubstyle {
  const byStyle: Record<GeneratorStyle, GeneratorSubstyle[]> = {
    chiptune: ['arcade', 'narrative'],
    kpop: ['dance', 'ballad'],
    'sea-shanty': ['work-song', 'anthemic'],
    celtic: ['reel', 'air'],
    'hurdy-gurdy': ['drone', 'wheel-dance'],
    wind: ['ensemble', 'soloist'],
    piano: ['etude', 'nocturne'],
    classical: ['sonata', 'minuet'],
    rock: ['arena', 'garage'],
    techno: ['club', 'warehouse']
  }

  if (!substyle || substyle === 'random') {
    return randItem(byStyle[style], random)
  }

  return byStyle[style].includes(substyle) ? substyle : randItem(byStyle[style], random)
}

function generateTheoryGrid(song: Song, options: GenerateTheoryOptions, random: SeededRandom): Record<string, NoteCell[]> {
  const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))
  const nextGrid = emptyGrid(song.tracks, song.stepCount)
  const isHurdyStyle = options.style === 'hurdy-gurdy'
  const isTechnoStyle = options.style === 'techno'
  const isRockStyle = options.style === 'rock'
  const isWindStyle = options.style === 'wind'
  const technoFlavor =
    options.technoFlavor && options.technoFlavor !== 'random'
      ? options.technoFlavor
      : randItem(['minimal', 'melodic', 'acid', 'industrial'], random)
  const rockFlavor =
    options.rockFlavor && options.rockFlavor !== 'random'
      ? options.rockFlavor
      : randItem(['classic', 'hard', 'metal-ish', 'blues-rock'], random)
  const selectedSongForm = resolveSongForm(options.songForm, random)
  const selectedChordStructure = resolveChordStructure(options.chordStructure, random)
  const selectedSubstyle = resolveSubstyle(options.style, options.substyle, random)
  const rockProgressionMode = options.rockProgressionMode ?? 'auto'
  const rockSectionForm = options.rockSectionForm ?? 'auto'
  const effectiveRockSectionForm: RockSectionForm = rockSectionForm === 'auto' ? selectedSongForm : rockSectionForm
  const rockRhythmPattern = options.rockRhythmPattern ?? 'auto'
  const styleProfile = STYLE_PROFILES[options.style]
  const keyDef = resolveKeyDef(options.key)
  const barCount = Math.max(1, song.barCount)
  const repeatReady = options.repeatReady && barCount > 1
  const strongCadence = options.loopStyle === 'strong-cadence'
  const stepsPerMeasure = Math.max(1, Math.floor(song.stepCount / barCount))
  const quarter = Math.max(1, Math.floor(stepsPerMeasure / 4))
  const eighth = Math.max(1, Math.floor(stepsPerMeasure / 8))
  const variationIntensity = options.variation === 'wild' ? 1.25 : options.variation === 'conservative' ? 0.78 : 1

  let mode = resolveModeForStyle(options.mood, styleProfile, random)
  if (isHurdyStyle && options.mood === 'random') {
    const hurdyModes = MODE_DEFS.filter((item) => item.mood === 'dorian' || item.mood === 'mixolydian' || item.mood === 'aeolian')
    mode = randItem(hurdyModes, random)
  }
  const keyRoot = keyDef.root === null ? randItem([0, 2, 4, 5, 7, 9, 11], random) : keyDef.root

  const styleProgressions = mode.family === 'major' ? styleProfile.progressionMajor : styleProfile.progressionMinor
  const fallbackProgressions = mode.family === 'major' ? [[0, 4, 5, 3], [0, 5, 1, 4], [5, 3, 0, 4]] : [[0, 5, 6, 4], [0, 3, 6, 5], [0, 6, 5, 4]]
  const sharedProgressions = [...styleProgressions, ...fallbackProgressions]
  const progressionByPreset: Record<GeneratorPreset, number[][]> = {
    balanced: sharedProgressions,
    chill: [...styleProgressions.slice(0, 2), ...fallbackProgressions.slice(0, 1)],
    upbeat: [...styleProgressions, ...fallbackProgressions],
    dark: [...styleProfile.progressionMinor, ...fallbackProgressions],
    'arp-heavy': sharedProgressions,
    menu: [...styleProgressions.slice(0, 2), ...fallbackProgressions.slice(0, 2)],
    battle: [...styleProgressions, ...fallbackProgressions],
    background: [...styleProgressions.slice(0, 2), ...fallbackProgressions.slice(0, 1)],
    cutscene: [...styleProgressions.slice(0, 2), ...fallbackProgressions.slice(0, 2)]
  }
  const selectedProgression = randItem(progressionByPreset[options.preset], random)
  const progressionRotation = selectedProgression.length > 1 && random() < 0.45 ? Math.floor(random() * selectedProgression.length) : 0
  const rotatedProgression =
    progressionRotation > 0
      ? [...selectedProgression.slice(progressionRotation), ...selectedProgression.slice(0, progressionRotation)]
      : [...selectedProgression]
  let progression = rotatedProgression.map((degree, index) => {
    if (index === 0 || random() >= 0.28) return degree
    return degree + randItem([-1, 1], random)
  })

  if (isRockStyle) {
    type RockProgressionFamilies = {
      verse: number[][]
      chorus: number[][]
      bridge: number[][]
      turnaround: number[]
      cadenceTargets: number[]
    }

    const rockFamilies: Record<Exclude<RockFlavor, 'random'>, RockProgressionFamilies> = {
      classic: {
        verse: [
          [0, 3, 4, 0],
          [0, 4, 5, 3],
          [0, 5, 4, 3],
          [0, 3, 5, 4]
        ],
        chorus: [
          [0, 5, 3, 4],
          [0, 4, 0, 5],
          [0, 5, 4, 0],
          [0, 3, 4, 5]
        ],
        bridge: [
          [5, 4, 0, 3],
          [3, 4, 5, 1],
          [1, 4, 0, 5],
          [6, 5, 4, 3]
        ],
        turnaround: [4, 5, 3, 1],
        cadenceTargets: [0, 4, 5]
      },
      hard: {
        verse: [
          [0, 5, 4, 0],
          [0, 4, 6, 5],
          [0, 3, 4, 6],
          [0, 6, 5, 4]
        ],
        chorus: [
          [0, 4, 5, 0],
          [0, 5, 3, 4],
          [0, 6, 4, 5],
          [0, 5, 4, 3]
        ],
        bridge: [
          [3, 6, 5, 4],
          [6, 4, 5, 0],
          [1, 3, 4, 5],
          [5, 4, 3, 6]
        ],
        turnaround: [6, 5, 4, 3],
        cadenceTargets: [0, 3, 4, 6]
      },
      'metal-ish': {
        verse: [
          [0, 0, 5, 4],
          [0, 6, 5, 4],
          [0, 4, 3, 2],
          [0, 5, 6, 4]
        ],
        chorus: [
          [0, 5, 4, 0],
          [0, 6, 4, 3],
          [0, 4, 5, 6],
          [0, 3, 2, 4]
        ],
        bridge: [
          [6, 5, 3, 4],
          [4, 2, 3, 5],
          [1, 2, 4, 0],
          [5, 3, 4, 2]
        ],
        turnaround: [2, 3, 4, 5],
        cadenceTargets: [0, 2, 4, 6]
      },
      'blues-rock': {
        verse: [
          [0, 3, 4, 3],
          [0, 5, 4, 0],
          [0, 3, 5, 4],
          [0, 4, 3, 0]
        ],
        chorus: [
          [0, 4, 5, 4],
          [0, 5, 3, 4],
          [0, 3, 4, 5],
          [0, 4, 0, 3]
        ],
        bridge: [
          [5, 4, 3, 0],
          [3, 4, 0, 5],
          [1, 3, 4, 0],
          [6, 5, 4, 3]
        ],
        turnaround: [3, 4, 5, 4],
        cadenceTargets: [0, 3, 4, 5]
      }
    }

    const manualSections = options.rockSectionProgressions
    const hasManualA = Boolean(manualSections?.A && manualSections.A.length > 0)
    if (effectiveRockSectionForm !== 'auto' && hasManualA) {
      const formMap: Record<RockSectionForm, Array<'A' | 'B' | 'C'>> = {
        auto: ['A', 'B'],
        aaaa: ['A', 'A', 'A', 'A'],
        aab: ['A', 'A', 'B'],
        aabb: ['A', 'A', 'B', 'B'],
        abab: ['A', 'B', 'A', 'B'],
        abba: ['A', 'B', 'B', 'A'],
        aaba: ['A', 'A', 'B', 'A'],
        abcb: ['A', 'B', 'C', 'B']
      }

      const sectionA = [...(manualSections?.A ?? [0])]
      const sectionB = manualSections?.B && manualSections.B.length > 0 ? [...manualSections.B] : [...sectionA]
      const sectionC = manualSections?.C && manualSections.C.length > 0 ? [...manualSections.C] : [...sectionB]
      const normalizedSections: Record<'A' | 'B' | 'C', number[]> = {
        A: sectionA,
        B: sectionB,
        C: sectionC
      }
      const sequence = formMap[effectiveRockSectionForm]

      progression = []
      let sectionCursor = 0
      while (progression.length < barCount) {
        const sectionName = sequence[sectionCursor % sequence.length]
        const shape = normalizedSections[sectionName]
        for (let index = 0; index < shape.length; index += 1) {
          if (progression.length >= barCount) break
          const isEnd = progression.length === barCount - 1
          let degree = shape[index]

          if (!isEnd && options.variation === 'wild' && random() < 0.12) {
            degree += randItem([-1, 1], random)
          }

          progression.push(degree)
        }
        sectionCursor += 1
      }

      if (repeatReady && strongCadence) {
        progression[progression.length - 1] = progression[0]
      }
      if (progression.length === 0) {
        progression = [0]
      }
    } else {

      const families = rockFamilies[rockFlavor]
      const phraseBarsByMode: Record<RockProgressionMode, number> = {
        auto: barCount >= 12 ? 4 : barCount >= 6 ? 2 : 1,
        'riff-vamp': barCount >= 8 ? 2 : 1,
        'anthem-lift': barCount >= 8 ? 4 : 2,
        'blues-turnaround': 4,
        'prog-suite': barCount >= 12 ? 4 : 2
      }
      const phraseBars = Math.max(1, Math.min(barCount, phraseBarsByMode[rockProgressionMode]))
      const phraseCount = Math.max(1, Math.ceil(barCount / phraseBars))
      const modulationChance = clamp01(0.08 + (variationIntensity - 0.75) * 0.16)
      const rotationChance = clamp01(0.25 + (variationIntensity - 0.75) * 0.18)
      const turnaroundChance = clamp01(0.18 + (variationIntensity - 0.75) * 0.14)
      const progressionMutationChanceByMode: Record<RockProgressionMode, number> = {
        auto: modulationChance,
        'riff-vamp': clamp01(modulationChance * 0.45),
        'anthem-lift': clamp01(modulationChance * 0.85),
        'blues-turnaround': clamp01(modulationChance * 0.55),
        'prog-suite': clamp01(modulationChance * 1.85)
      }

      const cadenceWeightByMode: Record<RockProgressionMode, number> = {
        auto: 0.62,
        'riff-vamp': 0.36,
        'anthem-lift': 0.78,
        'blues-turnaround': 0.82,
        'prog-suite': 0.42
      }

      const familySequenceByMode: Record<RockProgressionMode, Array<'verse' | 'chorus' | 'bridge'>> = {
        auto: ['verse', 'chorus', 'verse', 'bridge'],
        'riff-vamp': ['verse', 'verse', 'chorus', 'verse'],
        'anthem-lift': ['verse', 'chorus', 'chorus', 'bridge'],
        'blues-turnaround': ['verse', 'verse', 'chorus', 'verse'],
        'prog-suite': ['verse', 'bridge', 'chorus', 'bridge']
      }

      const bluesTwelveBar = mode.family === 'major' ? [0, 0, 0, 0, 3, 3, 0, 0, 4, 3, 0, 4] : [0, 0, 0, 0, 3, 3, 0, 0, 4, 3, 0, 5]
      const vampShapes =
        mode.family === 'major'
          ? [[0, 0, 4, 3], [0, 5, 4, 0], [0, 0, 5, 4]]
          : [[0, 0, 5, 4], [0, 6, 5, 4], [0, 0, 4, 5]]

      let lastShapeKey = ''
      progression = []

      for (let phraseIndex = 0; phraseIndex < phraseCount; phraseIndex += 1) {
        const modeFamilyCycle = familySequenceByMode[rockProgressionMode]
        const cycleFamily = modeFamilyCycle[phraseIndex % modeFamilyCycle.length]
        const isBridgeSlot = phraseCount >= 3 && (phraseIndex === phraseCount - 2 || (phraseCount > 4 && phraseIndex % 4 === 2))
        const familyName: keyof RockProgressionFamilies =
          rockProgressionMode === 'auto' ? (isBridgeSlot ? 'bridge' : phraseIndex % 2 === 1 ? 'chorus' : 'verse') : cycleFamily
        const pool = families[familyName] as number[][]
        const modePool =
          rockProgressionMode === 'riff-vamp'
            ? vampShapes
            : rockProgressionMode === 'blues-turnaround'
              ? [bluesTwelveBar.slice(0, 4), bluesTwelveBar.slice(4, 8), bluesTwelveBar.slice(8, 12)]
              : pool
        const candidateShapes = modePool.filter((shape) => shape.join(',') !== lastShapeKey)
        const selectedShape = randItem(candidateShapes.length > 0 ? candidateShapes : modePool, random)
        const rotateBy = selectedShape.length > 1 && random() < rotationChance ? Math.floor(random() * selectedShape.length) : 0
        const shape =
          rotateBy > 0 ? [...selectedShape.slice(rotateBy), ...selectedShape.slice(0, rotateBy)] : [...selectedShape]
        lastShapeKey = selectedShape.join(',')

        for (let barOffset = 0; barOffset < phraseBars; barOffset += 1) {
          if (progression.length >= barCount) break

          const isPhraseEnd = barOffset === phraseBars - 1
          const isSongEnd = progression.length === barCount - 1
          let degree = shape[barOffset % shape.length]

          if (!isSongEnd && !isPhraseEnd && random() < progressionMutationChanceByMode[rockProgressionMode]) {
            degree += randItem([-2, -1, 1, 2], random)
          }

          if ((isPhraseEnd || isSongEnd) && random() < turnaroundChance) {
            degree = randItem(families.turnaround, random)
          }

          if (isSongEnd || (isPhraseEnd && random() < cadenceWeightByMode[rockProgressionMode])) {
            degree = randItem(families.cadenceTargets, random)
          }

          if (rockProgressionMode === 'prog-suite' && random() < 0.24) {
            degree += randItem([-3, -2, 2, 3], random)
          }

          progression.push(degree)
        }
      }

      if (progression.length === 0) {
        progression = [0]
      }
      if (repeatReady && strongCadence) {
        progression[progression.length - 1] = progression[0]
      }
    }
  }

  if (!isRockStyle) {
    const phraseBarsByStyle: Partial<Record<GeneratorStyle, number>> = {
      chiptune: 2,
      techno: 2,
      kpop: 4,
      'sea-shanty': 4,
      celtic: 4,
      'hurdy-gurdy': 4,
      wind: 4,
      piano: 4,
      classical: 4
    }
    const presetStability: Record<GeneratorPreset, number> = {
      balanced: 0.64,
      chill: 0.82,
      upbeat: 0.56,
      dark: 0.62,
      'arp-heavy': 0.5,
      menu: 0.72,
      battle: 0.46,
      background: 0.9,
      cutscene: 0.94
    }
    const phraseBars = Math.max(1, Math.min(barCount, phraseBarsByStyle[options.style] ?? 4))
    const formSectionsByMode: Record<Exclude<SongForm, 'random'>, Array<'A' | 'B' | 'C'>> = {
      auto: ['A', 'B'],
      aaaa: ['A', 'A', 'A', 'A'],
      aab: ['A', 'A', 'B'],
      aabb: ['A', 'A', 'B', 'B'],
      abab: ['A', 'B', 'A', 'B'],
      abba: ['A', 'B', 'B', 'A'],
      aaba: ['A', 'A', 'B', 'A'],
      abcb: ['A', 'B', 'C', 'B']
    }
    const stability = presetStability[options.preset]
    const mutationChance = clamp01((1 - stability) * 0.3 * variationIntensity)
    const cadenceChance = clamp01(0.5 + stability * 0.38 + (repeatReady ? 0.08 : 0))
    const cadenceTargets = mode.family === 'major' ? [0, 4, 5] : [0, 4, 5, 6]
    const source = progression.length > 0 ? progression : [0]
    const sectionLength = Math.max(1, phraseBars)
    const sectionA = source.slice(0, sectionLength)
    const sectionB = source.slice(sectionLength, sectionLength * 2)
    const sectionC = source.slice(sectionLength * 2, sectionLength * 3)
    const sectionMap: Record<'A' | 'B' | 'C', number[]> = {
      A: sectionA.length > 0 ? sectionA : source,
      B: sectionB.length > 0 ? sectionB : sectionA.length > 0 ? sectionA : source,
      C: sectionC.length > 0 ? sectionC : sectionB.length > 0 ? sectionB : sectionA.length > 0 ? sectionA : source
    }
    const formSections = formSectionsByMode[selectedSongForm]
    const shaped: number[] = []

    for (let bar = 0; bar < barCount; bar += 1) {
      const sectionIndex = Math.floor(bar / sectionLength)
      const sectionName = formSections[sectionIndex % formSections.length]
      const sectionPattern = sectionMap[sectionName]
      const degreeIndex = bar % sectionLength
      const isPhraseEnd = (bar + 1) % sectionLength === 0 || bar === barCount - 1
      let degree = sectionPattern[degreeIndex % sectionPattern.length]

      if (!isPhraseEnd && random() < mutationChance) {
        degree += randItem([-1, 1], random)
      }

      if (isPhraseEnd && random() < cadenceChance) {
        degree = randItem(cadenceTargets, random)
      }

      shaped.push(degree)
    }

    progression = shaped

    if (repeatReady && strongCadence) {
      progression[progression.length - 1] = progression[0]
    }
  }

  const firstDegree = progression[0]

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

  const presetFeel: Record<
    GeneratorPreset,
    {
      melodicSurprise: number
      syncopation: number
      jumpiness: number
      smoothness: number
      bassMotion: number
      drumMotif: number
    }
  > = {
    balanced: { melodicSurprise: 0.62, syncopation: 0.56, jumpiness: 0.5, smoothness: 0.54, bassMotion: 0.58, drumMotif: 0.55 },
    upbeat: { melodicSurprise: 0.78, syncopation: 0.74, jumpiness: 0.68, smoothness: 0.42, bassMotion: 0.68, drumMotif: 0.72 },
    chill: { melodicSurprise: 0.32, syncopation: 0.28, jumpiness: 0.2, smoothness: 0.86, bassMotion: 0.3, drumMotif: 0.24 },
    background: {
      melodicSurprise: 0.18,
      syncopation: 0.18,
      jumpiness: 0.12,
      smoothness: 0.92,
      bassMotion: 0.2,
      drumMotif: 0.16
    },
    battle: { melodicSurprise: 0.72, syncopation: 0.76, jumpiness: 0.7, smoothness: 0.38, bassMotion: 0.76, drumMotif: 0.9 },
    menu: { melodicSurprise: 0.42, syncopation: 0.38, jumpiness: 0.34, smoothness: 0.7, bassMotion: 0.4, drumMotif: 0.34 },
    cutscene: {
      melodicSurprise: 0.24,
      syncopation: 0.22,
      jumpiness: 0.16,
      smoothness: 0.9,
      bassMotion: 0.22,
      drumMotif: 0.14
    },
    dark: { melodicSurprise: 0.5, syncopation: 0.44, jumpiness: 0.46, smoothness: 0.58, bassMotion: 0.54, drumMotif: 0.5 },
    'arp-heavy': {
      melodicSurprise: 0.66,
      syncopation: 0.64,
      jumpiness: 0.62,
      smoothness: 0.42,
      bassMotion: 0.6,
      drumMotif: 0.58
    }
  }
  const personality = presetFeel[options.preset]

  let substyleLeadRestMul = 1
  let substyleDrumMul = 1
  let substyleLongMul = 1
  let substyleBassFifthMul = 1
  switch (selectedSubstyle) {
    case 'dance':
    case 'club':
    case 'warehouse':
    case 'arena':
      substyleLeadRestMul = 0.78
      substyleDrumMul = 1.18
      substyleLongMul = 0.78
      substyleBassFifthMul = 1.15
      break
    case 'ballad':
    case 'nocturne':
    case 'air':
    case 'soloist':
      substyleLeadRestMul = 1.16
      substyleDrumMul = 0.72
      substyleLongMul = 1.28
      substyleBassFifthMul = 0.82
      break
    case 'garage':
    case 'work-song':
    case 'reel':
      substyleLeadRestMul = 0.9
      substyleDrumMul = 1.08
      substyleLongMul = 0.9
      substyleBassFifthMul = 1.08
      break
    case 'drone':
    case 'etude':
    case 'sonata':
    case 'minuet':
    case 'narrative':
      substyleLeadRestMul = 1.08
      substyleDrumMul = 0.84
      substyleLongMul = 1.12
      substyleBassFifthMul = 0.92
      break
    default:
      break
  }

  const leadRestChance = Math.max(
    0.02,
    Math.min(0.95, presetLeadRestChance[options.preset] * styleProfile.leadRestMultiplier * substyleLeadRestMul)
  )
  const drumDensity = Math.max(
    0.05,
    Math.min(0.98, presetDrumDensity[options.preset] * styleProfile.drumDensityMultiplier * substyleDrumMul)
  )
  const leadLongNoteChance = Math.max(
    0.05,
    Math.min(0.98, presetLeadLongNoteChance[options.preset] * styleProfile.leadLongMultiplier * substyleLongMul)
  )
  const bassFifthChance = Math.max(
    0.05,
    Math.min(0.95, presetBassFifthChance[options.preset] * styleProfile.bassFifthMultiplier * substyleBassFifthMul)
  )
  const technoFlavorTuning: Record<
    Exclude<TechnoFlavor, 'random'>,
    { hatGhostChance: number; kickGhostChance: number; stabDropChance: number; bassOctaveChance: number; arpDensity: number }
  > = {
    minimal: { hatGhostChance: 0.25, kickGhostChance: 0.28, stabDropChance: 0.34, bassOctaveChance: 0.22, arpDensity: 0.44 },
    melodic: { hatGhostChance: 0.58, kickGhostChance: 0.46, stabDropChance: 0.18, bassOctaveChance: 0.36, arpDensity: 0.68 },
    acid: { hatGhostChance: 0.72, kickGhostChance: 0.6, stabDropChance: 0.26, bassOctaveChance: 0.52, arpDensity: 0.86 },
    industrial: { hatGhostChance: 0.8, kickGhostChance: 0.64, stabDropChance: 0.4, bassOctaveChance: 0.3, arpDensity: 0.8 }
  }
  const technoTuning = technoFlavorTuning[technoFlavor]
  const rockFlavorTuning: Record<
    Exclude<RockFlavor, 'random'>,
    {
      hatPickupChance: number
      bassGallopChance: number
      chordDropChance: number
      soloOrnamentChance: number
      fillEveryBars: number
      soloDensity: number
    }
  > = {
    classic: {
      hatPickupChance: 0.34,
      bassGallopChance: 0.3,
      chordDropChance: 0.22,
      soloOrnamentChance: 0.14,
      fillEveryBars: 4,
      soloDensity: 0.62
    },
    hard: {
      hatPickupChance: 0.44,
      bassGallopChance: 0.48,
      chordDropChance: 0.16,
      soloOrnamentChance: 0.2,
      fillEveryBars: 4,
      soloDensity: 0.74
    },
    'metal-ish': {
      hatPickupChance: 0.52,
      bassGallopChance: 0.64,
      chordDropChance: 0.1,
      soloOrnamentChance: 0.24,
      fillEveryBars: 2,
      soloDensity: 0.84
    },
    'blues-rock': {
      hatPickupChance: 0.38,
      bassGallopChance: 0.24,
      chordDropChance: 0.2,
      soloOrnamentChance: 0.3,
      fillEveryBars: 4,
      soloDensity: 0.68
    }
  }
  const rockTuning = rockFlavorTuning[rockFlavor]
  type RockBassPatternKind = 'drive8' | 'syncopated' | 'space' | 'gallop' | 'octavePush'
  type RockGuitarPatternKind = 'chug16' | 'offbeat8' | 'pushPull' | 'strumWide'
  type RockRuntimeRhythmPattern = Exclude<RockRhythmPattern, 'auto'>
  const weightedRockRhythms: Record<'verse' | 'lift' | 'bridge', Array<{ rhythm: RockRuntimeRhythmPattern; weight: number }>> = {
    // 2000s mainstream/post-grunge tendency: backbeat and push dominate, with occasional halftime and gallop accents.
    verse: [
      { rhythm: 'straight-8ths', weight: 0.24 },
      { rhythm: 'offbeat-push', weight: 0.22 },
      { rhythm: 'punk-drive', weight: 0.14 },
      { rhythm: 'half-time', weight: 0.14 },
      { rhythm: 'sync-16ths', weight: 0.1 },
      { rhythm: 'chug-16ths', weight: 0.1 },
      { rhythm: 'gallop', weight: 0.06 }
    ],
    lift: [
      { rhythm: 'punk-drive', weight: 0.24 },
      { rhythm: 'chug-16ths', weight: 0.2 },
      { rhythm: 'offbeat-push', weight: 0.18 },
      { rhythm: 'straight-8ths', weight: 0.16 },
      { rhythm: 'sync-16ths', weight: 0.12 },
      { rhythm: 'gallop', weight: 0.07 },
      { rhythm: 'half-time', weight: 0.03 }
    ],
    bridge: [
      { rhythm: 'half-time', weight: 0.22 },
      { rhythm: 'offbeat-push', weight: 0.2 },
      { rhythm: 'sync-16ths', weight: 0.16 },
      { rhythm: 'straight-8ths', weight: 0.16 },
      { rhythm: 'punk-drive', weight: 0.12 },
      { rhythm: 'chug-16ths', weight: 0.09 },
      { rhythm: 'gallop', weight: 0.05 }
    ]
  }
  const pickWeightedRhythm = (
    bucket: Array<{ rhythm: RockRuntimeRhythmPattern; weight: number }>,
    disallow: RockRuntimeRhythmPattern | null
  ): RockRuntimeRhythmPattern => {
    const candidates =
      disallow === null
        ? bucket
        : bucket.filter((entry) => entry.rhythm !== disallow)
    const pool = candidates.length > 0 ? candidates : bucket
    const total = pool.reduce((sum, entry) => sum + entry.weight, 0)
    const target = random() * total
    let cursor = 0
    for (const entry of pool) {
      cursor += entry.weight
      if (target <= cursor) return entry.rhythm
    }
    return pool[pool.length - 1].rhythm
  }
  const rockPatternPlan: { bass: RockBassPatternKind[]; guitar: RockGuitarPatternKind[]; rhythm: RockRuntimeRhythmPattern[] } | null = isRockStyle
    ? (() => {
        const forcedBassPatternByRhythm: Partial<Record<RockRhythmPattern, RockBassPatternKind>> = {
          'straight-8ths': 'drive8',
          'offbeat-push': 'syncopated',
          'half-time': 'space',
          'punk-drive': 'drive8',
          'sync-16ths': 'syncopated',
          'chug-16ths': 'octavePush',
          gallop: 'gallop'
        }
        const forcedGuitarPatternByRhythm: Partial<Record<RockRhythmPattern, RockGuitarPatternKind>> = {
          'straight-8ths': 'offbeat8',
          'offbeat-push': 'pushPull',
          'half-time': 'strumWide',
          'punk-drive': 'offbeat8',
          'sync-16ths': 'pushPull',
          'chug-16ths': 'chug16',
          gallop: 'chug16'
        }

        const forcedBass = rockRhythmPattern === 'auto' ? undefined : forcedBassPatternByRhythm[rockRhythmPattern]
        const forcedGuitar = rockRhythmPattern === 'auto' ? undefined : forcedGuitarPatternByRhythm[rockRhythmPattern]
        const sectionBars = barCount >= 12 ? 4 : barCount >= 6 ? 2 : 1
        const bassByBar: RockBassPatternKind[] = []
        const guitarByBar: RockGuitarPatternKind[] = []
        const rhythmByBar: RockRuntimeRhythmPattern[] = []
        let prevBass: RockBassPatternKind | null = null
        let prevGuitar: RockGuitarPatternKind | null = null
        let prevRhythm: RockRuntimeRhythmPattern | null = null

        for (let measure = 0; measure < barCount; measure += 1) {
          const sectionIndex = Math.floor(measure / sectionBars) % 2
          const phraseIndex = Math.floor(measure / Math.max(1, sectionBars))
          const inLift = sectionIndex === 1
          const sectionRole: 'verse' | 'lift' | 'bridge' =
            phraseIndex % 6 === 3 || phraseIndex % 6 === 5 ? 'lift' : phraseIndex % 6 === 4 ? 'bridge' : 'verse'
          const rhythmClass: RockRuntimeRhythmPattern =
            rockRhythmPattern === 'auto'
              ? pickWeightedRhythm(weightedRockRhythms[sectionRole], prevRhythm)
              : (rockRhythmPattern as RockRuntimeRhythmPattern)
          const bassPool: RockBassPatternKind[] =
            rockFlavor === 'metal-ish'
              ? inLift
                ? ['gallop', 'octavePush', 'drive8', 'syncopated']
                : ['octavePush', 'syncopated', 'drive8', 'space']
              : rockFlavor === 'blues-rock'
                ? inLift
                  ? ['drive8', 'syncopated', 'space']
                  : ['space', 'syncopated', 'drive8']
                : inLift
                  ? ['drive8', 'octavePush', 'syncopated', 'space']
                  : ['syncopated', 'space', 'drive8', 'octavePush']
          const guitarPool: RockGuitarPatternKind[] =
            rockFlavor === 'metal-ish'
              ? inLift
                ? ['chug16', 'pushPull', 'offbeat8']
                : ['pushPull', 'offbeat8', 'chug16', 'strumWide']
              : rockFlavor === 'blues-rock'
                ? inLift
                  ? ['strumWide', 'offbeat8', 'pushPull']
                  : ['offbeat8', 'strumWide', 'pushPull']
                : inLift
                  ? ['offbeat8', 'pushPull', 'chug16', 'strumWide']
                  : ['pushPull', 'strumWide', 'offbeat8', 'chug16']

          if (rhythmClass === 'half-time') {
            bassPool.unshift('space')
            guitarPool.unshift('strumWide')
          } else if (rhythmClass === 'gallop' || rhythmClass === 'chug-16ths') {
            bassPool.unshift('gallop', 'octavePush')
            guitarPool.unshift('chug16', 'pushPull')
          }

          const bassCandidates = bassPool.filter((kind) => kind !== prevBass)
          const guitarCandidates = guitarPool.filter((kind) => kind !== prevGuitar)

          let bassPattern = randItem(bassCandidates.length > 0 ? bassCandidates : bassPool, random)
          let guitarPattern = randItem(guitarCandidates.length > 0 ? guitarCandidates : guitarPool, random)

          const rhythmForcedBass = forcedBassPatternByRhythm[rhythmClass]
          const rhythmForcedGuitar = forcedGuitarPatternByRhythm[rhythmClass]
          // Only force on ~30% of bars so the random selection actually gets used
          if ((forcedBass ?? rhythmForcedBass) && measure % 4 === 0 && random() < 0.35) {
            bassPattern = forcedBass ?? rhythmForcedBass ?? bassPattern
          }
          if ((forcedGuitar ?? rhythmForcedGuitar) && measure % 4 === 0 && random() < 0.35) {
            guitarPattern = forcedGuitar ?? rhythmForcedGuitar ?? guitarPattern
          }

          // Keep roles complementary: avoid max-density matches in the same bar.
          if ((bassPattern === 'drive8' || bassPattern === 'gallop') && (guitarPattern === 'chug16' || guitarPattern === 'offbeat8')) {
            const altGuitar = guitarPool.find((kind) => kind !== guitarPattern && kind !== prevGuitar)
            if (altGuitar) guitarPattern = altGuitar
          }
          if (bassPattern === 'space' && guitarPattern === 'strumWide' && random() < 0.65) {
            bassPattern = randItem(['syncopated', 'drive8'], random)
          }

          bassByBar.push(bassPattern)
          guitarByBar.push(guitarPattern)
          rhythmByBar.push(rhythmClass)
          prevBass = bassPattern
          prevGuitar = guitarPattern
          prevRhythm = rhythmClass
        }

        return { bass: bassByBar, guitar: guitarByBar, rhythm: rhythmByBar }
      })()
    : null
  const rockRhythmForBar = (measure: number): RockRuntimeRhythmPattern => {
    if (rockPatternPlan && rockPatternPlan.rhythm[measure]) {
      return rockPatternPlan.rhythm[measure]
    }
    if (rockRhythmPattern === 'auto') return 'straight-8ths'
    return rockRhythmPattern as RockRuntimeRhythmPattern
  }
  const normalizeOffsetsForBar = (offsets: number[]): number[] =>
    offsets
      .filter((offset, index, all) => offset >= 0 && offset < stepsPerMeasure && all.indexOf(offset) === index)
      .sort((a, b) => a - b)
  const mutateRockOffsets = (pattern: number[], measure: number, sixteenth: number): number[] => {
    const next = [...pattern]
    const barMode = measure % 4

    if (barMode === 1 && next.length > 3) {
      next.push(next[Math.floor(next.length / 2)] + sixteenth)
    } else if (barMode === 2 && next.length > 4) {
      next.splice(Math.max(1, Math.floor(next.length * 0.4)), 1)
      next.push(stepsPerMeasure - Math.max(1, sixteenth * 2))
    } else if (barMode === 3) {
      next.push(Math.max(0, quarter * 2 - sixteenth))
      next.push(stepsPerMeasure - Math.max(1, sixteenth))
    }

    if (random() < 0.35 * variationIntensity) {
      next.push(Math.max(0, Math.min(stepsPerMeasure - 1, randItem([quarter - sixteenth, quarter + sixteenth, quarter * 3 - sixteenth], random))))
    }

    return normalizeOffsetsForBar(next)
  }
  const leadTrackIds = song.tracks
    .filter((track, trackIndex) => classifyGeneratorTrackRole(track, trackIndex) === 'lead')
    .map((track) => track.id)

  for (let trackIndex = 0; trackIndex < song.tracks.length; trackIndex += 1) {
    const track = song.tracks[trackIndex]
    const row = nextGrid[track.id]
    let previousLeadDegree: number | null = null
    let previousLeadSemitone: number | null = null
    let defaultLeadMotifSemitones: number[] | null = null
    let defaultLeadMotifRhythm: number[] | null = null
    let rockLeadMotif: number[] | null = null
    let rockLeadRhythm: number[] | null = null
    let previousRockKickPattern: string | null = null
    let previousRockSnarePattern: string | null = null

    if (track.instrument === 'noise' || track.instrument === 'drums') {
      const useRealDrumKit = track.soundSource === 'real' || track.instrument === 'drums'
      if (isRockStyle) {
        for (let measure = 0; measure < barCount; measure += 1) {
          const base = measure * stepsPerMeasure
          const sixteenth = Math.max(1, Math.floor(eighth / 2))
          const sectionBars = barCount >= 8 ? 4 : 2
          const sectionIndex = Math.floor(measure / sectionBars) % 2
          const inLiftSection = sectionIndex === 1

          const kickPatternLibrary: Record<'backbeat' | 'push' | 'driving' | 'half' | 'stutter', number[]> = {
            backbeat: [0, quarter * 2],
            push: [0, quarter + sixteenth, quarter * 2, quarter * 3 + sixteenth],
            driving: [0, quarter, quarter * 2, quarter * 3],
            half: [0, quarter * 2 + eighth],
            stutter: [0, sixteenth, quarter * 2, quarter * 2 + sixteenth, quarter * 3 + eighth]
          }
          const snarePatternLibrary: Record<'backbeat' | 'late4' | 'half' | 'pushGhost', number[]> = {
            backbeat: [quarter, quarter * 3],
            late4: [quarter, quarter * 3 + Math.max(1, Math.floor(sixteenth / 2))],
            half: [quarter * 3],
            pushGhost: [quarter, quarter * 2 + eighth, quarter * 3]
          }
          const barRhythm = rockRhythmForBar(measure)

          const kickPool: Array<keyof typeof kickPatternLibrary> =
            barRhythm === 'half-time'
              ? ['half', 'push']
              : barRhythm === 'gallop' || barRhythm === 'chug-16ths'
                ? ['stutter', 'driving', 'push']
                : inLiftSection
                  ? ['driving', 'push', 'backbeat', 'stutter']
                  : ['backbeat', 'push', 'half', 'driving']
          const snarePool: Array<keyof typeof snarePatternLibrary> =
            barRhythm === 'half-time'
              ? ['half', 'backbeat']
              : inLiftSection
                ? ['backbeat', 'late4', 'pushGhost']
                : ['backbeat', 'pushGhost', 'late4']

          const kickCandidates = kickPool.filter((name) => name !== previousRockKickPattern)
          const snareCandidates = snarePool.filter((name) => name !== previousRockSnarePattern)
          const kickPatternName = randItem(kickCandidates.length > 0 ? kickCandidates : kickPool, random)
          const snarePatternName = randItem(snareCandidates.length > 0 ? snareCandidates : snarePool, random)
          previousRockKickPattern = kickPatternName
          previousRockSnarePattern = snarePatternName

          const kickPattern = mutateRockOffsets(kickPatternLibrary[kickPatternName], measure, sixteenth)
          const snarePattern = mutateRockOffsets(snarePatternLibrary[snarePatternName], measure, Math.max(1, Math.floor(sixteenth / 2)))

          for (const offset of kickPattern) {
            const step = base + offset
            if (step >= song.stepCount) continue
            const velocityBase = offset === 0 ? 116 : 102
            placeGeneratedNote(row, step, 1, useRealDrumKit ? DRUM_PITCHES.kick : track.defaultPitch, velocityBase + Math.floor(random() * 10))
          }
          for (const offset of snarePattern) {
            const step = base + offset
            if (step >= song.stepCount) continue
            const velocityBase = offset === quarter || offset === quarter * 3 ? 100 : 82
            placeGeneratedNote(row, step, 1, useRealDrumKit ? DRUM_PITCHES.snare : track.defaultPitch, velocityBase + Math.floor(random() * 10))
          }

          // Cymbal pattern library — varies feel per bar instead of fixed 8th notes
          const cymbalPatterns = [
            { hits: [0, 1, 2, 3, 4, 5, 6, 7], open: [7] },                     // full 8ths, open at end
            { hits: [0, 2, 4, 6], open: [6] },                                  // quarter notes
            { hits: [0, 1, 2, 3, 4, 5, 6, 7], open: [3, 7] },                  // 8ths with open on ands
            { hits: [0, 2, 3, 4, 6, 7], open: [3, 7] },                        // broken 8ths
            { hits: [0, 1, 3, 4, 5, 7], open: [1, 5] },                        // shuffled push
            { hits: [0, 4], open: [4] },                                         // sparse half
            { hits: [1, 3, 5, 7], open: [3, 7] },                               // all offbeats
            { hits: [0, 1, 2, 4, 5, 6], open: [2, 6] },                        // no beat-4 accent
          ]
          const cymbalWeights =
            barRhythm === 'half-time' ? [0, 2, 0, 0, 0, 3, 0, 0]
            : barRhythm === 'punk-drive' ? [3, 0, 2, 1, 0, 0, 0, 0]
            : barRhythm === 'chug-16ths' || barRhythm === 'gallop' ? [2, 0, 1, 2, 1, 0, 0, 1]
            : inLiftSection ? [2, 0, 2, 1, 1, 0, 1, 0]
            : [2, 1, 1, 1, 1, 0, 1, 1]
          const useRideForBar = rockFlavor === 'classic' ? sectionIndex === 1 : rockFlavor === 'metal-ish'

          // Weighted pick
          const cymbalTotal = cymbalWeights.reduce((s, w) => s + w, 0)
          let cymbalTarget = random() * cymbalTotal
          let cymbalIdx = 0
          for (let ci = 0; ci < cymbalWeights.length; ci++) {
            cymbalTarget -= cymbalWeights[ci]
            if (cymbalTarget <= 0) { cymbalIdx = ci; break }
          }
          const cymbalPattern = cymbalPatterns[cymbalIdx]

          for (const pos of cymbalPattern.hits) {
            const step = base + pos * eighth
            if (step >= song.stepCount) continue
            const isOpen = cymbalPattern.open.includes(pos)
            const accented = pos % 2 === 0
            const velocity = accented ? 82 + Math.floor(random() * 14) : 56 + Math.floor(random() * 12)
            const cymbalPitch = useRideForBar ? DRUM_PITCHES.ride : isOpen ? DRUM_PITCHES.openHat : DRUM_PITCHES.closedHat
            placeGeneratedNote(row, step, 1, useRealDrumKit ? cymbalPitch : track.defaultPitch, velocity)
          }

          // Occasional pickup kick before the next bar.
          if (random() < rockTuning.hatPickupChance) {
            const pickupStep = Math.min(song.stepCount - 1, base + stepsPerMeasure - Math.max(1, Math.floor(eighth / 2)))
            placeGeneratedNote(row, pickupStep, 1, useRealDrumKit ? DRUM_PITCHES.crash : track.defaultPitch, 86)
          }
        }
        continue
      }

      if (isTechnoStyle) {
        const sixteenth = Math.max(1, Math.floor(eighth / 2))
        // Techno groove templates — hat offsets, open positions, clap offsets, hit density
        const technoGrooves = [
          { hat: [1, 3, 5, 7], open: [5], clap: [2, 6], density: 1.0 },                          // classic offbeat
          { hat: [0, 1, 2, 3, 4, 5, 6, 7], open: [3, 7], clap: [2, 6], density: 0.7 },           // 8th driving
          { hat: [1, 5], open: [5], clap: [4], density: 1.0 },                                    // minimal sparse
          { hat: [1, 3, 5, 7], open: [7], clap: [2], density: 1.0 },                              // broken — clap on 2 only
          { hat: [0, 2, 4, 6], open: [2, 6], clap: [2, 6], density: 1.0 },                        // on-beat hats
          { hat: [0, 1, 3, 4, 5, 7], open: [3, 7], clap: [2, 5], density: 0.8 },                  // shuffled swoop
          { hat: [1, 2, 3, 5, 6, 7], open: [3, 7], clap: [2, 6], density: 0.75 },                 // rolling
          { hat: [0, 3, 4, 7], open: [0, 4], clap: [2, 6], density: 1.0 },                        // industrial pulse
        ]
        const technoGrooveWeights =
          technoFlavor === 'minimal' ? [3, 0, 3, 2, 0, 0, 0, 0]
          : technoFlavor === 'melodic' ? [2, 2, 1, 1, 1, 2, 1, 0]
          : technoFlavor === 'acid' ? [1, 2, 0, 1, 0, 2, 2, 1]
          : /* industrial */ [0, 1, 0, 1, 1, 0, 1, 4]
        let prevTechnoGroove = -1

        for (let measure = 0; measure < barCount; measure += 1) {
          const base = measure * stepsPerMeasure
          // Pick groove — change every 2 bars
          const isNewPhrase = measure % 2 === 0
          let tGrooveIdx: number
          if (isNewPhrase || prevTechnoGroove < 0) {
            const totalW = technoGrooveWeights.reduce((sum, w, i) => sum + (i === prevTechnoGroove ? 0 : w), 0)
            if (totalW <= 0) {
              tGrooveIdx = Math.floor(random() * technoGrooves.length)
            } else {
              let target = random() * totalW
              tGrooveIdx = 0
              for (let i = 0; i < technoGrooveWeights.length; i++) {
                if (i === prevTechnoGroove) continue
                target -= technoGrooveWeights[i]
                if (target <= 0) { tGrooveIdx = i; break }
              }
            }
            prevTechnoGroove = tGrooveIdx
          } else {
            tGrooveIdx = prevTechnoGroove
          }
          const tGroove = technoGrooves[tGrooveIdx]

          // Hats
          for (const pos of tGroove.hat) {
            const step = base + pos * eighth
            if (step >= song.stepCount) continue
            if (random() > tGroove.density) continue
            const isOpen = tGroove.open.includes(pos)
            const vel = isOpen ? 74 + Math.floor(random() * 12) : 66 + Math.floor(random() * 10)
            placeGeneratedNote(row, step, 1, useRealDrumKit ? (isOpen ? DRUM_PITCHES.openHat : DRUM_PITCHES.closedHat) : track.defaultPitch, vel)
          }

          // 16th ghost hats on energetic bars
          if (random() < technoTuning.hatGhostChance) {
            const ghostOffsets = [sixteenth * 3, sixteenth * 7, sixteenth * 11, sixteenth * 15]
            for (const offset of ghostOffsets) {
              const step = base + offset
              if (step >= song.stepCount) continue
              if (random() < 0.6) {
                placeGeneratedNote(row, step, 1, useRealDrumKit ? DRUM_PITCHES.closedHat : track.defaultPitch, 48 + Math.floor(random() * 12))
              }
            }
          }

          // Clap/snare
          for (const pos of tGroove.clap) {
            const step = base + pos * eighth
            if (step >= song.stepCount) continue
            placeGeneratedNote(row, step, Math.max(1, Math.floor(eighth / 2)), useRealDrumKit ? DRUM_PITCHES.snare : track.defaultPitch, 94 + Math.floor(random() * 8))
          }

          if (repeatReady && measure === barCount - 1) {
            const pickupStep = Math.min(song.stepCount - 1, base + stepsPerMeasure - Math.max(1, sixteenth * 2))
            placeGeneratedNote(row, pickupStep, 1, useRealDrumKit ? DRUM_PITCHES.crash : track.defaultPitch, strongCadence ? 86 : 62)
          }
        }
        continue
      }

      // Groove library — each template uses 8th-note positions 0..7 within a bar
      const drumGrooves = [
        { kick: [0, 4], snare: [2, 6], hat: [0, 1, 2, 3, 4, 5, 6, 7], openHat: [7] },          // standard rock
        { kick: [0, 3, 4], snare: [2, 6], hat: [0, 1, 2, 3, 4, 5, 6, 7], openHat: [3, 7] },    // pop-punk push
        { kick: [0, 2, 4, 6], snare: [2, 6], hat: [1, 3, 5, 7], openHat: [5] },                 // disco/dance
        { kick: [0, 4], snare: [4], hat: [0, 2, 4, 6], openHat: [6] },                          // half-time
        { kick: [0, 3, 6], snare: [2, 7], hat: [0, 1, 2, 3, 4, 5, 6, 7], openHat: [3, 7] },    // funk
        { kick: [0, 5], snare: [2, 6], hat: [0, 1, 2, 3, 4, 5, 6, 7], openHat: [5] },          // breakbeat
        { kick: [0], snare: [4], hat: [0, 4], openHat: [] as number[] },                         // sparse
        { kick: [0, 1, 4, 5], snare: [2, 6], hat: [0, 2, 4, 6], openHat: [] as number[] },      // double-kick drive
        { kick: [0, 4, 6], snare: [2, 5], hat: [0, 1, 2, 3, 4, 5, 6, 7], openHat: [1, 5] },    // syncopated
        { kick: [0, 2, 4], snare: [6], hat: [0, 2, 4, 6], openHat: [2] }                        // march
      ]
      const grooveWeights: Record<GeneratorPreset, number[]> = {
        balanced:   [3, 2, 1, 1, 1, 2, 0, 1, 1, 1],
        chill:      [1, 0, 0, 3, 0, 0, 3, 0, 0, 0],
        upbeat:     [2, 3, 2, 0, 2, 1, 0, 2, 1, 0],
        dark:       [2, 0, 0, 2, 0, 2, 1, 0, 1, 1],
        'arp-heavy':[1, 1, 2, 0, 1, 1, 0, 3, 1, 0],
        menu:       [2, 0, 0, 2, 0, 0, 3, 0, 0, 1],
        battle:     [1, 2, 1, 0, 2, 2, 0, 3, 1, 0],
        background: [1, 0, 0, 2, 0, 0, 4, 0, 0, 0],
        cutscene:   [0, 0, 0, 1, 0, 0, 4, 0, 0, 0]
      }
      const gWeights = grooveWeights[options.preset]
      let prevGrooveIdx = -1

      for (let measure = 0; measure < barCount; measure += 1) {
        const base = measure * stepsPerMeasure

        // Pick groove — change every 2 bars like real songs, with anti-repeat
        const isNewPhrase = measure % 2 === 0
        let grooveIdx: number
        if (isNewPhrase || prevGrooveIdx < 0) {
          const totalW = gWeights.reduce((sum, w, i) => sum + (i === prevGrooveIdx ? 0 : w), 0)
          if (totalW <= 0) {
            grooveIdx = Math.floor(random() * drumGrooves.length)
          } else {
            let target = random() * totalW
            grooveIdx = 0
            for (let i = 0; i < gWeights.length; i++) {
              if (i === prevGrooveIdx) continue
              target -= gWeights[i]
              if (target <= 0) { grooveIdx = i; break }
            }
          }
          prevGrooveIdx = grooveIdx
        } else {
          grooveIdx = prevGrooveIdx
        }
        const groove = drumGrooves[grooveIdx]

        for (const pos of groove.kick) {
          const step = base + pos * eighth
          if (step >= song.stepCount) continue
          placeGeneratedNote(row, step, 1, useRealDrumKit ? DRUM_PITCHES.kick : track.defaultPitch, pos === 0 ? 115 : 100 + Math.floor(random() * 14))
        }

        for (const pos of groove.snare) {
          const step = base + pos * eighth
          if (step >= song.stepCount) continue
          placeGeneratedNote(row, step, 1, useRealDrumKit ? DRUM_PITCHES.snare : track.defaultPitch, 86 + Math.floor(random() * 14))
        }

        for (const pos of groove.hat) {
          const step = base + pos * eighth
          if (step >= song.stepCount) continue
          if (random() > drumDensity + 0.15) continue
          const isOpen = groove.openHat.includes(pos)
          const cymbal = isOpen ? DRUM_PITCHES.openHat : DRUM_PITCHES.closedHat
          const vel = isOpen ? 72 + Math.floor(random() * 12) : 60 + Math.floor(random() * 14)
          placeGeneratedNote(row, step, 1, useRealDrumKit ? cymbal : track.defaultPitch, vel)
        }

        // Ghost snare for groove depth
        if (random() < personality.syncopation * 0.55) {
          const ghostCandidates = [1, 3, 5, 7].filter((p) => !groove.snare.includes(p) && !groove.kick.includes(p))
          if (ghostCandidates.length > 0) {
            const ghostPos = randItem(ghostCandidates, random)
            const step = base + ghostPos * eighth
            if (step < song.stepCount) {
              placeGeneratedNote(row, step, 1, useRealDrumKit ? DRUM_PITCHES.snare : track.defaultPitch, 44 + Math.floor(random() * 16))
            }
          }
        }

        if (repeatReady && measure === barCount - 1) {
          const pickupStep = Math.min(song.stepCount - 1, base + stepsPerMeasure - Math.max(1, eighth))
          placeGeneratedNote(row, pickupStep, 1, useRealDrumKit ? DRUM_PITCHES.crash : track.defaultPitch, strongCadence ? 84 : 56)

          if (strongCadence) {
            const sixteenth = Math.max(1, Math.floor(eighth / 2))
            const fillOffsets = [stepsPerMeasure - sixteenth * 3, stepsPerMeasure - sixteenth * 2, stepsPerMeasure - sixteenth]
            for (const offset of fillOffsets) {
              const fillStep = base + offset
              if (fillStep >= base && fillStep < song.stepCount) {
                placeGeneratedNote(row, fillStep, 1, useRealDrumKit ? DRUM_PITCHES.tomMid : track.defaultPitch, 86)
              }
            }
          } else {
            // Ambient loops keep the seam subtle: lightly thin the very end of the bar.
            const muteStep = Math.min(song.stepCount - 1, base + stepsPerMeasure - Math.max(1, Math.floor(eighth / 2)))
            row[muteStep] = null
          }
        }
      }
      continue
    }

    if (track.instrument === 'membrane' || track.instrument === 'metal') {
      const useRealDrumKit = track.soundSource === 'real'
      if (isRockStyle && track.instrument === 'membrane') {
        for (let measure = 0; measure < barCount; measure += 1) {
          const base = measure * stepsPerMeasure
          const barsPerFill = Math.max(2, rockTuning.fillEveryBars)
          const isPhraseEnd = measure % barsPerFill === barsPerFill - 1 || measure === barCount - 1
          if (!isPhraseEnd) continue

          // Tom fill at phrase boundaries for hard-rock momentum.
          const sixteenth = Math.max(1, Math.floor(eighth / 2))
          const fillOffsets = [stepsPerMeasure - sixteenth * 4, stepsPerMeasure - sixteenth * 3, stepsPerMeasure - sixteenth * 2, stepsPerMeasure - sixteenth]
          const fillPitches = useRealDrumKit
            ? [DRUM_PITCHES.tomHigh, DRUM_PITCHES.tomMid, DRUM_PITCHES.tomLow, DRUM_PITCHES.kick]
            : [track.defaultPitch + 7, track.defaultPitch + 4, track.defaultPitch + 2, track.defaultPitch]
          for (let index = 0; index < fillOffsets.length; index += 1) {
            const step = base + fillOffsets[index]
            if (step >= base && step < song.stepCount) {
              placeGeneratedNote(row, step, 1, fillPitches[index], 92 + index * 4)
            }
          }
        }
        continue
      }

      if (isTechnoStyle && track.instrument === 'membrane') {
        for (let measure = 0; measure < barCount; measure += 1) {
          const base = measure * stepsPerMeasure

          // Four-on-the-floor kick pattern.
          for (let beat = 0; beat < 4; beat += 1) {
            const step = base + beat * quarter
            if (step >= song.stepCount) continue
            const velocity = beat === 0 ? 122 : 112 + Math.floor(random() * 6)
            placeGeneratedNote(row, step, Math.max(1, Math.floor(eighth / 2)), useRealDrumKit ? DRUM_PITCHES.kick : track.defaultPitch, velocity)
          }

          // Light syncopated ghost kick gives propulsion.
          if (random() < technoTuning.kickGhostChance) {
            const ghostStep = base + quarter * 3 + Math.max(1, Math.floor(eighth / 2))
            if (ghostStep < song.stepCount) {
              placeGeneratedNote(row, ghostStep, 1, useRealDrumKit ? DRUM_PITCHES.kick : track.defaultPitch, 74 + Math.floor(random() * 10))
            }
          }

          if (repeatReady && measure === barCount - 1) {
            const sixteenth = Math.max(1, Math.floor(eighth / 2))
            const fillOffsets = [stepsPerMeasure - sixteenth * 3, stepsPerMeasure - sixteenth * 2, stepsPerMeasure - sixteenth]
            for (const offset of fillOffsets) {
              const fillStep = base + offset
              if (fillStep >= base && fillStep < song.stepCount) {
                placeGeneratedNote(row, fillStep, 1, useRealDrumKit ? DRUM_PITCHES.tomMid : track.defaultPitch, 92)
              }
            }
          }
        }
        continue
      }

      for (let measure = 0; measure < barCount; measure += 1) {
        const base = measure * stepsPerMeasure
        placeGeneratedNote(row, base, 1, useRealDrumKit ? DRUM_PITCHES.kick : track.defaultPitch, 110)
        placeGeneratedNote(
          row,
          base + quarter * 2,
          1,
          useRealDrumKit ? DRUM_PITCHES.tomLow : track.defaultPitch + (track.instrument === 'metal' ? 12 : 0),
          102
        )

        const offbeatChance = Math.max(0.12, drumDensity * 0.65)
        for (let hit = 1; hit < 8; hit += 2) {
          const step = base + hit * eighth
          if (step >= song.stepCount) continue
          if (random() < offbeatChance) {
            placeGeneratedNote(
              row,
              step,
              1,
              useRealDrumKit ? DRUM_PITCHES.closedHat : track.defaultPitch + (track.instrument === 'metal' ? 7 : 0),
              84
            )
          }
        }
      }
      continue
    }

    const role = classifyGeneratorTrackRole(track, trackIndex)
    let previousRockBassPattern: string | null = null
    let previousRockRhythmPattern: string | null = null

    for (let measure = 0; measure < barCount; measure += 1) {
      const degree = repeatReady && strongCadence && measure === barCount - 1 ? firstDegree : progression[measure % progression.length]
      const base = measure * stepsPerMeasure
      const chordDegrees =
        selectedChordStructure === 'power'
          ? [degree, degree + 4, degree + 7]
          : selectedChordStructure === 'seventh'
            ? [degree, degree + 2, degree + 4, degree + 6]
            : selectedChordStructure === 'sus2'
              ? [degree, degree + 1, degree + 4]
              : selectedChordStructure === 'sus4'
                ? [degree, degree + 3, degree + 4]
                : [degree, degree + 2, degree + 4]
      const chordSemitones = chordDegrees.map((value) => degreeSemitone(mode.scale, value))

      if (role === 'drone') {
        const droneRoot = clampMidi((styleProfile.bassOctave + 1) * 12 + keyRoot + degreeSemitone(mode.scale, 0))
        const droneFifth = clampMidi(droneRoot + 7)
        placeGeneratedNote(row, base, Math.max(1, stepsPerMeasure), droneRoot, 92)

        const pulseLength = Math.max(1, Math.floor(eighth / 2))
        for (let pulse = 0; pulse < 4; pulse += 1) {
          const pulseStep = base + pulse * quarter
          if (pulseStep >= song.stepCount) continue
          if (random() < (isHurdyStyle ? 0.9 : 0.62)) {
            const pulsePitch = pulse % 2 === 0 ? droneRoot : droneFifth
            placeGeneratedNote(row, pulseStep, pulseLength, pulsePitch, 82)
          }
        }

        if (repeatReady && measure === barCount - 1) {
          const pickupStep = Math.min(song.stepCount - 1, base + stepsPerMeasure - Math.max(1, eighth))
          placeGeneratedNote(row, pickupStep, Math.max(1, Math.floor(eighth / 2)), droneRoot, strongCadence ? 86 : 72)
        }
        continue
      }

      if (role === 'bass') {
        if (isWindStyle) {
          const bassRoot = clampMidi((styleProfile.bassOctave + 1) * 12 + keyRoot + degreeSemitone(mode.scale, degree))
          const bassFifth = clampMidi(bassRoot + 7)
          const bassThirdW = clampMidi((styleProfile.bassOctave + 1) * 12 + keyRoot + degreeSemitone(mode.scale, degree + 2))
          const bassApproach = clampMidi((styleProfile.bassOctave + 1) * 12 + keyRoot + degreeSemitone(mode.scale, degree - 1))
          const phraseLength = Math.max(1, quarter * 2)

          // Wind bass variety — not just root-root every bar
          const windBassKind = randItem(['sustain', 'half', 'walking', 'arpeggio', 'sparse'], random)
          if (windBassKind === 'sustain') {
            placeGeneratedNote(row, base, phraseLength * 2, bassRoot, 88)
          } else if (windBassKind === 'half') {
            placeGeneratedNote(row, base, phraseLength, bassRoot, 88)
            placeGeneratedNote(row, base + phraseLength, phraseLength, random() < 0.45 ? bassFifth : bassRoot, 84)
          } else if (windBassKind === 'walking') {
            placeGeneratedNote(row, base, Math.max(1, quarter), bassRoot, 88)
            placeGeneratedNote(row, base + quarter, Math.max(1, quarter), bassThirdW, 82)
            placeGeneratedNote(row, base + quarter * 2, Math.max(1, quarter), bassFifth, 86)
            placeGeneratedNote(row, base + quarter * 3, Math.max(1, quarter), bassApproach, 80)
          } else if (windBassKind === 'arpeggio') {
            placeGeneratedNote(row, base, Math.max(1, quarter), bassRoot, 88)
            placeGeneratedNote(row, base + quarter, Math.max(1, quarter), bassFifth, 82)
            placeGeneratedNote(row, base + quarter * 2, Math.max(1, quarter), clampMidi(bassRoot + 12), 84)
            placeGeneratedNote(row, base + quarter * 3, Math.max(1, quarter), bassFifth, 80)
          } else {
            // sparse
            placeGeneratedNote(row, base, phraseLength, bassRoot, 88)
            if (random() < 0.5) {
              placeGeneratedNote(row, base + quarter * 3, Math.max(1, quarter), bassFifth, 78)
            }
          }

          // Light approach notes strengthen phrase boundaries without crowding the line.
          if (random() < 0.42) {
            const pickup = base + stepsPerMeasure - Math.max(1, Math.floor(eighth / 2))
            if (pickup < song.stepCount) {
              placeGeneratedNote(row, pickup, 1, bassApproach, 72)
            }
          }
          continue
        }

        if (isRockStyle) {
          const bassRoot = clampMidi((styleProfile.bassOctave + 1) * 12 + keyRoot + chordSemitones[0])
          const bassFifth = clampMidi(bassRoot + 7)
          const bassThird = clampMidi(bassRoot + (chordSemitones.length > 1 ? chordSemitones[1] : 3))
          const bassOctave = clampMidi(bassRoot + 12)
          const bassSeventh = clampMidi(bassRoot + 10)
          const sixteenth = Math.max(1, Math.floor(eighth / 2))

          // Look ahead to next chord for approach notes
          const nextDegree = progression[(measure + 1) % progression.length]
          const nextChordRoot = clampMidi((styleProfile.bassOctave + 1) * 12 + keyRoot + degreeSemitone(mode.scale, nextDegree))
          const approachNote = clampMidi(nextChordRoot - 1) // chromatic approach from below
          const approachAbove = clampMidi(nextChordRoot + 1) // chromatic approach from above

          // ─── Rock bass groove library ───
          // Each groove defines WHAT to play, not just WHEN
          type BassEvent = { offset: number; pitch: number; len: number; vel: number }
          const grooves: BassEvent[][] = [
            // 0: Root-fifth pump — classic rock
            [
              { offset: 0, pitch: bassRoot, len: Math.max(1, quarter), vel: 106 },
              { offset: quarter, pitch: bassFifth, len: Math.max(1, quarter), vel: 94 },
              { offset: quarter * 2, pitch: bassRoot, len: Math.max(1, quarter), vel: 102 },
              { offset: quarter * 3, pitch: bassFifth, len: Math.max(1, quarter), vel: 90 },
            ],
            // 1: Driving 8ths with octave accent
            [
              { offset: 0, pitch: bassRoot, len: Math.max(1, eighth), vel: 108 },
              { offset: eighth, pitch: bassRoot, len: Math.max(1, eighth), vel: 88 },
              { offset: quarter, pitch: bassOctave, len: Math.max(1, eighth), vel: 96 },
              { offset: quarter + eighth, pitch: bassRoot, len: Math.max(1, eighth), vel: 86 },
              { offset: quarter * 2, pitch: bassFifth, len: Math.max(1, eighth), vel: 100 },
              { offset: quarter * 2 + eighth, pitch: bassFifth, len: Math.max(1, eighth), vel: 84 },
              { offset: quarter * 3, pitch: bassRoot, len: Math.max(1, eighth), vel: 98 },
              { offset: quarter * 3 + eighth, pitch: bassOctave, len: Math.max(1, eighth), vel: 82 },
            ],
            // 2: Walking bass — root, third, fifth, approach to next chord
            [
              { offset: 0, pitch: bassRoot, len: Math.max(1, quarter), vel: 104 },
              { offset: quarter, pitch: bassThird, len: Math.max(1, quarter), vel: 92 },
              { offset: quarter * 2, pitch: bassFifth, len: Math.max(1, quarter), vel: 96 },
              { offset: quarter * 3, pitch: approachNote, len: Math.max(1, quarter), vel: 94 },
            ],
            // 3: Syncopated groove — offbeat emphasis
            [
              { offset: 0, pitch: bassRoot, len: Math.max(1, eighth), vel: 108 },
              { offset: quarter + eighth, pitch: bassFifth, len: Math.max(1, eighth), vel: 96 },
              { offset: quarter * 2, pitch: bassRoot, len: Math.max(1, quarter), vel: 100 },
              { offset: quarter * 3 + eighth, pitch: bassOctave, len: Math.max(1, eighth), vel: 92 },
            ],
            // 4: Sparse power — let it breathe, big sustained notes
            [
              { offset: 0, pitch: bassRoot, len: Math.max(1, quarter * 2), vel: 110 },
              { offset: quarter * 3, pitch: bassFifth, len: Math.max(1, quarter), vel: 94 },
            ],
            // 5: Gallop / metal triplet feel
            [
              { offset: 0, pitch: bassRoot, len: Math.max(1, sixteenth), vel: 110 },
              { offset: sixteenth, pitch: bassRoot, len: Math.max(1, sixteenth), vel: 86 },
              { offset: eighth, pitch: bassFifth, len: Math.max(1, sixteenth), vel: 92 },
              { offset: quarter, pitch: bassRoot, len: Math.max(1, sixteenth), vel: 108 },
              { offset: quarter + sixteenth, pitch: bassRoot, len: Math.max(1, sixteenth), vel: 84 },
              { offset: quarter + eighth, pitch: bassOctave, len: Math.max(1, sixteenth), vel: 94 },
              { offset: quarter * 2, pitch: bassRoot, len: Math.max(1, sixteenth), vel: 106 },
              { offset: quarter * 2 + sixteenth, pitch: bassFifth, len: Math.max(1, sixteenth), vel: 88 },
              { offset: quarter * 2 + eighth, pitch: bassRoot, len: Math.max(1, sixteenth), vel: 90 },
              { offset: quarter * 3, pitch: bassRoot, len: Math.max(1, sixteenth), vel: 104 },
              { offset: quarter * 3 + sixteenth, pitch: bassRoot, len: Math.max(1, sixteenth), vel: 82 },
              { offset: quarter * 3 + eighth, pitch: bassFifth, len: Math.max(1, sixteenth), vel: 90 },
            ],
            // 6: Root-octave bounce — punk/pop-punk energy
            [
              { offset: 0, pitch: bassRoot, len: Math.max(1, eighth), vel: 108 },
              { offset: eighth, pitch: bassOctave, len: Math.max(1, eighth), vel: 92 },
              { offset: quarter, pitch: bassRoot, len: Math.max(1, eighth), vel: 104 },
              { offset: quarter + eighth, pitch: bassOctave, len: Math.max(1, eighth), vel: 88 },
              { offset: quarter * 2, pitch: bassFifth, len: Math.max(1, eighth), vel: 100 },
              { offset: quarter * 2 + eighth, pitch: bassOctave, len: Math.max(1, eighth), vel: 86 },
              { offset: quarter * 3, pitch: bassRoot, len: Math.max(1, quarter), vel: 102 },
            ],
            // 7: Chromatic walk-up — tension builder
            [
              { offset: 0, pitch: bassRoot, len: Math.max(1, quarter), vel: 106 },
              { offset: quarter, pitch: clampMidi(bassRoot + 2), len: Math.max(1, quarter), vel: 94 },
              { offset: quarter * 2, pitch: clampMidi(bassRoot + 4), len: Math.max(1, quarter), vel: 98 },
              { offset: quarter * 3, pitch: approachNote, len: Math.max(1, quarter), vel: 100 },
            ],
            // 8: Stop-start — silence creates impact
            [
              { offset: 0, pitch: bassRoot, len: Math.max(1, eighth), vel: 112 },
              { offset: quarter * 2, pitch: bassRoot, len: Math.max(1, eighth), vel: 108 },
              { offset: quarter * 2 + eighth, pitch: bassFifth, len: Math.max(1, eighth), vel: 96 },
              { offset: quarter * 3, pitch: bassOctave, len: Math.max(1, eighth), vel: 100 },
            ],
            // 9: Descending run — R, b7, 5, approach
            [
              { offset: 0, pitch: bassOctave, len: Math.max(1, quarter), vel: 106 },
              { offset: quarter, pitch: bassSeventh, len: Math.max(1, quarter), vel: 96 },
              { offset: quarter * 2, pitch: bassFifth, len: Math.max(1, quarter), vel: 100 },
              { offset: quarter * 3, pitch: approachNote, len: Math.max(1, quarter), vel: 94 },
            ],
            // 10: Staccato pulse — tight muted feel
            [
              { offset: 0, pitch: bassRoot, len: Math.max(1, sixteenth), vel: 104 },
              { offset: quarter, pitch: bassRoot, len: Math.max(1, sixteenth), vel: 100 },
              { offset: quarter + eighth, pitch: bassFifth, len: Math.max(1, sixteenth), vel: 88 },
              { offset: quarter * 2, pitch: bassRoot, len: Math.max(1, sixteenth), vel: 102 },
              { offset: quarter * 3, pitch: bassRoot, len: Math.max(1, sixteenth), vel: 98 },
              { offset: quarter * 3 + eighth, pitch: approachAbove, len: Math.max(1, sixteenth), vel: 86 },
            ],
          ]

          // Weight grooves by flavor and section
          const sectionBars = barCount >= 8 ? 4 : 2
          const inLift = Math.floor(measure / sectionBars) % 2 === 1
          const grooveWeights =
            rockFlavor === 'metal-ish'
              ? inLift
                ? [1, 3, 0, 2, 0, 4, 2, 1, 2, 1, 2] // gallop+driving in lifts
                : [2, 2, 1, 2, 1, 2, 1, 2, 3, 2, 2]
              : rockFlavor === 'blues-rock'
                ? inLift
                  ? [3, 1, 3, 2, 1, 0, 1, 2, 1, 3, 0] // walking+root-fifth in lifts
                  : [2, 1, 3, 1, 2, 0, 1, 2, 2, 3, 1]
                : inLift
                  ? [2, 3, 1, 2, 1, 1, 3, 1, 2, 1, 2] // driving+bounce in lifts
                  : [3, 1, 2, 2, 2, 1, 1, 1, 2, 2, 1]

          // Weighted pick with anti-repeat
          const prevIdx = previousRockBassPattern !== null ? parseInt(previousRockBassPattern) : -1
          const adjustedWeights = grooveWeights.map((w, i) => i === prevIdx ? 0 : w)
          const total = adjustedWeights.reduce((s, w) => s + w, 0)
          let target = random() * total
          let grooveIdx = 0
          for (let gi = 0; gi < adjustedWeights.length; gi++) {
            target -= adjustedWeights[gi]
            if (target <= 0) { grooveIdx = gi; break }
          }
          previousRockBassPattern = String(grooveIdx)

          const groove = grooves[grooveIdx]
          for (const ev of groove) {
            const step = base + ev.offset
            if (step >= song.stepCount) continue
            // Slight velocity humanization
            const vel = Math.max(60, Math.min(127, ev.vel + Math.floor(random() * 10) - 5))
            placeGeneratedNote(row, step, ev.len, ev.pitch, vel)
          }

          if (repeatReady && measure === barCount - 1) {
            const pickupStep = Math.min(song.stepCount - 1, base + stepsPerMeasure - Math.max(1, Math.floor(eighth / 2)))
            placeGeneratedNote(row, pickupStep, 1, bassRoot, strongCadence ? 104 : 84)
          }
          continue
        }

        if (isTechnoStyle) {
          const bassRoot = clampMidi((styleProfile.bassOctave + 1) * 12 + keyRoot + degreeSemitone(mode.scale, degree))
          const bassFifth = clampMidi(bassRoot + 7)
          const bassOctave = clampMidi(bassRoot + 12)
          const bassApproach = clampMidi(bassRoot - 2)

          // Techno bass pattern library — varies per bar
          const technoBassPatterns: { hits: number[]; pitchFn: (i: number) => number }[] = [
            { hits: [0, eighth * 2, quarter * 2 + eighth, quarter * 3], pitchFn: (i) => i === 2 && random() < technoTuning.bassOctaveChance ? bassOctave : i === 3 && random() < 0.55 ? bassFifth : bassRoot },
            { hits: [0, eighth, eighth * 2, quarter * 2, quarter * 2 + eighth, quarter * 3], pitchFn: (i) => i % 3 === 2 ? bassFifth : bassRoot },
            { hits: [0, quarter, quarter * 2, quarter * 3], pitchFn: (i) => i === 1 ? bassFifth : i === 3 ? bassApproach : bassRoot },
            { hits: [0, eighth, quarter + eighth, quarter * 2, quarter * 3 + eighth], pitchFn: (i) => i === 2 ? bassOctave : i === 4 ? bassFifth : bassRoot },
            { hits: [0, quarter * 2], pitchFn: () => bassRoot },
            { hits: [0, eighth, quarter, quarter + eighth, quarter * 2, quarter * 2 + eighth, quarter * 3, quarter * 3 + eighth], pitchFn: (i) => i % 2 === 1 ? bassOctave : bassRoot },
            { hits: [eighth, quarter + eighth, quarter * 2 + eighth, quarter * 3 + eighth], pitchFn: (i) => i === 1 ? bassFifth : i === 3 ? bassApproach : bassRoot },
          ]
          const technoBassWeights =
            technoFlavor === 'minimal' ? [1, 0, 2, 0, 3, 0, 1]
            : technoFlavor === 'acid' ? [1, 2, 0, 2, 0, 2, 1]
            : technoFlavor === 'industrial' ? [2, 1, 1, 1, 0, 2, 0]
            : [2, 1, 1, 1, 1, 1, 1] // melodic
          const tbTotal = technoBassWeights.reduce((s, w) => s + w, 0)
          let tbTarget = random() * tbTotal
          let tbIdx = 0
          for (let bi = 0; bi < technoBassWeights.length; bi++) {
            tbTarget -= technoBassWeights[bi]
            if (tbTarget <= 0) { tbIdx = bi; break }
          }
          const technoBass = technoBassPatterns[tbIdx]
          const length = Math.max(1, Math.floor(eighth * 1.5))

          for (let index = 0; index < technoBass.hits.length; index += 1) {
            const step = base + technoBass.hits[index]
            if (step >= song.stepCount) continue
            const pitch = technoBass.pitchFn(index)
            const velocity = 94 + Math.floor(random() * 14)
            placeGeneratedNote(row, step, length, pitch, velocity)
          }

          if (repeatReady && measure === barCount - 1) {
            const pickupStep = Math.min(song.stepCount - 1, base + stepsPerMeasure - Math.max(1, Math.floor(eighth / 2)))
            placeGeneratedNote(row, pickupStep, 1, bassRoot, strongCadence ? 96 : 78)
          }
          continue
        }

        const bassRoot = clampMidi((styleProfile.bassOctave + 1) * 12 + keyRoot + chordSemitones[0])
        const bassFifthNote = clampMidi(bassRoot + 7)
        const bassThird = clampMidi(bassRoot + (chordSemitones.length > 1 ? chordSemitones[1] : 4))

        // Bass rhythm library — pick different patterns per bar
        const bassOptions =
          options.preset === 'background' || options.preset === 'cutscene'
            ? ['whole', 'half', 'sparse']
            : options.preset === 'battle' || options.preset === 'upbeat'
              ? ['walking', 'driving', 'bounce', 'synco', 'half']
              : ['half', 'walking', 'sparse', 'driving', 'synco', 'whole']
        const bassRhythm = randItem(bassOptions, random)

        if (bassRhythm === 'whole') {
          placeGeneratedNote(row, base, quarter * 4, bassRoot, 102)
        } else if (bassRhythm === 'half') {
          placeGeneratedNote(row, base, quarter * 2, bassRoot, 102)
          placeGeneratedNote(row, base + quarter * 2, quarter * 2, random() < bassFifthChance ? bassFifthNote : bassRoot, 96)
        } else if (bassRhythm === 'walking') {
          placeGeneratedNote(row, base, Math.max(1, quarter), bassRoot, 102)
          placeGeneratedNote(row, base + quarter, Math.max(1, quarter), bassThird, 92)
          placeGeneratedNote(row, base + quarter * 2, Math.max(1, quarter), bassFifthNote, 96)
          const approach = clampMidi(bassRoot + randItem([0, -2, -1, 5, 10], random))
          placeGeneratedNote(row, base + quarter * 3, Math.max(1, quarter), approach, 88)
        } else if (bassRhythm === 'bounce') {
          const octave = clampMidi(bassRoot + 12)
          placeGeneratedNote(row, base, Math.max(1, quarter), bassRoot, 104)
          placeGeneratedNote(row, base + quarter, Math.max(1, quarter), octave, 90)
          placeGeneratedNote(row, base + quarter * 2, Math.max(1, quarter), bassRoot, 100)
          placeGeneratedNote(row, base + quarter * 3, Math.max(1, quarter), octave, 88)
        } else if (bassRhythm === 'synco') {
          placeGeneratedNote(row, base, Math.max(1, quarter), bassRoot, 104)
          const syncoStep = base + quarter + Math.max(1, eighth)
          if (syncoStep < song.stepCount) placeGeneratedNote(row, syncoStep, Math.max(1, eighth), bassRoot, 88)
          placeGeneratedNote(row, base + quarter * 2, Math.max(1, quarter), bassFifthNote, 96)
          placeGeneratedNote(row, base + quarter * 3, Math.max(1, quarter), bassRoot, 92)
        } else if (bassRhythm === 'driving') {
          placeGeneratedNote(row, base, Math.max(1, quarter), bassRoot, 106)
          placeGeneratedNote(row, base + quarter, Math.max(1, quarter), bassRoot, 92)
          placeGeneratedNote(row, base + quarter * 2, Math.max(1, quarter), bassFifthNote, 98)
          placeGeneratedNote(row, base + quarter * 3, Math.max(1, quarter), bassRoot, 90)
        } else {
          // sparse
          placeGeneratedNote(row, base, quarter * 2, bassRoot, 102)
          placeGeneratedNote(row, base + quarter * 3, Math.max(1, quarter), bassFifthNote, 88)
        }

        if (repeatReady && measure === barCount - 1) {
          const pickupStep = Math.min(song.stepCount - 1, base + stepsPerMeasure - Math.max(1, eighth))
          const pickupPitch = clampMidi((styleProfile.bassOctave + 1) * 12 + keyRoot + degreeSemitone(mode.scale, degree - 1))
          placeGeneratedNote(row, pickupStep, Math.max(1, strongCadence ? eighth : Math.floor(eighth / 2) || 1), pickupPitch, strongCadence ? 94 : 72)
        }
        continue
      }

      if (role === 'harmony') {
        const leadPitchesAtStep = (step: number): number[] =>
          leadTrackIds
            .filter((trackId) => trackId !== track.id)
            .map((trackId) => getActiveGeneratedNote(nextGrid[trackId] ?? [], step)?.pitch ?? null)
            .filter((pitch): pitch is number => pitch !== null)

        if (options.style === 'celtic' || options.style === 'sea-shanty') {
          const registerCenter = clampMidi((styleProfile.harmonyOctave + 1) * 12 + keyRoot + chordSemitones[1])
          const harmonyCandidates = chordSemitones.map((semi) => clampMidi((styleProfile.harmonyOctave + 1) * 12 + keyRoot + semi))
          const phraseLength = Math.max(1, quarter * 2)
          const anchorSteps = [base, base + phraseLength]
          const shouldThin = /counter|accordion|fiddle/i.test(track.name)

          for (const anchorStep of anchorSteps) {
            if (anchorStep >= song.stepCount) continue
            if (shouldThin && leadPitchesAtStep(anchorStep).length > 0 && random() < 0.35) continue
            const pitch = chooseLeadRelativeHarmonyPitch(
              leadPitchesAtStep(anchorStep),
              harmonyCandidates,
              registerCenter,
              [3, 4, 8, 9]
            )
            placeGeneratedNote(row, anchorStep, phraseLength, pitch, anchorStep === base ? 82 : 76)
          }

          if (repeatReady && measure === barCount - 1) {
            const pickupStep = Math.min(song.stepCount - 1, base + stepsPerMeasure - Math.max(1, eighth))
            const pickupPitch = chooseLeadRelativeHarmonyPitch(
              leadPitchesAtStep(pickupStep),
              harmonyCandidates,
              registerCenter,
              [3, 4, 8, 9]
            )
            placeGeneratedNote(row, pickupStep, Math.max(1, Math.floor(eighth / 2)), pickupPitch, strongCadence ? 76 : 64)
          }
          continue
        }

        if (isWindStyle) {
          const registerCenter = clampMidi((styleProfile.harmonyOctave + 1) * 12 + keyRoot + chordSemitones[1])
          const supportRoot = clampMidi((styleProfile.harmonyOctave + 1) * 12 + keyRoot + chordSemitones[0])
          const supportThird = clampMidi((styleProfile.harmonyOctave + 1) * 12 + keyRoot + chordSemitones[1])
          const supportFifth = clampMidi((styleProfile.harmonyOctave + 1) * 12 + keyRoot + chordSemitones[2])
          const phraseLength = Math.max(1, quarter * 2)
          const supportPattern = random() < 0.5 ? [supportRoot, supportThird] : [supportThird, supportFifth]

          // Wind accompaniment favors open dyads and phrase-length sustains.
          const firstSupportPitch = chooseComplementaryHarmonyPitch(supportPattern, leadPitchesAtStep(base), registerCenter)
          const secondSupportPitch = chooseComplementaryHarmonyPitch(supportPattern, leadPitchesAtStep(base + phraseLength), registerCenter)
          placeGeneratedNote(row, base, phraseLength, firstSupportPitch, 76)
          placeGeneratedNote(row, base + phraseLength, phraseLength, secondSupportPitch, 72)

          if (random() < 0.25) {
            const answerStep = base + Math.max(1, quarter)
            if (answerStep < song.stepCount) {
              const answerPitch = chooseComplementaryHarmonyPitch(
                [supportRoot + 2, supportThird],
                leadPitchesAtStep(answerStep),
                registerCenter
              )
              placeGeneratedNote(row, answerStep, Math.max(1, eighth), answerPitch, 66)
            }
          }
          continue
        }

        if (isRockStyle) {
          const guitarRoot = clampMidi((styleProfile.harmonyOctave + 1) * 12 + keyRoot + chordSemitones[0])
          const guitarFifth = clampMidi(guitarRoot + 7)
          const guitarOctave = clampMidi(guitarRoot + 12)
          const sixteenth = Math.max(1, Math.floor(eighth / 2))
          const sectionBars = barCount >= 8 ? 4 : 2
          const sectionIndex = Math.floor(measure / sectionBars) % 2
          const pedalRoot = clampMidi((styleProfile.harmonyOctave + 1) * 12 + keyRoot + degreeSemitone(mode.scale, progression[0]))
          const rhythmPatterns: Record<'chug16' | 'offbeat8' | 'pushPull' | 'strumWide', number[]> = {
            chug16: [0, sixteenth, eighth, quarter, quarter + eighth, quarter * 2, quarter * 2 + eighth, quarter * 3],
            offbeat8: [eighth, quarter + eighth, quarter * 2 + eighth, quarter * 3 + eighth],
            pushPull: [0, eighth, quarter + sixteenth, quarter * 2, quarter * 2 + sixteenth * 3, quarter * 3],
            strumWide: [0, quarter, quarter * 2, quarter * 3]
          }
          const forcedRhythmPatternBySetting: Partial<Record<RockRhythmPattern, keyof typeof rhythmPatterns>> = {
            'straight-8ths': 'offbeat8',
            'offbeat-push': 'pushPull',
            'half-time': 'strumWide',
            'punk-drive': 'offbeat8',
            'sync-16ths': 'pushPull',
            'chug-16ths': 'chug16',
            gallop: 'chug16'
          }
          const barRhythm = rockRhythmForBar(measure)
          const forcedRhythmPattern = forcedRhythmPatternBySetting[barRhythm]
          const patternCandidates: Array<keyof typeof rhythmPatterns> =
            forcedRhythmPattern !== undefined
              ? [forcedRhythmPattern]
              : rockFlavor === 'metal-ish'
                ? ['chug16', 'pushPull', 'offbeat8']
                : ['offbeat8', 'pushPull', 'strumWide', 'chug16']
          const nonRepeatingPatternCandidates = patternCandidates.filter((kind) => kind !== previousRockRhythmPattern)
          const plannedRhythmPattern = rockPatternPlan?.guitar[measure]
          const rhythmPatternKind =
            plannedRhythmPattern && patternCandidates.includes(plannedRhythmPattern)
              ? plannedRhythmPattern
              : randItem(nonRepeatingPatternCandidates.length > 0 ? nonRepeatingPatternCandidates : patternCandidates, random)
          previousRockRhythmPattern = rhythmPatternKind
          const chugPattern = mutateRockOffsets(rhythmPatterns[rhythmPatternKind], measure, sixteenth)

          for (const offset of chugPattern) {
            if (random() < rockTuning.chordDropChance * (sectionIndex === 1 ? 1.2 : 0.9)) continue
            const step = base + offset
            if (step >= song.stepCount) continue
            const length =
              rhythmPatternKind === 'strumWide'
                ? Math.max(1, Math.floor(eighth * 1.2))
                : rhythmPatternKind === 'chug16'
                  ? Math.max(1, Math.floor((measure % 2 === 0 ? eighth : eighth * 0.8) / 1.5))
                  : Math.max(1, Math.floor(eighth / 1.2))
            const velocity = 84 + Math.floor(random() * 14)
            const rootForHit = sectionIndex === 0 && random() < 0.48 ? pedalRoot : guitarRoot
            placeGeneratedNote(row, step, length, rootForHit, velocity)
            placeGeneratedNote(row, step, length, clampMidi(rootForHit + 7), Math.max(70, velocity - 8))

            // Sparse upper color in contrast sections implies voicing movement without losing riff identity.
            if (sectionIndex === 1 && random() < 0.24 * variationIntensity) {
              const upperColor = rhythmPatternKind === 'strumWide' ? guitarOctave : clampMidi(guitarFifth + 5)
              placeGeneratedNote(row, step, Math.max(1, Math.floor(length / 2)), upperColor, Math.max(64, velocity - 14))
            }
          }

          if (measure % 2 === 1 && rhythmPatternKind !== 'strumWide') {
            const anchorStep = base
            if (anchorStep < song.stepCount && random() < 0.55) {
              placeGeneratedNote(row, anchorStep, Math.max(1, Math.floor(eighth)), guitarRoot, 76)
              placeGeneratedNote(row, anchorStep, Math.max(1, Math.floor(eighth)), guitarFifth, 70)
            }
          }

          if (repeatReady && measure === barCount - 1) {
            const pickupStep = Math.min(song.stepCount - 1, base + stepsPerMeasure - Math.max(1, Math.floor(eighth / 2)))
            placeGeneratedNote(row, pickupStep, 1, guitarRoot, strongCadence ? 90 : 72)
          }
          continue
        }

        if (isTechnoStyle) {
          const stabRoot = clampMidi((styleProfile.harmonyOctave + 1) * 12 + keyRoot + chordSemitones[0])
          const stabThird = clampMidi((styleProfile.harmonyOctave + 1) * 12 + keyRoot + chordSemitones[1])
          const stabFifth = clampMidi((styleProfile.harmonyOctave + 1) * 12 + keyRoot + chordSemitones[2])
          const stabLength = Math.max(1, Math.floor(eighth / 2))
          const offbeats = [eighth, eighth * 3, eighth * 5, eighth * 7]

          for (const offset of offbeats) {
            if (random() < technoTuning.stabDropChance) continue
            const step = base + offset
            if (step >= song.stepCount) continue
            placeGeneratedNote(row, step, stabLength, stabRoot, 82)
            if (random() < 0.9) placeGeneratedNote(row, step, stabLength, stabThird, 76)
            if (random() < 0.75) placeGeneratedNote(row, step, stabLength, stabFifth, 72)
          }

          if (repeatReady && measure === barCount - 1) {
            const pickupStep = Math.min(song.stepCount - 1, base + stepsPerMeasure - Math.max(1, Math.floor(eighth / 2)))
            placeGeneratedNote(row, pickupStep, 1, stabRoot, strongCadence ? 82 : 64)
          }
          continue
        }

        if (isHurdyStyle && track.instrument === 'hurdy-gurdy') {
          const registerCenter = clampMidi((styleProfile.harmonyOctave + 1) * 12 + keyRoot + 7)
          const harmonyRoot = clampMidi((styleProfile.harmonyOctave + 1) * 12 + keyRoot + degreeSemitone(mode.scale, 0))
          const harmonyFifth = clampMidi(harmonyRoot + 7)
          placeGeneratedNote(
            row,
            base,
            Math.max(1, quarter * 2),
            chooseComplementaryHarmonyPitch([harmonyRoot, harmonyFifth], leadPitchesAtStep(base), registerCenter),
            84
          )
          placeGeneratedNote(
            row,
            base + Math.max(1, quarter * 2),
            Math.max(1, quarter * 2),
            chooseComplementaryHarmonyPitch([harmonyFifth, harmonyRoot], leadPitchesAtStep(base + Math.max(1, quarter * 2)), registerCenter),
            80
          )

          if (repeatReady && measure === barCount - 1) {
            const pickupStep = Math.min(song.stepCount - 1, base + stepsPerMeasure - Math.max(1, eighth))
            placeGeneratedNote(row, pickupStep, Math.max(1, Math.floor(eighth / 2)), harmonyRoot, strongCadence ? 76 : 62)
          }
          continue
        }

        const harmonyRoot = clampMidi((styleProfile.harmonyOctave + 1) * 12 + keyRoot + chordSemitones[0])
        const harmonyThird = clampMidi((styleProfile.harmonyOctave + 1) * 12 + keyRoot + chordSemitones[1])
        const harmonyFifth = clampMidi((styleProfile.harmonyOctave + 1) * 12 + keyRoot + chordSemitones[2])
        const registerCenter =
          options.style === 'piano' || options.style === 'classical'
            ? clampMidi((styleProfile.harmonyOctave + 1) * 12 + keyRoot + chordSemitones[0] - 7)
            : clampMidi((styleProfile.harmonyOctave + 1) * 12 + keyRoot + chordSemitones[1])
        const harmonyCandidates = [harmonyRoot, harmonyThird, harmonyFifth]
        const isCounterLine = /counter|fiddle|viola/i.test(track.name)
        const longPad = options.preset === 'background' || options.preset === 'cutscene'
        if (longPad) {
          const padPitch = chooseComplementaryHarmonyPitch(harmonyCandidates, leadPitchesAtStep(base), registerCenter)
          placeGeneratedNote(row, base, Math.max(quarter * 4, 1), padPitch, 82)
        } else {
          const voicingChoice = random()
          if (isCounterLine && leadPitchesAtStep(base).length > 0 && random() < 0.32) {
            continue
          }
          if (voicingChoice < 0.34) {
            const firstPitch = chooseComplementaryHarmonyPitch([harmonyRoot, harmonyFifth], leadPitchesAtStep(base), registerCenter)
            const secondPitch = chooseComplementaryHarmonyPitch(
              [harmonyThird, harmonyFifth],
              leadPitchesAtStep(base + Math.max(quarter * 2, 1)),
              registerCenter
            )
            placeGeneratedNote(row, base, Math.max(quarter * 2, 1), firstPitch, 90)
            placeGeneratedNote(row, base + Math.max(quarter * 2, 1), Math.max(quarter * 2, 1), secondPitch, 84)
          } else if (voicingChoice < 0.68) {
            const firstPitch = chooseComplementaryHarmonyPitch(
              [personality.smoothness > 0.75 ? harmonyRoot : harmonyThird, harmonyFifth],
              leadPitchesAtStep(base),
              registerCenter
            )
            const secondPitch = chooseComplementaryHarmonyPitch(
              [harmonyFifth, harmonyThird],
              leadPitchesAtStep(base + Math.max(quarter * 2, 1)),
              registerCenter
            )
            placeGeneratedNote(row, base, Math.max(quarter * 2, 1), firstPitch, 88)
            placeGeneratedNote(row, base + Math.max(quarter * 2, 1), Math.max(quarter * 2, 1), secondPitch, 82)
          } else {
            const firstStep = base
            const secondStep = base + Math.max(quarter, 1)
            const thirdStep = base + Math.max(quarter * 2, 1)
            placeGeneratedNote(
              row,
              firstStep,
              Math.max(quarter, 1),
              chooseComplementaryHarmonyPitch([harmonyRoot, harmonyFifth], leadPitchesAtStep(firstStep), registerCenter),
              88
            )
            placeGeneratedNote(
              row,
              secondStep,
              Math.max(quarter, 1),
              chooseComplementaryHarmonyPitch([harmonyThird, harmonyFifth], leadPitchesAtStep(secondStep), registerCenter),
              82
            )
            placeGeneratedNote(
              row,
              thirdStep,
              Math.max(quarter * 2, 1),
              chooseComplementaryHarmonyPitch([harmonyFifth, harmonyThird, harmonyRoot], leadPitchesAtStep(thirdStep), registerCenter),
              80
            )
          }
        }

        if (repeatReady && measure === barCount - 1) {
          const pickupStep = Math.min(song.stepCount - 1, base + stepsPerMeasure - Math.max(1, eighth))
          const pickupPitch = clampMidi((styleProfile.harmonyOctave + 1) * 12 + keyRoot + degreeSemitone(mode.scale, degree - 1))
          placeGeneratedNote(row, pickupStep, Math.max(1, strongCadence ? eighth : Math.floor(eighth / 2) || 1), pickupPitch, strongCadence ? 78 : 64)
        }
        continue
      }

      const leadOctave = styleProfile.leadOctave
      const isHurdyLead = isHurdyStyle && track.instrument === 'hurdy-gurdy'
      const isTechnoLead = isTechnoStyle && /arp|pluck/i.test(track.name)
      const isRockLead = isRockStyle && /lead|guitar|riff/i.test(track.name)

      if (isWindStyle) {
        const isFlute = track.instrument === 'flute'
        const isOcarina = track.instrument === 'ocarina'
        const phraseSpan = 2
        const phraseIndex = Math.floor(measure / phraseSpan)
        const barInPhrase = measure % phraseSpan
        const breathChance = barInPhrase === phraseSpan - 1 ? 0.72 : 0.28
        const shortLen = Math.max(1, eighth)
        const longLen = Math.max(1, quarter)
        const figure =
          isFlute
            ? [0, eighth, quarter, quarter + eighth, quarter * 2, quarter * 3]
            : [0, quarter, quarter * 2]
        const pitchPool = isOcarina
          ? [0, 2, 4, 7, 9]
          : mode.family === 'minor'
            ? [0, 2, 3, 5, 7, 8, 10]
            : [0, 2, 4, 5, 7, 9, 11]

        let lastPitch: number | null = null
        for (let index = 0; index < figure.length; index += 1) {
          const step = base + figure[index]
          if (step >= song.stepCount) continue
          if (random() < breathChance && index >= figure.length - 2) continue

          const targetScaleDegree = degree + Math.floor((index + phraseIndex) / 2)
          const targetSemitone = degreeSemitone(mode.scale, targetScaleDegree)
          const localPool = pitchPool.map((semi) => semi + 12 * Math.floor(targetSemitone / 12))
          const preferred = localPool.reduce(
            (best, candidate) =>
              Math.abs(candidate - targetSemitone) < Math.abs(best - targetSemitone) ? candidate : best,
            localPool[0]
          )
          let semitone = random() < 0.65 ? preferred : randItem(localPool, random)

          if (lastPitch !== null) {
            const jump = semitone - lastPitch
            const maxJump = isFlute ? 9 : 6
            if (Math.abs(jump) > maxJump) {
              semitone = lastPitch + Math.sign(jump) * maxJump
            }
          }

          const basePitch = clampMidi((leadOctave + 1) * 12 + keyRoot + semitone)
          const registerLift = isFlute ? 2 : 0
          const pitch = clampMidi(basePitch + registerLift)
          const length = index === figure.length - 1 || random() < 0.25 ? longLen : shortLen
          const velocity = isFlute ? 92 + Math.floor(random() * 16) : 80 + Math.floor(random() * 10)
          placeGeneratedNote(row, step, length, pitch, velocity)
          lastPitch = semitone
        }

        if (repeatReady && measure === barCount - 1) {
          const pickupStep = Math.min(song.stepCount - 1, base + stepsPerMeasure - Math.max(1, eighth))
          const pickupPitch = clampMidi((leadOctave + 1) * 12 + keyRoot + degreeSemitone(mode.scale, firstDegree - 1))
          placeGeneratedNote(row, pickupStep, Math.max(1, Math.floor(eighth / 2)), pickupPitch, strongCadence ? 88 : 74)
        }
        continue
      }

      if (isRockLead) {
        const minorPentatonic = [0, 3, 5, 7, 10]
        const majorPentatonic = [0, 2, 4, 7, 9]
        const bluesPassing = 6
        const useMinor = mode.family === 'minor' || options.preset === 'dark' || options.preset === 'battle'
        const includeBlue = useMinor && random() < (rockFlavor === 'blues-rock' ? 0.58 : 0.3)
        const scalePool = includeBlue ? [...(useMinor ? minorPentatonic : majorPentatonic), bluesPassing] : useMinor ? minorPentatonic : majorPentatonic
        const chordPitchClasses = chordSemitones.map((value) => ((value % 12) + 12) % 12)
        const isPhraseStart = measure % 4 === 0
        const isAnswerBar = measure % 2 === 1

        if (isPhraseStart || !rockLeadRhythm || !rockLeadMotif) {
          const sixteenth = Math.max(1, Math.floor(eighth / 2))
          const rhythmChoices =
            rockFlavor === 'metal-ish'
              ? [
                  [0, sixteenth, eighth, quarter, quarter + eighth, quarter * 2, quarter * 2 + eighth, quarter * 3],
                  [0, eighth, quarter, quarter + sixteenth, quarter + eighth, quarter * 2, quarter * 3],
                  [0, sixteenth, eighth, quarter + sixteenth, quarter * 2, quarter * 2 + eighth, quarter * 3]
                ]
              : rockFlavor === 'blues-rock'
                ? [
                    [0, eighth, quarter, quarter + eighth, quarter * 2, quarter * 3],
                    [0, eighth, quarter + sixteenth, quarter * 2, quarter * 2 + eighth, quarter * 3],
                    [0, quarter, quarter + eighth, quarter * 2, quarter * 3]
                  ]
                : [
                    [0, eighth, quarter, quarter + eighth, quarter * 2, quarter * 2 + eighth, quarter * 3],
                    [0, Math.max(1, Math.floor(eighth / 2)), eighth, quarter, quarter + eighth, quarter * 2, quarter * 3],
                    [0, eighth, quarter, quarter + eighth, quarter * 2, quarter * 3]
                  ]

          rockLeadRhythm = randItem(rhythmChoices, random)

          const motif: number[] = []
          let cursor = Math.floor(random() * scalePool.length)
          for (let idx = 0; idx < rockLeadRhythm.length; idx += 1) {
            if (idx > 0) {
              cursor = Math.max(0, Math.min(scalePool.length - 1, cursor + randItem([-2, -1, -1, 0, 1, 1, 2], random)))
            }

            const onStrongBeat = rockLeadRhythm[idx] % Math.max(1, quarter) === 0
            if (onStrongBeat && random() < 0.72) {
              const chordTones = scalePool.filter((semi) => chordPitchClasses.includes(((semi % 12) + 12) % 12))
              motif.push(chordTones.length > 0 ? randItem(chordTones, random) : scalePool[cursor])
            } else {
              motif.push(scalePool[cursor])
            }
          }
          rockLeadMotif = motif
        }

        const rhythm = rockLeadRhythm
        const motif = rockLeadMotif
        const noteDensity = Math.max(0.4, Math.min(0.96, rockTuning.soloDensity * variationIntensity + (isAnswerBar ? 0.06 : -0.04)))
        const sequenceShift = measure % 4 === 2 && random() < 0.56 ? randItem([-2, 2], random) : 0

        for (let idx = 0; idx < rhythm.length; idx += 1) {
          const offset = rhythm[idx]
          const step = base + offset
          if (step >= song.stepCount) continue

          const onStrongBeat = offset % Math.max(1, quarter) === 0
          if (!onStrongBeat && random() > noteDensity) continue

          let semitone = motif[idx]
          if (isAnswerBar && random() < 0.38) {
            semitone += randItem([-1, 1], random)
          }
          if (sequenceShift !== 0 && idx > 0) {
            semitone += sequenceShift
          }

          if (idx === rhythm.length - 1 && (isAnswerBar || (repeatReady && measure === barCount - 1))) {
            const cadenceTargets = scalePool.filter((semi) => {
              const pitchClass = ((semi % 12) + 12) % 12
              return pitchClass === chordPitchClasses[0] || pitchClass === chordPitchClasses[2] || pitchClass === ((keyRoot % 12) + 12) % 12
            })
            if (cadenceTargets.length > 0) {
              semitone = randItem(cadenceTargets, random)
            }
          }

          const octaveBoost = rockFlavor === 'metal-ish' && isAnswerBar && random() < 0.22 ? 12 : 0
          const pitch = clampMidi((leadOctave + 1) * 12 + keyRoot + semitone + octaveBoost)
          const nextOffset = idx < rhythm.length - 1 ? rhythm[idx + 1] : stepsPerMeasure
          const rawLength = Math.max(1, nextOffset - offset)
          const length = Math.max(1, Math.min(rawLength, Math.max(1, Math.floor(eighth * 1.6))))
          const velocityBase = onStrongBeat ? 100 : 84
          const velocity = velocityBase + Math.floor(random() * 14)
          placeGeneratedNote(row, step, length, pitch, velocity)

          // Quick grace-note neighbor tones imply bends/slides in a step-sequenced context.
          if (!onStrongBeat && random() < rockTuning.soloOrnamentChance && step + 1 < song.stepCount) {
            const gracePitch = clampMidi(pitch + randItem([-1, 1], random))
            placeGeneratedNote(row, step + 1, 1, gracePitch, Math.max(62, velocity - 20))
          }
        }

        if (repeatReady && measure === barCount - 1) {
          const pickupStep = Math.min(song.stepCount - 1, base + stepsPerMeasure - Math.max(1, eighth))
          const pickupPitch = clampMidi((leadOctave + 1) * 12 + keyRoot + degreeSemitone(mode.scale, firstDegree - 1))
          placeGeneratedNote(
            row,
            pickupStep,
            Math.max(1, strongCadence ? eighth : Math.floor(eighth / 2) || 1),
            pickupPitch,
            strongCadence ? 100 : 86
          )
        }

        continue
      }

      const phrasePalette =
        isHurdyLead
          ? [
              [0, eighth, quarter, quarter + eighth, quarter * 2, quarter * 2 + eighth, quarter * 3],
              [0, quarter, quarter + eighth, quarter * 2, quarter * 3],
              [0, eighth * 2, quarter * 2, quarter * 2 + eighth, quarter * 3]
            ]
          : options.style === 'techno' || options.preset === 'arp-heavy' || options.preset === 'battle'
          ? [
              [0, eighth, eighth * 2, eighth * 3, quarter * 2, quarter * 2 + eighth, quarter * 3],
              [0, eighth, quarter, quarter + eighth, quarter * 2, quarter * 2 + eighth, quarter * 3 + eighth]
            ]
          : options.style === 'sea-shanty' || options.style === 'classical' || options.preset === 'background' || options.preset === 'cutscene'
            ? [
                [0, quarter * 2],
                [0, quarter, quarter * 2],
                [0, quarter * 2, quarter * 3]
              ]
            : [
                [0, eighth * 2, quarter, quarter + eighth, quarter * 2, quarter * 3],
                [0, eighth, quarter, quarter * 2, quarter * 2 + eighth, quarter * 3],
                [0, quarter, quarter + eighth, quarter * 2, quarter * 2 + eighth, quarter * 3 + eighth]
              ]
      // Motif system: default leads remember melody for 2 bars, then vary
      const isDefaultLeadStyle = !isTechnoLead && !isHurdyLead
      const isNewMotifPhrase = measure % 2 === 0 || !defaultLeadMotifSemitones || !defaultLeadMotifRhythm

      let phrasePositions: number[]
      if (isDefaultLeadStyle && !isNewMotifPhrase && defaultLeadMotifRhythm) {
        // Repeat bar: reuse stored rhythm
        phrasePositions = defaultLeadMotifRhythm
      } else {
        phrasePositions = [...randItem(phrasePalette, random)]
        if (random() < personality.syncopation && phrasePositions.length > 0) {
          phrasePositions.push(Math.min(stepsPerMeasure - 1, quarter + eighth * 3))
        }
      }

      // Pre-generate motif pitches for default lead on new phrase
      if (isDefaultLeadStyle && isNewMotifPhrase) {
        defaultLeadMotifRhythm = phrasePositions
        defaultLeadMotifSemitones = []
        const chordToneBase = options.preset === 'arp-heavy' ? 0.88 : 0.72
        const motifNonChordDeg = personality.jumpiness > 0.55 ? [1, 2, 3, 5, 6, 7] : personality.smoothness > 0.78 ? [1, 2, 3, 4] : [1, 2, 3, 5, 6]
        let prevSemi = previousLeadSemitone
        for (const off of phrasePositions) {
          const useChord = random() < clamp01(chordToneBase - personality.melodicSurprise * 0.22 + personality.smoothness * 0.08)
          let semi = useChord ? randItem(chordSemitones, random) : degreeSemitone(mode.scale, degree + randItem(motifNonChordDeg, random))
          const onStrong = off % Math.max(1, quarter) === 0
          if (onStrong) {
            const nearest = chordSemitones.reduce((best, c) => Math.abs(c - semi) < Math.abs(best - semi) ? c : best, chordSemitones[0])
            if (random() < 0.78) semi = nearest
          }
          if (prevSemi !== null) {
            const jump = semi - prevSemi
            const maxJump = onStrong ? 7 : 9
            if (Math.abs(jump) > maxJump) semi = prevSemi + Math.sign(jump) * maxJump
          }
          defaultLeadMotifSemitones.push(semi)
          prevSemi = semi
        }
      }

      if (repeatReady && measure === 0) {
        const loopTargetPitch = clampMidi((leadOctave + 1) * 12 + keyRoot + degreeSemitone(mode.scale, firstDegree))
        placeGeneratedNote(row, base, Math.max(1, strongCadence ? eighth : Math.floor(eighth / 2) || 1), loopTargetPitch, strongCadence ? 102 : 86)
      }

      for (let noteIdx = 0; noteIdx < phrasePositions.length; noteIdx++) {
        const offset = phrasePositions[noteIdx]
        const step = base + offset
        if (step >= song.stepCount) continue
        if (random() < leadRestChance) continue

        if (isTechnoLead) {
          if (random() > technoTuning.arpDensity) continue
          const stepInMeasure = step - base
          const sixteenth = Math.max(1, Math.floor(eighth / 2))
          const arpDegreeOffset = stepInMeasure % (sixteenth * 4) < sixteenth ? 0 : stepInMeasure % (sixteenth * 4) < sixteenth * 2 ? 2 : stepInMeasure % (sixteenth * 4) < sixteenth * 3 ? 4 : 2
          const arpPitch = clampMidi((leadOctave + 1) * 12 + keyRoot + degreeSemitone(mode.scale, degree + arpDegreeOffset))
          const arpLength = Math.max(1, sixteenth)
          const arpVelocity = 76 + Math.floor(random() * 20)
          placeGeneratedNote(row, step, arpLength, arpPitch, arpVelocity)
          continue
        }

        if (isHurdyLead) {
          const minDegree = degree
          const maxDegree = degree + 5
          const wheelMove = previousLeadDegree === null ? randItem([0, 1, 2, 3], random) : randItem([-2, -1, 0, 1, 1, 2], random)
          const nextDegree = Math.max(minDegree, Math.min(maxDegree, (previousLeadDegree ?? degree + 1) + wheelMove))
          previousLeadDegree = nextDegree

          const pitch = clampMidi((leadOctave + 1) * 12 + keyRoot + degreeSemitone(mode.scale, nextDegree))
          const noteLength = random() < 0.24 ? Math.max(1, quarter) : Math.max(1, eighth)
          const velocity = Math.max(70, Math.min(110, Math.round(82 + random() * 20)))
          placeGeneratedNote(row, step, noteLength, pitch, velocity)

          if (random() < 0.2) {
            const ornamentStep = step + Math.max(1, Math.floor(eighth / 2))
            if (ornamentStep < base + stepsPerMeasure && ornamentStep < song.stepCount) {
              const ornamentPitch = clampMidi((leadOctave + 1) * 12 + keyRoot + degreeSemitone(mode.scale, Math.min(maxDegree, nextDegree + 1)))
              placeGeneratedNote(row, ornamentStep, 1, ornamentPitch, Math.max(58, velocity - 14))
            }
          }

          continue
        }

        // Default lead: use stored motif pitches instead of random notes each bar
        let semitone = defaultLeadMotifSemitones![noteIdx % defaultLeadMotifSemitones!.length]

        // Slight variation on repeat bars to keep it alive
        if (!isNewMotifPhrase && random() < 0.28 * variationIntensity) {
          semitone += randItem([-1, 0, 1, 2], random)
        }

        const pitch = clampMidi((leadOctave + 1) * 12 + keyRoot + semitone)
        const noteLength = random() < leadLongNoteChance ? Math.max(1, eighth * 2) : Math.max(1, eighth)
        const velocity = Math.max(68, Math.min(118, Math.round(86 + random() * 24 + (step % Math.max(1, quarter) === 0 ? 8 : 0))))
        placeGeneratedNote(row, step, noteLength, pitch, velocity)
        previousLeadSemitone = semitone
      }

      if (repeatReady && measure === barCount - 1) {
        const pickupStep = Math.min(song.stepCount - 1, base + stepsPerMeasure - Math.max(1, eighth))
        const pickupPitch = clampMidi((leadOctave + 1) * 12 + keyRoot + degreeSemitone(mode.scale, firstDegree - 1))
        placeGeneratedNote(
          row,
          pickupStep,
          Math.max(1, strongCadence ? eighth : Math.floor(eighth / 2) || 1),
          pickupPitch,
          strongCadence ? 98 : 84
        )
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
    noise: 69,
    fm: 64,
    am: 62,
    duo: 65,
    pluck: 67,
    guitar: 64,
    'electric-guitar': 64,
    'hurdy-gurdy': 62,
    violin: 74,
    viola: 67,
    cello: 55,
    bass: 43,
    flute: 79,
    ocarina: 72,
    harmonica: 67,
    piano: 60,
    drums: DRUM_PITCHES.kick,
    membrane: 43,
    metal: 76
  }

  const realSampleInstruments: InstrumentType[] = [
    'guitar',
    'electric-guitar',
    'hurdy-gurdy',
    'violin',
    'viola',
    'cello',
    'bass',
    'flute',
    'ocarina',
    'harmonica',
    'piano',
    'drums'
  ]

  return {
    id: `track-${index}`,
    name: `Track ${index}`,
    instrument,
    soundSource: realSampleInstruments.includes(instrument) ? 'real' : 'synth',
    settings: {
      envelope: {
        attack: 0.001,
        decay: instrument === 'noise' || instrument === 'drums' ? 0.1 : 0.08,
        sustain: instrument === 'noise' || instrument === 'drums' ? 0 : 0.25,
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

function buildTracksFromLayout(
  layout: Array<{ name: string; instrument: InstrumentType }>,
  previousTracks: Track[] = []
): Track[] {
  const allReal = previousTracks.length > 0 && previousTracks.every((track) => track.soundSource === 'real')
  const allSynth = previousTracks.length > 0 && previousTracks.every((track) => track.soundSource === 'synth')
  const hasAnyReal = previousTracks.some((track) => track.soundSource === 'real')
  const fallbackSoundSource: TrackSoundSource = allReal ? 'real' : allSynth ? 'synth' : hasAnyReal ? 'real' : 'synth'

  return layout.map((item, index) => {
    const nextTrack = createTrack(index + 1, item.instrument)
    const previousTrack = previousTracks[index]
    const track: Track = {
      ...nextTrack,
      name: item.name.trim().length > 0 ? item.name : nextTrack.name,
      soundSource: previousTrack ? previousTrack.soundSource : fallbackSoundSource,
      volume: previousTrack ? previousTrack.volume : nextTrack.volume,
      muted: previousTrack ? previousTrack.muted : nextTrack.muted,
      solo: previousTrack ? previousTrack.solo : nextTrack.solo
    }
    return normalizeTrackForSoundSource(track)
  })
}

function buildLayoutFromStyle(style: GeneratorStyle, instrumentCount: number): Array<{ name: string; instrument: InstrumentType }> {
  const profile = STYLE_PROFILES[style]
  const targetCount = Math.max(1, Math.min(TRACK_LIMIT, Math.floor(instrumentCount)))
  const nextLayout: Array<{ name: string; instrument: InstrumentType }> = []

  for (let index = 0; index < targetCount; index += 1) {
    const template = profile.trackLayout[index % profile.trackLayout.length]
    const cycle = Math.floor(index / profile.trackLayout.length)
    nextLayout.push({
      name: cycle > 0 ? `${template.name} ${cycle + 1}` : template.name,
      instrument: template.instrument
    })
  }

  return nextLayout
}

function remapGridToTracksByIndex(
  previousTracks: Track[],
  nextTracks: Track[],
  previousGrid: Record<string, NoteCell[]>,
  stepCount: number
): Record<string, NoteCell[]> {
  return Object.fromEntries(
    nextTracks.map((track, index) => {
      const sourceTrack = previousTracks[index]
      const sourceRow = sourceTrack ? previousGrid[sourceTrack.id] ?? [] : []
      return [track.id, trimRowToStepCount(sourceRow, stepCount)]
    })
  )
}

function applyRockFlavorTrackVoicing(tracks: Track[], flavor: RockFlavor, random: SeededRandom): Track[] {
  const resolvedFlavor: Exclude<RockFlavor, 'random'> =
    flavor === 'random' ? randItem(['classic', 'hard', 'metal-ish', 'blues-rock'], random) : flavor

  const leadOptions: Record<Exclude<RockFlavor, 'random'>, InstrumentType[]> = {
    classic: ['guitar', 'electric-guitar'],
    hard: ['electric-guitar', 'guitar'],
    'metal-ish': ['electric-guitar'],
    'blues-rock': ['guitar', 'electric-guitar']
  }
  const rhythmOptions: Record<Exclude<RockFlavor, 'random'>, InstrumentType[]> = {
    classic: ['guitar'],
    hard: ['electric-guitar', 'guitar'],
    'metal-ish': ['electric-guitar'],
    'blues-rock': ['guitar']
  }

  return tracks.map((track) => {
    const isLead = /lead|riff/i.test(track.name)
    const isRhythm = /rhythm/i.test(track.name)
    const isBass = /bass/i.test(track.name)
    const isKit = /kit|drum/i.test(track.name)
    const isToms = /tom/i.test(track.name)

    const leadInstrument = randItem(leadOptions[resolvedFlavor], random)
    const rhythmInstrument = randItem(rhythmOptions[resolvedFlavor], random)

    if (isLead) {
      return {
        ...track,
        instrument: leadInstrument,
        defaultPitch: resolvedFlavor === 'metal-ish' ? 58 : resolvedFlavor === 'blues-rock' ? 64 : 60,
        volume: resolvedFlavor === 'classic' ? 0.86 : 0.9,
        settings: {
          ...track.settings,
          envelope: {
            attack: 0.001,
            decay: resolvedFlavor === 'blues-rock' ? 0.22 : 0.12,
            sustain: resolvedFlavor === 'metal-ish' ? 0.22 : 0.34,
            release: resolvedFlavor === 'blues-rock' ? 0.18 : 0.1
          }
        }
      }
    }

    if (isRhythm) {
      return {
        ...track,
        instrument: rhythmInstrument,
        defaultPitch: resolvedFlavor === 'metal-ish' ? 52 : 55,
        volume: 0.82,
        settings: {
          ...track.settings,
          envelope: {
            attack: 0.001,
            decay: resolvedFlavor === 'classic' ? 0.14 : 0.1,
            sustain: resolvedFlavor === 'metal-ish' ? 0.18 : 0.28,
            release: resolvedFlavor === 'blues-rock' ? 0.14 : 0.08
          }
        }
      }
    }

    if (isBass) {
      return {
        ...track,
        instrument: 'bass',
        defaultPitch: resolvedFlavor === 'metal-ish' ? 36 : 40,
        volume: 0.8,
        settings: {
          ...track.settings,
          envelope: {
            attack: 0.001,
            decay: 0.12,
            sustain: 0.38,
            release: 0.08
          }
        }
      }
    }

    if (isKit || track.instrument === 'noise') {
      return {
        ...track,
        instrument: 'drums',
        defaultPitch: DRUM_PITCHES.kick,
        volume: 0.84,
        settings: {
          ...track.settings,
          noiseType: resolvedFlavor === 'metal-ish' ? 'white' : resolvedFlavor === 'blues-rock' ? 'pink' : 'brown',
          envelope: {
            attack: 0.001,
            decay: resolvedFlavor === 'blues-rock' ? 0.16 : 0.1,
            sustain: 0,
            release: 0.05
          }
        }
      }
    }

    if (isToms || track.instrument === 'membrane' || track.instrument === 'metal') {
      return {
        ...track,
        instrument: 'drums',
        defaultPitch: resolvedFlavor === 'metal-ish' ? DRUM_PITCHES.tomHigh : DRUM_PITCHES.tomMid,
        volume: 0.64,
        settings: {
          ...track.settings,
          envelope: {
            attack: 0.001,
            decay: 0.12,
            sustain: 0,
            release: 0.06
          }
        }
      }
    }

    return track
  })
}

const DEFAULT_TRACKS: Track[] = [
  {
    id: 'track-1',
    name: 'Pulse 1',
    instrument: 'square',
    soundSource: 'synth',
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
    soundSource: 'synth',
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
    soundSource: 'synth',
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
    soundSource: 'synth',
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
    barCount: DEFAULT_BAR_COUNT,
    stepCount: DEFAULT_STEP_COUNT,
    lastGenerationSeed: null,
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
  applyStyleLayout: (style: GeneratorStyle, instrumentCount: number) => void
  setBarCount: (barCount: number) => void
  setStepCount: (stepCount: number) => void
  shiftCompositionSemitones: (semitones: number) => void
  setBpm: (bpm: number) => void
  setTrackMute: (trackId: string, muted: boolean) => void
  setTrackSolo: (trackId: string, solo: boolean) => void
  setTrackVolume: (trackId: string, volume: number) => void
  setTrackInstrument: (trackId: string, instrument: InstrumentType) => void
  randomizeTrackInstruments: (allowedInstruments?: InstrumentType[]) => void
  setTrackSoundSource: (trackId: string, soundSource: TrackSoundSource) => void
  setAllTrackSoundSource: (soundSource: TrackSoundSource) => void
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
      let workingSong = state.song
      const styleProfile = STYLE_PROFILES[options.style]
      const requestedSeed = options.seed ? normalizeSeed(options.seed) : createAutoSeed()
      const random = createSeededRandom(requestedSeed)
      const requestedInstrumentCount = options.instrumentCount ?? state.song.tracks.length
      const layoutToApply =
        options.trackLayout && options.trackLayout.length > 0
          ? options.trackLayout
          : buildLayoutFromStyle(options.style, requestedInstrumentCount)
      if (layoutToApply.length > 0) {
        let nextTracks = buildTracksFromLayout(layoutToApply, state.song.tracks)
        if (options.style === 'rock') {
          nextTracks = applyRockFlavorTrackVoicing(nextTracks, options.rockFlavor ?? 'random', random)
        }
        nextTracks = normalizeTracksForSoundSource(nextTracks)
        workingSong = {
          ...state.song,
          tracks: nextTracks,
          grid: remapGridToTracksByIndex(state.song.tracks, nextTracks, state.song.grid, state.song.stepCount)
        }
      }

      const nextGrid = generateTheoryGrid(workingSong, options, random)
      const nextBpm =
        typeof options.bpm === 'number' && Number.isFinite(options.bpm)
          ? Math.max(40, Math.min(300, Math.floor(options.bpm)))
          : randItem(styleProfile.bpm, random)
      const stepsPerBar = Math.max(1, Math.floor(workingSong.stepCount / Math.max(1, workingSong.barCount)))
      const generationToken = buildGenerationSeedToken({
        seed: requestedSeed,
        style: options.style,
        technoFlavor: options.technoFlavor ?? options.rockFlavor,
        key: options.key,
        variation: options.variation,
        mood: options.mood,
        preset: options.preset,
        repeatReady: options.repeatReady,
        loopStyle: options.loopStyle,
        randomizeBpm: typeof options.bpm !== 'number',
        bpm: nextBpm,
        barCount: workingSong.barCount,
        stepsPerBar,
        trackLayout: workingSong.tracks.map((track) => ({ name: track.name, instrument: track.instrument }))
      })

      return withHistory(
        state.song,
        {
          ...workingSong,
          bpm: nextBpm,
          lastGenerationSeed: generationToken,
          grid: nextGrid
        },
        state.past
      )
    }),

  addTrack: (instrument) =>
    set((state) => {
      if (state.song.tracks.length >= TRACK_LIMIT) return state

      const nextIndex = state.song.tracks.length + 1
      const allReal = state.song.tracks.length > 0 && state.song.tracks.every((track) => track.soundSource === 'real')
      const nextTrackBase = createTrack(nextIndex, instrument)
      const nextTrack = normalizeTrackForSoundSource({
        ...nextTrackBase,
        soundSource: allReal ? 'real' : nextTrackBase.soundSource
      })
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

  applyStyleLayout: (style, instrumentCount) =>
    set((state) => {
      const nextLayout = buildLayoutFromStyle(style, instrumentCount)
      const nextTracks = normalizeTracksForSoundSource(buildTracksFromLayout(nextLayout, state.song.tracks))

      const sameLayout =
        nextTracks.length === state.song.tracks.length &&
        nextTracks.every(
          (track, index) =>
            track.name === state.song.tracks[index]?.name &&
            track.instrument === state.song.tracks[index]?.instrument &&
            track.soundSource === state.song.tracks[index]?.soundSource &&
            track.volume === state.song.tracks[index]?.volume &&
            track.muted === state.song.tracks[index]?.muted &&
            track.solo === state.song.tracks[index]?.solo
        )
      if (sameLayout) return state

      const nextGrid = remapGridToTracksByIndex(state.song.tracks, nextTracks, state.song.grid, state.song.stepCount)

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

  setBarCount: (barCount) =>
    set((state) => {
      const boundedBarCount = Math.max(1, Math.min(16, Math.floor(barCount)))
      if (state.song.barCount === boundedBarCount) return state

      const currentStepsPerBar = Math.max(1, Math.floor(state.song.stepCount / Math.max(1, state.song.barCount)))
      const maxStepsPerBar = Math.max(1, Math.floor(1024 / boundedBarCount))
      const nextStepsPerBar = Math.max(1, Math.min(currentStepsPerBar, maxStepsPerBar))
      const nextStepCount = boundedBarCount * nextStepsPerBar

      const nextGrid = Object.fromEntries(
        state.song.tracks.map((track) => [track.id, trimRowToStepCount(state.song.grid[track.id] ?? [], nextStepCount)])
      )

      return withHistory(
        state.song,
        {
          ...state.song,
          barCount: boundedBarCount,
          stepCount: nextStepCount,
          grid: nextGrid
        },
        state.past
      )
    }),

  setStepCount: (stepCount) =>
    set((state) => {
      const boundedStepCount = Math.max(4, Math.min(1024, Math.floor(stepCount)))
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

  shiftCompositionSemitones: (semitones) =>
    set((state) => {
      const semitoneShift = Math.trunc(semitones)
      if (semitoneShift === 0) return state
      let changed = false

      const nextTracks = state.song.tracks.map((track) => {
        if (track.instrument === 'noise' || track.instrument === 'drums') return track
        const nextDefaultPitch = clampMidi(track.defaultPitch + semitoneShift)
        if (nextDefaultPitch !== track.defaultPitch) changed = true
        return {
          ...track,
          defaultPitch: nextDefaultPitch
        }
      })

      const nextGrid = Object.fromEntries(
        state.song.tracks.map((track) => {
          const row = state.song.grid[track.id] ?? []
          if (track.instrument === 'noise' || track.instrument === 'drums') return [track.id, row]

          const shiftedRow = row.map((cell) => {
            if (!cell) return null
            const nextPitch = clampMidi(cell.pitch + semitoneShift)
            if (nextPitch !== cell.pitch) changed = true
            return {
              ...cell,
              pitch: nextPitch
            }
          })

          return [track.id, shiftedRow]
        })
      )

      if (!changed) return state

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
                  instrument: track.soundSource === 'real' ? toRealSampleInstrument(instrument) : instrument,
                  settings:
                    instrument === 'noise' || instrument === 'membrane' || instrument === 'metal' || instrument === 'drums'
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

  randomizeTrackInstruments: (allowedInstruments) =>
    set((state) => {
      const pool: InstrumentType[] =
        allowedInstruments && allowedInstruments.length > 0
          ? (Array.from(new Set(allowedInstruments)) as InstrumentType[])
          : [
              'square',
              'triangle',
              'sawtooth',
              'noise',
              'fm',
              'am',
              'duo',
              'pluck',
              'guitar',
              'electric-guitar',
              'hurdy-gurdy',
              'violin',
              'viola',
              'cello',
              'bass',
              'flute',
              'ocarina',
              'harmonica',
              'piano',
              'drums',
              'membrane',
              'metal'
            ]

      if (pool.length === 0 || state.song.tracks.length === 0) return state

      const nextTracks = normalizeTracksForSoundSource(
        state.song.tracks.map((track) => {
          const chosen: InstrumentType = randItem(pool, Math.random)
          const nextInstrument = track.soundSource === 'real' ? toRealSampleInstrument(chosen) : chosen
          return {
            ...track,
            instrument: nextInstrument,
            settings:
              nextInstrument === 'noise' || nextInstrument === 'membrane' || nextInstrument === 'metal' || nextInstrument === 'drums'
                ? {
                    ...track.settings,
                    envelope: {
                      ...track.settings.envelope,
                      sustain: 0
                    }
                  }
                : track.settings
          }
        })
      )

      const unchanged = nextTracks.every((track, index) => track.instrument === state.song.tracks[index]?.instrument)
      if (unchanged) return state

      return {
        ...withHistory(
          state.song,
          {
            ...state.song,
            tracks: nextTracks
          },
          state.past
        )
      }
    }),

  setTrackSoundSource: (trackId, soundSource) =>
    set((state) => ({
      ...withHistory(
        state.song,
        {
          ...state.song,
          tracks: state.song.tracks.map((track) =>
            track.id === trackId ? normalizeTrackForSoundSource({ ...track, soundSource }) : track
          )
        },
        state.past
      )
    })),

  setAllTrackSoundSource: (soundSource) =>
    set((state) => ({
      ...withHistory(
        state.song,
        {
          ...state.song,
          tracks: normalizeTracksForSoundSource(state.song.tracks.map((track) => ({ ...track, soundSource })))
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
