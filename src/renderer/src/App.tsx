import React from 'react'
import Transport from './components/Transport'
import StepGrid from './components/StepGrid'
import { usePlayback } from './audio/usePlayback'
import { renderSongToWav } from './audio/exportAudio'
import { findMissingLocalSamples } from './audio/sampleHealth'
import { useProjectStore } from './store/useProjectStore'
import { SongSchema } from './types/song'
import type { AudioExportFormat, Song } from './types/song'

const isElectron = typeof window !== 'undefined' && typeof window.api?.openProject === 'function'

/** Trigger a browser download for a Blob. */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 100)
}

/** Open a file picker and read a JSON file as a Song (browser fallback). */
function browserOpenProject(): Promise<Song | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.8bm'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) { resolve(null); return }
      try {
        const text = await file.text()
        const parsed = SongSchema.parse(JSON.parse(text))
        resolve(parsed)
      } catch {
        resolve(null)
      }
    }
    input.oncancel = () => resolve(null)
    input.click()
  })
}

function browserSaveProject(song: Song): boolean {
  const json = JSON.stringify(song, null, 2)
  downloadBlob(new Blob([json], { type: 'application/json' }), '8bMzMKR-project.json')
  return true
}

function browserExportAudio(wavBytes: Uint8Array): boolean {
  downloadBlob(new Blob([wavBytes.buffer as ArrayBuffer], { type: 'audio/wav' }), '8bMzMKR-export.wav')
  return true
}

function browserExportCc0License(): boolean {
  const text = [
    'CC0 1.0 Universal — Public Domain Dedication',
    '',
    'The person who associated a work with this deed has dedicated the work',
    'to the public domain by waiving all of his or her rights to the work',
    'worldwide under copyright law, including all related and neighboring',
    'rights, to the extent allowed by law.',
    '',
    'https://creativecommons.org/publicdomain/zero/1.0/'
  ].join('\n')
  downloadBlob(new Blob([text], { type: 'text/plain' }), 'LICENSE-CC0.txt')
  return true
}

export default function App(): React.JSX.Element {
  const { isPlaying, currentStep, toggle, stop, restart, previewLoopSeam } = usePlayback()
  const song = useProjectStore((state) => state.song)
  const replaceSong = useProjectStore((state) => state.replaceSong)
  const resetSong = useProjectStore((state) => state.resetSong)
  const undo = useProjectStore((state) => state.undo)
  const redo = useProjectStore((state) => state.redo)
  const canUndo = useProjectStore((state) => state.canUndo)
  const canRedo = useProjectStore((state) => state.canRedo)
  const [busy, setBusy] = React.useState(false)
  const [status, setStatus] = React.useState<string>('')
  const [showOnboarding, setShowOnboarding] = React.useState(true)
  const [missingSamplePaths, setMissingSamplePaths] = React.useState<string[]>([])

  const hasNotes = React.useMemo(
    () => Object.values(song.grid).some((row) => row.some((cell) => cell !== null)),
    [song.grid]
  )

  const handleNewProject = React.useCallback(async (): Promise<void> => {
    stop()
    resetSong()
    setStatus('New project ready')
  }, [resetSong, stop])

  const handleOpenProject = React.useCallback(async (): Promise<void> => {
    setBusy(true)
    try {
      stop()
      const openedSong = isElectron ? await window.api.openProject() : await browserOpenProject()
      if (!openedSong) return
      replaceSong(openedSong)
      setStatus('Project opened')
    } catch {
      setStatus('Open failed')
    } finally {
      setBusy(false)
    }
  }, [replaceSong, stop])

  const handleSaveProject = React.useCallback(async (): Promise<void> => {
    setBusy(true)
    try {
      const didSave = isElectron ? await window.api.saveProject(song) : browserSaveProject(song)
      setStatus(didSave ? 'Project saved' : 'Save cancelled')
    } catch {
      setStatus('Save failed')
    } finally {
      setBusy(false)
    }
  }, [song])

  const handleExportAudio = React.useCallback(
    async (format: AudioExportFormat): Promise<void> => {
      setBusy(true)
      try {
        stop()
        const wavBytes = await renderSongToWav(song)
        const didExport = isElectron
          ? await window.api.exportAudio(format, wavBytes)
          : browserExportAudio(wavBytes)
        setStatus(didExport ? `Exported ${format.toUpperCase()}` : 'Export cancelled')
      } catch {
        setStatus(`Export ${format.toUpperCase()} failed`)
      } finally {
        setBusy(false)
      }
    },
    [song, stop]
  )

  const handleExportCc0License = React.useCallback(async (): Promise<void> => {
    setBusy(true)
    try {
      const didExport = isElectron ? await window.api.exportCc0License() : browserExportCc0License()
      setStatus(didExport ? 'License exported' : 'License export cancelled')
    } catch {
      setStatus('License export failed')
    } finally {
      setBusy(false)
    }
  }, [])

  React.useEffect(() => {
    let cancelled = false

    void findMissingLocalSamples().then((missing) => {
      if (cancelled || missing.length === 0) return
      setMissingSamplePaths(missing)
      setStatus('Missing local samples')
    })

    return () => {
      cancelled = true
    }
  }, [])

  React.useEffect(() => {
    function isEditableTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false
      const tagName = target.tagName
      return tagName === 'INPUT' || tagName === 'TEXTAREA' || target.isContentEditable
    }

    function handleKeyDown(event: KeyboardEvent): void {
      const metaKey = event.metaKey || event.ctrlKey

      if (metaKey && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void handleSaveProject()
        return
      }

      if (metaKey && event.key.toLowerCase() === 'e') {
        event.preventDefault()
        void handleExportAudio('wav')
        return
      }

      if (metaKey && event.key.toLowerCase() === 'o') {
        event.preventDefault()
        void handleOpenProject()
        return
      }

      if (metaKey && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        void handleNewProject()
        return
      }

      if (metaKey && event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
        return
      }

      if ((metaKey && event.shiftKey && event.key.toLowerCase() === 'z') || (metaKey && event.key.toLowerCase() === 'y')) {
        event.preventDefault()
        redo()
        return
      }

      if (isEditableTarget(event.target)) return

      if (event.code === 'Space') {
        event.preventDefault()
        toggle()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleExportAudio, handleNewProject, handleOpenProject, handleSaveProject, redo, toggle, undo])

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">8bMzMKR</span>
        <Transport
          isPlaying={isPlaying}
          onPlayStop={toggle}
          onPreviewLoop={previewLoopSeam}
          onNewProject={handleNewProject}
          onOpenProject={handleOpenProject}
          onSaveProject={handleSaveProject}
          onExportAudio={handleExportAudio}
          onExportCc0License={handleExportCc0License}
          onUndo={undo}
          onRedo={redo}
          busy={busy}
          canUndo={canUndo}
          canRedo={canRedo}
        />
        <span className="status-badge">{status || 'Ready'}</span>
      </header>
      <main className="app-main">
        {missingSamplePaths.length > 0 ? (
          <section className="sample-warning-panel" aria-label="Missing sample warning">
            <p className="sample-warning-title">Missing local sample files detected</p>
            <p className="sample-warning-copy">
              Real instrument playback/export may be silent for some tracks until missing files are restored.
            </p>
            <p className="sample-warning-copy">Missing count: {missingSamplePaths.length}</p>
            <p className="sample-warning-copy sample-warning-list">
              {missingSamplePaths.slice(0, 10).join(', ')}
              {missingSamplePaths.length > 10 ? ', ...' : ''}
            </p>
          </section>
        ) : null}

        {showOnboarding ? (
          <section className="onboarding-panel" aria-label="Getting started">
            <div>
              <p className="onboarding-eyebrow">Quick start</p>
              <h2 className="onboarding-title">Generate a loop first, then fine-tune</h2>
            </div>
            <div className="onboarding-pills">
              <span className="onboarding-pill">Pick Mood, Preset, Clip Length, then click Generate</span>
              <span className="onboarding-pill">Use Preview Loop to audition the seam quickly</span>
              <span className="onboarding-pill">Use M/S/Volume to balance tracks before editing</span>
              <span className="onboarding-pill">Open Manual Editor only when you want note-level changes</span>
              <span className="onboarding-pill">Space starts and stops playback</span>
              {!isElectron && <span className="onboarding-pill">Web version: only WAV export is supported</span>}
            </div>
            <button className="dismiss-onboarding" onClick={() => setShowOnboarding(false)}>
              Hide tips
            </button>
          </section>
        ) : null}

        {!hasNotes ? (
          <section className="empty-state" aria-label="Empty pattern help">
            <div className="empty-state-card">
              <p className="empty-state-eyebrow">Empty pattern</p>
              <h2 className="empty-state-title">Start by generating a loop</h2>
              <p className="empty-state-copy">
                Choose Mood and Preset, set Clip Length, then click Generate. Use Preview Loop to check how the ending flows back to
                the beginning. Open Manual Editor when you want note-by-note control.
              </p>
              <div className="empty-state-shortcuts">
                <span>Play: Space</span>
                <span>Preview: Preview Loop</span>
                <span>Save: Cmd/Ctrl+S</span>
                <span>Open: Cmd/Ctrl+O</span>
                <span>Undo: Cmd/Ctrl+Z</span>
              </div>
            </div>
          </section>
        ) : null}

        <StepGrid currentStep={currentStep} onStopPlayback={stop} onRestartPlayback={restart} />
      </main>
    </div>
  )
}
