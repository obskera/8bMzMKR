import { useCallback, useEffect, useRef, useState } from 'react'
import { startPlayback, stopPlayback, syncBpm } from './scheduler'
import { useProjectStore } from '../store/useProjectStore'

export function usePlayback(): {
  isPlaying: boolean
  currentStep: number | null
  toggle: () => void
  stop: () => void
  play: () => void
  restart: () => void
  previewLoopSeam: () => void
} {
  const song = useProjectStore((s) => s.song)
  const instrumentLayoutSignature = song.tracks.map((track) => track.instrument).join('|')

  // Always-current ref so the scheduler reads the latest grid on every tick
  const songRef = useRef(song)
  songRef.current = song

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState<number | null>(null)
  const previewTimeoutRef = useRef<number | null>(null)

  function clearPreviewTimer(): void {
    if (previewTimeoutRef.current === null) return
    window.clearTimeout(previewTimeoutRef.current)
    previewTimeoutRef.current = null
  }

  const restartRef = useRef(0)
  const [restartToken, setRestartToken] = useState(0)

  // Keep BPM synced live during playback without restarting
  useEffect(() => {
    if (isPlaying) syncBpm(song.bpm)
  }, [song.bpm, isPlaying])

  useEffect(() => {
    if (!isPlaying) return
    stopPlayback()
    startPlayback(songRef, setCurrentStep)
  }, [isPlaying, song.stepCount, instrumentLayoutSignature, restartToken])

  const play = useCallback(() => {
    clearPreviewTimer()
    setIsPlaying(true)
  }, [])

  const stop = useCallback(() => {
    clearPreviewTimer()
    stopPlayback()
    setIsPlaying(false)
    setCurrentStep(null)
  }, [])

  const restart = useCallback(() => {
    clearPreviewTimer()
    stopPlayback()
    setCurrentStep(null)
    // Bump token so the effect re-fires even if isPlaying was already true
    restartRef.current += 1
    setRestartToken(restartRef.current)
    setIsPlaying(true)
  }, [])

  const toggle = useCallback(() => {
    if (isPlaying) stop()
    else play()
  }, [isPlaying, play, stop])

  const previewLoopSeam = useCallback(() => {
    clearPreviewTimer()

    const latestSong = songRef.current
    const stepsPerMeasure = Math.max(1, Math.floor(latestSong.stepCount / Math.max(1, latestSong.barCount)))
    const previewStartStep = Math.max(0, latestSong.stepCount - stepsPerMeasure)
    const previewSteps = Math.max(1, Math.min(latestSong.stepCount, stepsPerMeasure * 2))
    const stepDurationSeconds = (60 / latestSong.bpm) * (4 / stepsPerMeasure)
    const previewDurationMs = Math.max(250, Math.ceil((previewSteps * stepDurationSeconds + 0.2) * 1000))

    stopPlayback()
    setCurrentStep(null)
    setIsPlaying(true)
    startPlayback(songRef, setCurrentStep, { startStep: previewStartStep })

    previewTimeoutRef.current = window.setTimeout(() => {
      stopPlayback()
      setIsPlaying(false)
      setCurrentStep(null)
      previewTimeoutRef.current = null
    }, previewDurationMs)
  }, [])

  // Cleanup if component unmounts
  useEffect(
    () => () => {
      clearPreviewTimer()
      stopPlayback()
    },
    []
  )

  return { isPlaying, currentStep, toggle, stop, play, restart, previewLoopSeam }
}
