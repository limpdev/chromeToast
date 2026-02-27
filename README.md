# 🍞 Toast — Floating Selection Menu

A lightweight, fully customizable Chrome extension that summons a sleek floating action menu whenever you highlight text on any page. Copy, search, or trigger any link-based action — all without breaking your reading flow.

---

## Features

- **Instant popup** — select any text and a smooth animated toolbar appears above it
- **Configurable buttons** — add any number of actions: copy, paste, or open any URL with the selected text injected
- **Custom icons** — paste any SVG directly into the settings panel
- **Full visual control** — tweak background color, opacity, border radius, button size, spacing, hover scale, click animation, and icon lift
- **Live updates** — changes in the popup apply to the content script immediately without a page reload
- **Canvas-rendered** — the entire UI is drawn on an HTML5 canvas, so it never interferes with page styles or layouts

---

## Installation

### From Source

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
   This produces a `dist/` folder and a ready-to-upload `extension.zip`.

4. Load in Chrome:
   - Navigate to `chrome://extensions`
   - Enable **Developer mode** (top right)
   - Click **Load unpacked** and select the `dist/` folder

### From the Chrome Web Store

> Coming soon.

---

## Usage

1. Highlight any text on any webpage
2. The Toast menu appears above your selection
3. Click a button to trigger its action:
   - **Copy** — copies the selected text to your clipboard
   - **Search** — opens a new tab with your selected text substituted into a configured URL (e.g. a Google search)
   - Any custom link you've configured
4. The menu dismisses automatically after an action, or when you click away

---

## Configuration

Click the Toast icon in your Chrome toolbar to open the settings popup.

### Visual Style

| Setting      | Description                                      |
| ------------ | ------------------------------------------------ |
| Background   | The fill color of the toast container            |
| Accent Color | The highlight color shown when hovering a button |
| Opacity      | Background opacity (0.5–1.0)                     |

### Animation & Interaction

| Setting      | Description                                         |
| ------------ | --------------------------------------------------- |
| Anim Speed   | How fast the toast fades in/out and buttons animate |
| Hover Scale  | How much a button grows when hovered                |
| Active Click | How much a button shrinks when clicked              |
| Icon Lift    | How many pixels the icon floats upward on hover     |

### Actions & Links

Each button has a **type**:

- **System Action** — `copy` (copies selection) or `paste` (replaces selection with clipboard contents)
- **Search / Link** — opens a URL in a new tab. Use `%s` as a placeholder for the selected text:
  ```
  https://www.google.com/search?q=%s
  https://translate.google.com/?text=%s
  https://www.merriam-webster.com/dictionary/%s
  ```

You can add as many buttons as you like, reorder them by removing and re-adding, and provide a custom SVG for each icon.

---

## Permissions

| Permission       | Why it's needed                   |
| ---------------- | --------------------------------- |
| `storage`        | Saves your configuration settings |
| `clipboardWrite` | Required for the Copy action      |
| `clipboardRead`  | Required for the Paste action     |

Toast does **not** collect, transmit, or store any text you select. Everything happens locally in your browser.

---

## Project Structure

```
├── content.js        # Canvas rendering, selection detection, button actions
├── popup.html        # Settings UI markup
├── popup.js          # Settings UI logic, chrome.storage read/write
├── manifest.json     # Extension manifest (MV3)
├── build.js          # esbuild bundler + zip packager
├── assets/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
```

---

## Building & Packaging

```bash
npm run build
```

The build script will:
1. Bundle and minify `content.js` and `popup.js` via esbuild
2. Minify `popup.html`
3. Copy `manifest.json` and icon assets into `dist/`
4. Package everything into `extension.zip` ready for Web Store upload

---

## Development Tips

- Edit `content.js` or `popup.js` and re-run `npm run build` to see changes
- The `defaultConfig` objects in `content.js` and `popup.js` should always be kept in sync — they define the out-of-box experience for new installs
- To add a new system action type, handle it in the `handleCanvasUp` function in `content.js` and add it as a `<option>` in the `popup.js` render function

---

## License

MIT

## Privacy Policy

I will __**NOT**__ collect, nor sell any data. In fact, none shall be collected period  all of it ought to remain local!