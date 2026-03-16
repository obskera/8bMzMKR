import React from 'react'
import TrackEditor from './TrackEditor'
import { useProjectStore } from '../store/useProjectStore'
import type { InstrumentType } from '../types/song'
import type {
  ChordStructure,
  GeneratorSubstyle,
  GeneratorKey,
  GeneratorMood,
  GeneratorPreset,
  SongForm,
  GeneratorStyle,
  RockFlavor,
  RockProgressionMode,
  RockRhythmPattern,
  RockSectionForm,
  TechnoFlavor,
  GeneratorVariation,
  LoopStyle
} from '../store/useProjectStore'
import { createAutoSeed, parseGenerationSeedToken } from '../utils/seededRandom'

interface StepGridProps {
  currentStep: number | null
  onStopPlayback: () => void
  onRestartPlayback: () => void
}

const RESOLUTION_OPTIONS = [8, 16, 32, 64]
const CLIP_BAR_OPTIONS = [1, 2, 4, 8, 16]
const INSTRUMENT_COUNT_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
const OCTAVE_OPTIONS = [1, 2, 3, 4, 5, 6, 7]
const OCTAVE_RANGE_OPTIONS = [1, 2, 3, 4]
const SUPPORTED_INSTRUMENTS: InstrumentType[] = [
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
const INSTRUMENT_OPTIONS: Array<{ value: InstrumentType; label: string }> = [
  { value: 'square', label: 'Square' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'sawtooth', label: 'Saw' },
  { value: 'fm', label: 'FM' },
  { value: 'am', label: 'AM' },
  { value: 'duo', label: 'Duo' },
  { value: 'pluck', label: 'Pluck' },
  { value: 'guitar', label: 'Guitar' },
  { value: 'electric-guitar', label: 'Electric Guitar' },
  { value: 'hurdy-gurdy', label: 'Hurdy Gurdy' },
  { value: 'violin', label: 'Violin' },
  { value: 'viola', label: 'Viola' },
  { value: 'cello', label: 'Cello' },
  { value: 'bass', label: 'Bass' },
  { value: 'flute', label: 'Flute' },
  { value: 'ocarina', label: 'Ocarina' },
  { value: 'harmonica', label: 'Harmonica' },
  { value: 'piano', label: 'Piano' },
  { value: 'drums', label: 'Drum Kit' },
  { value: 'membrane', label: 'Membrane' },
  { value: 'metal', label: 'Metal' },
  { value: 'noise', label: 'Noise' }
]

const REAL_INSTRUMENT_OPTIONS: Array<{ value: InstrumentType; label: string }> = [
  { value: 'guitar', label: 'Guitar' },
  { value: 'electric-guitar', label: 'Electric Guitar' },
  { value: 'hurdy-gurdy', label: 'Hurdy Gurdy' },
  { value: 'violin', label: 'Violin' },
  { value: 'viola', label: 'Viola' },
  { value: 'cello', label: 'Cello' },
  { value: 'bass', label: 'Bass' },
  { value: 'flute', label: 'Flute' },
  { value: 'ocarina', label: 'Ocarina' },
  { value: 'harmonica', label: 'Harmonica' },
  { value: 'piano', label: 'Piano' },
  { value: 'drums', label: 'Drum Kit' }
]

const NOTE_LENGTHS = [
  { id: 'whole', label: 'Whole', denominator: 1 },
  { id: 'half', label: 'Half', denominator: 2 },
  { id: 'quarter', label: 'Quarter', denominator: 4 },
  { id: 'eighth', label: '8th', denominator: 8 },
  { id: 'sixteenth', label: '16th', denominator: 16 },
  { id: 'thirtySecond', label: '32nd', denominator: 32 }
] as const
const GENERATOR_MOODS: Array<{ value: GeneratorMood; label: string }> = [
  { value: 'random', label: 'Random' },
  { value: 'major', label: 'Major Family' },
  { value: 'minor', label: 'Minor Family' },
  { value: 'ionian', label: 'Ionian' },
  { value: 'dorian', label: 'Dorian' },
  { value: 'phrygian', label: 'Phrygian' },
  { value: 'lydian', label: 'Lydian' },
  { value: 'mixolydian', label: 'Mixolydian' },
  { value: 'aeolian', label: 'Aeolian' },
  { value: 'locrian', label: 'Locrian' }
]
const GENERATOR_KEYS: Array<{ value: GeneratorKey; label: string }> = [
  { value: 'random', label: 'Random Key' },
  { value: 'c-major', label: 'C Major' },
  { value: 'g-major', label: 'G Major' },
  { value: 'd-major', label: 'D Major' },
  { value: 'a-major', label: 'A Major' },
  { value: 'e-major', label: 'E Major' },
  { value: 'f-major', label: 'F Major' },
  { value: 'bb-major', label: 'Bb Major' },
  { value: 'a-minor', label: 'A Minor' },
  { value: 'e-minor', label: 'E Minor' },
  { value: 'd-minor', label: 'D Minor' },
  { value: 'g-minor', label: 'G Minor' },
  { value: 'c-minor', label: 'C Minor' }
]
const GENERATOR_PRESETS: Array<{ value: GeneratorPreset; label: string }> = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'menu', label: 'Menu' },
  { value: 'battle', label: 'Battle' },
  { value: 'background', label: 'Background' },
  { value: 'cutscene', label: 'Cutscene' },
  { value: 'chill', label: 'Chill' },
  { value: 'upbeat', label: 'Upbeat' },
  { value: 'dark', label: 'Dark' },
  { value: 'arp-heavy', label: 'Arp Heavy' }
]
const GENERATOR_VARIATIONS: Array<{ value: GeneratorVariation; label: string }> = [
  { value: 'conservative', label: 'Conservative' },
  { value: 'normal', label: 'Normal' },
  { value: 'wild', label: 'Wild' }
]
const GENERATOR_STYLES: Array<{ value: GeneratorStyle; label: string }> = [
  { value: 'chiptune', label: 'Chiptune' },
  { value: 'kpop', label: 'kStyle' },
  { value: 'sea-shanty', label: 'Sea' },
  { value: 'celtic', label: 'cella' },
  { value: 'hurdy-gurdy', label: 'Hurdy Gurdy' },
  { value: 'wind', label: 'winds' },
  { value: 'piano', label: 'Piano' },
  { value: 'classical', label: 'classica' },
  { value: 'rock', label: 'rockin' },
  { value: 'techno', label: 'techno' }
]
const STYLE_DEFAULT_BPM: Record<GeneratorStyle, number> = {
  chiptune: 128,
  kpop: 120,
  'sea-shanty': 88,
  celtic: 112,
  'hurdy-gurdy': 96,
  wind: 84,
  piano: 80,
  classical: 84,
  rock: 124,
  techno: 132
}
const LOOP_STYLE_OPTIONS: Array<{ value: LoopStyle; label: string }> = [
  { value: 'strong-cadence', label: 'Strong Cadence' },
  { value: 'seamless-ambient', label: 'Seamless Ambient' }
]
const SONG_FORM_OPTIONS: Array<{ value: SongForm; label: string }> = [
  { value: 'random', label: 'Random Form' },
  { value: 'auto', label: 'Auto Form' },
  { value: 'aaaa', label: 'AAAA' },
  { value: 'aab', label: 'AAB' },
  { value: 'aabb', label: 'AABB' },
  { value: 'abab', label: 'ABAB' },
  { value: 'abba', label: 'ABBA' },
  { value: 'aaba', label: 'AABA' },
  { value: 'abcb', label: 'ABCB' }
]
const CHORD_STRUCTURE_OPTIONS: Array<{ value: ChordStructure; label: string }> = [
  { value: 'random', label: 'Random Chords' },
  { value: 'triads', label: 'Triads' },
  { value: 'power', label: 'Power' },
  { value: 'seventh', label: 'Seventh' },
  { value: 'sus2', label: 'Sus2' },
  { value: 'sus4', label: 'Sus4' }
]
const STYLE_SUBSTYLE_OPTIONS: Record<GeneratorStyle, Array<{ value: GeneratorSubstyle; label: string }>> = {
  chiptune: [
    { value: 'random', label: 'Random Substyle' },
    { value: 'arcade', label: 'Arcade' },
    { value: 'narrative', label: 'Narrative' }
  ],
  kpop: [
    { value: 'random', label: 'Random Substyle' },
    { value: 'dance', label: 'Dance' },
    { value: 'ballad', label: 'Ballad' }
  ],
  'sea-shanty': [
    { value: 'random', label: 'Random Substyle' },
    { value: 'work-song', label: 'Work Song' },
    { value: 'anthemic', label: 'Anthemic' }
  ],
  celtic: [
    { value: 'random', label: 'Random Substyle' },
    { value: 'reel', label: 'Reel' },
    { value: 'air', label: 'Air' }
  ],
  'hurdy-gurdy': [
    { value: 'random', label: 'Random Substyle' },
    { value: 'drone', label: 'Drone' },
    { value: 'wheel-dance', label: 'Wheel Dance' }
  ],
  wind: [
    { value: 'random', label: 'Random Substyle' },
    { value: 'ensemble', label: 'Ensemble' },
    { value: 'soloist', label: 'Soloist' }
  ],
  piano: [
    { value: 'random', label: 'Random Substyle' },
    { value: 'etude', label: 'Etude' },
    { value: 'nocturne', label: 'Nocturne' }
  ],
  classical: [
    { value: 'random', label: 'Random Substyle' },
    { value: 'sonata', label: 'Sonata' },
    { value: 'minuet', label: 'Minuet' }
  ],
  rock: [
    { value: 'random', label: 'Random Substyle' },
    { value: 'arena', label: 'Arena' },
    { value: 'garage', label: 'Garage' }
  ],
  techno: [
    { value: 'random', label: 'Random Substyle' },
    { value: 'club', label: 'Club' },
    { value: 'warehouse', label: 'Warehouse' }
  ]
}
const TECHNO_FLAVOR_OPTIONS: Array<{ value: TechnoFlavor; label: string }> = [
  { value: 'random', label: 'Random' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'melodic', label: 'Melodic' },
  { value: 'acid', label: 'Acid' },
  { value: 'industrial', label: 'Industrial' }
]
const ROCK_FLAVOR_OPTIONS: Array<{ value: RockFlavor; label: string }> = [
  { value: 'random', label: 'Random' },
  { value: 'classic', label: 'Classic' },
  { value: 'hard', label: 'Hard' },
  { value: 'metal-ish', label: 'Metal-ish' },
  { value: 'blues-rock', label: 'Blues Rock' }
]
const ROCK_PROGRESSION_MODE_OPTIONS: Array<{ value: RockProgressionMode; label: string }> = [
  { value: 'auto', label: 'Auto Form' },
  { value: 'riff-vamp', label: 'Riff Vamp' },
  { value: 'anthem-lift', label: 'Anthem Lift' },
  { value: 'blues-turnaround', label: 'Blues Turnaround' },
  { value: 'prog-suite', label: 'Prog Suite' }
]
const ROCK_SECTION_FORM_OPTIONS: Array<{ value: RockSectionForm; label: string }> = [
  { value: 'auto', label: 'Auto Sections' },
  { value: 'aaaa', label: 'AAAA' },
  { value: 'aab', label: 'AAB' },
  { value: 'aabb', label: 'AABB' },
  { value: 'abab', label: 'ABAB' },
  { value: 'abba', label: 'ABBA' },
  { value: 'aaba', label: 'AABA' },
  { value: 'abcb', label: 'ABCB' }
]
const ROCK_RHYTHM_PATTERN_OPTIONS: Array<{ value: RockRhythmPattern; label: string }> = [
  { value: 'auto', label: 'Auto Groove' },
  { value: 'straight-8ths', label: 'Straight 8ths' },
  { value: 'offbeat-push', label: 'Offbeat Push' },
  { value: 'half-time', label: 'Half-Time' },
  { value: 'punk-drive', label: 'Punk Drive' },
  { value: 'sync-16ths', label: 'Sync 16ths' },
  { value: 'chug-16ths', label: 'Chug 16ths' },
  { value: 'gallop', label: 'Gallop' }
]

type NoteLengthId = (typeof NOTE_LENGTHS)[number]['id']

interface SelectedNote {
  startStep: number
  pitch: number
}

function midiLabel(pitch: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const note = names[pitch % 12]
  const octave = Math.floor(pitch / 12) - 1
  return `${note}${octave}`
}

function findOwningStepAtPitch(
  row: Array<{ length: number; pitch: number } | null>,
  step: number,
  pitch: number
): number | null {
  for (let index = 0; index < row.length; index += 1) {
    const cell = row[index]
    if (!cell || cell.pitch !== pitch) continue
    if (index <= step && step < index + cell.length) return index
  }

  return null
}

function isBlackKey(pitch: number): boolean {
  const index = pitch % 12
  return index === 1 || index === 3 || index === 6 || index === 8 || index === 10
}

function parseManualRockSections(input: string): Partial<Record<'A' | 'B' | 'C', number[]>> | undefined {
  const parts = input
    .split('|')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .slice(0, 3)

  if (parts.length === 0) return undefined

  const sectionKeys: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C']
  const result: Partial<Record<'A' | 'B' | 'C', number[]>> = {}

  for (let index = 0; index < parts.length; index += 1) {
    const degrees = parts[index]
      .split(/[\s,]+/)
      .map((token) => Number(token))
      .filter((value) => Number.isFinite(value))
      .map((value) => (value >= 1 ? Math.floor(value) - 1 : Math.floor(value)))
      .slice(0, 16)

    if (degrees.length > 0) {
      result[sectionKeys[index]] = degrees
    }
  }

  return result.A && result.A.length > 0 ? result : undefined
}

interface PianoRollCellProps {
  occupied: boolean
  selected: boolean
  playhead: boolean
  groupEnd: boolean
  blackKeyRow: boolean
  onClick: () => void
  ariaLabel: string
}

const PianoRollCell = React.memo(function PianoRollCell({
  occupied,
  selected,
  playhead,
  groupEnd,
  blackKeyRow,
  onClick,
  ariaLabel
}: PianoRollCellProps): React.JSX.Element {
  return (
    <button
      className={[
        'roll-cell',
        occupied ? 'occupied' : '',
        selected ? 'selected' : '',
        playhead ? 'playhead' : '',
        groupEnd ? 'group-end' : '',
        blackKeyRow ? 'black-key-row' : ''
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={occupied}
    />
  )
})

export default function StepGrid({ currentStep, onStopPlayback, onRestartPlayback }: StepGridProps): React.JSX.Element {
  const {
    song,
    applyStyleLayout,
    removeTrack,
    generateTheorySong,
    placeNote,
    setNoteLength,
    removeNoteAtStep,
    setBarCount,
    setStepCount,
    shiftCompositionSemitones,
    setBpm,
    setTrackMute,
    setTrackSolo,
    setTrackVolume,
    setTrackInstrument,
    randomizeTrackInstruments,
    setAllTrackSoundSource,
    setTrackNoiseType,
    setTrackEnvelope
  } = useProjectStore()
  const [octaveStart, setOctaveStart] = React.useState(5)
  const [octaveCount, setOctaveCount] = React.useState(1)
  const [selectedLengthId, setSelectedLengthId] = React.useState<NoteLengthId>('quarter')
  const [instrumentCount, setInstrumentCount] = React.useState(4)
  const [generatorStyle, setGeneratorStyle] = React.useState<GeneratorStyle>('chiptune')
  const [generatorSubstyle, setGeneratorSubstyle] = React.useState<GeneratorSubstyle>('random')
  const [generatorSongForm, setGeneratorSongForm] = React.useState<SongForm>('random')
  const [generatorChordStructure, setGeneratorChordStructure] = React.useState<ChordStructure>('random')
  const [generatorKey, setGeneratorKey] = React.useState<GeneratorKey>('random')
  const [generatorVariation, setGeneratorVariation] = React.useState<GeneratorVariation>('normal')
  const [technoFlavor, setTechnoFlavor] = React.useState<TechnoFlavor>('random')
  const [rockFlavor, setRockFlavor] = React.useState<RockFlavor>('random')
  const [rockProgressionMode, setRockProgressionMode] = React.useState<RockProgressionMode>('auto')
  const [rockRhythmPattern, setRockRhythmPattern] = React.useState<RockRhythmPattern>('auto')
  const [rockSectionForm, setRockSectionForm] = React.useState<RockSectionForm>('auto')
  const [rockSectionInput, setRockSectionInput] = React.useState('0 4 5 3 | 0 5 4 3 | 0 3 4 5')
  const [generatorMood, setGeneratorMood] = React.useState<GeneratorMood>('random')
  const [generatorPreset, setGeneratorPreset] = React.useState<GeneratorPreset>('balanced')
  const [repeatReadyLoops, setRepeatReadyLoops] = React.useState(false)
  const [loopStyle, setLoopStyle] = React.useState<LoopStyle>('strong-cadence')
  const [showSeedControls, setShowSeedControls] = React.useState(false)
  const [seedInput, setSeedInput] = React.useState('')
  const [seedFeedback, setSeedFeedback] = React.useState('')
  const [generationBpm, setGenerationBpm] = React.useState(song.bpm)
  const [randomizeBpm, setRandomizeBpm] = React.useState(false)
  const [bpmInput, setBpmInput] = React.useState(String(song.bpm))
  const [isBpmPinned, setIsBpmPinned] = React.useState(false)
  const [selectedNote, setSelectedNote] = React.useState<(SelectedNote & { trackId: string }) | null>(null)
  const [manualEditorOpen, setManualEditorOpen] = React.useState(false)

  React.useEffect(() => {
    if (!selectedNote) return
    const trackExists = song.tracks.some((track) => track.id === selectedNote.trackId)
    if (!trackExists) setSelectedNote(null)
  }, [selectedNote, song.tracks])

  React.useEffect(() => {
    if (!song.lastGenerationSeed) return
    setSeedInput(song.lastGenerationSeed)
  }, [song.lastGenerationSeed])

  React.useEffect(() => {
    setInstrumentCount(song.tracks.length)
  }, [song.tracks.length])

  React.useEffect(() => {
    setGenerationBpm(song.bpm)
    setBpmInput(String(song.bpm))
  }, [song.bpm])

  const visiblePitches = React.useMemo(() => {
    const highest = Math.min(127, octaveStart * 12 + octaveCount * 12 - 1)
    const lowest = Math.max(0, octaveStart * 12)
    const pitches: number[] = []

    for (let pitch = highest; pitch >= lowest; pitch -= 1) {
      pitches.push(pitch)
    }

    return pitches
  }, [octaveCount, octaveStart])

  const useRealSamples = React.useMemo(() => song.tracks.every((track) => track.soundSource === 'real'), [song.tracks])
  const availableInstrumentOptions = useRealSamples ? REAL_INSTRUMENT_OPTIONS : INSTRUMENT_OPTIONS
  const substyleOptions = STYLE_SUBSTYLE_OPTIONS[generatorStyle]

  React.useEffect(() => {
    if (!substyleOptions.some((option) => option.value === generatorSubstyle)) {
      setGeneratorSubstyle('random')
    }
  }, [generatorStyle, generatorSubstyle, substyleOptions])

  if (song.tracks.length === 0) {
    return <div className="step-grid">No tracks available.</div>
  }

  const stepsPerMeasure = Math.max(1, Math.floor(song.stepCount / Math.max(1, song.barCount)))
  const selectedLength = NOTE_LENGTHS.find((item) => item.id === selectedLengthId) ?? NOTE_LENGTHS[2]
  const selectedLengthSteps = Math.max(1, Math.floor(stepsPerMeasure / selectedLength.denominator))
  const activeTrack = selectedNote ? song.tracks.find((track) => track.id === selectedNote.trackId) : null
  const activeRow = selectedNote ? song.grid[selectedNote.trackId] ?? [] : []
  const activeNote =
    selectedNote && activeRow[selectedNote.startStep] && activeRow[selectedNote.startStep]?.pitch === selectedNote.pitch
      ? activeRow[selectedNote.startStep]
      : null

  function handleResolutionChange(nextResolution: number): void {
    const boundedResolution = Math.max(8, Math.min(64, nextResolution))
    setStepCount(song.barCount * boundedResolution)
  }

  function handleClipLengthChange(nextBars: number): void {
    setBarCount(nextBars)
  }

  function applyLength(denominator: number): void {
    if (!selectedNote || !activeNote) return
    const nextLength = Math.max(1, Math.floor(stepsPerMeasure / denominator))
    setNoteLength(selectedNote.trackId, selectedNote.startStep, nextLength)
  }

  function removeSelectedNote(): void {
    if (!selectedNote || !activeNote) return
    removeNoteAtStep(selectedNote.trackId, selectedNote.startStep)
    setSelectedNote(null)
  }

  function generateFromCurrentSeedInput(overrideBpm?: number, overrideChordStructure?: ChordStructure): void {
    onStopPlayback()
    let nextMood = generatorMood
    let nextPreset = generatorPreset
    let nextStyle = generatorStyle
    let nextSubstyle = generatorSubstyle
    let nextSongForm = generatorSongForm
    let nextChordStructure = overrideChordStructure ?? generatorChordStructure
    let nextTechnoFlavor = technoFlavor
    let nextRockFlavor = rockFlavor
    let nextKey = generatorKey
    let nextVariation = generatorVariation
    let nextRepeatReady = repeatReadyLoops
    let nextLoopStyle = loopStyle
    let nextRockProgressionMode = rockProgressionMode
    let nextRockRhythmPattern = rockRhythmPattern
    let nextRockSectionForm = rockSectionForm
    let nextRockSectionProgressions = parseManualRockSections(rockSectionInput)
    let nextBpm = typeof overrideBpm === 'number' ? overrideBpm : generationBpm
    let nextRandomizeBpm = randomizeBpm
    let nextInstrumentCount = instrumentCount
    let nextSeed: string | undefined = showSeedControls ? seedInput : undefined
    let nextTrackLayout: Array<{ name: string; instrument: InstrumentType }> | undefined

    const parsedToken = showSeedControls ? parseGenerationSeedToken(seedInput) : null
    if (parsedToken) {
      const validStyle = GENERATOR_STYLES.some((item) => item.value === parsedToken.style)
      const validKey = GENERATOR_KEYS.some((item) => item.value === parsedToken.key)
      const validTechnoFlavor = TECHNO_FLAVOR_OPTIONS.some((item) => item.value === parsedToken.technoFlavor)
      const validRockFlavor = ROCK_FLAVOR_OPTIONS.some((item) => item.value === (parsedToken.technoFlavor as RockFlavor))
      const validVariation = GENERATOR_VARIATIONS.some((item) => item.value === parsedToken.variation)
      const validMood = GENERATOR_MOODS.some((item) => item.value === parsedToken.mood)
      const validPreset = GENERATOR_PRESETS.some((item) => item.value === parsedToken.preset)
      const validLoopStyle = LOOP_STYLE_OPTIONS.some((item) => item.value === parsedToken.loopStyle)

      if (validStyle) {
        nextStyle = parsedToken.style as GeneratorStyle
        setGeneratorStyle(nextStyle)
      }
      if (validKey) {
        nextKey = parsedToken.key as GeneratorKey
        setGeneratorKey(nextKey)
      }
      if (validTechnoFlavor) {
        nextTechnoFlavor = parsedToken.technoFlavor as TechnoFlavor
        setTechnoFlavor(nextTechnoFlavor)
      }
      if (validRockFlavor) {
        nextRockFlavor = parsedToken.technoFlavor as RockFlavor
        setRockFlavor(nextRockFlavor)
      }
      if (validVariation) {
        nextVariation = parsedToken.variation as GeneratorVariation
        setGeneratorVariation(nextVariation)
      }

      if (validMood) {
        nextMood = parsedToken.mood as GeneratorMood
        setGeneratorMood(nextMood)
      }
      if (validPreset) {
        nextPreset = parsedToken.preset as GeneratorPreset
        setGeneratorPreset(nextPreset)
      }
      if (validLoopStyle) {
        nextLoopStyle = parsedToken.loopStyle as LoopStyle
        setLoopStyle(nextLoopStyle)
      }

      nextRepeatReady = parsedToken.repeatReady
      setRepeatReadyLoops(nextRepeatReady)

      const nextBarCount = Math.max(1, Math.min(16, parsedToken.barCount))
      const nextStepsPerBar = Math.max(8, Math.min(64, parsedToken.stepsPerBar))
      setBarCount(nextBarCount)
      setStepCount(nextBarCount * nextStepsPerBar)

      nextTrackLayout = parsedToken.trackLayout
        .filter((item) => SUPPORTED_INSTRUMENTS.includes(item.instrument as InstrumentType))
        .map((item) => ({ name: item.name, instrument: item.instrument as InstrumentType }))
      nextInstrumentCount = nextTrackLayout.length
      setInstrumentCount(nextInstrumentCount)

      if (typeof parsedToken.bpm === 'number' && Number.isFinite(parsedToken.bpm)) {
        nextBpm = Math.max(40, Math.min(300, Math.floor(parsedToken.bpm)))
        setGenerationBpm(nextBpm)
        setBpmInput(String(nextBpm))
        setIsBpmPinned(true)
        setBpm(nextBpm)
      }
      nextRandomizeBpm = parsedToken.randomizeBpm === true
      setRandomizeBpm(nextRandomizeBpm)

      nextSeed = parsedToken.seed
      setSeedInput(parsedToken.seed)
      setSeedFeedback('Loaded full settings and track layout from seed token')
    }

    generateTheorySong({
      style: nextStyle,
      substyle: nextSubstyle,
      songForm: nextSongForm,
      chordStructure: nextChordStructure,
      technoFlavor: nextTechnoFlavor,
      rockFlavor: nextRockFlavor,
      rockProgressionMode: nextRockProgressionMode,
      rockRhythmPattern: nextRockRhythmPattern,
      rockSectionForm: nextRockSectionForm,
      rockSectionProgressions: nextRockSectionProgressions,
      key: nextKey,
      variation: nextVariation,
      mood: nextMood,
      preset: nextPreset,
      repeatReady: nextRepeatReady,
      loopStyle: nextLoopStyle,
      bpm: nextRandomizeBpm ? undefined : nextBpm,
      instrumentCount: nextInstrumentCount,
      seed: nextSeed,
      trackLayout: nextTrackLayout
    })
    onRestartPlayback()
  }

  function handleStyleChange(nextStyle: GeneratorStyle): void {
    setGeneratorStyle(nextStyle)
    applyStyleLayout(nextStyle, instrumentCount)

    if (!isBpmPinned && !randomizeBpm) {
      const styleBpm = STYLE_DEFAULT_BPM[nextStyle]
      setGenerationBpm(styleBpm)
      setBpmInput(String(styleBpm))
      setBpm(styleBpm)
    }
  }

  function handleInstrumentCountChange(nextCount: number): void {
    const boundedCount = Math.max(1, Math.min(16, nextCount))
    setInstrumentCount(boundedCount)
    applyStyleLayout(generatorStyle, boundedCount)
  }

  function applyBpmValue(nextBpm: number): void {
    const boundedBpm = Math.max(40, Math.min(300, Math.floor(nextBpm)))
    setGenerationBpm(boundedBpm)
    setBpmInput(String(boundedBpm))
    setBpm(boundedBpm)
  }

  function commitBpmInput(): number {
    const parsed = Number(bpmInput)
    if (!Number.isFinite(parsed)) {
      setBpmInput(String(generationBpm))
      return generationBpm
    }

    const boundedBpm = Math.max(40, Math.min(300, Math.floor(parsed)))
    applyBpmValue(boundedBpm)
    return boundedBpm
  }

  function nudgeBpm(delta: number): void {
    applyBpmValue(generationBpm + delta)
  }

  function toggleBpmMode(): void {
    if (isBpmPinned) {
      const styleBpm = STYLE_DEFAULT_BPM[generatorStyle]
      setIsBpmPinned(false)
      applyBpmValue(styleBpm)
      return
    }

    setIsBpmPinned(true)
  }

  async function copySeedToClipboard(): Promise<void> {
    const value = song.lastGenerationSeed ?? seedInput.trim()
    if (!value) {
      setSeedFeedback('No seed to copy')
      return
    }

    try {
      await navigator.clipboard.writeText(value)
      setSeedFeedback('Seed copied')
    } catch {
      setSeedFeedback('Clipboard copy failed')
    }
  }

  async function pasteSeedFromClipboard(): Promise<void> {
    try {
      const value = await navigator.clipboard.readText()
      setSeedInput(value)
      setSeedFeedback(value.trim().length > 0 ? 'Seed pasted' : 'Clipboard empty')
    } catch {
      setSeedFeedback('Clipboard paste failed')
    }
  }

  return (
    <div className="step-grid">
      <section className="roll-toolbar" aria-label="Generation controls">
        <label>
          <span>Instruments</span>
          <select value={instrumentCount} onChange={(event) => handleInstrumentCountChange(Number(event.target.value))}>
            {INSTRUMENT_COUNT_OPTIONS.map((count) => (
              <option key={count} value={count}>
                {count} parts
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Style</span>
          <select value={generatorStyle} onChange={(event) => handleStyleChange(event.target.value as GeneratorStyle)}>
            {GENERATOR_STYLES.map((style) => (
              <option key={style.value} value={style.value}>
                {style.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Substyle</span>
          <select value={generatorSubstyle} onChange={(event) => setGeneratorSubstyle(event.target.value as GeneratorSubstyle)}>
            {substyleOptions.map((option) => (
              <option key={`${generatorStyle}-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Song Form</span>
          <select value={generatorSongForm} onChange={(event) => setGeneratorSongForm(event.target.value as SongForm)}>
            {SONG_FORM_OPTIONS.map((form) => (
              <option key={form.value} value={form.value}>
                {form.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Chord Structure</span>
          <select
            value={generatorChordStructure}
            onChange={(event) => {
              const nextChord = event.target.value as ChordStructure
              setGeneratorChordStructure(nextChord)
              generateFromCurrentSeedInput(undefined, nextChord)
            }}
          >
            {CHORD_STRUCTURE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {generatorStyle === 'techno' ? (
          <label>
            <span>Flavor</span>
            <select value={technoFlavor} onChange={(event) => setTechnoFlavor(event.target.value as TechnoFlavor)}>
              {TECHNO_FLAVOR_OPTIONS.map((flavor) => (
                <option key={flavor.value} value={flavor.value}>
                  {flavor.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {generatorStyle === 'rock' ? (
          <>
            <label>
              <span>Flavor</span>
              <select value={rockFlavor} onChange={(event) => setRockFlavor(event.target.value as RockFlavor)}>
                {ROCK_FLAVOR_OPTIONS.map((flavor) => (
                  <option key={flavor.value} value={flavor.value}>
                    {flavor.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Harmony</span>
              <select
                value={rockProgressionMode}
                onChange={(event) => setRockProgressionMode(event.target.value as RockProgressionMode)}
              >
                {ROCK_PROGRESSION_MODE_OPTIONS.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Rhythm Pattern</span>
              <select value={rockRhythmPattern} onChange={(event) => setRockRhythmPattern(event.target.value as RockRhythmPattern)}>
                {ROCK_RHYTHM_PATTERN_OPTIONS.map((pattern) => (
                  <option key={pattern.value} value={pattern.value}>
                    {pattern.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Section Form</span>
              <select value={rockSectionForm} onChange={(event) => setRockSectionForm(event.target.value as RockSectionForm)}>
                {ROCK_SECTION_FORM_OPTIONS.map((form) => (
                  <option key={form.value} value={form.value}>
                    {form.label}
                  </option>
                ))}
              </select>
            </label>

            {rockSectionForm !== 'auto' ? (
              <label>
                <span>Chord Sections (A|B|C)</span>
                <input
                  className="seed-input"
                  type="text"
                  value={rockSectionInput}
                  onChange={(event) => setRockSectionInput(event.target.value)}
                  placeholder="0 4 5 3 | 0 5 4 3 | 0 3 4 5"
                  aria-label="Manual rock section progression"
                />
              </label>
            ) : null}
          </>
        ) : null}

        <label>
          <span>Key</span>
          <select value={generatorKey} onChange={(event) => setGeneratorKey(event.target.value as GeneratorKey)}>
            {GENERATOR_KEYS.map((key) => (
              <option key={key.value} value={key.value}>
                {key.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Variation</span>
          <select value={generatorVariation} onChange={(event) => setGeneratorVariation(event.target.value as GeneratorVariation)}>
            {GENERATOR_VARIATIONS.map((variation) => (
              <option key={variation.value} value={variation.value}>
                {variation.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Mood</span>
          <select value={generatorMood} onChange={(event) => setGeneratorMood(event.target.value as GeneratorMood)}>
            {GENERATOR_MOODS.map((mood) => (
              <option key={mood.value} value={mood.value}>
                {mood.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Preset</span>
          <select value={generatorPreset} onChange={(event) => setGeneratorPreset(event.target.value as GeneratorPreset)}>
            {GENERATOR_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>

        <div className="roll-toolbar-checkbox-row" aria-label="Mode toggles">
          <label className="toolbar-toggle">
            <span>Real Samples</span>
            <input
              type="checkbox"
              checked={useRealSamples}
              onChange={(event) => {
                setAllTrackSoundSource(event.target.checked ? 'real' : 'synth')
                onRestartPlayback()
              }}
              aria-label="Toggle real sample playback for all tracks"
            />
            <small>Applies to all tracks</small>
          </label>

          <label className="toolbar-toggle">
            <span>Show Seed</span>
            <input
              type="checkbox"
              checked={showSeedControls}
              onChange={(event) => setShowSeedControls(event.target.checked)}
              aria-label="Show deterministic seed controls"
            />
            <small>Show seed controls</small>
          </label>

          <label className="toolbar-toggle">
            <span>Repeat Ready</span>
            <input
              type="checkbox"
              checked={repeatReadyLoops}
              onChange={(event) => setRepeatReadyLoops(event.target.checked)}
              aria-label="Generate repeat-ready loop transitions"
            />
            <small>Loop-safe endings</small>
          </label>

          <label className="toolbar-toggle">
            <span>Randomize BPM</span>
            <input type="checkbox" checked={randomizeBpm} onChange={(event) => setRandomizeBpm(event.target.checked)} />
            <small>Auto tempo per style</small>
          </label>
        </div>

        {showSeedControls ? (
          <>
            <label>
              <span>Seed</span>
              <input
                className="seed-input"
                type="text"
                value={seedInput}
                onChange={(event) => setSeedInput(event.target.value)}
                placeholder="leave blank for auto seed"
                aria-label="Seed for deterministic generation"
              />
            </label>

            <button type="button" className="secondary-btn" onClick={() => setSeedInput(createAutoSeed())}>
              New Seed
            </button>

            <button type="button" className="secondary-btn" onClick={() => void copySeedToClipboard()}>
              Copy Seed
            </button>

            <button type="button" className="secondary-btn" onClick={() => void pasteSeedFromClipboard()}>
              Paste Seed
            </button>
          </>
        ) : null}

        <label>
          <span>Loop Style</span>
          <select value={loopStyle} onChange={(event) => setLoopStyle(event.target.value as LoopStyle)} disabled={!repeatReadyLoops}>
            {LOOP_STYLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Clip Length</span>
          <select value={song.barCount} onChange={(event) => handleClipLengthChange(Number(event.target.value))}>
            {CLIP_BAR_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} {option === 1 ? 'bar' : 'bars'}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Resolution</span>
          <select value={stepsPerMeasure} onChange={(event) => handleResolutionChange(Number(event.target.value))}>
            {RESOLUTION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                1/{option} ({song.barCount} {song.barCount === 1 ? 'bar' : 'bars'})
              </option>
            ))}
          </select>
        </label>

        <div className="roll-toolbar-timing-row">
          {!randomizeBpm ? (
            <label className="bpm-picker">
              <span>BPM</span>
              <div className="bpm-input-row">
                <button type="button" className="bpm-nudge bpm-nudge-big" onClick={() => nudgeBpm(-10)} aria-label="Decrease BPM by 10">
                  −10
                </button>
                <button type="button" className="bpm-nudge bpm-nudge-med" onClick={() => nudgeBpm(-5)} aria-label="Decrease BPM by 5">
                  −5
                </button>
                <button type="button" className="bpm-nudge" onClick={() => nudgeBpm(-1)} aria-label="Decrease BPM by 1">
                  −
                </button>
                <input
                  className="bpm-input"
                  type="text"
                  inputMode="numeric"
                  value={bpmInput}
                  onChange={(event) => setBpmInput(event.target.value.replace(/[^0-9]/g, ''))}
                  onBlur={() => {
                    commitBpmInput()
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      commitBpmInput()
                    }
                  }}
                  aria-label="Generator BPM"
                />
                <button type="button" className="bpm-nudge" onClick={() => nudgeBpm(1)} aria-label="Increase BPM by 1">
                  +
                </button>
                <button type="button" className="bpm-nudge bpm-nudge-med" onClick={() => nudgeBpm(5)} aria-label="Increase BPM by 5">
                  +5
                </button>
                <button type="button" className="bpm-nudge bpm-nudge-big" onClick={() => nudgeBpm(10)} aria-label="Increase BPM by 10">
                  +10
                </button>
              </div>
              <div className="bpm-preset-row">
                <button type="button" className="bpm-preset-btn" onClick={() => applyBpmValue(65)} aria-label="Slow tempo 65 BPM">Slow</button>
                <button type="button" className="bpm-preset-btn" onClick={() => applyBpmValue(100)} aria-label="Mid tempo 100 BPM">Mid</button>
                <button type="button" className="bpm-preset-btn" onClick={() => applyBpmValue(130)} aria-label="Fast tempo 130 BPM">Fast</button>
                <button type="button" className="bpm-preset-btn" onClick={() => applyBpmValue(160)} aria-label="Hard tempo 160 BPM">Hard</button>
              </div>
              <button
                type="button"
                className={`bpm-lock-btn${isBpmPinned ? ' pinned' : ''}`}
                onClick={toggleBpmMode}
                aria-pressed={isBpmPinned}
                aria-label={isBpmPinned ? 'BPM locked' : 'BPM auto by style'}
              >
                {isBpmPinned ? 'LOCK' : 'AUTO'}
              </button>
            </label>
          ) : null}

          <label className="pitch-shift-label">
            <span>Pitch Shift</span>
          </label>

          <button type="button" className="tone-shift-btn" onClick={() => shiftCompositionSemitones(-1)}>
            Pitch -
          </button>

          <button type="button" className="tone-shift-btn" onClick={() => shiftCompositionSemitones(1)}>
            Pitch +
          </button>
        </div>
      </section>

      <section className="generation-summary-panel" aria-label="Generation summary and editor mode">
        <div>
          <p className="generation-summary-copy">
            Focus mode: generate and audition loops first, then open Manual Editor only when you want detailed note edits.
          </p>
          {showSeedControls ? <p className="generation-summary-copy seed-copy">Current Seed: {song.lastGenerationSeed ?? 'none yet'}</p> : null}
          {showSeedControls && seedFeedback ? <p className="generation-summary-copy seed-feedback">{seedFeedback}</p> : null}
        </div>
        <div className="generation-summary-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={() => randomizeTrackInstruments(availableInstrumentOptions.map((option) => option.value))}
          >
            Randomize Instruments
          </button>

          <button
            type="button"
            className="secondary-btn"
            onClick={() => {
              const chordOptions: ChordStructure[] = ['triads', 'power', 'seventh', 'sus2', 'sus4']
              const randomChord = chordOptions[Math.floor(Math.random() * chordOptions.length)]
              setGeneratorChordStructure(randomChord)
              generateFromCurrentSeedInput(undefined, randomChord)
            }}
          >
            Randomize Chords
          </button>

          <button
            type="button"
            className="generate-btn generate-main-btn"
            onClick={() => {
              const bpmToUse = randomizeBpm ? undefined : commitBpmInput()
              generateFromCurrentSeedInput(bpmToUse)
            }}
          >
            Generate
          </button>

          <button
            type="button"
            className="secondary-btn manual-toggle-btn"
            onClick={() => setManualEditorOpen((open) => !open)}
            aria-expanded={manualEditorOpen}
          >
            {manualEditorOpen ? 'Close Manual Editor' : 'Open Manual Editor'}
          </button>
        </div>
      </section>

      <section className="track-mixer-panel" aria-label="Track mixer">
        {song.tracks.map((track) => (
          <div key={`mixer-${track.id}`} className="track-mixer-row">
            <div className="track-mixer-meta">
              <span className="track-name">{track.name}</span>
              <span className="track-instrument">{track.instrument}</span>
            </div>
            <div className="track-controls">
              <select
                value={track.instrument}
                onChange={(event) => setTrackInstrument(track.id, event.target.value as InstrumentType)}
                aria-label={`${track.name} instrument`}
              >
                {availableInstrumentOptions.map((instrument) => (
                  <option key={`${track.id}-${instrument.value}`} value={instrument.value}>
                    {instrument.label}
                  </option>
                ))}
              </select>
              <button
                className={`track-toggle${track.muted ? ' active' : ''}`}
                onClick={() => setTrackMute(track.id, !track.muted)}
                aria-pressed={track.muted}
              >
                M
              </button>
              <button
                className={`track-toggle${track.solo ? ' active solo' : ''}`}
                onClick={() => setTrackSolo(track.id, !track.solo)}
                aria-pressed={track.solo}
              >
                S
              </button>
              <input
                className="track-volume"
                type="range"
                min={0}
                max={100}
                value={Math.round(track.volume * 100)}
                onChange={(event) => setTrackVolume(track.id, Number(event.target.value) / 100)}
                aria-label={`${track.name} volume`}
              />
            </div>
          </div>
        ))}
      </section>

      {manualEditorOpen ? (
        <section className="manual-editor-panel" aria-label="Manual editing panel">
          <div className="manual-editor-toolbar">
            <label>
              <span>Start Octave</span>
              <select value={octaveStart} onChange={(event) => setOctaveStart(Number(event.target.value))}>
                {OCTAVE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Octaves</span>
              <select value={octaveCount} onChange={(event) => setOctaveCount(Number(event.target.value))}>
                {OCTAVE_RANGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <button type="button" className="secondary-btn" onClick={() => setManualEditorOpen(false)}>
              Done Editing
            </button>
          </div>

          <section className="note-action-panel" aria-label="Selected note actions">
            <div className="note-action-head">
              <span>Selected Note</span>
              <strong>
                {selectedNote && activeNote
                  ? `${activeTrack?.name ?? 'Track'} ${midiLabel(selectedNote.pitch)} @ step ${selectedNote.startStep + 1}`
                  : 'None'}
              </strong>
            </div>

            <div className="note-length-options">
              {NOTE_LENGTHS.map((option) => {
                const optionSteps = Math.max(1, Math.floor(stepsPerMeasure / option.denominator))
                const isActive = activeNote ? activeNote.length === optionSteps : selectedLengthId === option.id

                return (
                  <button
                    key={option.id}
                    className={`note-option${isActive ? ' active' : ''}`}
                    onClick={() => {
                      setSelectedLengthId(option.id)
                      applyLength(option.denominator)
                    }}
                    type="button"
                  >
                    {option.label}
                  </button>
                )
              })}

              <button className="note-option remove" onClick={removeSelectedNote} type="button" disabled={!activeNote}>
                Remove
              </button>
            </div>

            <p className="note-action-copy">
              Click any square in any track to place a {selectedLength.label.toLowerCase()} note, then use these controls to change
              length or remove.
            </p>
          </section>

          {song.tracks.map((track) => {
            const row = song.grid[track.id] ?? []

            return (
              <div key={track.id} className={`track-row${track.muted ? ' muted' : ''}`}>
                <div className="track-info">
                  <div className="track-heading">
                    <span className="track-name">{track.name}</span>
                    <div className="track-heading-actions">
                      <span className="track-instrument">{track.instrument}</span>
                      <button
                        type="button"
                        className="track-remove-btn"
                        onClick={() => {
                          removeTrack(track.id)
                          if (selectedNote?.trackId === track.id) {
                            setSelectedNote(null)
                          }
                        }}
                        disabled={song.tracks.length <= 1}
                        aria-label={`Remove ${track.name}`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="track-controls">
                    <button
                      className={`track-toggle${track.muted ? ' active' : ''}`}
                      onClick={() => setTrackMute(track.id, !track.muted)}
                      aria-pressed={track.muted}
                    >
                      M
                    </button>
                    <button
                      className={`track-toggle${track.solo ? ' active solo' : ''}`}
                      onClick={() => setTrackSolo(track.id, !track.solo)}
                      aria-pressed={track.solo}
                    >
                      S
                    </button>
                    <input
                      className="track-volume"
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(track.volume * 100)}
                      onChange={(event) => setTrackVolume(track.id, Number(event.target.value) / 100)}
                      aria-label={`${track.name} volume`}
                    />
                  </div>
                  <TrackEditor
                    track={track}
                    instrumentOptions={availableInstrumentOptions}
                    onInstrumentChange={(instrument) => setTrackInstrument(track.id, instrument)}
                    onNoiseTypeChange={(noiseType) => setTrackNoiseType(track.id, noiseType)}
                    onEnvelopeChange={(field, value) => setTrackEnvelope(track.id, field, value)}
                  />
                </div>

                <div className="piano-roll-shell">
                  <div className="pitch-labels" style={{ gridTemplateRows: `repeat(${visiblePitches.length}, 20px)` }}>
                    {visiblePitches.map((pitch) => (
                      <div key={`pitch-${track.id}-${pitch}`} className={`pitch-label${pitch % 12 === 0 ? ' c-note' : ''}`}>
                        {midiLabel(pitch)}
                      </div>
                    ))}
                  </div>

                  <div
                    className="piano-roll-grid"
                    style={{
                      gridTemplateColumns: `repeat(${song.stepCount}, 22px)`,
                      gridTemplateRows: `repeat(${visiblePitches.length}, 20px)`
                    }}
                  >
                    {visiblePitches.map((pitch) =>
                      Array.from({ length: song.stepCount }).map((_, step) => {
                        const owningStep = findOwningStepAtPitch(row, step, pitch)
                        const occupied = owningStep !== null
                        const selected = Boolean(
                          selectedNote &&
                            selectedNote.trackId === track.id &&
                            owningStep === selectedNote.startStep &&
                            selectedNote.pitch === pitch
                        )

                        return (
                          <PianoRollCell
                            key={`${track.id}-${pitch}-${step}`}
                            occupied={occupied}
                            selected={selected}
                            playhead={step === currentStep}
                            groupEnd={(step + 1) % stepsPerMeasure === 0 && step !== song.stepCount - 1}
                            blackKeyRow={isBlackKey(pitch)}
                            onClick={() => {
                              if (owningStep !== null) {
                                setSelectedNote({ trackId: track.id, startStep: owningStep, pitch })
                                return
                              }

                              placeNote(track.id, step, pitch, selectedLengthSteps)
                              setSelectedNote({ trackId: track.id, startStep: step, pitch })
                            }}
                            ariaLabel={`${track.name} ${midiLabel(pitch)} step ${step + 1}`}
                          />
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          <div className="roll-hint">
            Each square is independently clickable. Click an existing note square to select it, then choose length or remove.
          </div>
        </section>
      ) : null}
    </div>
  )
}
