# ChatGPT View Manager

A Chrome extension for navigating long ChatGPT conversations.

ChatGPT View Manager adds a compact floating panel to ChatGPT pages, allowing you to bookmark useful conversation turns, navigate back to them quickly, add notes, filter saved items, and export/import your saved View Manager data.

The project was created to solve a practical problem: long ChatGPT conversations become difficult to navigate, review, and manage. As conversations grow, finding an earlier prompt, response, decision, or code block can become slow and frustrating. This extension provides a lightweight local navigation layer on top of the ChatGPT page.

> This project is independent and is not affiliated with OpenAI.

---

## Current Status

This project is currently in MVP development.

The MVP focuses on:

* Bookmarking conversation turns
* Reliable navigation to bookmarked turns
* Bookmark editing and notes
* Filtering bookmarks
* Local persistence per ChatGPT conversation
* Import/export of saved View Manager data
* Light, dark, and auto themes

The previous Collapsed Blocks feature has been excluded from the MVP for stability reasons. The code may still contain some collapsed-block-related functions for later review, but the MVP user interface does not expose that workflow.

---

## Features

### Floating View Manager Panel

The extension adds a compact floating panel to ChatGPT pages.

The panel includes:

* Detected conversation block count
* Bookmark controls
* Search/filter box
* Theme/export/import menu
* Collapsible panel mode

### Conversation Bookmarks

You can bookmark the currently visible ChatGPT conversation block.

Each bookmark can store:

* Title
* Notes
* ChatGPT turn identity
* View Manager block identity
* Content hash fallback
* Role/index fallback
* Created/updated timestamps

Bookmarks are scoped to the current ChatGPT conversation.

### Bookmark Navigation

Bookmark navigation is designed to work with ChatGPT’s virtualised conversation layout.

The extension attempts to locate bookmarks using:

1. ChatGPT turn ID
2. View Manager block key
3. Content hash
4. Role/index fallback

Navigation uses the ChatGPT scroll container and includes retry logic for long or lazily-loaded conversations.

### Bookmark Notes

Bookmarks can be edited after creation.

You can update:

* Bookmark title
* Bookmark notes

Bookmark notes are included in filtering and export/import data.

### Filtering

The View Manager panel includes a compact filter box.

Filtering searches bookmark data including:

* Title
* Notes
* Role
* Block key
* Content hash
* Block index

Filtering is runtime-only and does not change saved data.

### Themes

The extension supports:

* Auto theme
* Light theme
* Dark theme

Theme selection is persisted globally.

### Import and Export

Saved View Manager state can be exported to JSON and imported later.

Exported data includes:

* Storage version
* Global UI state
* Conversation-scoped bookmarks
* Bookmark notes
* Conversation keys

This allows backup, transfer, and manual inspection of saved View Manager data.

---

## MVP Scope

Included in the MVP:

* Floating View Manager panel
* Conversation block detection
* Bookmark creation
* Bookmark editing
* Bookmark notes
* Bookmark navigation
* Bookmark filtering
* Theme switching
* Import/export
* Conversation-scoped state
* Local Chrome storage persistence

Excluded from the MVP:

* Collapsing ChatGPT conversation blocks
* Collapsed Blocks overlay section
* Restore collapsed blocks
* Collapse toolbar button
* Collapsed-block navigation

Collapsed Blocks may return in a later milestone once the interaction with ChatGPT’s virtualised scrolling and lazy hydration is stable enough.

---

## Installation for Local Development

1. Clone or download this repository.

2. Open Chrome and go to:

   ```text
   chrome://extensions/
   ```

3. Enable **Developer mode**.

4. Click **Load unpacked**.

5. Select the extension project folder.

6. Open or refresh ChatGPT.

7. The View Manager panel should appear on supported ChatGPT conversation pages.

---

## Expected Project Structure

```text
chatgpt-view-manager/
  manifest.json
  src/
    content/
      content.js
      content.css
      conversationScanner.js
      viewManagerActionsDropdown.js
      viewManagerIconButtonFactory.js
      viewManagerIcons.js
      viewManagerStrings.js
  types/
    chrome-extension-globals.d.ts
  README.md
```

---

## Technical Notes

### Browser

The extension is currently developed and tested in Chrome.

### Manifest

The extension uses Chrome Extension Manifest V3.

### Storage

State is stored using Chrome local extension storage.

The main storage key is:

```text
mrbrChatGptViewManagerState
```

The storage model separates:

* Global UI state
* Conversation-specific bookmark state

### Conversation Identity

The extension uses the current ChatGPT URL as the conversation key.

For individual conversation turns, the extension prefers ChatGPT’s turn ID when available.

Fallback identity fields are retained because ChatGPT’s DOM can change during page refresh, lazy loading, or response regeneration.

### Scrolling and Virtualisation

ChatGPT uses a large virtualised thread layout. Some turns may not be fully hydrated until scrolled into view.

Bookmark navigation therefore uses:

* The ChatGPT scroll root
* Turn container targeting
* Header offset correction
* Scroll position verification
* Automatic retries
* Delayed rescans after scroll/hydration

This is intended to make bookmark navigation more reliable in long conversations.

---

## Known Limitations

* ChatGPT’s DOM structure may change without notice.
* Long conversations can still produce visible scroll jitter.
* Navigation reliability depends on ChatGPT’s current virtualised rendering behaviour.
* The extension is currently focused on Chrome.
* The MVP intentionally excludes collapsed-block workflows.
* Import currently replaces saved View Manager state rather than merging it.
* Filter text is not currently persisted.
* The extension has not yet been packaged for Chrome Web Store distribution.

---

## Development Priorities

Current priorities:

* Stabilise bookmark navigation
* Keep the MVP small and reliable
* Avoid over-focusing on collapsed-block behaviour
* Maintain clean vanilla JavaScript
* Keep DOM updates scheduled and controlled
* Avoid unnecessary work during ChatGPT DOM mutations

Later priorities may include:

* Reintroducing Collapsed Blocks behind a feature flag
* Better performance handling for very long conversations
* Optional persisted filters
* Per-conversation panel settings
* Import merge support
* Export selected conversation only
* Keyboard shortcuts
* More formal accessibility pass
* Chrome i18n support
* Test checklist automation where practical

---

## Development Style

This project currently uses:

* Vanilla JavaScript
* JSDoc typing
* Small content-side helper classes
* No build step
* CSS custom properties
* Chrome extension APIs
* `requestAnimationFrame` for DOM update scheduling
* Debounced mutation handling

The code is intentionally kept close to browser APIs to make the extension easy to inspect, debug, and modify.

---

## Safety and Privacy

ChatGPT View Manager stores its data locally using Chrome extension storage.

The extension does not require a server for the MVP.

The exported JSON file may contain bookmark titles and notes written by the user. Treat exported files as personal data if they contain sensitive information.

---

## Roadmap

### MVP

* [x] Floating View Manager panel
* [x] Conversation block detection
* [x] Bookmark creation
* [x] Bookmark editing
* [x] Bookmark notes
* [x] Bookmark filtering
* [x] Theme switching
* [x] Import/export
* [x] Conversation-scoped state
* [x] Turn-ID-based bookmark navigation
* [x] Header-aware scroll positioning
* [x] Verified scroll retry logic
* [ ] MVP testing pass
* [ ] README final review
* [ ] First GitHub commit/tag

### Later Milestones

* [ ] Collapsed Blocks redesign
* [ ] Feature flag support
* [ ] Performance pass for long conversations
* [ ] Storage migration hardening
* [ ] Import merge workflow
* [ ] Accessibility review
* [ ] Keyboard shortcuts
* [ ] Chrome i18n support
* [ ] Chrome Web Store packaging review

---

## License

No license has been selected yet.

Before publishing publicly, add a license file such as:

* MIT
* Apache-2.0
* GPL-3.0
* Proprietary / All rights reserved

Choose the licence based on how open you want the project to be.

---

## Disclaimer

ChatGPT View Manager depends on ChatGPT page structure and DOM attributes that may change over time. Updates to ChatGPT may require updates to the extension.

This project is independent and is not affiliated with OpenAI.
