# 8bMzMKR

8bMzMKR is a chiptune music editor built with Electron, React, and TypeScript.

## Run Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start development mode:
   ```bash
   npm run dev
   ```

## Build Desktop Apps

Compiled app artifacts are written to the `dist/` directory.

### macOS

1. Build and package for macOS:
   ```bash
   npm run dist:mac
   ```
2. Output typically includes a `.dmg` and/or `.zip` depending on target defaults.

### Windows

1. Build and package for Windows:
   ```bash
   npm run dist:win
   ```
2. Output typically includes an `.exe` installer and/or unpacked app depending on target defaults.

## Cross-Platform Build Notes

- Best practice is to build on the target OS:
  - Build macOS artifacts on macOS
  - Build Windows artifacts on Windows
- Cross-building can work in some setups, but signing, native dependencies, and installer tooling can fail depending on environment.

## Generic Packaging Command

To let `electron-builder` choose the current platform automatically:

```bash
npm run dist
```

## Code Signing (Release Builds)

Unsigned builds are fine for local testing. For public distribution:

- macOS: configure Apple Developer signing and notarization.
- Windows: configure Authenticode code signing.

Without signing, users may see security warnings during installation.

## License

This project uses a custom license. See [LICENSE](LICENSE).
