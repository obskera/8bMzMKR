import React from 'react'
import type { Envelope, NoiseType, Track, InstrumentType } from '../types/song'

interface TrackEditorProps {
  track: Track
  instrumentOptions: Array<{ value: InstrumentType; label: string }>
  onInstrumentChange: (instrument: InstrumentType) => void
  onNoiseTypeChange: (noiseType: NoiseType) => void
  onEnvelopeChange: (field: keyof Envelope, value: number) => void
}

const envelopeFields: Array<{ key: keyof Envelope; label: string; min: number; max: number; step: number }> = [
  { key: 'attack', label: 'A', min: 0, max: 1, step: 0.001 },
  { key: 'decay', label: 'D', min: 0, max: 2, step: 0.01 },
  { key: 'sustain', label: 'S', min: 0, max: 1, step: 0.01 },
  { key: 'release', label: 'R', min: 0, max: 2, step: 0.01 }
]

export default function TrackEditor({
  track,
  instrumentOptions,
  onInstrumentChange,
  onNoiseTypeChange,
  onEnvelopeChange
}: TrackEditorProps): React.JSX.Element {
  return (
    <div className="track-editor">
      <label className="track-editor-field">
        <span>Wave</span>
        <select value={track.instrument} onChange={(event) => onInstrumentChange(event.target.value as InstrumentType)}>
          {instrumentOptions.map((instrument) => (
            <option key={instrument.value} value={instrument.value}>
              {instrument.label}
            </option>
          ))}
        </select>
      </label>

      {track.instrument === 'noise' ? (
        <label className="track-editor-field narrow">
          <span>Noise</span>
          <select value={track.settings.noiseType} onChange={(event) => onNoiseTypeChange(event.target.value as NoiseType)}>
            <option value="white">White</option>
            <option value="pink">Pink</option>
            <option value="brown">Brown</option>
          </select>
        </label>
      ) : null}

      <div className="adsr-controls">
        {envelopeFields.map((field) => (
          <label key={field.key} className="track-editor-field envelope">
            <span>{field.label}</span>
            <input
              type="range"
              min={field.min}
              max={field.max}
              step={field.step}
              value={track.settings.envelope[field.key]}
              onChange={(event) => onEnvelopeChange(field.key, Number(event.target.value))}
            />
          </label>
        ))}
      </div>
    </div>
  )
}
