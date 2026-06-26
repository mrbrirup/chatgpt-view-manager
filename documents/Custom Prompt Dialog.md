# Custom Prompt Dialog

Specification for the ChatGPT View Manager custom prompt editor.

The current working MVP proves that a View Manager dialog can set ChatGPT composer text and send it through a MAIN-world bridge. This document describes the intended complete feature.

```text
------------------------------------------------------------
| Prompt Editor                        [Max/Restore][Close] | <- TitleBar
|-----------------------------------------------------------|
| ChatGPT Prompt                                            | <- Prompt label/body
| --------------------------------------------------------- |
| | Editable Area                                         | |
| |                                                       | |
| |                                                       | |
| |                                                       | |
| |                                                       | |
| |                                                       | |
| --------------------------------------------------------- |
|-----------------------------------------------------------|
|                    [Clear][Set Prompt][Set Prompt & Send] | <- Footer
|-----------------------------------------------------------|
```

## Goals

- Provide a larger, safer prompt editing surface than ChatGPT's composer.
- Allow the user to prepare/edit prompt text in View Manager before pushing it into ChatGPT.
- The Dialog is always above the ChatGPT webpage composer, so the user can see both at once.
- Avoid reading or copying existing ChatGPT composer text, because the webpage may expose unrelated ProseMirror or conversation DOM nodes.
- Keep the editor draft local to the current tab/page lifetime unless a later requirement explicitly adds persistent drafts.
- Use the selected ChatGPT View Manager theme.

## Launch

- The dialog is launched from the View Manager panel toolbar.
- Toolbar button label/title: `Open Custom Prompt Editor`.
- The dialog opens with an empty editable area unless a page-lifetime draft exists from a previous open of the same dialog in the same tab/page.
- Opening the dialog must not read existing text from the ChatGPT webpage prompt/composer.

## Components

### TitleBar

- Displays the dialog title.
- Title text: `Prompt Editor`.
- Contains:
  - Max/Restore button.
  - Close button.
- The title bar is the drag handle for moving the dialog.
- Close hides the dialog and keeps the current editable area contents in page-lifetime memory.

### Prompt section

- Label text: `ChatGPT Prompt`.
- Description: the text in this editor will be sent to ChatGPT's webpage composer when the user chooses `Set Prompt` or `Set Prompt & Send`.

### Editable Area

- Primary prompt authoring surface.
- Placeholder: `Type your prompt here...`
- Multi-line.
- Scrollable.
- Content should remain in the dialog when the dialog is closed and reopened during the same page lifetime.
- Content is not persisted across browser sessions unless this is explicitly added later.

Implementation preference:

- Use a `contenteditable` element if rich editing or future structured prompt blocks are needed.
- A `textarea` is acceptable for the MVP and plain-text-only implementation.
- The value passed to ChatGPT should be plain text unless/until rich prompt transfer is explicitly specified.

### Footer

Buttons, left-to-right:

- `Clear`
  - Clears the editable area.
  - Does not clear ChatGPT's webpage composer by itself.
- `Set Prompt`
  - Clears ChatGPT's webpage composer.
  - Sets ChatGPT's webpage composer to the current editable area contents.
  - Does not send.
  - Clears the Custom Prompt Dialog editable area after a successful prompt set.
  - Leaves the dialog open so the user can continue authoring prompts or interact with ChatGPT's native composer, for example to attach files.
- `Set Prompt & Send`
  - Clears ChatGPT's webpage composer.
  - Sets ChatGPT's webpage composer to the current editable area contents.
  - Waits for the ChatGPT send button to exist/be enabled.
  - Clicks the send button.
  - Clears the Custom Prompt Dialog editable area after a successful send.
  - Leaves the dialog open so the user can continue authoring prompts.

## Dialog sizing and movement

### Default size

- Default size: `640px x 480px`.
- The default must be clamped so it never exceeds the viewport.

### Max/Restore

- Maximise expands the dialog to the usable viewport.
- Restore returns to the previous non-maximised size and position.
- The restored size and position should be persisted across sessions.
- The maximised/restored state should not persist across sessions.
- The dialog should always open in restored state to avoid unexpectedly covering ChatGPT UI when the user returns.

### Dragging

- The user can move the dialog by dragging the title bar.
- Movement must be clamped so the dialog cannot be dragged completely outside the viewport.
- The saved/restored position must be clamped on load in case the viewport size changed.

### Resizing

- The user can resize the dialog from edges and corners.
- Minimum size should preserve access to the title bar, editable area, and footer actions.
- Resizing must be clamped to viewport bounds.
- Restored size should be persisted across sessions.

## ChatGPT composer integration

The Custom Prompt Dialog runs in the extension/content-script isolated world. ChatGPT's ProseMirror editor belongs to the webpage's MAIN world.

The integration must therefore use a MAIN-world bridge and pass only serializable data across the boundary.

Confirmed MVP behaviour:

- The dialog sends plain text to the MAIN-world bridge.
- The MAIN-world bridge clears the ChatGPT composer before setting text.
- The bridge uses frame-sequenced updates:
  1. `requestAnimationFrame`: clear composer text.
  2. `requestAnimationFrame`: set composer text from the dialog.
  3. `requestAnimationFrame`: find and click the send button if requested.
- `Set Prompt & Send` retries this sequence if the send button does not exist or is disabled.
- The send button should be queried after the prompt update, not before it.

Send button lookup:

- Primary: `document.getElementById("composer-submit-button")`.
- Fallback selectors may be used for resilience.

Composer update strategy:

- Preferred: use ChatGPT's ProseMirror `EditorView` in MAIN world if it can be found safely.
- Fallback: use the active/contenteditable composer DOM surface if ProseMirror cannot be reached.
- Do not read composer text from the webpage into the Custom Prompt Dialog.

## State

### Page-lifetime state

The following state should be retained while the current ChatGPT tab/page lifetime continues:

- Editable area contents.
- Dialog open/closed state is not required to persist.
- Draft state is per current tab/page URL.
- Draft state should not be shared across conversations or tabs.

### Cross-session state

The following state should be persisted across sessions:

- Restored dialog size.
- Restored dialog position.

Do not persist prompt text across sessions by default.
Do not persist maximised/restored state across sessions.

## Accessibility and keyboard behaviour

- Dialog uses `role="dialog"` and `aria-modal="false"` because it is a floating, non-modal editor.
- Dialog title is connected via `aria-labelledby`.
- Initial focus goes to the editable area.
- `Escape` closes the dialog.
- Buttons have accessible names.
- Footer buttons remain reachable when the dialog is small.

Keyboard shortcuts:

- `Ctrl+Enter`: Set Prompt & Send.
- `Cmd+Enter`: Set Prompt & Send.
- `Ctrl+Shift+Enter`: Set Prompt without sending.

## Error handling and status

The dialog should show non-blocking status text for:

- Ready.
- Setting prompt.
- Prompt set.
- Prompt set and sent.
- Send button not found/enabled after retries.
- Composer not found.
- MAIN-world bridge failed/timed out.

Diagnostic data may be published to a hidden JSON script element while this feature is still being developed.

## Resolved decisions

- Do not persist maximised/restored state across sessions; only persist restored size and position.
- Always open the dialog in restored state.
- Remove the footer `Cancel` button; it duplicates the title bar Close button.
- Close hides the dialog and keeps the current page-lifetime draft.
- After successful `Set Prompt`, keep the dialog open and clear the editable area.
- After successful `Set Prompt & Send`, keep the dialog open and clear the editable area.
- Start with a plain-text implementation. Add rich prompt blocks later only if needed.
- Keep one draft per current tab/page URL to avoid unrelated prompt text appearing in another conversation.
- Use the proposed keyboard shortcuts:
  - `Ctrl+Enter`: Set Prompt & Send.
  - `Cmd+Enter`: Set Prompt & Send.
  - `Ctrl+Shift+Enter`: Set Prompt without sending.
