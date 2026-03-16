const LOCAL_PIANO_FILES = [
  'A0.mp3',
  'C1.mp3',
  'Ds1.mp3',
  'Fs1.mp3',
  'A1.mp3',
  'C2.mp3',
  'Ds2.mp3',
  'Fs2.mp3',
  'A2.mp3',
  'C3.mp3',
  'Ds3.mp3',
  'Fs3.mp3',
  'A3.mp3',
  'C4.mp3',
  'Ds4.mp3',
  'Fs4.mp3',
  'A4.mp3',
  'C5.mp3',
  'Ds5.mp3',
  'Fs5.mp3',
  'A5.mp3',
  'C6.mp3',
  'Ds6.mp3',
  'Fs6.mp3',
  'A6.mp3',
  'C7.mp3',
  'Ds7.mp3',
  'Fs7.mp3',
  'A7.mp3',
  'C8.mp3'
]

const LOCAL_HURDY_GURDY_FILES = ['C3.wav', 'G3.wav', 'C4.wav', 'G4.wav', 'C5.wav']

const LOCAL_GUITAR_FILES = ['A2.mp3', 'C3.mp3', 'E3.mp3', 'G3.mp3', 'A3.mp3', 'C4.mp3', 'E4.mp3', 'G4.mp3']
const LOCAL_ELECTRIC_GUITAR_FILES = ['A2.mp3', 'C3.mp3', 'E3.mp3', 'G3.mp3', 'A3.mp3', 'C4.mp3', 'E4.mp3', 'G4.mp3']
const LOCAL_DRUM_FILES = ['B1.mp3', 'C2.mp3', 'D2.mp3', 'E2.mp3', 'F2.mp3', 'G2.mp3', 'A2.mp3', 'B2.mp3', 'C3.mp3']

const LOCAL_STRING_FILES: Record<'violin' | 'viola' | 'cello' | 'bass', string[]> = {
  violin: ['G3.wav', 'D4.wav', 'A4.wav', 'E5.wav'],
  viola: ['C3.wav', 'G3.wav', 'D4.wav', 'A4.wav'],
  cello: ['C2.wav', 'G2.wav', 'D3.wav', 'A3.wav'],
  bass: ['E1.wav', 'A1.wav', 'D2.wav', 'G2.wav']
}

const LOCAL_WIND_FILES: Record<'flute' | 'ocarina' | 'harmonica', string[]> = {
  flute: ['C4.mp3', 'D4.mp3', 'E4.mp3', 'G4.mp3', 'A4.mp3', 'C5.mp3', 'D5.mp3', 'E5.mp3', 'G5.mp3', 'A5.mp3', 'C6.mp3'],
  ocarina: ['A3.mp3', 'B3.mp3', 'C4.mp3', 'D4.mp3', 'E4.mp3', 'A4.mp3', 'B4.mp3', 'C5.mp3', 'D5.mp3', 'E5.mp3', 'G5.mp3', 'A5.mp3'],
  harmonica: ['C3.mp3', 'D3.mp3', 'E3.mp3', 'G3.mp3', 'A3.mp3', 'C4.mp3', 'D4.mp3', 'E4.mp3', 'G4.mp3', 'A4.mp3', 'C5.mp3']
}

const BASE = import.meta.env.BASE_URL ?? '/'

function buildRequiredSamplePaths(): string[] {
  const paths: string[] = []

  for (const file of LOCAL_PIANO_FILES) {
    paths.push(`${BASE}samples/piano/${file}`)
  }

  for (const file of LOCAL_HURDY_GURDY_FILES) {
    paths.push(`${BASE}samples/hurdy-gurdy/${file}`)
  }

  for (const file of LOCAL_GUITAR_FILES) {
    paths.push(`${BASE}samples/guitar/${file}`)
  }

  for (const file of LOCAL_ELECTRIC_GUITAR_FILES) {
    paths.push(`${BASE}samples/electric-guitar/${file}`)
  }

  for (const file of LOCAL_DRUM_FILES) {
    paths.push(`${BASE}samples/drums/${file}`)
  }

  for (const instrument of Object.keys(LOCAL_STRING_FILES) as Array<keyof typeof LOCAL_STRING_FILES>) {
    for (const file of LOCAL_STRING_FILES[instrument]) {
      paths.push(`${BASE}samples/strings/${instrument}/${file}`)
    }
  }

  for (const instrument of Object.keys(LOCAL_WIND_FILES) as Array<keyof typeof LOCAL_WIND_FILES>) {
    for (const file of LOCAL_WIND_FILES[instrument]) {
      paths.push(`${BASE}samples/winds/${instrument}/${file}`)
    }
  }

  return paths
}

export const REQUIRED_LOCAL_SAMPLE_PATHS = buildRequiredSamplePaths()

export async function findMissingLocalSamples(): Promise<string[]> {
  const checks = await Promise.all(
    REQUIRED_LOCAL_SAMPLE_PATHS.map(async (path) => {
      try {
        const response = await fetch(path, { cache: 'no-store' })
        return response.ok ? null : path
      } catch {
        return path
      }
    })
  )

  return checks.filter((item): item is string => item !== null)
}
