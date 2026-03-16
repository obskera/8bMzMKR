const fs = require('fs')
const path = require('path')

const sampleRate = 44100
const durationSeconds = 2.2
const sampleCount = Math.floor(sampleRate * durationSeconds)

const banks = {
  violin: [
    ['G3', 196.0],
    ['D4', 293.66],
    ['A4', 440.0],
    ['E5', 659.25]
  ],
  viola: [
    ['C3', 130.81],
    ['G3', 196.0],
    ['D4', 293.66],
    ['A4', 440.0]
  ],
  cello: [
    ['C2', 65.41],
    ['G2', 98.0],
    ['D3', 146.83],
    ['A3', 220.0]
  ],
  bass: [
    ['E1', 41.2],
    ['A1', 55.0],
    ['D2', 73.42],
    ['G2', 98.0]
  ]
}

const timbre = {
  violin: { brightness: 0.95, bowNoise: 0.035, vibratoHz: 5.5, vibratoDepth: 0.004, attack: 0.05 },
  viola: { brightness: 0.72, bowNoise: 0.04, vibratoHz: 5.0, vibratoDepth: 0.0035, attack: 0.06 },
  cello: { brightness: 0.52, bowNoise: 0.045, vibratoHz: 4.5, vibratoDepth: 0.003, attack: 0.07 },
  bass: { brightness: 0.38, bowNoise: 0.05, vibratoHz: 4.2, vibratoDepth: 0.0024, attack: 0.08 }
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

function bowedStringSample(frequency, profile) {
  const out = new Float32Array(sampleCount)
  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / sampleRate
    const attack = Math.min(1, t / profile.attack)
    const releaseWindow = Math.max(0, (durationSeconds - t) / 0.18)
    const sustain = Math.min(1, releaseWindow)
    const envelope = attack * sustain

    const vibrato = 1 + profile.vibratoDepth * Math.sin(2 * Math.PI * profile.vibratoHz * t)
    const f = frequency * vibrato

    let harmonicMix = 0
    harmonicMix += 0.58 * Math.sin(2 * Math.PI * f * t)
    harmonicMix += 0.26 * Math.sin(2 * Math.PI * f * 2 * t + 0.11)
    harmonicMix += 0.18 * Math.sin(2 * Math.PI * f * 3 * t + 0.27)
    harmonicMix += 0.1 * profile.brightness * Math.sin(2 * Math.PI * f * 4 * t + 0.41)
    harmonicMix += 0.06 * profile.brightness * Math.sin(2 * Math.PI * f * 5 * t + 0.53)
    harmonicMix += 0.04 * profile.brightness * Math.sin(2 * Math.PI * f * 6 * t + 0.18)

    const bow = (Math.random() * 2 - 1) * profile.bowNoise
    const bodyResonance = 0.12 * Math.sin(2 * Math.PI * (f * 0.5) * t)

    out[i] = (harmonicMix + bodyResonance + bow) * envelope * 0.92
  }
  return out
}

for (const instrument of Object.keys(banks)) {
  const dir = path.resolve(`src/renderer/public/samples/strings/${instrument}`)
  fs.mkdirSync(dir, { recursive: true })

  for (const [noteName, frequency] of banks[instrument]) {
    const sample = bowedStringSample(frequency, timbre[instrument])
    const outPath = path.join(dir, `${noteName}.wav`)
    writeWav(outPath, sample)
  }
}

console.log('generated local string sample banks')
