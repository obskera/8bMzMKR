const fs = require('fs')
const path = require('path')

const sampleRate = 44100
const durationSeconds = 4.2
const sampleCount = Math.floor(sampleRate * durationSeconds)

const banks = {
  flute: [
    ['C4', 261.63],
    ['D4', 293.66],
    ['E4', 329.63],
    ['G4', 392.0],
    ['A4', 440.0],
    ['C5', 523.25],
    ['D5', 587.33],
    ['E5', 659.25],
    ['G5', 783.99],
    ['A5', 880.0],
    ['C6', 1046.5]
  ],
  ocarina: [
    ['A3', 220.0],
    ['B3', 246.94],
    ['C4', 261.63],
    ['D4', 293.66],
    ['E4', 329.63],
    ['A4', 440.0],
    ['B4', 493.88],
    ['C5', 523.25],
    ['D5', 587.33],
    ['E5', 659.25],
    ['G5', 783.99],
    ['A5', 880.0]
  ],
  harmonica: [
    ['C3', 130.81],
    ['D3', 146.83],
    ['E3', 164.81],
    ['G3', 196.0],
    ['A3', 220.0],
    ['C4', 261.63],
    ['D4', 293.66],
    ['E4', 329.63],
    ['G4', 392.0],
    ['A4', 440.0],
    ['C5', 523.25]
  ]
}

const timbre = {
  flute: {
    attack: 0.07,
    release: 0.26,
    vibratoHz: 5.5,
    vibratoDepth: 0.012,
    vibratoDelay: 0.22,
    breathNoise: 0.018,
    brightness: 1.05,
    saturation: 0.72,
    pitchScoopCents: 13,
    breathCutoffHz: 4200,
    harmonicRolloff: 1.45,
    formants: [
      [900, 1.2],
      [2500, 0.85],
      [4200, 0.45]
    ]
  },
  ocarina: {
    attack: 0.09,
    release: 0.22,
    vibratoHz: 4.2,
    vibratoDepth: 0.007,
    vibratoDelay: 0.27,
    breathNoise: 0.01,
    brightness: 0.78,
    saturation: 0.58,
    pitchScoopCents: 9,
    breathCutoffHz: 3000,
    harmonicRolloff: 1.7,
    formants: [
      [700, 1.3],
      [1500, 0.9],
      [2800, 0.45]
    ]
  },
  harmonica: {
    attack: 0.035,
    release: 0.2,
    vibratoHz: 6.1,
    vibratoDepth: 0.016,
    vibratoDelay: 0.12,
    breathNoise: 0.028,
    brightness: 1.18,
    saturation: 0.88,
    pitchScoopCents: 16,
    breathCutoffHz: 3600,
    harmonicRolloff: 1.25,
    formants: [
      [1100, 1.05],
      [2300, 1.0],
      [3600, 0.55]
    ]
  }
}

function createPrng(seed) {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

function hashString(input) {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value))
}

function centsToRatio(cents) {
  return 2 ** (cents / 1200)
}

function writeWav(filePath, samples) {
  const channels = 1
  const bytesPerSample = 2
  const byteRate = sampleRate * channels * bytesPerSample
  const blockAlign = channels * bytesPerSample
  const dataSize = samples.length * bytesPerSample
  const buffer = Buffer.alloc(44 + dataSize)

  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(channels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(byteRate, 28)
  buffer.writeUInt16LE(blockAlign, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  for (let i = 0; i < samples.length; i += 1) {
    const value = Math.max(-1, Math.min(1, samples[i]))
    buffer.writeInt16LE(Math.round(value * 32767), 44 + i * 2)
  }

  fs.writeFileSync(filePath, buffer)
}

function envelopeAt(time, profile) {
  const attack = Math.min(1, time / profile.attack)
  const sustainEnd = durationSeconds - profile.release
  const release = time > sustainEnd ? Math.max(0, (durationSeconds - time) / profile.release) : 1
  return attack * release
}

function formantBoost(hz, profile) {
  let total = 0.12
  for (const [center, gain] of profile.formants) {
    const bandwidth = center * 0.35
    const norm = (hz - center) / Math.max(1, bandwidth)
    total += gain * Math.exp(-(norm * norm))
  }
  return total
}

function softClip(value, amount) {
  const drive = 1 + amount * 5
  return Math.tanh(value * drive) / Math.tanh(drive)
}

function windSample(instrument, noteName, frequency, profile) {
  const rand = createPrng(hashString(`${instrument}:${noteName}`))
  const out = new Float32Array(sampleCount)
  const harmonicCount = 12
  const harmonicPhases = new Array(harmonicCount).fill(0).map(() => rand() * Math.PI * 2)

  const noiseAlpha = Math.exp((-2 * Math.PI * profile.breathCutoffHz) / sampleRate)
  let noiseState = 0
  let shimmerState = 0

  for (let index = 0; index < sampleCount; index += 1) {
    const t = index / sampleRate
    const env = envelopeAt(t, profile)
    const vibFade = clamp((t - profile.vibratoDelay) / 0.28, 0, 1)
    const vibrato = 1 + profile.vibratoDepth * vibFade * Math.sin(2 * Math.PI * profile.vibratoHz * t)

    const pitchScoop = centsToRatio(profile.pitchScoopCents * Math.exp(-t * 17))
    const tailDrop = t > durationSeconds - profile.release ? centsToRatio(-6 * ((t - (durationSeconds - profile.release)) / profile.release)) : 1
    const instantaneousFreq = frequency * vibrato * pitchScoop * tailDrop

    shimmerState += (rand() * 2 - 1) * 0.00003
    shimmerState = clamp(shimmerState, -0.0006, 0.0006)

    let harmonicSum = 0
    for (let harmonic = 1; harmonic <= harmonicCount; harmonic += 1) {
      const hz = instantaneousFreq * harmonic * (1 + shimmerState * harmonic * 0.2)
      harmonicPhases[harmonic - 1] += (2 * Math.PI * hz) / sampleRate
      if (harmonicPhases[harmonic - 1] > Math.PI * 2) {
        harmonicPhases[harmonic - 1] -= Math.PI * 2
      }

      const rolloff = 1 / harmonic ** profile.harmonicRolloff
      const brightnessTilt = 1 + ((profile.brightness - 1) * (harmonic - 1)) / harmonicCount
      const formant = formantBoost(hz, profile)
      const amplitude = rolloff * brightnessTilt * formant
      harmonicSum += Math.sin(harmonicPhases[harmonic - 1]) * amplitude
    }

    const rawNoise = rand() * 2 - 1
    noiseState = noiseAlpha * noiseState + (1 - noiseAlpha) * rawNoise
    const breath = noiseState * profile.breathNoise

    const chiffEnv = Math.exp(-t * 36)
    const chiff = (rand() * 2 - 1) * profile.breathNoise * 3.2 * chiffEnv

    const core = softClip(harmonicSum * 0.32 + breath + chiff, profile.saturation)
    out[index] = core * env
  }

  let peak = 0
  for (let index = 0; index < out.length; index += 1) {
    const value = Math.abs(out[index])
    if (value > peak) peak = value
  }

  if (peak > 0.0001) {
    const gain = 0.92 / peak
    for (let index = 0; index < out.length; index += 1) {
      out[index] = clamp(out[index] * gain, -1, 1)
    }
  }

  return out
}

for (const instrument of Object.keys(banks)) {
  const dir = path.resolve(`src/renderer/public/samples/winds/${instrument}`)
  fs.mkdirSync(dir, { recursive: true })

  for (const [noteName, frequency] of banks[instrument]) {
    const sample = windSample(instrument, noteName, frequency, timbre[instrument])
    writeWav(path.join(dir, `${noteName}.wav`), sample)
  }
}

console.log('generated local wind sample banks')