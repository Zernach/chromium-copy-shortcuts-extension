# Copy Shortcuts

A minimal Chrome extension that lets you save reusable text snippets and copy them to your clipboard with a single click. Always dark mode.

## Features

- Save any text as a "shortcut" — email signatures, addresses, snippets of code, anything reusable.
- One click to copy a saved shortcut to your clipboard.
- Shortcuts are stored locally on your machine via `chrome.storage.local`. No accounts, no sync, no servers.
- Delete a shortcut at any time.
- Permanent dark theme.

## Installing locally (developer mode)

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this folder.
4. Pin the extension icon to your toolbar for quick access.

## Using

1. Click the extension icon to open the popup.
2. Click **+ New Shortcut**, paste or type your text, and hit **Save**.
3. Click a saved shortcut to copy its text to your clipboard.
4. Click the `×` on a shortcut to delete it.

Keyboard:
- `Cmd/Ctrl + Enter` while typing — save the shortcut.
- `Esc` while typing — cancel.

## Packaging for the Chrome Web Store

Create a zip of the extension (excluding the source SVG and git metadata):

```bash
./scripts/build.sh
```

This produces `dist/copy-shortcuts.zip`, which you upload at <https://chrome.google.com/webstore/devconsole>.

## File layout

```
manifest.json     Manifest V3 declaration
popup.html        Popup markup
popup.css         Dark theme styles
popup.js          Storage + UI logic (vanilla JS, no build step)
icons/            16/32/48/128 PNGs + source SVG
scripts/build.sh  Produces a Chrome Web Store-ready zip
```

## Permissions

- `storage` — to persist shortcuts on your local machine.
- `clipboardWrite` — to copy text to the clipboard.

No host permissions are requested; the extension only operates inside its own popup.
