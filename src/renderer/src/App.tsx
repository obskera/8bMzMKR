import React from 'react'
import Transport from './components/Transport'
import StepGrid from './components/StepGrid'
import { usePlayback } from './audio/usePlayback'
import { renderSongToWav } from './audio/exportAudio'
import { useProjectStore } from './store/useProjectStore'
import type { AudioExportFormat } from './types/song'

export default function App(): React.JSX.Element {
  const { isPlaying, currentStep, toggle, stop } = usePlayback()
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
      const openedSong = await window.api.openProject()
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
      const didSave = await window.api.saveProject(song)
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
        const didExport = await window.api.exportAudio(format, wavBytes)
        setStatus(didExport ? `Exported ${format.toUpperCase()}` : 'Export cancelled')
      } catch {
        setStatus(`Export ${format.toUpperCase()} failed`)
      } finally {
        setBusy(false)
      }
    },
    [song, stop]
  )

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
          onNewProject={handleNewProject}
          onOpenProject={handleOpenProject}
          onSaveProject={handleSaveProject}
          onExportAudio={handleExportAudio}
          onUndo={undo}
          onRedo={redo}
          busy={busy}
          canUndo={canUndo}
          canRedo={canRedo}
        />
        <span className="status-badge">{status || 'Ready'}</span>
      </header>
      <main className="app-main">
        {showOnboarding ? (
          <section className="onboarding-panel" aria-label="Getting started">
            <div>
              <p className="onboarding-eyebrow">Quick start</p>
              <h2 className="onboarding-title">Build a loop in under 10 seconds</h2>
            </div>
            <div className="onboarding-pills">
              <span className="onboarding-pill">Click any piano-roll square to place a note</span>
              <span className="onboarding-pill">Select a note, then choose whole/half/quarter/etc.</span>
              <span className="onboarding-pill">Space starts and stops playback</span>
              <span className="onboarding-pill">M and S buttons mute or solo tracks</span>
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
              <h2 className="empty-state-title">Start by clicking any step cell</h2>
              <p className="empty-state-copy">
                Each square places one note. Click an existing note to select it, then use the length buttons to set whole, half,
                quarter, 8th, 16th, or 32nd values.
              </p>
              <div className="empty-state-shortcuts">
                <span>Play: Space</span>
                <span>Save: Cmd/Ctrl+S</span>
                <span>Open: Cmd/Ctrl+O</span>
                <span>Undo: Cmd/Ctrl+Z</span>
              </div>
            </div>
          </section>
        ) : null}

        <StepGrid currentStep={currentStep} />
      </main>
    </div>
  )
}
