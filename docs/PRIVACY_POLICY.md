# Privacy Policy for Copy Shortcuts

_Last updated: 2026-05-20_

Copy Shortcuts ("the extension") is a Chrome extension that lets you save reusable text snippets and copy them to your clipboard with a single click. This privacy policy describes what data the extension handles and how.

## Summary

**The extension does not collect, transmit, sell, or share any personal data.** All shortcuts you save stay on your own machine.

## Data the extension stores

The extension stores the following data **locally on your device** using Chrome's `chrome.storage.local` API:

- The text content of each shortcut you create.
- Any label or title you assign to a shortcut.

This data:

- Never leaves your device.
- Is not transmitted to the developer or any third party.
- Is not synced across devices.
- Is not backed up to any remote server.
- Is not associated with any account, identifier, or analytics service.

You can delete any shortcut at any time from inside the extension popup. Uninstalling the extension removes all stored shortcuts.

## Permissions and why they are requested

The extension requests the minimum permissions required to function:

- **`storage`** — used solely to persist your shortcuts on your local machine via `chrome.storage.local`.
- **`clipboardWrite`** — used solely to write a selected shortcut's text to your system clipboard when you click it.

The extension requests **no host permissions** and does not read, modify, or interact with the content of any web page. It operates entirely inside its own popup.

## Data the extension does NOT collect

The extension does not collect, access, or transmit any of the following:

- Personally identifiable information (name, email, address, phone number, etc.).
- Authentication information (passwords, credentials, tokens).
- Financial or payment information.
- Health information.
- Personal communications (email, SMS, chat content not entered by you into the extension).
- Location data.
- Web history, browsing activity, or visited URLs.
- User activity, clicks, keystrokes, or mouse movements outside the extension popup.
- Information about other software or extensions installed on your device.

## Third parties

The extension does not include any third-party analytics, advertising, tracking, telemetry, or remote-code libraries. No data is shared with any third party because no data is ever transmitted off your device.

## Children's privacy

The extension does not knowingly collect any information from anyone, including children under 13.

## Changes to this policy

If this policy is updated, the revised version will be published in this repository with an updated "Last updated" date. Material changes will also be reflected in the extension's Chrome Web Store listing.

## Contact

Questions about this policy can be directed to the Ryan Zernach
