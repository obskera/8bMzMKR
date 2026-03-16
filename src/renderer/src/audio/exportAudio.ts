import type { InstrumentType, Song } from '../types/song'

const SAMPLE_RATE = 44100
const BEATS_PER_MEASURE = 4
const GRAND_PIANO_SAMPLE_BASE_URL = '/samples/piano/'
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
const HURDY_GURDY_SAMPLE_BASE_URL = '/samples/hurdy-gurdy/'
const HURDY_GURDY_SAMPLE_URLS: Record<string, string> = {
  C3: 'C3.wav',
  G3: 'G3.wav',
  C4: 'C4.wav',
  G4: 'G4.wav',
  C5: 'C5.wav'
}
const GUITAR_SAMPLE_BASE_URL = '/samples/guitar/'
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
const ELECTRIC_GUITAR_SAMPLE_BASE_URL = '/samples/electric-guitar/'
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
const DRUM_SAMPLE_BASE_URL = '/samples/drums/'
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
const STRING_SAMPLE_BASE_URLS: Record<'violin' | 'viola' | 'cello' | 'bass', string> = {
  violin: '/samples/strings/violin/',
  viola: '/samples/strings/viola/',
  cello: '/samples/strings/cello/',
  bass: '/samples/strings/bass/'
}
const WIND_SAMPLE_BASE_URLS: Record<'flute' | 'ocarina' | 'harmonica', string> = {
  flute: '/samples/winds/flute/',
  ocarina: '/samples/winds/ocarina/',
  harmonica: '/samples/winds/harmonica/'
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
const NOTE_NAME_TO_SEMITONE: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11
}
const pianoSampleCache = new Map<string, Promise<ArrayBuffer>>()
const guitarSampleCache = new Map<string, Promise<ArrayBuffer>>()
const electricGuitarSampleCache = new Map<string, Promise<ArrayBuffer>>()
const drumSampleCache = new Map<string, Promise<ArrayBuffer>>()
const hurdyGurdySampleCache = new Map<string, Promise<ArrayBuffer>>()
const stringSampleCache = new Map<string, Promise<ArrayBuffer>>()
const windSampleCache = new Map<string, Promise<ArrayBuffer>>()

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

function isStringSampleInstrument(instrument: Song['tracks'][number]['instrument']): instrument is 'violin' | 'viola' | 'cello' | 'bass' {
  return instrument === 'violin' || instrument === 'viola' || instrument === 'cello' || instrument === 'bass'
}

function isWindSampleInstrument(instrument: Song['tracks'][number]['instrument']): instrument is 'flute' | 'ocarina' | 'harmonica' {
  return instrument === 'flute' || instrument === 'ocarina' || instrument === 'harmonica'
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

function midiToHz(pitch: number): number {
  return 440 * 2 ** ((pitch - 69) / 12)
}

function oscillatorTypeForInstrument(instrument: Song['tracks'][number]['instrument']): OscillatorType {
  if (instrument === 'square') return 'square'
  if (instrument === 'triangle') return 'triangle'
  if (instrument === 'fm' || instrument === 'piano' || instrument === 'membrane') return 'sine'
  if (instrument === 'am') return 'triangle'
  if (instrument === 'duo') return 'sawtooth'
  if (instrument === 'pluck' || instrument === 'guitar' || instrument === 'electric-guitar' || instrument === 'metal') return 'square'
  return 'sawtooth'
}

function noteNameToMidi(noteName: string): number {
  const match = noteName.match(/^([A-G](?:#|b)?)(-?\d+)$/)
  if (!match) return 60
  const semitone = NOTE_NAME_TO_SEMITONE[match[1]]
  const octave = Number(match[2])
  if (semitone === undefined || Number.isNaN(octave)) return 60
  return (octave + 1) * 12 + semitone
}

function nearestPianoSampleForMidi(pitch: number): { note: string; midi: number } {
  let closestNote = 'C4'
  let closestMidi = 60
  let closestDistance = Number.POSITIVE_INFINITY

  for (const note of Object.keys(GRAND_PIANO_SAMPLE_URLS)) {
    const midi = noteNameToMidi(note)
    const distance = Math.abs(midi - pitch)
    if (distance < closestDistance) {
      closestDistance = distance
      closestNote = note
      closestMidi = midi
    }
  }

  return { note: closestNote, midi: closestMidi }
}

async function getPianoSampleArrayBuffer(note: string): Promise<ArrayBuffer> {
  const cached = pianoSampleCache.get(note)
  if (cached) return cached

  const nextPromise = fetch(`${GRAND_PIANO_SAMPLE_BASE_URL}${GRAND_PIANO_SAMPLE_URLS[note]}`).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Failed to load piano sample ${note}`)
    }
    return response.arrayBuffer()
  })

  pianoSampleCache.set(note, nextPromise)
  return nextPromise
}

function nearestHurdyGurdySampleForMidi(pitch: number): { note: string; midi: number } {
  let closestNote = 'C4'
  let closestMidi = 60
  let closestDistance = Number.POSITIVE_INFINITY

  for (const note of Object.keys(HURDY_GURDY_SAMPLE_URLS)) {
    const midi = noteNameToMidi(note)
    const distance = Math.abs(midi - pitch)
    if (distance < closestDistance) {
      closestDistance = distance
      closestNote = note
      closestMidi = midi
    }
  }

  return { note: closestNote, midi: closestMidi }
}

async function getHurdyGurdySampleArrayBuffer(note: string): Promise<ArrayBuffer> {
  const cached = hurdyGurdySampleCache.get(note)
  if (cached) return cached

  const nextPromise = fetch(`${HURDY_GURDY_SAMPLE_BASE_URL}${HURDY_GURDY_SAMPLE_URLS[note]}`).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Failed to load hurdy-gurdy sample ${note}`)
    }
    return response.arrayBuffer()
  })

  hurdyGurdySampleCache.set(note, nextPromise)
  return nextPromise
}

function nearestGuitarSampleForMidi(pitch: number): { note: string; midi: number } {
  let closestNote = 'A3'
  let closestMidi = 57
  let closestDistance = Number.POSITIVE_INFINITY

  for (const note of Object.keys(GUITAR_SAMPLE_URLS)) {
    const midi = noteNameToMidi(note)
    const distance = Math.abs(midi - pitch)
    if (distance < closestDistance) {
      closestDistance = distance
      closestNote = note
      closestMidi = midi
    }
  }

  return { note: closestNote, midi: closestMidi }
}

async function getGuitarSampleArrayBuffer(note: string): Promise<ArrayBuffer> {
  const cached = guitarSampleCache.get(note)
  if (cached) return cached

  const nextPromise = fetch(`${GUITAR_SAMPLE_BASE_URL}${GUITAR_SAMPLE_URLS[note]}`).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Failed to load guitar sample ${note}`)
    }
    return response.arrayBuffer()
  })

  guitarSampleCache.set(note, nextPromise)
  return nextPromise
}

function nearestElectricGuitarSampleForMidi(pitch: number): { note: string; midi: number } {
  let closestNote = 'A3'
  let closestMidi = 57
  let closestDistance = Number.POSITIVE_INFINITY

  for (const note of Object.keys(ELECTRIC_GUITAR_SAMPLE_URLS)) {
    const midi = noteNameToMidi(note)
    const distance = Math.abs(midi - pitch)
    if (distance < closestDistance) {
      closestDistance = distance
      closestNote = note
      closestMidi = midi
    }
  }

  return { note: closestNote, midi: closestMidi }
}

async function getElectricGuitarSampleArrayBuffer(note: string): Promise<ArrayBuffer> {
  const cached = electricGuitarSampleCache.get(note)
  if (cached) return cached

  const nextPromise = fetch(`${ELECTRIC_GUITAR_SAMPLE_BASE_URL}${ELECTRIC_GUITAR_SAMPLE_URLS[note]}`).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Failed to load electric guitar sample ${note}`)
    }
    return response.arrayBuffer()
  })

  electricGuitarSampleCache.set(note, nextPromise)
  return nextPromise
}

function nearestDrumSampleForMidi(pitch: number): { note: string; midi: number } {
  let closestNote = 'B1'
  let closestMidi = 35
  let closestDistance = Number.POSITIVE_INFINITY

  for (const note of Object.keys(DRUM_SAMPLE_URLS)) {
    const midi = noteNameToMidi(note)
    const distance = Math.abs(midi - pitch)
    if (distance < closestDistance) {
      closestDistance = distance
      closestNote = note
      closestMidi = midi
    }
  }

  return { note: closestNote, midi: closestMidi }
}

async function getDrumSampleArrayBuffer(note: string): Promise<ArrayBuffer> {
  const cached = drumSampleCache.get(note)
  if (cached) return cached

  const nextPromise = fetch(`${DRUM_SAMPLE_BASE_URL}${DRUM_SAMPLE_URLS[note]}`).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Failed to load drum sample ${note}`)
    }
    return response.arrayBuffer()
  })

  drumSampleCache.set(note, nextPromise)
  return nextPromise
}

function nearestStringSampleForMidi(
  instrument: 'violin' | 'viola' | 'cello' | 'bass',
  pitch: number
): { note: string; midi: number } {
  let closestNote = Object.keys(STRING_SAMPLE_URLS[instrument])[0] ?? 'C4'
  let closestMidi = noteNameToMidi(closestNote)
  let closestDistance = Number.POSITIVE_INFINITY

  for (const note of Object.keys(STRING_SAMPLE_URLS[instrument])) {
    const midi = noteNameToMidi(note)
    const distance = Math.abs(midi - pitch)
    if (distance < closestDistance) {
      closestDistance = distance
      closestNote = note
      closestMidi = midi
    }
  }

  return { note: closestNote, midi: closestMidi }
}

async function getStringSampleArrayBuffer(instrument: 'violin' | 'viola' | 'cello' | 'bass', note: string): Promise<ArrayBuffer> {
  const key = `${instrument}:${note}`
  const cached = stringSampleCache.get(key)
  if (cached) return cached

  const nextPromise = fetch(`${STRING_SAMPLE_BASE_URLS[instrument]}${STRING_SAMPLE_URLS[instrument][note]}`).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Failed to load ${instrument} sample ${note}`)
    }
    return response.arrayBuffer()
  })

  stringSampleCache.set(key, nextPromise)
  return nextPromise
}

function nearestWindSampleForMidi(instrument: 'flute' | 'ocarina' | 'harmonica', pitch: number): { note: string; midi: number } {
  let closestNote = Object.keys(WIND_SAMPLE_URLS[instrument])[0] ?? 'C4'
  let closestMidi = noteNameToMidi(closestNote)
  let closestDistance = Number.POSITIVE_INFINITY

  for (const note of Object.keys(WIND_SAMPLE_URLS[instrument])) {
    const midi = noteNameToMidi(note)
    const distance = Math.abs(midi - pitch)
    if (distance < closestDistance) {
      closestDistance = distance
      closestNote = note
      closestMidi = midi
    }
  }

  return { note: closestNote, midi: closestMidi }
}

async function getWindSampleArrayBuffer(instrument: 'flute' | 'ocarina' | 'harmonica', note: string): Promise<ArrayBuffer> {
  const key = `${instrument}:${note}`
  const cached = windSampleCache.get(key)
  if (cached) return cached

  const nextPromise = fetch(`${WIND_SAMPLE_BASE_URLS[instrument]}${WIND_SAMPLE_URLS[instrument][note]}`).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Failed to load ${instrument} sample ${note}`)
    }
    return response.arrayBuffer()
  })

  windSampleCache.set(key, nextPromise)
  return nextPromise
}

function buildNoiseBuffer(context: BaseAudioContext, durationSeconds: number, noiseType: Song['tracks'][number]['settings']['noiseType']): AudioBuffer {
  const sampleCount = Math.max(1, Math.ceil(context.sampleRate * durationSeconds))
  const buffer = context.createBuffer(1, sampleCount, context.sampleRate)
  const output = buffer.getChannelData(0)

  let lastBrown = 0
  for (let i = 0; i < sampleCount; i += 1) {
    const white = Math.random() * 2 - 1
    if (noiseType === 'white') {
      output[i] = white
      continue
    }

    if (noiseType === 'pink') {
      output[i] = (lastBrown + 0.02 * white) / 1.02
      lastBrown = output[i]
      continue
    }

    lastBrown = (lastBrown + 0.04 * white) / 1.04
    output[i] = lastBrown * 3.5
  }

  return buffer
}

function audioBufferToWav(audioBuffer: AudioBuffer): Uint8Array {
  const channels = audioBuffer.numberOfChannels
  const sampleRate = audioBuffer.sampleRate
  const frameCount = audioBuffer.length
  const bytesPerSample = 2
  const blockAlign = channels * bytesPerSample
  const dataSize = frameCount * blockAlign
  const wavBuffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(wavBuffer)

  function writeAscii(offset: number, value: string): void {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i))
    }
  }

  writeAscii(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeAscii(8, 'WAVE')
  writeAscii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true)
  writeAscii(36, 'data')
  view.setUint32(40, dataSize, true)

  const channelData = Array.from({ length: channels }, (_, channel) => audioBuffer.getChannelData(channel))
  let offset = 44

  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][frame]))
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff
      view.setInt16(offset, intSample, true)
      offset += bytesPerSample
    }
  }

  return new Uint8Array(wavBuffer)
}

export async function renderSongToWav(song: Song): Promise<Uint8Array> {
  const stepsPerMeasure = Math.max(1, Math.floor(song.stepCount / Math.max(1, song.barCount)))
  const stepDurationSeconds = (60 / song.bpm) * (BEATS_PER_MEASURE / stepsPerMeasure)
  const longestRelease = Math.max(0, ...song.tracks.map((track) => track.settings.envelope.release))
  const renderDurationSeconds = song.stepCount * stepDurationSeconds + longestRelease + 0.5
  const frameCount = Math.max(1, Math.ceil(renderDurationSeconds * SAMPLE_RATE))

  const context = new OfflineAudioContext(2, frameCount, SAMPLE_RATE)
  const master = context.createGain()
  master.gain.value = 0.9
  master.connect(context.destination)

  const neededPianoSamples = new Set<string>()
  const neededGuitarSamples = new Set<string>()
  const neededElectricGuitarSamples = new Set<string>()
  const neededDrumSamples = new Set<string>()
  const neededHurdyGurdySamples = new Set<string>()
  const neededStringSamples = new Map<'violin' | 'viola' | 'cello' | 'bass', Set<string>>([
    ['violin', new Set<string>()],
    ['viola', new Set<string>()],
    ['cello', new Set<string>()],
    ['bass', new Set<string>()]
  ])
  const neededWindSamples = new Map<'flute' | 'ocarina' | 'harmonica', Set<string>>([
    ['flute', new Set<string>()],
    ['ocarina', new Set<string>()],
    ['harmonica', new Set<string>()]
  ])
  for (const track of song.tracks) {
    if (track.soundSource !== 'real') continue
    const row = song.grid[track.id] ?? []
    const realInstrument = resolveRealSampleInstrument(track.instrument)
    for (let step = 0; step < row.length; step += 1) {
      const cell = row[step]
      if (!cell) continue
      if (realInstrument === 'piano') {
        neededPianoSamples.add(nearestPianoSampleForMidi(cell.pitch).note)
      }
      if (realInstrument === 'guitar') {
        neededGuitarSamples.add(nearestGuitarSampleForMidi(cell.pitch).note)
      }
      if (realInstrument === 'electric-guitar') {
        neededElectricGuitarSamples.add(nearestElectricGuitarSampleForMidi(cell.pitch).note)
      }
      if (realInstrument === 'drums') {
        neededDrumSamples.add(nearestDrumSampleForMidi(cell.pitch).note)
      }
      if (realInstrument === 'hurdy-gurdy') {
        neededHurdyGurdySamples.add(nearestHurdyGurdySampleForMidi(cell.pitch).note)
      }
      if (isStringSampleInstrument(realInstrument)) {
        const sample = nearestStringSampleForMidi(realInstrument, cell.pitch)
        neededStringSamples.get(realInstrument)?.add(sample.note)
      }
      if (isWindSampleInstrument(realInstrument)) {
        const sample = nearestWindSampleForMidi(realInstrument, cell.pitch)
        neededWindSamples.get(realInstrument)?.add(sample.note)
      }
    }
  }

  const pianoBuffers = new Map<string, AudioBuffer>()
  await Promise.all(
    Array.from(neededPianoSamples).map(async (note) => {
      const arrayBuffer = await getPianoSampleArrayBuffer(note)
      const decoded = await context.decodeAudioData(arrayBuffer.slice(0))
      pianoBuffers.set(note, decoded)
    })
  )

  const hurdyGurdyBuffers = new Map<string, AudioBuffer>()
  await Promise.all(
    Array.from(neededHurdyGurdySamples).map(async (note) => {
      const arrayBuffer = await getHurdyGurdySampleArrayBuffer(note)
      const decoded = await context.decodeAudioData(arrayBuffer.slice(0))
      hurdyGurdyBuffers.set(note, decoded)
    })
  )

  const guitarBuffers = new Map<string, AudioBuffer>()
  await Promise.all(
    Array.from(neededGuitarSamples).map(async (note) => {
      const arrayBuffer = await getGuitarSampleArrayBuffer(note)
      const decoded = await context.decodeAudioData(arrayBuffer.slice(0))
      guitarBuffers.set(note, decoded)
    })
  )

  const electricGuitarBuffers = new Map<string, AudioBuffer>()
  await Promise.all(
    Array.from(neededElectricGuitarSamples).map(async (note) => {
      const arrayBuffer = await getElectricGuitarSampleArrayBuffer(note)
      const decoded = await context.decodeAudioData(arrayBuffer.slice(0))
      electricGuitarBuffers.set(note, decoded)
    })
  )

  const drumBuffers = new Map<string, AudioBuffer>()
  await Promise.all(
    Array.from(neededDrumSamples).map(async (note) => {
      const arrayBuffer = await getDrumSampleArrayBuffer(note)
      const decoded = await context.decodeAudioData(arrayBuffer.slice(0))
      drumBuffers.set(note, decoded)
    })
  )

  const stringBuffers = new Map<string, AudioBuffer>()
  await Promise.all(
    Array.from(neededStringSamples.entries()).flatMap(([instrument, notes]) =>
      Array.from(notes).map(async (note) => {
        const arrayBuffer = await getStringSampleArrayBuffer(instrument, note)
        const decoded = await context.decodeAudioData(arrayBuffer.slice(0))
        stringBuffers.set(`${instrument}:${note}`, decoded)
      })
    )
  )

  const windBuffers = new Map<string, AudioBuffer>()
  await Promise.all(
    Array.from(neededWindSamples.entries()).flatMap(([instrument, notes]) =>
      Array.from(notes).map(async (note) => {
        const arrayBuffer = await getWindSampleArrayBuffer(instrument, note)
        const decoded = await context.decodeAudioData(arrayBuffer.slice(0))
        windBuffers.set(`${instrument}:${note}`, decoded)
      })
    )
  )

  const hasSolo = song.tracks.some((track) => track.solo)

  for (const track of song.tracks) {
    if (track.muted) continue
    if (hasSolo && !track.solo) continue

    const row = song.grid[track.id] ?? []
    const realInstrumentForTrack = track.soundSource === 'real' ? resolveRealSampleInstrument(track.instrument) : null
    const isRealDrum = realInstrumentForTrack === 'drums'
    const attack =
      track.soundSource === 'real' ? Math.max(0.001, track.settings.envelope.attack) : Math.max(0.001, track.settings.envelope.attack)
    const decay =
      track.soundSource === 'real'
        ? isRealDrum
          ? Math.max(0.01, Math.min(0.2, track.settings.envelope.decay))
          : Math.max(0.02, track.settings.envelope.decay)
        : Math.max(0, track.settings.envelope.decay)
    const sustain =
      track.soundSource === 'real'
        ? isRealDrum
          ? Math.max(0, Math.min(0.3, track.settings.envelope.sustain))
          : Math.max(0.7, Math.min(1, track.settings.envelope.sustain))
        : Math.max(0, Math.min(1, track.settings.envelope.sustain))
    const release =
      track.soundSource === 'real'
        ? isRealDrum
          ? Math.max(0.01, Math.min(0.18, track.settings.envelope.release))
          : Math.max(0.12, track.settings.envelope.release)
        : Math.max(0.001, track.settings.envelope.release)

    for (let step = 0; step < row.length; step += 1) {
      const cell = row[step]
      if (!cell) continue

      const startTime = step * stepDurationSeconds
      const noteDuration = Math.max(stepDurationSeconds, cell.length * stepDurationSeconds)
      const releaseStart = startTime + noteDuration
      const stopTime = releaseStart + release + 0.02
      const gainMultiplier =
        track.soundSource === 'real' ? realSampleGainMultiplier(resolveRealSampleInstrument(track.instrument)) : 1
      const velocityGain = (cell.velocity / 127) * track.volume * 0.55 * gainMultiplier

      const gainNode = context.createGain()
      gainNode.gain.setValueAtTime(0.0001, startTime)
      gainNode.gain.linearRampToValueAtTime(velocityGain, startTime + attack)
      gainNode.gain.linearRampToValueAtTime(velocityGain * sustain, startTime + attack + decay)
      gainNode.gain.setValueAtTime(velocityGain * sustain, releaseStart)
      gainNode.gain.linearRampToValueAtTime(0.0001, releaseStart + release)
      gainNode.connect(master)

      if (track.soundSource === 'real') {
        const realInstrument = resolveRealSampleInstrument(track.instrument)
        if (realInstrument === 'piano') {
          const sample = nearestPianoSampleForMidi(cell.pitch)
          const sampleBuffer = pianoBuffers.get(sample.note)
          if (!sampleBuffer) continue

          const source = context.createBufferSource()
          source.buffer = sampleBuffer
          source.playbackRate.setValueAtTime(2 ** ((cell.pitch - sample.midi) / 12), startTime)
          source.connect(gainNode)
          source.start(startTime)
          source.stop(stopTime)
          continue
        }

        if (realInstrument === 'guitar') {
          const sample = nearestGuitarSampleForMidi(cell.pitch)
          const sampleBuffer = guitarBuffers.get(sample.note)
          if (!sampleBuffer) continue

          const source = context.createBufferSource()
          source.buffer = sampleBuffer
          source.playbackRate.setValueAtTime(2 ** ((cell.pitch - sample.midi) / 12), startTime)
          source.connect(gainNode)
          source.start(startTime)
          source.stop(stopTime)
          continue
        }

        if (realInstrument === 'electric-guitar') {
          const sample = nearestElectricGuitarSampleForMidi(cell.pitch)
          const sampleBuffer = electricGuitarBuffers.get(sample.note)
          if (!sampleBuffer) continue

          const source = context.createBufferSource()
          source.buffer = sampleBuffer
          source.playbackRate.setValueAtTime(2 ** ((cell.pitch - sample.midi) / 12), startTime)
          source.connect(gainNode)
          source.start(startTime)
          source.stop(stopTime)
          continue
        }

        if (realInstrument === 'drums') {
          const sample = nearestDrumSampleForMidi(cell.pitch)
          const sampleBuffer = drumBuffers.get(sample.note)
          if (!sampleBuffer) continue

          const source = context.createBufferSource()
          source.buffer = sampleBuffer
          source.connect(gainNode)
          source.start(startTime)
          source.stop(stopTime)
          continue
        }

        if (realInstrument === 'hurdy-gurdy') {
          const sample = nearestHurdyGurdySampleForMidi(cell.pitch)
          const sampleBuffer = hurdyGurdyBuffers.get(sample.note)
          if (!sampleBuffer) continue

          const source = context.createBufferSource()
          source.buffer = sampleBuffer
          source.playbackRate.setValueAtTime(2 ** ((cell.pitch - sample.midi) / 12), startTime)
          source.connect(gainNode)
          source.start(startTime)
          source.stop(stopTime)
          continue
        }

        if (isStringSampleInstrument(realInstrument)) {
          const sample = nearestStringSampleForMidi(realInstrument, cell.pitch)
          const sampleBuffer = stringBuffers.get(`${realInstrument}:${sample.note}`)
          if (!sampleBuffer) continue

          const source = context.createBufferSource()
          source.buffer = sampleBuffer
          source.playbackRate.setValueAtTime(2 ** ((cell.pitch - sample.midi) / 12), startTime)
          source.connect(gainNode)
          source.start(startTime)
          source.stop(stopTime)
          continue
        }

        const sample = nearestWindSampleForMidi(realInstrument, cell.pitch)
        const sampleBuffer = windBuffers.get(`${realInstrument}:${sample.note}`)
        if (!sampleBuffer) continue

        const source = context.createBufferSource()
        source.buffer = sampleBuffer
        source.playbackRate.setValueAtTime(2 ** ((cell.pitch - sample.midi) / 12), startTime)
        source.connect(gainNode)
        source.start(startTime)
        source.stop(stopTime)
        continue
      }

      if (track.instrument === 'noise' || track.instrument === 'drums') {
        const noiseSource = context.createBufferSource()
        noiseSource.buffer = buildNoiseBuffer(context, noteDuration + release + 0.05, track.settings.noiseType)
        noiseSource.connect(gainNode)
        noiseSource.start(startTime)
        noiseSource.stop(stopTime)
        continue
      }

      const osc = context.createOscillator()
      osc.type = oscillatorTypeForInstrument(track.instrument)
      osc.frequency.setValueAtTime(midiToHz(cell.pitch), startTime)
      osc.connect(gainNode)
      osc.start(startTime)
      osc.stop(stopTime)
    }
  }

  const rendered = await context.startRendering()
  return audioBufferToWav(rendered)
}
