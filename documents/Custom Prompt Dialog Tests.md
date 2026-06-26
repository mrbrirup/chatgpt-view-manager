# Custom Prompt Dialog Tests

## UI Layout

### Title bar

- [x] Icons
  - [x] Need appropriate icons for:
    - [x] Maximise
    - [x] Close

### Body

- [x] Status div
  - [x] Slight overlap from editable area from focus outline
    - [x] .mrbr-cvm-custom-editor-status: set padding to "8px 0px"

## Functionality

- [x] Prompt Editable section
  - [x] Prompt persists across conversations when the dialog is open, when it should not
    - Prompt is correctly cleared when the dialog is closed when conversation changes
    - [x] Clear the text area when the dialog is closed and reopened
    - [x] Add a brief border flash when the text is cleared
    - [x] Update status div to indicate that the prompt has been cleared
    
