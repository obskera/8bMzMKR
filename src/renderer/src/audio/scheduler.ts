/**
 * Audio scheduler — keeps all Tone.js logic out of React components.
 * Reads the latest song state through a MutableRefObject so note toggles
 * during playback take effect on the very next tick.
 */
import * as Tone from 'tone'
import type { MutableRefObject } from 'react'
import type { InstrumentType, Song } from '../types/song'

const BASE = import.meta.env.BASE_URL ?? '/'

export type StepCallback = (step: number) => void

interface PlaybackOptions {
  startStep?: number
}

type RealSampleInstrument =
  | 'piano'
  | 'guitar'
  | 'electric-guitar'
  | 'drums'
  | 'hurdy-gurdy'
  | 'violin'
  | 'viola'
  | 'cello'
  | 'bass'
  | 'flute'
  | 'ocarina'
  | 'harmonica'

const GRAND_PIANO_SAMPLE_URLS: Record<string, string> = {
  A0: 'A0.mp3',
  C1: 'C1.mp3',
  'D#1': 'Ds1.mp3',
  'F#1': 'Fs1.mp3',
  A1: 'A1.mp3',
  C2: 'C2.mp3',
  'D#2': 'Ds2.mp3',
  'F#2': 'Fs2.mp3',
  A2: 'A2.mp3',
  C3: 'C3.mp3',
  'D#3': 'Ds3.mp3',
  'F#3': 'Fs3.mp3',
  A3: 'A3.mp3',
  C4: 'C4.mp3',
  'D#4': 'Ds4.mp3',
  'F#4': 'Fs4.mp3',
  A4: 'A4.mp3',
  C5: 'C5.mp3',
  'D#5': 'Ds5.mp3',
  'F#5': 'Fs5.mp3',
  A5: 'A5.mp3',
  C6: 'C6.mp3',
  'D#6': 'Ds6.mp3',
  'F#6': 'Fs6.mp3',
  A6: 'A6.mp3',
  C7: 'C7.mp3',
  'D#7': 'Ds7.mp3',
  'F#7': 'Fs7.mp3',
  A7: 'A7.mp3',
  C8: 'C8.mp3'
}

const HURDY_GURDY_SAMPLE_URLS: Record<string, string> = {
  C3: 'C3.wav',
  G3: 'G3.wav',
  C4: 'C4.wav',
  G4: 'G4.wav',
  C5: 'C5.wav'
}

const GUITAR_SAMPLE_URLS: Record<string, string> = {
  A2: 'A2.mp3',
  C3: 'C3.mp3',
  E3: 'E3.mp3',
  G3: 'G3.mp3',
  A3: 'A3.mp3',
  C4: 'C4.mp3',
  E4: 'E4.mp3',
  G4: 'G4.mp3'
}

const ELECTRIC_GUITAR_SAMPLE_URLS: Record<string, string> = {
  A2: 'A2.mp3',
  C3: 'C3.mp3',
  E3: 'E3.mp3',
  G3: 'G3.mp3',
  A3: 'A3.mp3',
  C4: 'C4.mp3',
  E4: 'E4.mp3',
  G4: 'G4.mp3'
}

const DRUM_SAMPLE_URLS: Record<string, string> = {
  B1: 'B1.mp3',
  C2: 'C2.mp3',
  D2: 'D2.mp3',
  E2: 'E2.mp3',
  F2: 'F2.mp3',
  G2: 'G2.mp3',
  A2: 'A2.mp3',
  B2: 'B2.mp3',
  C3: 'C3.mp3'
}

const STRING_SAMPLE_URLS: Record<'violin' | 'viola' | 'cello' | 'bass', Record<string, string>> = {
  violin: {
    G3: 'G3.wav',
    D4: 'D4.wav',
    A4: 'A4.wav',
    E5: 'E5.wav'
  },
  viola: {
    C3: 'C3.wav',
    G3: 'G3.wav',
    D4: 'D4.wav',
    A4: 'A4.wav'
  },
  cello: {
    C2: 'C2.wav',
    G2: 'G2.wav',
    D3: 'D3.wav',
    A3: 'A3.wav'
  },
  bass: {
    E1: 'E1.wav',
    A1: 'A1.wav',
    D2: 'D2.wav',
    G2: 'G2.wav'
  }
}

const WIND_SAMPLE_URLS: Record<'flute' | 'ocarina' | 'harmonica', Record<string, string>> = {
  flute: {
    C4: 'C4.mp3',
    D4: 'D4.mp3',
    E4: 'E4.mp3',
    G4: 'G4.mp3',
    A4: 'A4.mp3',
    C5: 'C5.mp3',
    D5: 'D5.mp3',
    E5: 'E5.mp3',
    G5: 'G5.mp3',
    A5: 'A5.mp3',
    C6: 'C6.mp3'
  },
  ocarina: {
    A3: 'A3.mp3',
    B3: 'B3.mp3',
    C4: 'C4.mp3',
    D4: 'D4.mp3',
    E4: 'E4.mp3',
    A4: 'A4.mp3',
    B4: 'B4.mp3',
    C5: 'C5.mp3',
    D5: 'D5.mp3',
    E5: 'E5.mp3',
    G5: 'G5.mp3',
    A5: 'A5.mp3'
  },
  harmonica: {
    C3: 'C3.mp3',
    D3: 'D3.mp3',
    E3: 'E3.mp3',
    G3: 'G3.mp3',
    A3: 'A3.mp3',
    C4: 'C4.mp3',
    D4: 'D4.mp3',
    E4: 'E4.mp3',
    G4: 'G4.mp3',
    A4: 'A4.mp3',
    C5: 'C5.mp3'
  }
}

function isStringSampleInstrument(instrument: Song['tracks'][number]['instrument']): instrument is 'violin' | 'viola' | 'cello' | 'bass' {
  return instrument === 'violin' || instrument === 'viola' || instrument === 'cello' || instrument === 'bass'
}

const REAL_SAMPLE_MAP: Record<InstrumentType, RealSampleInstrument> = {
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

function resolveRealSampleInstrument(instrument: Song['tracks'][number]['instrument']): RealSampleInstrument {
  return REAL_SAMPLE_MAP[instrument]
}

function realSampleGainMultiplier(instrument: RealSampleInstrument): number {
  if (instrument === 'piano') return 2.25
  if (instrument === 'guitar') return 3.1
  if (instrument === 'electric-guitar') return 2.9
  if (instrument === 'drums') return 1.3
  return 1
}

function applyOscillatorType(synth: Tone.Synth, instrument: Song['tracks'][number]['instrument']): void {
  synth.oscillator.type = instrument as any
}

function isBasicOscillatorInstrument(instrument: Song['tracks'][number]['instrument']): boolean {
  return instrument === 'square' || instrument === 'triangle' || instrument === 'sawtooth'
}

// MIDI note → Hz  (standard equal temperament)
function midiToHz(pitch: number): number {
  return 440 * 2 ** ((pitch - 69) / 12)
}

function midiToNoteName(pitch: number): string {
  return Tone.Frequency(pitch, 'midi').toNote()
}

let sequence: Tone.Sequence<number> | null = null
const activeSynths = new Map<string, any>()
let playbackRequestId = 0

function applyTrackSettings(synth: any, track: Song['tracks'][number]): void {
  const gainMultiplier =
    track.soundSource === 'real' ? realSampleGainMultiplier(resolveRealSampleInstrument(track.instrument)) : 1
  synth.volume.value = Tone.gainToDb(Math.max(0.001, track.volume * gainMultiplier))

  if (track.soundSource === 'real') {
    // Real mode always uses sample playback, so keep a sampler-friendly envelope
    // and do not apply noise-synth specific settings.
    if (synth.envelope) {
      const realInstrument = resolveRealSampleInstrument(track.instrument)
      const isRealDrum = realInstrument === 'drums'
      const attack = Math.max(0.001, track.settings.envelope.attack)
      const decay = isRealDrum ? Math.max(0.01, Math.min(0.2, track.settings.envelope.decay)) : Math.max(0.02, track.settings.envelope.decay)
      const sustain = isRealDrum
        ? Math.max(0, Math.min(0.3, track.settings.envelope.sustain))
        : Math.max(0.7, track.settings.envelope.sustain)
      const release = isRealDrum ? Math.max(0.01, Math.min(0.18, track.settings.envelope.release)) : Math.max(0.12, track.settings.envelope.release)
      synth.envelope.attack = attack
      synth.envelope.decay = decay
      synth.envelope.sustain = sustain
      synth.envelope.release = release
    }
    return
  }

  if (track.instrument === 'noise' || track.instrument === 'drums') {
    if (synth.noise) synth.noise.type = track.settings.noiseType
    if (synth.envelope) {
      synth.envelope.attack = track.settings.envelope.attack
      synth.envelope.decay = track.settings.envelope.decay
      synth.envelope.sustain = track.settings.envelope.sustain
      synth.envelope.release = track.settings.envelope.release
    }
    return
  }

  if (isBasicOscillatorInstrument(track.instrument) && synth.oscillator) {
    applyOscillatorType(synth as Tone.Synth, track.instrument)
  }

  if (synth.envelope) {
    synth.envelope.attack = track.settings.envelope.attack
    synth.envelope.decay = track.settings.envelope.decay
    synth.envelope.sustain = track.settings.envelope.sustain
    synth.envelope.release = track.settings.envelope.release
  }
}

function buildSynths(song: Song): void {
  for (const track of song.tracks) {
    let synth: any

    if (track.soundSource === 'real') {
      const realInstrument = resolveRealSampleInstrument(track.instrument)
      if (realInstrument === 'piano') {
        synth = new Tone.Sampler({
          urls: GRAND_PIANO_SAMPLE_URLS,
          baseUrl: `${BASE}samples/piano/`
        }).toDestination()
      } else if (realInstrument === 'guitar') {
        synth = new Tone.Sampler({
          urls: GUITAR_SAMPLE_URLS,
          baseUrl: `${BASE}samples/guitar/`
        }).toDestination()
      } else if (realInstrument === 'electric-guitar') {
        synth = new Tone.Sampler({
          urls: ELECTRIC_GUITAR_SAMPLE_URLS,
          baseUrl: `${BASE}samples/electric-guitar/`
        }).toDestination()
      } else if (realInstrument === 'drums') {
        synth = new Tone.Sampler({
          urls: DRUM_SAMPLE_URLS,
          baseUrl: `${BASE}samples/drums/`
        }).toDestination()
      } else if (realInstrument === 'hurdy-gurdy') {
        synth = new Tone.Sampler({
          urls: HURDY_GURDY_SAMPLE_URLS,
          baseUrl: `${BASE}samples/hurdy-gurdy/`
        }).toDestination()
      } else if (isStringSampleInstrument(realInstrument)) {
        synth = new Tone.Sampler({
          urls: STRING_SAMPLE_URLS[realInstrument],
          baseUrl: `${BASE}samples/strings/${realInstrument}/`
        }).toDestination()
      } else {
        synth = new Tone.Sampler({
          urls: WIND_SAMPLE_URLS[realInstrument],
          baseUrl: `${BASE}samples/winds/${realInstrument}/`
        }).toDestination()
      }

      applyTrackSettings(synth, track)
      activeSynths.set(track.id, synth)
      continue
    }

    switch (track.instrument) {
      case 'noise':
        synth = new Tone.NoiseSynth({
          noise: { type: track.settings.noiseType },
          envelope: {
            attack: track.settings.envelope.attack,
            decay: track.settings.envelope.decay,
            sustain: track.settings.envelope.sustain,
            release: track.settings.envelope.release
          }
        }).toDestination()
        break
      case 'fm':
        synth = new Tone.FMSynth().toDestination()
        break
      case 'am':
        synth = new Tone.AMSynth().toDestination()
        break
      case 'duo':
        synth = new Tone.DuoSynth().toDestination()
        break
      case 'pluck':
      case 'guitar':
        synth = new Tone.PluckSynth().toDestination()
        break
      case 'electric-guitar':
        synth = new Tone.MonoSynth().toDestination()
        break
      case 'drums':
        synth = new Tone.NoiseSynth({
          noise: { type: track.settings.noiseType },
          envelope: {
            attack: track.settings.envelope.attack,
            decay: track.settings.envelope.decay,
            sustain: track.settings.envelope.sustain,
            release: track.settings.envelope.release
          }
        }).toDestination()
        break
      case 'membrane':
        synth = new Tone.MembraneSynth().toDestination()
        break
      case 'metal':
        synth = new Tone.MetalSynth().toDestination()
        break
      default:
        synth = new Tone.Synth({
          envelope: {
            attack: track.settings.envelope.attack,
            decay: track.settings.envelope.decay,
            sustain: track.settings.envelope.sustain,
            release: track.settings.envelope.release
          }
        }).toDestination()
        break
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

export function startPlayback(songRef: MutableRefObject<Song>, onStep: StepCallback, options: PlaybackOptions = {}): void {
  const requestId = ++playbackRequestId
  teardown()

  const initialSong = songRef.current
  Tone.getTransport().bpm.value = initialSong.bpm
  buildSynths(initialSong)

  // Wait for async sample loads (notably grand piano) before starting transport.
  void Tone.loaded().then(() => {
    if (requestId !== playbackRequestId) return

    const steps = Array.from({ length: initialSong.stepCount }, (_, i) => i)
    const boundedStartStep = Math.max(0, Math.min(initialSong.stepCount - 1, Math.floor(options.startStep ?? 0)))
    const orderedSteps =
      boundedStartStep > 0 ? [...steps.slice(boundedStartStep), ...steps.slice(0, boundedStartStep)] : steps
    const stepsPerMeasure = Math.max(1, Math.floor(initialSong.stepCount / Math.max(1, initialSong.barCount)))
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

          const currentStepsPerMeasure = Math.max(1, Math.floor(song.stepCount / Math.max(1, song.barCount)))
          const currentInterval = `${currentStepsPerMeasure}n`
          const stepDuration = Tone.Time(currentInterval).toSeconds()
          const noteDuration = stepDuration * Math.max(1, cell.length)
          const noteFrequency = midiToHz(cell.pitch)
          const noteName = midiToNoteName(cell.pitch)

          if ((track.instrument === 'noise' || track.instrument === 'drums') && track.soundSource === 'synth') {
            synth.triggerAttackRelease(noteDuration, time)
          } else if (track.instrument === 'pluck' && track.soundSource === 'synth') {
            synth.triggerAttack(noteFrequency, time)
          } else if (track.soundSource === 'real') {
            synth.triggerAttackRelease(noteName, noteDuration, time, cell.velocity / 127)
          } else {
            synth.triggerAttackRelease(noteFrequency, noteDuration, time, cell.velocity / 127)
          }
        }
      },
      orderedSteps,
      interval
    )

    sequence.start(0)
    Tone.getTransport().start()
  })
}

export function stopPlayback(): void {
  playbackRequestId += 1
  teardown()
}

export function syncBpm(bpm: number): void {
  Tone.getTransport().bpm.value = bpm
}
