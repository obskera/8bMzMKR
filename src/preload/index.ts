import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { AudioExportFormat, Song } from '../shared/song'

const api = {
  openProject: (): Promise<Song | null> => ipcRenderer.invoke('project:open'),
  saveProject: (song: Song): Promise<boolean> => ipcRenderer.invoke('project:save', song),
  exportAudio: (format: AudioExportFormat, audioData: Uint8Array): Promise<boolean> =>
    ipcRenderer.invoke('project:export-audio', { format, audioData })
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
