# ChatGPT View Manager — Functionality Review Checklist

## 1. Extension Bootstrap and Runtime

- [x] Extension loads as an unpacked Chrome extension.
- [x] Content script loads on `https://chatgpt.com/*`.
- [x] CSS is injected correctly.
- [x] No runtime errors appear in the browser console on page load.
- [x] No design-time errors appear in VS Code.
- [x] Reloading the extension and refreshing ChatGPT restores expected behaviour.
- [x] Extension does not interfere with normal ChatGPT interaction.
- [x] Extension handles ChatGPT single-page navigation between conversations.

## 2. Floating View Manager Overlay

- [x] Overlay appears on ChatGPT pages.
- [x] Overlay position is usable and does not block important page content.
  - [ ] Add a way to reposition the overlay if it blocks content.
- [x] Overlay can be collapsed.
- [x] Overlay can be expanded again.
- [x] Collapsed/expanded overlay state persists globally.
- [x] Overlay header/title displays correctly.
- [x] Overlay status shows detected block count.
  - [ ] Removed as it serves no useful purpose
  - [ ] Add an updating indicator that it is still working as ChatGPT processes in background
- [x] Overlay remains responsive in long conversations.
- [x] Overlay layout remains compact at normal browser zoom.
- [x] Overlay layout remains usable at increased zoom.
- [x] Overlay does not lose state after page refresh.

## 3. Toolbar Actions

- [x] Bookmark visible block button works.
  - [ ] Add a bookmark button to each block for easier access.
- [x] Collapse highlighted block button works.
- [x] Restore all collapsed blocks button works.
- [x] Rescan conversation blocks button works.
- [x] Scroll to top button works.
- [x] More dropdown opens.
  - [ ] Menu is clipped by the overlay if it is too close to the bottom of the viewport.
- [x] More dropdown closes on outside click.
- [x] More dropdown closes on Escape.
- [x] More dropdown actions remain accessible after repeated overlay renders.
- [x] Toolbar icons have useful tooltips.
- [x] Toolbar icons have useful `aria-label` values.
- [x] Toolbar remains visually compact.
- [x] Toolbar does not wrap awkwardly.

## 4. Block Detection

- [x] Conversation blocks are detected.
- [x] User blocks are detected.
- [ ] Assistant blocks are detected.
  - [ ] Don't know how to tell these from the others
- [ ] Blocks receive stable View Manager data attributes.
- [ ] Block index is assigned.
- [ ] Block role is assigned.
- [ ] Block content hash is assigned.
- [ ] Block key is assigned.
- [ ] Rescan updates block count correctly.
- [ ] Rescan does not duplicate attributes incorrectly.
- [ ] New ChatGPT messages are detected after they appear.
- [ ] Lazy-loaded older conversation blocks are detected after scrolling.
- [ ] Block detection remains stable after page refresh.
- [ ] Block detection remains stable after changing conversations.

## 5. Stable Block Identity

- [ ] Existing bookmarks still locate blocks after refresh.
- [ ] Existing bookmarks still locate blocks after conversation navigation.
- [ ] Matching by exact block key works.
- [ ] Matching by content hash works when key changes.
- [ ] Matching by role/index fallback works where appropriate.
- [ ] Missing blocks produce a clear alert instead of a runtime error.
- [ ] Identity fallback behaviour is acceptable for edited/regenerated ChatGPT content.
- [ ] Identity strategy is documented well enough for later review.

## 6. Bookmarks

- [ ] Bookmark visible block opens the non-blocking title dialog.
- [ ] Bookmark title dialog highlights or identifies the target block before saving.
- [ ] Saving a bookmark creates a bookmark row.
- [ ] Cancelling bookmark creation does not create a bookmark.
- [ ] Empty bookmark title is handled correctly.
- [ ] Existing bookmarks display a safe fallback title if title is missing.
- [ ] Bookmark rows show compact layout.
- [ ] Bookmark Go button scrolls to the correct block.
- [ ] Bookmark Go button restores the block first if it is collapsed.
- [ ] Bookmark Delete button removes the bookmark.
- [ ] Bookmark Delete does not remove the underlying conversation block.
- [ ] Bookmark list persists after refresh.
- [ ] Bookmark list is scoped to the current conversation.
- [ ] Bookmarks do not leak into other conversations.
- [ ] Bookmark tooltip includes useful metadata.
- [ ] Bookmark tooltip includes notes when present.
- [ ] Bookmark fallback titles are understandable.
- [ ] Bookmark creation works near top of page.
- [ ] Bookmark creation works near middle of page.
- [ ] Bookmark creation works near bottom of page.

## 7. Bookmark Editing

- [ ] Edit button appears on bookmark rows.
- [ ] Edit button opens the title/notes editor.
- [ ] Existing bookmark title is shown in the editor.
- [ ] Existing bookmark notes are shown in the editor.
- [ ] Saving changes updates the bookmark title.
- [ ] Saving changes updates bookmark notes.
- [ ] Cancelling does not change the bookmark.
- [ ] Empty title is prevented or handled correctly.
- [ ] Updated bookmark persists after refresh.
- [ ] Updated bookmark persists after conversation navigation.
- [ ] Bookmark `updatedUtc` is set when edited.
- [ ] Keyboard shortcut Ctrl+Enter saves.
- [ ] Keyboard shortcut Cmd+Enter saves on macOS.
- [ ] Escape closes the editor without saving.
- [ ] Clicking outside the dialog cancels safely.
- [ ] Focus handling in the editor feels correct.

## 8. Bookmark Notes

- [ ] Bookmark notes can be added.
- [ ] Bookmark notes can be edited.
- [ ] Bookmark notes can be cleared.
- [ ] Bookmark notes are included in bookmark tooltip.
- [ ] Bookmark notes persist after refresh.
- [ ] Bookmark notes persist after export/import.
- [ ] Bookmark notes are searchable by the overlay filter.
- [ ] Long bookmark notes do not break the overlay layout.
- [ ] Multi-line bookmark notes display acceptably in tooltips/dialogs.
- [ ] Bookmark notes remain separate from block-level notes.

## 9. Collapsing Blocks

- [ ] Hovering over Collapse highlighted block highlights the target block.
- [ ] Moving away clears the target highlight.
- [ ] Clicking Collapse highlighted block collapses the highlighted block.
- [ ] Collapsed block is hidden from the ChatGPT page.
- [ ] A placeholder is inserted where the block was.
- [ ] Collapsed state persists after refresh.
- [ ] Collapsed state is scoped to the current conversation.
- [ ] Collapsed blocks do not leak into other conversations.
- [ ] Collapsing multiple blocks works.
- [ ] Collapsing adjacent blocks works.
- [ ] Collapsing user blocks works.
- [ ] Collapsing assistant blocks works.
- [ ] Collapsed-block records include block identity fields.
- [ ] Existing collapsed blocks display safe fallback titles if title is missing.
- [ ] Collapse operation does not cause layout instability beyond expected page reflow.
- [ ] Collapse operation does not create duplicate placeholders.

## 10. Compact In-Chat Collapsed Placeholder

- [ ] Placeholder displays as `[expand] [note] [title]`.
- [ ] Placeholder uses minimal vertical space.
- [ ] Placeholder title truncates cleanly.
- [ ] Expand button restores the block.
- [ ] Note button opens the notes editor.
- [ ] Note icon has highlight colour when notes exist.
- [ ] Note icon has normal colour when no notes exist.
- [ ] Placeholder tooltip includes title.
- [ ] Placeholder tooltip includes notes when present.
- [ ] Placeholder tooltip includes block identity metadata.
- [ ] Placeholder remains visually clear in light theme.
- [ ] Placeholder remains visually clear in dark theme.
- [ ] Placeholder is usable at increased browser zoom.
- [ ] Placeholder is usable with keyboard navigation where practical.

## 11. Restoring Collapsed Blocks

- [ ] Individual restore button works from in-chat placeholder.
- [ ] Individual restore button works from overlay collapsed-block row.
- [ ] Restore removes the placeholder.
- [ ] Restore removes the hidden/collapsed CSS class from the block.
- [ ] Restore removes the collapsed-block state record.
- [ ] Restore does not delete durable block notes.
- [ ] Restore all collapsed blocks works.
- [ ] Restore all removes all placeholders.
- [ ] Restore all restores all hidden blocks.
- [ ] Restore all clears collapsed-block state.
- [ ] Restore all does not delete durable block notes.
- [ ] Restoring a missing block does not throw a runtime error.
- [ ] Restoring a missing placeholder does not throw a runtime error.

## 12. Collapsed Block Notes

- [ ] Notes can be added to a collapsed block.
- [ ] Notes can be edited on a collapsed block.
- [ ] Notes can be cleared from a collapsed block.
- [ ] Notes highlight appears after adding notes.
- [ ] Notes highlight disappears after clearing notes.
- [ ] Notes persist after page refresh.
- [ ] Notes persist after restoring the collapsed block.
- [ ] Notes persist after collapsing the same block again.
- [ ] Notes are stored in `blockNotes`.
- [ ] Existing collapsed-block notes migrate into `blockNotes`.
- [ ] Collapsed-block notes are searchable by the overlay filter.
- [ ] Exported JSON includes `blockNotes`.
- [ ] Imported JSON restores `blockNotes`.

## 13. View Manager Bookmarks Section

- [ ] Bookmarks section displays correct title.
- [ ] Bookmarks section displays correct count.
- [ ] Bookmarks section can be collapsed.
- [ ] Bookmarks section can be expanded.
- [ ] Bookmarks section collapsed state persists.
- [ ] Bookmarks section collapse state is independent from Collapsed Blocks section.
- [ ] Empty Bookmarks section displays correct empty message.
- [ ] Filtered empty Bookmarks section displays correct filtered-empty message.
- [ ] Bookmark rows remain compact.
- [ ] Bookmark row buttons remain usable.
- [ ] Bookmark section works when many bookmarks exist.

## 14. View Manager Collapsed Blocks Section

- [ ] Collapsed Blocks section displays correct title.
- [ ] Collapsed Blocks section displays correct count.
- [ ] Collapsed Blocks section can be collapsed.
- [ ] Collapsed Blocks section can be expanded.
- [ ] Collapsed Blocks section collapsed state persists.
- [ ] Collapsed Blocks section collapse state is independent from Bookmarks section.
- [ ] Empty Collapsed Blocks section displays correct empty message.
- [ ] Filtered empty Collapsed Blocks section displays correct filtered-empty message.
- [ ] Collapsed-block rows remain compact.
- [ ] Collapsed-block row buttons remain usable.
- [ ] Collapsed Blocks section works when many collapsed blocks exist.

## 15. Overlay Filter

- [ ] Filter control appears between toolbar and More dropdown.
- [ ] Filter control visually appears as one joined control.
- [ ] Filter control contains search icon.
- [ ] Filter control contains textbox.
- [ ] Filter control contains clear button.
- [ ] Textbox starts empty.
- [ ] Textbox placeholder appears when empty.
- [ ] Textbox does not show `"undefined"`.
- [ ] Typing into the textbox keeps focus.
- [ ] Pasting into the textbox keeps focus.
- [ ] Typing filters Bookmarks.
- [ ] Typing filters Collapsed Blocks.
- [ ] Filter matches bookmark titles.
- [ ] Filter matches bookmark notes.
- [ ] Filter matches collapsed-block titles.
- [ ] Filter matches block notes.
- [ ] Filter matches role.
- [ ] Filter matches block key.
- [ ] Filter matches content hash.
- [ ] Filter matches block index where useful.
- [ ] Filtering is debounced.
- [ ] Filtering re-renders lists only.
- [ ] Filtering does not re-render the toolbar.
- [ ] Clear button enables when filter text exists.
- [ ] Clear button disables when filter text is empty.
- [ ] Clear button clears the textbox.
- [ ] Clear button removes the filter.
- [ ] Escape inside textbox clears the filter.
- [ ] Filter does not modify saved data.
- [ ] Filter state can remain runtime-only for now.

## 16. Themes

- [ ] Auto theme works.
- [ ] Light theme works.
- [ ] Dark theme works.
- [ ] Theme choice persists globally.
- [ ] Theme can be changed from More dropdown.
- [ ] Active theme is indicated in More dropdown.
- [ ] Overlay remains readable in light theme.
- [ ] Overlay remains readable in dark theme.
- [ ] Dialogs remain readable in light theme.
- [ ] Dialogs remain readable in dark theme.
- [ ] Highlight colours are visible in light theme.
- [ ] Highlight colours are visible in dark theme.
- [ ] Note highlight colour is visible in light theme.
- [ ] Note highlight colour is visible in dark theme.

## 17. Import and Export

- [ ] Export downloads JSON file.
- [ ] Export filename is sensible.
- [ ] Export includes version.
- [ ] Export includes global UI state.
- [ ] Export includes conversations.
- [ ] Export includes bookmarks.
- [ ] Export includes bookmark notes.
- [ ] Export includes collapsed blocks.
- [ ] Export includes block notes.
- [ ] Export includes active conversation key.
- [ ] Import accepts valid exported JSON.
- [ ] Import rejects invalid JSON.
- [ ] Import rejects invalid View Manager data.
- [ ] Import asks for confirmation before replacing state.
- [ ] Import restores bookmarks.
- [ ] Import restores bookmark notes.
- [ ] Import restores collapsed blocks.
- [ ] Import restores block notes.
- [ ] Import restores global UI state.
- [ ] Import handles older flat state.
- [ ] Import handles older version 2 state without `blockNotes`.
- [ ] Import does not leave runtime errors.
- [ ] Imported data is normalised safely.

## 18. Storage and State

- [ ] Storage root uses version 2.
- [ ] Global UI state is separate from conversation state.
- [ ] Conversation state is keyed by conversation URL/key.
- [ ] `bookmarks` are conversation-scoped.
- [ ] `collapsedBlocks` are conversation-scoped.
- [ ] `blockNotes` are conversation-scoped.
- [ ] `theme` is global.
- [ ] `isPanelCollapsed` is global.
- [ ] section collapsed state is global.
- [ ] Missing saved state creates a clean default state.
- [ ] Old flat saved state migrates correctly.
- [ ] Missing `collapsedSections` normalises correctly.
- [ ] Missing `blockNotes` normalises correctly.
- [ ] Missing bookmark title normalises safely.
- [ ] Missing collapsed-block title normalises safely.
- [ ] Missing notes normalise safely.
- [ ] Save state includes all current data fields.
- [ ] Save state does not save runtime-only filter text.
- [ ] State remains valid after repeated edits/deletes/restores.

## 19. String Abstraction

- [ ] User-facing strings go through `ViewManagerStrings`.
- [ ] `ViewManagerStrings.get()` returns default English string.
- [ ] `ViewManagerStrings.format()` handles `{0}` placeholders.
- [ ] Missing string key returns key safely.
- [ ] No major hard-coded UI strings remain in content logic.
- [ ] Default English string store is centralised.
- [ ] String provider is ready for later Chrome i18n.
- [ ] Dropdown receives string provider as explicit dependency.
- [ ] UI classes avoid hidden global string dependencies where practical.

## 20. Type Safety and Code Structure

- [ ] Domain objects use named typedefs.
- [ ] Inline anonymous object JSDoc has been removed where practical.
- [ ] Bookmark type is centralised.
- [ ] Collapsed block type is centralised.
- [ ] Block note type is centralised.
- [ ] UI state type is centralised.
- [ ] Conversation state type is centralised.
- [ ] Storage root type is centralised.
- [ ] Dialog option/result types are centralised.
- [ ] Icon button option type is centralised.
- [ ] Block identity type is centralised.
- [ ] Nullable DOM lookups are guarded.
- [ ] `findBlockForBookmark()` null result is handled.
- [ ] Local callbacks have JSDoc where needed.
- [ ] No implicit `any` errors remain.
- [ ] No possibly-null errors remain.
- [ ] No stale private element references after full render.
- [ ] Classes remain split into manageable files.

## 21. DOM Scheduling and Mutation Handling

- [ ] DOM writes are scheduled through `requestAnimationFrame` where practical.
- [ ] MutationObserver work is debounced.
- [ ] MutationObserver does not trigger excessive full renders.
- [ ] Filter updates re-render only lists.
- [ ] Toolbar is not unnecessarily rebuilt during typing.
- [ ] Dropdown event listeners are disposed before re-render.
- [ ] Overlay render does not leak event listeners.
- [ ] Highlight operations are scheduled safely.
- [ ] Collapse/restore DOM updates are scheduled safely.
- [ ] Long conversations remain usable.

## 22. Accessibility and Keyboard Behaviour

- [ ] Icon buttons have `title`.
- [ ] Icon buttons have `aria-label`.
- [ ] Dialogs have `role="dialog"`.
- [ ] Dialogs have `aria-modal="true"`.
- [ ] Dialog headings are linked with `aria-labelledby`.
- [ ] Text inputs have labels or aria labels.
- [ ] Escape closes dialogs.
- [ ] Escape clears filter when focus is in filter textbox.
- [ ] Ctrl+Enter saves editor dialog.
- [ ] Cmd+Enter saves editor dialog.
- [ ] Focus goes to first dialog input.
- [ ] Focus behaviour after closing dialogs is acceptable.
- [ ] Keyboard access to dropdown is acceptable.
- [ ] Keyboard access to section toggles is acceptable.
- [ ] Keyboard access to placeholder actions is acceptable.

## 23. Known Future Review Items

- [ ] Review whether bookmark notes and block notes should be linked or remain separate.
- [ ] Review whether block-level notes should be editable directly from overlay rows.
- [ ] Review whether deleting a collapsed-block record should preserve or delete block notes.
- [ ] Review whether restoring a block should leave an optional note indicator elsewhere.
- [ ] Review whether filters should optionally persist.
- [ ] Review whether section collapsed state should be global or per conversation.
- [ ] Review whether import should merge rather than replace.
- [ ] Review whether export should support selected conversation only.
- [ ] Review whether a confirmation is needed before deleting bookmarks.
- [ ] Review whether a confirmation is needed before forgetting collapsed blocks.
- [ ] Review whether there should be undo for delete/restore actions.
- [ ] Review whether collapsed placeholders should support keyboard shortcuts.
- [ ] Review whether very long notes need a richer preview.
- [ ] Review whether overlay needs resize or reposition support.
- [ ] Review whether overlay state should sync across Chrome profiles/devices.
- [ ] Review performance jitter when ChatGPT appends/lazy-loads blocks.
- [ ] Review MutationObserver and IntersectionObserver strategy.
- [ ] Review full conversation rescanning cost.
- [ ] Review lazy network/download behaviour and DOM append timing.
- [ ] Review storage schema migration hardening before broader use.

## 24. Suggested Workflow Test Passes

### New Conversation Workflow

- [ ] Open a new ChatGPT conversation.
- [ ] Confirm View Manager appears.
- [ ] Confirm no existing bookmarks appear.
- [ ] Confirm no existing collapsed blocks appear.
- [ ] Create a bookmark.
- [ ] Edit bookmark title.
- [ ] Add bookmark note.
- [ ] Collapse a block.
- [ ] Add block note.
- [ ] Filter by bookmark title.
- [ ] Filter by bookmark note.
- [ ] Filter by block note.
- [ ] Refresh page.
- [ ] Confirm everything persists.

### Existing Long Conversation Workflow

- [ ] Open a long existing conversation.
- [ ] Wait for blocks to load.
- [ ] Confirm block count appears.
- [ ] Scroll through conversation.
- [ ] Confirm lazy-loaded blocks are detected.
- [ ] Bookmark several blocks.
- [ ] Collapse several blocks.
- [ ] Use filter.
- [ ] Restore individual collapsed block.
- [ ] Restore all collapsed blocks.
- [ ] Confirm no major jitter or broken state.

### Conversation Switching Workflow

- [ ] Open conversation A.
- [ ] Add bookmarks and collapsed blocks.
- [ ] Open conversation B.
- [ ] Confirm conversation A state is not shown.
- [ ] Add different bookmarks and collapsed blocks.
- [ ] Return to conversation A.
- [ ] Confirm conversation A state returns.
- [ ] Return to conversation B.
- [ ] Confirm conversation B state returns.
- [ ] Confirm global theme/panel/section state behaves as expected.

### Import/Export Workflow

- [ ] Create bookmarks.
- [ ] Add bookmark notes.
- [ ] Collapse blocks.
- [ ] Add block notes.
- [ ] Export data.
- [ ] Inspect exported JSON.
- [ ] Clear/reload state if safe.
- [ ] Import data.
- [ ] Confirm all data is restored.
- [ ] Confirm no runtime errors.

### Error/Edge Case Workflow

- [ ] Delete a bookmarked block from the DOM indirectly by changing conversation state or reload timing.
- [ ] Click bookmark Go.
- [ ] Confirm clear error message.
- [ ] Restore a collapsed block whose placeholder is missing.
- [ ] Confirm no runtime error.
- [ ] Import invalid JSON.
- [ ] Confirm import failure message.
- [ ] Import wrong JSON shape.
- [ ] Confirm import failure message.
- [ ] Use filter with no matches.
- [ ] Confirm correct filtered-empty messages.

## 25. Notes and Findings

Use this section while testing.

### Issues Found

- [ ]

### Improvements

- [ ]

### New Requirements

- [ ]

### Priority Candidates

- [ ]
