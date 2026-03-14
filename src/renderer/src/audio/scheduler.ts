/**
 * Audio scheduler — keeps all Tone.js logic out of React components.
 * Reads the latest song state through a MutableRefObject so note toggles
 * during playback take effect on the very next tick.
 */
import * as Tone from 'tone'
import type { MutableRefObject } from 'react'
import type { Song } from '../types/song'

export type StepCallback = (step: number) => void
const MEASURE_COUNT = 4

function applyOscillatorType(synth: Tone.Synth, instrument: Song['tracks'][number]['instrument']): void {
  synth.oscillator.type = instrument as any
}

// MIDI note → Hz  (standard equal temperament)
function midiToHz(pitch: number): number {
  return 440 * 2 ** ((pitch - 69) / 12)
}

let sequence: Tone.Sequence<number> | null = null
const activeSynths = new Map<string, Tone.Synth | Tone.NoiseSynth>()

function applyTrackSettings(synth: Tone.Synth | Tone.NoiseSynth, track: Song['tracks'][number]): void {
  synth.volume.value = Tone.gainToDb(Math.max(0.001, track.volume))

  if (track.instrument === 'noise') {
    const noiseSynth = synth as Tone.NoiseSynth
    noiseSynth.noise.type = track.settings.noiseType
    noiseSynth.envelope.attack = track.settings.envelope.attack
    noiseSynth.envelope.decay = track.settings.envelope.decay
    noiseSynth.envelope.sustain = track.settings.envelope.sustain
    noiseSynth.envelope.release = track.settings.envelope.release
    return
  }

  const toneSynth = synth as Tone.Synth
  applyOscillatorType(toneSynth, track.instrument)
  toneSynth.envelope.attack = track.settings.envelope.attack
  toneSynth.envelope.decay = track.settings.envelope.decay
  toneSynth.envelope.sustain = track.settings.envelope.sustain
  toneSynth.envelope.release = track.settings.envelope.release
}

function buildSynths(song: Song): void {
  for (const track of song.tracks) {
    let synth: Tone.Synth | Tone.NoiseSynth

    if (track.instrument === 'noise') {
      synth = new Tone.NoiseSynth({
        noise: { type: track.settings.noiseType },
        envelope: {
          attack: track.settings.envelope.attack,
          decay: track.settings.envelope.decay,
          sustain: track.settings.envelope.sustain,
          release: track.settings.envelope.release
        }
      }).toDestination()
    } else {
      synth = new Tone.Synth({
        envelope: {
          attack: track.settings.envelope.attack,
          decay: track.settings.envelope.decay,
          sustain: track.settings.envelope.sustain,
          release: track.settings.envelope.release
        }
      }).toDestination()
    }

    applyTrackSettings(synth, track)
    activeSynths.set(track.id, synth)
  }
}

function teardown(): void {
  sequence?.stop()
  sequence?.dispose()
  sequence = null
  for (const s of activeSynths.values()) s.dispose()
  activeSynths.clear()
  Tone.getTransport().stop()
  Tone.getTransport().position = 0
}

export function startPlayback(songRef: MutableRefObject<Song>, onStep: StepCallback): void {
  teardown()

  const initialSong = songRef.current
  Tone.getTransport().bpm.value = initialSong.bpm
  buildSynths(initialSong)

  const steps = Array.from({ length: initialSong.stepCount }, (_, i) => i)
  const stepsPerMeasure = Math.max(1, Math.floor(initialSong.stepCount / MEASURE_COUNT))
  const interval = `${stepsPerMeasure}n`

  sequence = new Tone.Sequence<number>(
    (time, step) => {
      // Schedule visual update to align with requestAnimationFrame
      Tone.getDraw().schedule(() => onStep(step), time)

      const song = songRef.current
      const hasSolo = song.tracks.some((t) => t.solo)

      for (const track of song.tracks) {
        const synth = activeSynths.get(track.id)
        if (synth) {
          applyTrackSettings(synth, track)
        }

        if (track.muted) continue
        if (hasSolo && !track.solo) continue

        const cell = song.grid[track.id]?.[step]
        if (!cell) continue

        if (!synth) continue

        const currentStepsPerMeasure = Math.max(1, Math.floor(song.stepCount / MEASURE_COUNT))
        const currentInterval = `${currentStepsPerMeasure}n`
        const stepDuration = Tone.Time(currentInterval).toSeconds()
        const noteDuration = stepDuration * Math.max(1, cell.length)

        if (track.instrument === 'noise') {
          ;(synth as Tone.NoiseSynth).triggerAttackRelease(noteDuration, time)
        } else {
          ;(synth as Tone.Synth).triggerAttackRelease(midiToHz(cell.pitch), noteDuration, time)
        }
      }
    },
    steps,
    interval
  )

  sequence.start(0)
  Tone.getTransport().start()
}

export function stopPlayback(): void {
  teardown()
}

export function syncBpm(bpm: number): void {
  Tone.getTransport().bpm.value = bpm
}
