# ChatGPT View Manager

A local Chrome extension for navigating, annotating, collapsing, and managing long ChatGPT conversations.

![View Manager panel open](./docs/images/ViewManagerPanelOpen.png)

ChatGPT View Manager adds a floating panel and contextual hover controls to ChatGPT pages. It is intended for people who work in long ChatGPT conversations and need a lightweight way to find important turns, collapse noisy sections, keep notes, and prepare prompts.

This project is independent and is not affiliated with OpenAI.

## Status

This project is shared as an MVP/personal-use tool. It is usable, but it depends on ChatGPT's webpage structure, which may change without notice and may break the extension.

The extension is not published in the Chrome Web Store. It is installed as an unpacked extension from source.

## Features

- Floating View Manager panel
- Conversation turn bookmarks
- Collapsed conversation blocks
- Collapsed block information bars
- Per-block notes
- Contextual Hover Toolbar
- Custom Prompt Dialog
- Filter/search for bookmarks and collapsed blocks
- Collapse All and Expand All controls
- Go to top / go to bottom navigation
- Light and dark themes
- Import/export of local View Manager data
- Local Chrome storage persistence

## Screenshots

### View Manager panel

![View Manager panel](./docs/images/ViewManagerPanelOpen.png)

### Hover Toolbar

![Hover Toolbar](./docs/images/HoverMenu.png)

### Collapsed block information bar

![Collapsed block information bar](./docs/images/CollapsedBlockUserInfobar.png)

### Custom Prompt Dialog

![Custom Prompt Dialog](./docs/images/CustomPromptDialog.png)

### Actions dropdown

![Actions dropdown](./docs/images/ActionsDropDown.png)

More screenshots and usage notes are available in the [User Guide](./USER_GUIDE.md).

## Installation

See [INSTALL.MD](./INSTALL.MD) for unpacked Chrome extension installation instructions.

Short version:

1. Download or clone this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the repository folder containing `manifest.json`.
6. Open or refresh `https://chatgpt.com/`.

## User Guide

See [USER_GUIDE.md](./USER_GUIDE.md) for screenshots and feature walkthroughs.

The guide covers:

- View Manager panel
- Toolbar controls
- Bookmarks
- Collapsed blocks
- Hover Toolbar
- Notes dialog
- Custom Prompt Dialog
- Filtering
- Themes
- Import/export

## Privacy

See [PRIVACY.md](./PRIVACY.md).

In short:

- Data is stored locally using Chrome extension storage.
- The extension does not send data to a server controlled by this project.
- Exported JSON files may contain bookmark titles, notes, collapsed block records, and UI state.
- The extension runs on ChatGPT pages and can read/modify the page DOM to provide its features.

## Support and Maintenance

This project is shared as-is under the MIT License.

It was built primarily as a personal tool for managing long ChatGPT conversations. It depends on ChatGPT's webpage structure, which may change without notice and may break the extension.

I do not provide any guarantee of support, maintenance, compatibility, or timely fixes. I may update the project when I need it for my own use, and others are welcome to fork or adapt it.

## How it works

ChatGPT View Manager is a Manifest V3 Chrome extension.

The extension injects content scripts into `https://chatgpt.com/*` and adds local UI on top of the ChatGPT page.

Most functionality lives in `src/content/`:

- `content.js` coordinates the main View Manager panel.
- `conversationScanner.js` detects ChatGPT conversation blocks.
- `hoverToolbar.js` manages the contextual hover controls.
- `collapsedBlocksManager.js` manages collapsed block state and UI.
- `informationBar.js` renders collapsed-block information bars.
- `viewManagerNotesManager.js` manages block and bookmark notes.
- `customEditor.js` renders the Custom Prompt Dialog.
- `viewManagerLocalPersistence.js` manages Chrome local storage.

The Custom Prompt Dialog uses a small page-world bridge in `src/page/customEditorMainWorldBridge.js` because ChatGPT's composer belongs to the webpage's JavaScript context.

## Storage

State is stored locally using `chrome.storage.local`.

Stored data may include:

- bookmark titles;
- bookmark notes;
- collapsed block records;
- block notes;
- conversation/page identifiers;
- UI settings such as theme, panel state, and dialog size/position.

The main storage key is:

```text
mrbrChatGptViewManagerState
```

## Import and export

The extension can export local View Manager data to JSON and import it later.

Exported files may contain user-written titles and notes. Treat exported files as personal data if they contain sensitive information.

## Development

The project intentionally has no build step.

Development style:

- vanilla JavaScript;
- JSDoc typing;
- class-based UI components;
- CSS custom properties;
- Manifest V3 APIs;
- local Chrome extension storage;
- `requestAnimationFrame` for batched DOM updates.

Useful checks:

```powershell
Get-ChildItem -Path src -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

```powershell
node -e "const fs=require('fs'); const m=JSON.parse(fs.readFileSync('manifest.json','utf8')); const files=[...m.content_scripts.flatMap(s=>[...(s.js||[]),...(s.css||[])]), ...m.web_accessible_resources.flatMap(r=>r.resources||[])]; const missing=files.filter(f=>!fs.existsSync(f)); if(missing.length){ console.error(missing.join('\n')); process.exit(1);} console.log('manifest assets ok')"
```

## Known limitations

- ChatGPT's DOM structure may change without notice.
- Some features depend on ChatGPT's virtualised conversation rendering.
- Long conversations can still produce scroll jitter.
- Collapse All may occasionally need to be run more than once if ChatGPT moves or rehydrates DOM nodes.
- The extension is currently focused on Chrome.
- It is not packaged for Chrome Web Store distribution.
- It is provided as an unpacked source extension.

## Repository notes

Public-facing docs:

- [INSTALL.MD](./INSTALL.MD)
- [USER_GUIDE.md](./USER_GUIDE.md)
- [PRIVACY.md](./PRIVACY.md)
- [LICENSE](./LICENSE)

Development notes and planning documents are in `documents/`.

## License

MIT License. See [LICENSE](./LICENSE).

## Disclaimer

This extension is not affiliated with OpenAI.

ChatGPT View Manager depends on ChatGPT page structure and DOM behaviour. It may stop working when ChatGPT changes. Use at your own risk.
