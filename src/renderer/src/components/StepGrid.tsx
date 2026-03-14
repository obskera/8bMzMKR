import React from 'react'
import TrackEditor from './TrackEditor'
import { useProjectStore } from '../store/useProjectStore'
import type { InstrumentType } from '../types/song'
import type { GeneratorMood, GeneratorPreset } from '../store/useProjectStore'

interface StepGridProps {
  currentStep: number | null
}

const RESOLUTION_OPTIONS = [8, 16, 32, 64]
const OCTAVE_OPTIONS = [1, 2, 3, 4, 5, 6, 7]
const OCTAVE_RANGE_OPTIONS = [1, 2, 3, 4]
const MEASURE_COUNT = 4

const NOTE_LENGTHS = [
  { id: 'whole', label: 'Whole', denominator: 1 },
  { id: 'half', label: 'Half', denominator: 2 },
  { id: 'quarter', label: 'Quarter', denominator: 4 },
  { id: 'eighth', label: '8th', denominator: 8 },
  { id: 'sixteenth', label: '16th', denominator: 16 },
  { id: 'thirtySecond', label: '32nd', denominator: 32 }
] as const
const MAX_TRACKS = 16
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

export default function StepGrid({ currentStep }: StepGridProps): React.JSX.Element {
  const {
    song,
    addTrack,
    removeTrack,
    generateTheorySong,
    placeNote,
    setNoteLength,
    removeNoteAtStep,
    setStepCount,
    setTrackMute,
    setTrackSolo,
    setTrackVolume,
    setTrackInstrument,
    setTrackNoiseType,
    setTrackEnvelope
  } = useProjectStore()
  const [octaveStart, setOctaveStart] = React.useState(5)
  const [octaveCount, setOctaveCount] = React.useState(1)
  const [selectedLengthId, setSelectedLengthId] = React.useState<NoteLengthId>('quarter')
  const [newTrackInstrument, setNewTrackInstrument] = React.useState<InstrumentType>('square')
  const [generatorMood, setGeneratorMood] = React.useState<GeneratorMood>('random')
  const [generatorPreset, setGeneratorPreset] = React.useState<GeneratorPreset>('balanced')
  const [selectedNote, setSelectedNote] = React.useState<(SelectedNote & { trackId: string }) | null>(null)

  React.useEffect(() => {
    if (!selectedNote) return
    const trackExists = song.tracks.some((track) => track.id === selectedNote.trackId)
    if (!trackExists) setSelectedNote(null)
  }, [selectedNote, song.tracks])

  const visiblePitches = React.useMemo(() => {
    const highest = Math.min(127, octaveStart * 12 + octaveCount * 12 - 1)
    const lowest = Math.max(0, octaveStart * 12)
    const pitches: number[] = []

    for (let pitch = highest; pitch >= lowest; pitch -= 1) {
      pitches.push(pitch)
    }

    return pitches
  }, [octaveCount, octaveStart])

  if (song.tracks.length === 0) {
    return <div className="step-grid">No tracks available.</div>
  }

  const stepsPerMeasure = Math.max(1, Math.floor(song.stepCount / MEASURE_COUNT))
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
    setStepCount(MEASURE_COUNT * boundedResolution)
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

  return (
    <div className="step-grid">
      <section className="roll-toolbar" aria-label="Piano roll controls">
        <label>
          <span>Add Instrument</span>
          <select value={newTrackInstrument} onChange={(event) => setNewTrackInstrument(event.target.value as InstrumentType)}>
            <option value="square">Square</option>
            <option value="triangle">Triangle</option>
            <option value="sawtooth">Saw</option>
            <option value="noise">Noise</option>
          </select>
        </label>

        <button
          type="button"
          className="add-track-btn"
          onClick={() => addTrack(newTrackInstrument)}
          disabled={song.tracks.length >= MAX_TRACKS}
        >
          Add Instrument
        </button>

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

        <button
          type="button"
          className="generate-btn"
          onClick={() => generateTheorySong({ mood: generatorMood, preset: generatorPreset })}
        >
          Generate
        </button>

        <label>
          <span>Resolution</span>
          <select value={stepsPerMeasure} onChange={(event) => handleResolutionChange(Number(event.target.value))}>
            {RESOLUTION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                1/{option} ({MEASURE_COUNT} bars)
              </option>
            ))}
          </select>
        </label>

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
      </section>

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
          Click any square in any track to place a {selectedLength.label.toLowerCase()} note, then use these controls to change length or remove.
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

      <div className="roll-hint">Each square is independently clickable. Click an existing note square to select it, then choose length or remove.</div>
    </div>
  )
}
