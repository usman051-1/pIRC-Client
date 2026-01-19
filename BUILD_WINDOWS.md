# Building pIRC Windows Installer

This guide explains how to build the pIRC Windows installer application.

## Automated Builds (Recommended)

The easiest way to build installers is via GitHub Actions:

1. Push your code to GitHub
2. Create a new tag: `git tag v1.0.0 && git push origin v1.0.0`
3. GitHub Actions will automatically build:
   - Windows `.exe` installer
   - Linux `.AppImage`
   - macOS `.dmg`
4. Download from the Releases page or Actions artifacts

## Manual Build Prerequisites

1. **Node.js 20+** installed on your system
2. **Windows** for building the Windows installer (or use a CI/CD pipeline)

## Build Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Web Application

First, build the production version of the web app:

```bash
npm run build
```

### 3. Build the Windows Installer

Run electron-builder to create the Windows installer:

```bash
npx electron-builder --win --config electron-builder.json
```

This will create the installer in the `release/` directory.

## Output Files

After building, you'll find:

- `release/pIRC-Setup-1.0.0.exe` - The Windows installer

## Development Mode

To run the Electron app in development mode:

1. Start the web server: `npm run dev`
2. In another terminal: `npx electron .`

## Customization

### App Icon

The app includes a custom retro-style icon at `electron/assets/icon.png`.

To use a different icon:
1. Replace `electron/assets/icon.png` with your 256x256 PNG
2. For Windows, also provide `electron/assets/icon.ico` (ICO format)
3. For macOS, provide `electron/assets/icon.icns` (ICNS format)

### App Metadata

Edit `electron-builder.json` to customize:
- `productName` - Display name
- `appId` - Unique application ID
- `nsis` settings for installer behavior

## Troubleshooting

If you encounter issues:

1. Clear the `release/` and `dist/` directories
2. Delete `node_modules` and reinstall
3. Ensure you're on a Windows machine for `.exe` builds

---

**pIRC v1.0** - pwedIRC - A nostalgic IRC client
