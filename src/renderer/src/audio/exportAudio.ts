import type { Song } from '../types/song'

const SAMPLE_RATE = 44100
const BEATS_PER_MEASURE = 4
const MEASURE_COUNT = 4

function midiToHz(pitch: number): number {
  return 440 * 2 ** ((pitch - 69) / 12)
}

function oscillatorTypeForInstrument(instrument: Song['tracks'][number]['instrument']): OscillatorType {
  if (instrument === 'square') return 'square'
  if (instrument === 'triangle') return 'triangle'
  return 'sawtooth'
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
  const stepsPerMeasure = Math.max(1, Math.floor(song.stepCount / MEASURE_COUNT))
  const stepDurationSeconds = (60 / song.bpm) * (BEATS_PER_MEASURE / stepsPerMeasure)
  const longestRelease = Math.max(0, ...song.tracks.map((track) => track.settings.envelope.release))
  const renderDurationSeconds = song.stepCount * stepDurationSeconds + longestRelease + 0.5
  const frameCount = Math.max(1, Math.ceil(renderDurationSeconds * SAMPLE_RATE))

  const context = new OfflineAudioContext(2, frameCount, SAMPLE_RATE)
  const master = context.createGain()
  master.gain.value = 0.9
  master.connect(context.destination)

  const hasSolo = song.tracks.some((track) => track.solo)

  for (const track of song.tracks) {
    if (track.muted) continue
    if (hasSolo && !track.solo) continue

    const row = song.grid[track.id] ?? []
    const attack = Math.max(0.001, track.settings.envelope.attack)
    const decay = Math.max(0, track.settings.envelope.decay)
    const sustain = Math.max(0, Math.min(1, track.settings.envelope.sustain))
    const release = Math.max(0.001, track.settings.envelope.release)

    for (let step = 0; step < row.length; step += 1) {
      const cell = row[step]
      if (!cell) continue

      const startTime = step * stepDurationSeconds
      const noteDuration = Math.max(stepDurationSeconds, cell.length * stepDurationSeconds)
      const releaseStart = startTime + noteDuration
      const stopTime = releaseStart + release + 0.02
      const velocityGain = (cell.velocity / 127) * track.volume * 0.55

      const gainNode = context.createGain()
      gainNode.gain.setValueAtTime(0.0001, startTime)
      gainNode.gain.linearRampToValueAtTime(velocityGain, startTime + attack)
      gainNode.gain.linearRampToValueAtTime(velocityGain * sustain, startTime + attack + decay)
      gainNode.gain.setValueAtTime(velocityGain * sustain, releaseStart)
      gainNode.gain.linearRampToValueAtTime(0.0001, releaseStart + release)
      gainNode.connect(master)

      if (track.instrument === 'noise') {
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
