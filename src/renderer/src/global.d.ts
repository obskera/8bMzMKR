import type { AudioExportFormat, Song } from './types/song'

declare global {
  interface Window {
    api: {
      openProject: () => Promise<Song | null>
      saveProject: (song: Song) => Promise<boolean>
      exportAudio: (format: AudioExportFormat, audioData: Uint8Array) => Promise<boolean>
      exportCc0License: () => Promise<boolean>
    }
  }
}

export {}
