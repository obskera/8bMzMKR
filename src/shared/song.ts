import { z } from 'zod'

export const InstrumentTypeSchema = z.enum([
  'square',
  'triangle',
  'sawtooth',
  'noise',
  'fm',
  'am',
  'duo',
  'pluck',
  'guitar',
  'electric-guitar',
  'hurdy-gurdy',
  'violin',
  'viola',
  'cello',
  'bass',
  'flute',
  'ocarina',
  'harmonica',
  'piano',
  'drums',
  'membrane',
  'metal'
])
export type InstrumentType = z.infer<typeof InstrumentTypeSchema>

export const EnvelopeSchema = z.object({
  attack: z.number().min(0).max(1),
  decay: z.number().min(0).max(2),
  sustain: z.number().min(0).max(1),
  release: z.number().min(0).max(2)
})
export type Envelope = z.infer<typeof EnvelopeSchema>

export const NoiseTypeSchema = z.enum(['white', 'pink', 'brown'])
export type NoiseType = z.infer<typeof NoiseTypeSchema>

export const TrackSoundSourceSchema = z.enum(['synth', 'real'])
export type TrackSoundSource = z.infer<typeof TrackSoundSourceSchema>

export const InstrumentSettingsSchema = z.object({
  envelope: EnvelopeSchema.default({
    attack: 0.001,
    decay: 0.1,
    sustain: 0.3,
    release: 0.08
  }),
  noiseType: NoiseTypeSchema.default('white')
})
export type InstrumentSettings = z.infer<typeof InstrumentSettingsSchema>

export const TrackSchema = z.object({
  id: z.string(),
  name: z.string(),
  instrument: InstrumentTypeSchema,
  soundSource: TrackSoundSourceSchema.default('synth'),
  settings: InstrumentSettingsSchema.default({
    envelope: {
      attack: 0.001,
      decay: 0.1,
      sustain: 0.3,
      release: 0.08
    },
    noiseType: 'white'
  }),
  defaultPitch: z.number().int().min(0).max(127),
  volume: z.number().min(0).max(1),
  muted: z.boolean(),
  solo: z.boolean()
})
export type Track = z.infer<typeof TrackSchema>

export const NoteCellSchema = z
  .object({
    pitch: z.number().int().min(0).max(127),
    velocity: z.number().int().min(1).max(127),
    length: z.number().int().min(1).max(64).default(1)
  })
  .nullable()
export type NoteCell = z.infer<typeof NoteCellSchema>

export const SongSchema = z.object({
  version: z.literal(1),
  bpm: z.number().min(40).max(300),
  barCount: z.number().int().min(1).max(16).default(4),
  stepCount: z.number().int().min(4).max(1024),
  lastGenerationSeed: z.string().nullable().default(null),
  tracks: z.array(TrackSchema),
  grid: z.record(z.string(), z.array(NoteCellSchema))
})
export type Song = z.infer<typeof SongSchema>

export const AudioExportFormatSchema = z.enum(['wav', 'mp3', 'ogg'])
export type AudioExportFormat = z.infer<typeof AudioExportFormatSchema>

export const ExportAudioPayloadSchema = z.object({
  format: AudioExportFormatSchema,
  audioData: z.instanceof(Uint8Array)
})
export type ExportAudioPayload = z.infer<typeof ExportAudioPayloadSchema>
