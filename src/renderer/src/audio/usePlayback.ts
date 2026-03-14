import { useCallback, useEffect, useRef, useState } from 'react'
import { startPlayback, stopPlayback, syncBpm } from './scheduler'
import { useProjectStore } from '../store/useProjectStore'

export function usePlayback(): {
  isPlaying: boolean
  currentStep: number | null
  toggle: () => void
  stop: () => void
} {
  const song = useProjectStore((s) => s.song)

  // Always-current ref so the scheduler reads the latest grid on every tick
  const songRef = useRef(song)
  songRef.current = song

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState<number | null>(null)

  // Keep BPM synced live during playback without restarting
  useEffect(() => {
    if (isPlaying) syncBpm(song.bpm)
  }, [song.bpm, isPlaying])

  useEffect(() => {
    if (!isPlaying) return
    stopPlayback()
    startPlayback(songRef, setCurrentStep)
  }, [isPlaying, song.stepCount])

  const play = useCallback(() => {
    setIsPlaying(true)
  }, [])

  const stop = useCallback(() => {
    stopPlayback()
    setIsPlaying(false)
    setCurrentStep(null)
  }, [])

  const toggle = useCallback(() => {
    if (isPlaying) stop()
    else play()
  }, [isPlaying, play, stop])

  // Cleanup if component unmounts
  useEffect(() => () => stopPlayback(), [])

  return { isPlaying, currentStep, toggle, stop }
}
