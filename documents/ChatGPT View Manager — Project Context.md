# ChatGPT View Manager — Project Context

## Project purpose

ChatGPT View Manager is a Chrome extension for improving navigation and performance in long ChatGPT conversations.

The extension helps manage long chats by allowing the user to:

* Bookmark conversation blocks.
* Collapse conversation blocks.
* Restore collapsed blocks.
* Add and edit notes on bookmarks, collapsed blocks, and normal conversation sections.
* Navigate quickly to saved blocks.
* Persist state across tabs and browser sessions.
* Import and export extension data as JSON.

The motivation is that long ChatGPT pages become slow and difficult to navigate. The extension is intended to reduce visual clutter, improve usability, and help the user return to important parts of a long conversation.

## User preferences and coding style

The user prefers a class-based JavaScript architecture using vanilla JavaScript and JSDoc, not TypeScript.

Important preferences:

* Use small, focused classes.
* Prefer object-oriented design.
* Treat class-based OOP and encapsulation as the default design style.
* Keep DOM structure creation inside the UI class that owns it, using `DOMParser`
  for reusable HTML templates where appropriate.
* Keep UI code clean and professional.
* Avoid unnecessary decoration or entertainment-style UI.
* Use `window.MrbrCvm` as the namespace.
* Use `mrbr-cvm-*` CSS class naming.
* Use `requestAnimationFrame` for DOM writes where possible.
* Debounce/throttle MutationObserver and high-frequency DOM work.
* Avoid excessive DOM processing on large ChatGPT pages.
* Use CSS classes and CSS variables rather than inline styling where practical.
* Do not act on TODO comments unless explicitly asked.

## Current extension structure

The extension is a Chrome Manifest V3 extension.

The content script load order matters. The expected order is roughly:

```text
draw.js
conversationScanner.js
viewManagerStrings.js
viewManagerIcons.js
viewManagerIconButtonFactory.js
viewManagerActionsDropdown.js
viewManagerLocalPersistence.js
viewManagerImportExport.js
viewManagerNotesManager.js
collapsedBlocksManager.js
content.js
```

CSS includes the main content CSS, collapsed blocks CSS, and notes CSS.

## Main classes and responsibilities

### MrbrChatGptViewManager

Main orchestrator.

Responsibilities:

* Starts the extension.
* Creates and renders the View Manager panel.
* Wires together persistence, import/export, notes, scanner, and collapsed blocks.
* Handles tab/shared-state sync.
* Handles browser visibility changes.
* Handles storage change events.
* Coordinates rendering after state changes.
* Provides panel-level actions for bookmarks, collapsed blocks, notes, import/export, theme, and filtering.

It should not own low-level storage logic, import/export file logic, or collapsed-block DOM logic where that can be delegated.

### ConversationScanner

Finds and identifies ChatGPT conversation blocks.

Responsibilities:

* Finds block candidates from ChatGPT DOM.
* Assigns block identity attributes.
* Produces stable-ish local identities:

  * `turnId`
  * `blockKey`
  * `blockIndex`
  * `role`
  * `contentHash`
* Finds blocks by bookmark/collapsed-block identity.
* Gets readable block titles.
* Normalises block text and creates short hashes.

### ViewManagerLocalPersistence

Owns persistence through `chrome.storage.local`.

Responsibilities:

* Load state from `chrome.storage.local`.
* Save state to `chrome.storage.local`.
* Maintain a versioned storage root.
* Normalise older or partial state.
* Merge shared state across tabs.
* Preserve global UI state.
* Preserve per-conversation state.
* Support forced overwrite saves for delete/restore operations so deleted items are not recreated by merge.
* Handle extension-context-invalidated errors defensively.

The persisted state should be shared across all tabs and survive browser close/reopen.

### ViewManagerImportExport

Owns JSON import/export.

Responsibilities:

* Export the full View Manager storage root as JSON.
* Import valid View Manager JSON.
* Validate imported data.
* Normalise imported storage root.
* Save imported data through persistence.
* Keep file I/O separate from the main manager.

### ViewManagerNotesManager

Owns note logic.

Responsibilities:

* Create and edit notes.
* Sanitise notes before persistence.
* Store notes as plain text.
* Avoid rendering notes as HTML.
* Render note content only through `textContent`, `title`, form `.value`, or textarea `.value`.
* Update bookmark notes.
* Update collapsed-block notes.
* Maintain shared block-level notes in `blockNotes`.
* Create a bookmark with a note when the user adds a note to a normal block that is not already a bookmark or collapsed block.

Notes should be available from:

* Bookmark rows in the panel.
* Collapsed-block rows in the panel.
* Collapsed-block toolbar.
* A normal visible section/block through a panel toolbar action.

### CollapsedBlocksManager

Owns collapsed-block persistence coordination and DOM behaviour.

Responsibilities:

* Collapse and restore conversation blocks.
* Apply persisted collapsed state to hydrated conversation blocks.
* Coordinate the display-only `InformationBar`.
* Keep block identity and collapsed DOM mechanics separate from hover interaction.
* Call into persistence rather than owning global storage directly.

### HoverToolbar

Owns the contextual toolbar shown for a hovered conversation block.

Responsibilities:

* Track the currently hovered conversation block.
* Position and minimise the toolbar.
* Show collapse or restore according to block state.
* Show add or remove bookmark according to block state.
* Show add/edit/delete notes according to block state.
* Dispatch actions through callbacks rather than owning persistence.

### InformationBar

Owns the non-interactive summary shown on a collapsed block.

Responsibilities:

* Indicate that the block is collapsed.
* Indicate whether the block has a note.
* Display the collapsed-block title.
* Contain no collapse, restore, bookmark, or note editing actions.

The earlier development-only static `Map` should not be the source of truth. Persistent state should come from `ViewManagerLocalPersistence`.

## Data model

The current storage root is versioned.

Recommended shape:

```javascript
{
    version: 2,
    globalUi: {
        theme: "auto" | "dark" | "light",
        isPanelCollapsed: boolean,
        collapsedSections: {
            bookmarks: boolean,
            collapsedBlocks: boolean
        }
    },
    conversations: {
        [conversationKey]: {
            bookmarks: [],
            collapsedBlocks: [],
            blockNotes: {}
        }
    }
}
```

### Bookmark shape

```javascript
{
    id: string,
    title: string,
    notes?: string,
    turnId?: string,
    blockKey: string,
    blockIndex?: number,
    role?: string,
    contentHash?: string,
    createdUtc: string,
    updatedUtc?: string
}
```

### Collapsed block shape

```javascript
{
    turnId?: string,
    blockKey: string,
    blockIndex?: number,
    role?: string,
    contentHash?: string,
    title: string,
    notes?: string,
    collapsedUtc: string,
    updatedUtc?: string
}
```

### Block note shape

```javascript
{
    blockKey: string,
    notes: string,
    updatedUtc: string
}
```

Notes may exist both on a bookmark/collapsed block and in `blockNotes`. `blockNotes` is the shared block-level store.

## Conversation key

The conversation key should be stable for the same ChatGPT conversation across tabs.

Current intended approach:

```javascript
const url = new URL(window.location.href);

if (url.pathname.startsWith("/c/")) {
    return `${url.origin}${url.pathname}`;
}

return `${url.origin}${url.pathname}`;
```

For the same ChatGPT conversation opened in multiple tabs, bookmarks and collapsed blocks must resolve to the same conversation state.

## Shared-state sync behaviour

The same conversation can be open in multiple tabs.

Expected behaviour:

* All tabs for the same conversation share bookmarks, collapsed blocks, and notes.
* State persists after browser close.
* When a tab becomes active, it reloads the latest persisted state.
* It merges local state with persisted state.
* It persists the merged result.
* It responds to `chrome.storage.onChanged`.
* Delete and restore operations should avoid merge resurrection. They should save with overwrite semantics where needed.

Important edge case:

When the extension is reloaded, old content scripts may still run in existing tabs. Calls to `chrome.storage.local` can then throw:

```text
Extension context invalidated.
```

The extension should detect this and stop the old content-script instance quietly.

## Notes functionality

Notes are editable through a modal dialog using a textarea.

Notes are available from:

* Bookmarks in the panel.
* Collapsed blocks in the panel.
* CollapsedBlock toolbar.
* A normal visible block.

When the user creates a note on a normal section that is neither a bookmark nor a collapsed block:

* Create a bookmark for that block.
* Store the note on the bookmark.
* Store the note in `blockNotes`.

Security requirement:

* Notes must be treated as plain text.
* Sanitise before persistence.
* Do not use `innerHTML` for note content.
* Use `textContent`, `title`, `.value`, or textarea `.value`.
* Strip or normalise unsafe control characters.
* Avoid storing raw HTML as executable content.

CSS requirement:

* Note icons can receive a class to show they have notes.
* Current active note classes include:

  * `mrbr-cvm-note-button-active`
  * `mrbr-cvm-has-note`
* Notes may have their own CSS file, for example:

  * `viewManagerNotes.css`

## Bookmark functionality

Bookmarks are saved against block identity.

Bookmark features:

* Add bookmark for visible block.
* Edit bookmark title and notes.
* Delete bookmark.
* Navigate to bookmark.
* Search/filter bookmarks.
* Persist across tabs and sessions.
* Import/export with the rest of the state.

Bookmark navigation may need to handle ChatGPT virtualisation/hydration by scrolling to the turn container and rescanning.

## Collapsed-block functionality

Collapsed blocks can be created from hover UI or panel/UI actions.

Collapsed block features:

* Hover over a block to show collapse button.
* Collapse hovered block.
* Add collapsed-block toolbar to collapsed block.
* Restore from collapsed-block toolbar.
* Restore from panel.
* Navigate to collapsed block.
* Persist collapsed state across tabs and browser sessions.
* Sync across tabs for the same conversation.
* Store notes against collapsed blocks.

The hover collapse button should move with mouse movement and remain usable over the currently hovered block.

## Import/export functionality

Export:

* Save latest state first.
* Export JSON containing:

  * metadata such as export time and active conversation key
  * storage key
  * full storage root

Import:

* Read JSON from file input.
* Accept either wrapped export data or raw storage root.
* Validate versioned storage root.
* Confirm with the user before replacing data.
* Normalise imported state.
* Save through persistence.
* Reload and render.

## UI functionality

The panel currently supports:

* Header/title.
* Collapse/expand panel.
* Bookmark visible block.
* Note visible block.
* Rescan blocks.
* Scroll to top.
* Filter input.
* More/actions dropdown.
* Theme selection.
* Bookmarks section.
* Collapsed Blocks section.

Sections are collapsible.

The UI has known layout and performance issues that the user plans to address later.

## Performance principles

Important for this project:

* Avoid direct heavy DOM work inside event handlers.
* Use `requestAnimationFrame` to group DOM writes.
* Debounce MutationObserver-triggered refreshes.
* Debounce input/filter updates.
* Avoid repeated full DOM scans unless needed.
* Be careful with long ChatGPT conversations because DOM size can be large.
* Avoid repeated console logging in production paths.
* Keep hover/mousemove logic lightweight.

## Testing checklist

Useful tests for future changes:

1. Open one ChatGPT conversation.
2. Add a bookmark.
3. Open the same conversation in a second tab.
4. Confirm the bookmark appears after focus/storage sync.
5. Add a collapsed block in tab 1.
6. Confirm it appears in tab 2.
7. Restore/delete in tab 2.
8. Confirm tab 1 does not resurrect the deleted item.
9. Add a note to a bookmark.
10. Confirm note icon is active.
11. Add a note to a collapsed block.
12. Confirm note appears through panel and collapsed-block toolbar.
13. Add a note to a normal visible block.
14. Confirm this creates a bookmark with a note.
15. Close and reopen browser.
16. Confirm bookmarks, collapsed blocks, and notes persist.
17. Reload the extension while ChatGPT tab is open.
18. Confirm old content-script context does not spam `Extension context invalidated` errors.
19. Test on a very long conversation.
20. Check CPU usage and responsiveness.

## Known cautions

* ChatGPT DOM structure can change.
* Block identity is stable-ish but not guaranteed forever.
* `turnId`, `blockKey`, `contentHash`, `role`, and `blockIndex` should be used together for best matching.
* The same block can be temporarily unavailable because ChatGPT virtualises/hydrates content.
* Storage sync should be careful not to recreate deleted items.
* Notes should never be inserted as HTML.
* Do not act on TODO comments unless specifically instructed.

## Current project direction

The project is moving toward a class-based architecture with each feature isolated:

* Persistence manager.
* Import/export manager.
* Notes manager.
* Collapsed blocks manager.
* Scanner.
* Main View Manager orchestrator.

Future work is likely to include:

* UI layout improvements.
* Performance tuning.
* Better collapsed-block layout.
* More robust block identity.
* Better styling for note indicators.
* Cleaner modal/dialog management.
* Possibly a dedicated Dialog/Modal class.
