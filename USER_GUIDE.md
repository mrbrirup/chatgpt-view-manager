# User Guide

## View Manager Panel

**Panel Open**
![View Manager panel open ](./docs/images/ViewManagerPanelOpen.png)
Shows Title Bar, Bookmarks and Collapsed Blocks sections, and the Actions dropdown menu.

---

**Title Bar**
![View Manager panel title bar](./docs/images/ViewManagerPanelTitle.png)
- Draggable title bar to move the panel around the page.
- Minimise button to collapse the panel to a small title bar.

---

**Tool Bar**
![View Manager panel toolbar](./docs/images/ViewManagerPanelToolbar.png)
- Goto Top button to scroll the page to the top.
- Goto Bottom button to scroll the page to the bottom.
- Custom Prompt button to open the Custom Prompt Dialog.
- Collapse All button to collapse all conversation blocks on the page.
- Expand All button to expand all collapsed conversation blocks on the page.
- Filter/Search input to filter bookmarks and collapsed blocks by text.
- Actions dropdown button to open the Actions menu for theme, import/export, and other options.

---

**Bookmarks Section**
***Empty*** 
![View Manager panel bookmarks section Empty](./docs/images/ViewManagerPanelBookmarksEmpty.png)
***With Entries***
![View Manager panel bookmarks section Full](./docs/images/ViewManagerPanelBookmarksFull.png)

---

**Collapsed Blocks Section**
***Empty***
![View Manager panel collapsed blocks section Empty](./docs/images/ViewManagerPanelCollapsedBlocksEmpty.png)
***With Entries***
![View Manager panel collapsed blocks section Full](./docs/images/ViewManagerPanelCollapsedBlocksFull.png)

---

**Panel Collapsed/Minimised**
![View Manager panel collapsed/minimised](./docs/images/ViewManagerPanelCollapsed.png)
- Restore button to open the panel again.

---

## Hover Toolbar

**Normal Conversation block**
![Hover Toolbar on a normal conversation block](./docs/images/HoverMenu.png)
- Participant icon shows the participant of the conversation block, user or ChatGPT.
- Collapse button to collapse the conversation block.
- Bookmark button to bookmark the conversation block.
- Notes button to add/edit notes for the conversation block.
- Minimise button to minimise the conversation block.

---

**Hover Toolbar Minimised**
***Minimise the Hover Toolbar to a small icon on the conversation block to reduce clutter.***
![Hover Toolbar minimised](./docs/images/HoverMenuMinimised.png)
- Restore button to restore the Hover Toolbar to full size.

---

**Collapsed Block Information Bar**
Shows a collapsed block with participant/collapsed/note indicators if possible.
![User Collapsed block Information Bar](./docs/images/CollapsedBlockUserInfobar.png)
![System Collapsed block Information Bar](./docs/images/CollapsedBlockChatGPTInfobar.png)
- Participant icon shows the participant of the collapsed block, user (blue person) or ChatGPT (Green robot).
- Collapsed indicator shows the block is collapsed.
- Red note indicator shows the block has notes attached.
- Summary text shows the first few words of the collapsed block.

---

## Notes dialog
Show add/edit note dialog with Delete, Cancel, Save Notes buttons.
![Notes dialog](./docs/images/NotesDialog.png)
- Text note area to add/edit notes for the conversation block.
- Delete button to delete the note for the conversation block.
- Cancel button to close the dialog without saving changes.
- Save Notes button to save the note for the conversation block.

---

## Custom Prompt Dialog
Show floating prompt editor above/near ChatGPT composer.
![Custom Prompt Dialog](./docs/images/CustomPromptDialog.png)
- Header
  - Maximise button to expand the dialog to full width and height of the page.
  - Close button to close the dialog without sending text to ChatGPT prompt composer.
- Body
  - Text area to enter text to send to ChatGPT prompt composer.
- Footer
  - Set Prompt button to send the text to ChatGPT prompt composer without processing it.
  - Set Prompt and Send button to send the text to ChatGPT prompt composer and submit it for processing.

---

**Default Prompt with Text Sent from Custom Prompt Dialog**
![Default Prompt with Text Sent from Custom Prompt Dialog](./docs/images/DefaultPromptWithSentText.png)

---

## Actions dropdown
Show theme/import/export menu open.
![Actions dropdown](./docs/images/ActionsDropDown.png)
- Theme menu to select light or dark theme for the extension.
- Import/Export menu to import/export View Manager data as a JSON file.


## Filter In Use

**Unfiltered Bookmarks and Blocks**
![Unfiltered bookmarks and Blocks](./docs/images/UnfilteredLists.png)
**Filtered Bookmarks and Blocks**
***Filtered on "goi"***
![Filtered bookmarks and Blocks](./docs/images/FilteredListAfter.png)

---

## Themes

**Light theme**
![Light theme](./docs/images/LightTheme.png)

---

**Dark theme**
![Dark theme](./docs/images/DarkTheme.png)

---

## Import/Export Flow
**Export**
![Export menu or import confirmation](./docs/images/ExportData.png)
- Select Folder and enter a file name to export View Manager data as a JSON file.

---

**Import**
- Select a JSON file to import View Manager data.
![Import Data](./docs/images/ImportData.png)
- Confirm import of View Manager data from the selected JSON file.
![Confirm Import Data](./docs/images/ConfirmImport.png)
- Successful import alert and ChatGPT View Manager updated with imported data.
![Import Data Success](./docs/images/ImportDataSuccess.png)


---

## Custom Prompt Dialog maximised
**Custom Prompt Dialog maximised**
![Custom Prompt Dialog maximised](./docs/images/CustomPromptDialogMaximised.png)

---

