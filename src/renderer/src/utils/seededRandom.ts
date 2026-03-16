export type SeededRandom = () => number

const TOKEN_PREFIX = 'g1'

export interface GenerationSeedTokenPayload {
  seed: string
  style: string
  technoFlavor?: string
  key: string
  variation: string
  mood: string
  preset: string
  repeatReady: boolean
  loopStyle: string
  randomizeBpm?: boolean
  bpm?: number
  barCount: number
  stepsPerBar: number
  trackLayout: Array<{ name: string; instrument: string }>
}

function xmur3(seed: string): () => number {
  let hash = 1779033703 ^ seed.length

  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 3432918353)
    hash = (hash << 13) | (hash >>> 19)
  }

  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507)
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909)
    hash ^= hash >>> 16
    return hash >>> 0
  }
}

function mulberry32(seed: number): SeededRandom {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function normalizeSeed(seed: string): string {
  const next = seed.trim()
  return next.length > 0 ? next : 'seed-0'
}

export function createSeededRandom(seed: string): SeededRandom {
  const normalized = normalizeSeed(seed)
  const hasher = xmur3(normalized)
  return mulberry32(hasher())
}

export function createAutoSeed(): string {
  const time = Date.now().toString(36)
  const noise = Math.floor(Math.random() * 0xffffffff)
    .toString(36)
    .padStart(6, '0')
  return `${time}-${noise}`
}

export function buildGenerationSeedToken(payload: GenerationSeedTokenPayload): string {
  const layoutJson = JSON.stringify(payload.trackLayout)
  return [
    TOKEN_PREFIX,
    `seed=${encodeURIComponent(normalizeSeed(payload.seed))}`,
    `style=${encodeURIComponent(payload.style)}`,
    `flavor=${encodeURIComponent(payload.technoFlavor ?? 'melodic')}`,
    `key=${encodeURIComponent(payload.key)}`,
    `variation=${encodeURIComponent(payload.variation)}`,
    `mood=${encodeURIComponent(payload.mood)}`,
    `preset=${encodeURIComponent(payload.preset)}`,
    `repeat=${payload.repeatReady ? '1' : '0'}`,
    `loop=${encodeURIComponent(payload.loopStyle)}`,
    `rbpm=${payload.randomizeBpm ? '1' : '0'}`,
    `bpm=${Math.max(40, Math.min(300, Math.floor(payload.bpm ?? 120)))}`,
    `bars=${Math.max(1, Math.floor(payload.barCount))}`,
    `spb=${Math.max(1, Math.floor(payload.stepsPerBar))}`,
    `layout=${encodeURIComponent(layoutJson)}`
  ].join('|')
}

export function parseGenerationSeedToken(value: string): GenerationSeedTokenPayload | null {
  const trimmed = value.trim()
  if (!trimmed.startsWith(`${TOKEN_PREFIX}|`)) return null

  const parts = trimmed.split('|').slice(1)
  const map = new Map<string, string>()

  for (const part of parts) {
    const separatorIndex = part.indexOf('=')
    if (separatorIndex <= 0) continue
    const key = part.slice(0, separatorIndex)
    const rawValue = part.slice(separatorIndex + 1)
    map.set(key, rawValue)
  }

  const seedRaw = map.get('seed')
  const styleRaw = map.get('style')
  const keyRaw = map.get('key')
  const flavorRaw = map.get('flavor')
  const variationRaw = map.get('variation')
  const moodRaw = map.get('mood')
  const presetRaw = map.get('preset')
  const repeatRaw = map.get('repeat')
  const loopRaw = map.get('loop')
  const randomizeBpmRaw = map.get('rbpm')
  const bpmRaw = map.get('bpm')
  const barsRaw = map.get('bars')
  const spbRaw = map.get('spb')
  const layoutRaw = map.get('layout')

  if (!seedRaw || !moodRaw || !presetRaw || !repeatRaw || !loopRaw || !barsRaw || !spbRaw || !layoutRaw) return null

  const barCount = Number(barsRaw)
  const stepsPerBar = Number(spbRaw)
  const bpm = bpmRaw ? Number(bpmRaw) : undefined
  if (!Number.isFinite(barCount) || !Number.isFinite(stepsPerBar)) return null

  let trackLayout: Array<{ name: string; instrument: string }> = []
  try {
    const parsedLayout = JSON.parse(decodeURIComponent(layoutRaw))
    if (!Array.isArray(parsedLayout)) return null

    trackLayout = parsedLayout
      .filter((item) => item && typeof item.name === 'string' && typeof item.instrument === 'string')
      .map((item) => ({ name: item.name, instrument: item.instrument }))

    if (trackLayout.length === 0) return null
  } catch {
    return null
  }

  return {
    seed: normalizeSeed(decodeURIComponent(seedRaw)),
    style: styleRaw ? decodeURIComponent(styleRaw) : 'chiptune',
    technoFlavor: flavorRaw ? decodeURIComponent(flavorRaw) : 'melodic',
    key: keyRaw ? decodeURIComponent(keyRaw) : 'random',
    variation: variationRaw ? decodeURIComponent(variationRaw) : 'normal',
    mood: decodeURIComponent(moodRaw),
    preset: decodeURIComponent(presetRaw),
    repeatReady: repeatRaw === '1',
    loopStyle: decodeURIComponent(loopRaw),
    randomizeBpm: randomizeBpmRaw === '1',
    bpm: typeof bpm === 'number' && Number.isFinite(bpm) ? Math.max(40, Math.min(300, Math.floor(bpm))) : undefined,
    barCount: Math.max(1, Math.floor(barCount)),
    stepsPerBar: Math.max(1, Math.floor(stepsPerBar)),
    trackLayout
  }
}
