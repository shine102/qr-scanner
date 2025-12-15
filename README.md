# Paste QR Decoder

A Chrome-compatible Manifest V3 extension that lets you paste or drop screenshots containing QR codes and decodes them entirely on-device using ZXing's audited WebAssembly pipeline. No images ever leave your browser.

## Features
- Paste (`Ctrl/Cmd+V`) or drag-and-drop screenshots directly into the popup
- Client-only decoding powered by `@zxing/browser`
- Result preview with quick copy button and safe URL link-out
- Optional decode history stored locally (last 10 entries)

## Installation
1. Clone or download this repository.
2. Run `npm install` to fetch dependencies.
3. Build the popup script:
   ```bash
   npm run build
   ```
4. Open `chrome://extensions/` and enable **Developer mode**.
5. Click **Load unpacked** and select the repository folder (`qr-scanner`).
6. Pin the extension for quick access if desired.

## Usage
1. Capture a screenshot containing a QR code and copy it to the clipboard.
2. Click the extension icon to open the popup.
3. Press `Ctrl/Cmd+V`, drop the image, or pick a file with the button.
4. The decoded payload appears immediately; copy it or open the URL if it’s an `http(s)` link.
5. Recent results stay in the popup history until cleared, stored only in `chrome.storage.local`.

## Security Notes
- QR decoding happens entirely within the popup using ZXing’s WebAssembly implementation, so the image data never leaves your machine.
- URL links are restricted to `http`/`https` schemes and open in a new tab with `rel="noopener noreferrer"` to avoid opener attacks.

## Development
- TypeScript sources live under `src/` and compile into `popup/` via `npm run build`.
- Update icons in `assets/` with production-quality artwork before distribution.
- To add tests or additional features, extend the TypeScript build or add your preferred tooling.
