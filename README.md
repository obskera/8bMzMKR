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

## Generate Local Wind Samples

Wind instruments (flute, ocarina, harmonica) use local WAV banks generated in-repo.

```bash
npm run gen:samples:wind
```

## Music Usage License Requirement

If you plan to use generated music outside local testing (for example in games, videos, streams, client work, or commercial releases), you must generate and include a license/attribution text file.

Required workflow:

1. In the app, click `Export License` after exporting audio.
2. Include the exported license text file with your distributed music/project files.
3. If your project uses any CC-BY source material, make sure the attribution text is complete and accurate before distribution.

Treat this step as mandatory for public or commercial use.

## Bundled Sample Attribution

This project includes locally bundled instrument samples for real playback/export.

- FluidR3_GM soundfont derived samples are used for bundled piano, acoustic guitar, electric guitar, and drum kit assets.
- FluidR3_GM is identified by the upstream source as licensed under CC BY 3.0.
- Distribution of builds or exported works that include these assets requires attribution.

Minimum compliance steps:

1. Preserve this attribution information in your project or distribution materials.
2. Use the app's exported license/attribution text when distributing generated music.
3. Do not remove attribution notices from the sample folders.

Sample folder README files under [src/renderer/public/samples](src/renderer/public/samples) document the bundled source and attribution requirement.

## Build Desktop Apps

Compiled app artifacts are written to the `dist/` directory.

### macOS

1. Build and package for macOS:
    ```bash
    npm run dist:mac
    ```
2. Output typically includes a `.dmg` and/or `.zip` depending on target defaults.
3. If a macOS signing identity is installed in your keychain, `electron-builder` may auto-sign this build.
4. For an unsigned local test build, use:
    ```bash
    npm run dist:mac:unsigned
    ```
5. If signed builds fail with `resource fork, Finder information, or similar detritus not allowed`, build to `/tmp` (outside Desktop/iCloud-managed paths):
    ```bash
    npm run dist:mac:signed:tmp
    ```

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

On macOS, `electron-builder` can automatically detect a signing identity from your keychain. If you want to skip signing for a local build, run `npm run dist:mac:unsigned`.

If macOS keeps prompting for your keychain password during signing, that is usually Keychain Access blocking repeated `codesign` operations. For local testing, use `npm run dist:mac:unsigned`. For signed builds, update the Access Control settings for your Apple Developer private key in Keychain Access so `codesign` is allowed.

One-time terminal fix for repeated `codesign` prompts on macOS:

```bash
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "<your-mac-login-password>" ~/Library/Keychains/login.keychain-db
```

Then rerun:

```bash
npm run dist:mac
```

If you prefer the GUI path, open Keychain Access, find the private key attached to your `Developer ID Application` certificate, open `Get Info`, then update `Access Control` so `codesign` is allowed without prompting every time.

If your repository is under Desktop or another iCloud-managed location, macOS can add `FinderInfo`/`fileprovider` metadata to generated `.app` directories and break `codesign`. In that case, use `npm run dist:mac:signed:tmp` or move the repo to a non-iCloud path like `~/Developer`.

## License

This project uses a custom license. See [LICENSE](LICENSE).
