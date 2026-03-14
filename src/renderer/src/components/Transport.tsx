import React from 'react'
import { useProjectStore } from '../store/useProjectStore'
import type { AudioExportFormat } from '../types/song'

interface TransportProps {
  isPlaying: boolean
  onPlayStop: () => void
  onNewProject: () => void
  onOpenProject: () => void
  onSaveProject: () => void
  onExportAudio: (format: AudioExportFormat) => void
  onUndo: () => void
  onRedo: () => void
  busy: boolean
  canUndo: boolean
  canRedo: boolean
}

export default function Transport({
  isPlaying,
  onPlayStop,
  onNewProject,
  onOpenProject,
  onSaveProject,
  onExportAudio,
  onUndo,
  onRedo,
  busy,
  canUndo,
  canRedo
}: TransportProps): React.JSX.Element {
  const { song, setBpm } = useProjectStore()
  const [exportFormat, setExportFormat] = React.useState<AudioExportFormat>('wav')

  return (
    <div className="transport">
      <div className="file-controls">
        <button className="secondary-btn" onClick={onNewProject} disabled={busy}>
          New
        </button>
        <button className="secondary-btn" onClick={onOpenProject} disabled={busy}>
          Open
        </button>
        <button className="secondary-btn" onClick={onSaveProject} disabled={busy}>
          Save
        </button>
        <select
          className="secondary-select"
          value={exportFormat}
          onChange={(event) => setExportFormat(event.target.value as AudioExportFormat)}
          disabled={busy}
          aria-label="Export audio format"
        >
          <option value="wav">WAV</option>
          <option value="mp3">MP3</option>
          <option value="ogg">OGG</option>
        </select>
        <button className="secondary-btn" onClick={() => onExportAudio(exportFormat)} disabled={busy}>
          Export
        </button>
        <button className="secondary-btn" onClick={onUndo} disabled={busy || !canUndo}>
          Undo
        </button>
        <button className="secondary-btn" onClick={onRedo} disabled={busy || !canRedo}>
          Redo
        </button>
      </div>

      <button
        className={`transport-btn${isPlaying ? ' playing' : ''}`}
        onClick={onPlayStop}
        disabled={busy}
        aria-label={isPlaying ? 'Stop' : 'Play'}
      >
        {isPlaying ? '■' : '▶'}
      </button>

      <label className="bpm-control">
        <span>BPM</span>
        <input
          type="number"
          min={40}
          max={300}
          value={song.bpm}
          onChange={(e) => setBpm(Math.max(40, Math.min(300, Number(e.target.value))))}
        />
      </label>
    </div>
  )
}
