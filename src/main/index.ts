import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { is } from '@electron-toolkit/utils'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import { ExportAudioPayloadSchema, SongSchema, type AudioExportFormat, type Song } from '../shared/song'

let mainWindow: BrowserWindow | null = null

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic)
}

async function openProjectFile(): Promise<Song | null> {
  if (!mainWindow) return null

  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Open 8bMzMKR Project',
    filters: [{ name: '8bMzMKR Project', extensions: ['mzkr', 'json'] }],
    properties: ['openFile']
  })

  if (canceled || filePaths.length === 0) return null

  const raw = await readFile(filePaths[0], 'utf8')
  const parsed = SongSchema.safeParse(JSON.parse(raw))
  if (!parsed.success) {
    throw new Error('Invalid project file')
  }

  return parsed.data
}

async function saveProjectFile(song: Song): Promise<boolean> {
  if (!mainWindow) return false

  const parsed = SongSchema.safeParse(song)
  if (!parsed.success) {
    throw new Error('Cannot save invalid project data')
  }

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save 8bMzMKR Project',
    defaultPath: 'untitled.mzkr',
    filters: [{ name: '8bMzMKR Project', extensions: ['mzkr'] }]
  })

  if (canceled || !filePath) return false

  await writeFile(filePath, JSON.stringify(parsed.data, null, 2), 'utf8')
  return true
}

function runFfmpegConvert(inputPath: string, outputPath: string, format: AudioExportFormat): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = ffmpeg(inputPath).format(format)

    if (format === 'mp3') {
      command.audioCodec('libmp3lame')
    }

    if (format === 'ogg') {
      command.audioCodec('libvorbis')
    }

    command
      .on('end', () => resolve())
      .on('error', (error) => reject(error))
      .save(outputPath)
  })
}

async function exportAudioFile(payload: unknown): Promise<boolean> {
  if (!mainWindow) return false

  const parsed = ExportAudioPayloadSchema.safeParse(payload)
  if (!parsed.success) {
    throw new Error('Invalid export payload')
  }

  const { format, audioData } = parsed.data

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Audio',
    defaultPath: `untitled.${format}`,
    filters: [{ name: format.toUpperCase(), extensions: [format] }]
  })

  if (canceled || !filePath) return false

  if (format === 'wav') {
    await writeFile(filePath, Buffer.from(audioData))
    return true
  }

  if (!ffmpegStatic) {
    throw new Error('FFmpeg binary is unavailable for compressed export')
  }

  const workingDir = join(tmpdir(), `8bmzmkr-export-${randomUUID()}`)
  const sourceWavPath = join(workingDir, 'source.wav')
  await mkdir(workingDir, { recursive: true })
  await writeFile(sourceWavPath, Buffer.from(audioData), { flag: 'w' })

  try {
    await runFfmpegConvert(sourceWavPath, filePath, format)
    return true
  } finally {
    await rm(workingDir, { recursive: true, force: true })
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: '8bMzMKR',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  ipcMain.handle('project:open', async () => openProjectFile())
  ipcMain.handle('project:save', async (_event, song: Song) => saveProjectFile(song))
  ipcMain.handle('project:export-audio', async (_event, payload: unknown) => exportAudioFile(payload))

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
