(() => {
    "use strict";

    /**
     * @typedef {{
     *     blockKey: string,
     *     notes: string,
     *     updatedUtc: string
     * }} MrbrCvmBlockNote
     */
    /**
    * @typedef {new () => ConversationScanner} ConversationScannerConstructor
    */

    /**
     * @typedef {{
     *     id: string,
     *     title: string,
     *     notes?: string,
     *     turnId?: string,
     *     blockKey: string,
     *     blockIndex?: number,
     *     role?: string,
     *     contentHash?: string,
     *     createdUtc: string,
     *     updatedUtc?: string
     * }} MrbrCvmBookmark
     */

    /**
     * @typedef {{
     *     turnId?: string,
     *     blockKey: string,
     *     blockIndex?: number,
     *     role?: string,
     *     contentHash?: string,
     *     title: string,
     *     notes?: string,
     *     collapsedUtc: string,
     *     updatedUtc?: string
     * }} MrbrCvmCollapsedBlock
     */

    /**
     * @typedef {{
     *     bookmarks: MrbrCvmBookmark[],
     *     collapsedBlocks: MrbrCvmCollapsedBlock[],
     *     blockNotes: Record<string, MrbrCvmBlockNote>
     * }} MrbrCvmConversationState
     */

    /**
     * @typedef {{
     *     theme: "auto" | "dark" | "light",
     *     isPanelCollapsed: boolean,
     *     collapsedSections: {
     *         bookmarks: boolean,
     *         collapsedBlocks: boolean
     *     }
     * }} MrbrCvmUiState
     */

    /**
     * @typedef {{
     *     version: number,
     *     globalUi: MrbrCvmUiState,
     *     conversations: Record<string, MrbrCvmConversationState>
     * }} MrbrCvmStorageRoot
     */

    /**
     * @typedef {new (options: {
     *     createIconButton: (options: {
     *         iconName: string,
     *         title: string,
     *         onClick: (event: MouseEvent) => void
     *     }) => HTMLButtonElement,
     *     strings: {
     *         get: (key: string) => string
     *     },
     *     onImport: () => void | Promise<void>,
     *     onExport: () => void | Promise<void>,
     *     onSetTheme: (theme: "auto" | "dark" | "light") => void | Promise<void>,
     *     getCurrentTheme: () => "auto" | "dark" | "light"
     * }) => ViewManagerActionsDropdown} ViewManagerActionsDropdownConstructor
     */

    /**
     * @typedef {{
     *     dialogTitle: string,
     *     titleLabel: string,
     *     notesLabel: string,
     *     title: string,
     *     notes?: string,
     *     allowEmptyTitle?: boolean
     * }} MrbrCvmTitleNotesEditorOptions
     */

    /**
     * @typedef {{
     *     title: string,
     *     notes: string
     * }} MrbrCvmTitleNotesEditorResult
     */

    /**
     * @typedef {{
     *     title: string,
     *     label: string,
     *     value: string
     * }} MrbrCvmTextInputDialogOptions
     */
    /**
     * @typedef {{
     *     iconName: string,
     *     title: string,
     *     onClick: (event: MouseEvent) => void,
     *     onMouseEnter?: (event: MouseEvent) => void,
     *     onMouseLeave?: (event: MouseEvent) => void
     * }} MrbrCvmIconButtonOptions
     */
    /**
     * @typedef {{
     *     turnId?: string,
     *     blockKey?: string,
     *     contentHash?: string
     * }} MrbrCvmTurnIdentity
     */
    /**
     * @typedef {{ get: (key: string) => string, format: (key: string, ...values: Array<string | number>) => string }} ViewManagerStringsType
     */

    /**
     * Gets the ViewManagerStrings registry.
     *
     * @returns {ViewManagerStringsType}
     */
    const getViewManagerStrings = () => {
        const viewManagerStrings = window.MrbrCvm?.ViewManagerStrings;

        if (!viewManagerStrings) {
            throw new Error("ChatGPT View Manager failed to load ViewManagerStrings.");
        }

        return viewManagerStrings;
    };
    const ViewManagerStrings = getViewManagerStrings();


    /**
     * Gets the ConversationScanner constructor loaded by conversationScanner.js.
     *
     * @returns {ConversationScannerConstructor}
     */
    const getConversationScannerConstructor = () => {
        const conversationScanner = window.MrbrCvm?.ConversationScanner;

        if (!conversationScanner) {
            throw new Error(ViewManagerStrings.get("conversationScannerLoadFailed"));
        }

        return conversationScanner;
    };

    const ConversationScanner = getConversationScannerConstructor();

    /**
     * @typedef {new () => ViewManagerIconButtonFactory} ViewManagerIconButtonFactoryConstructor
     */

    /**
     * Gets the ViewManagerIconButtonFactory constructor.
     *
     * @returns {ViewManagerIconButtonFactoryConstructor}
     */
    const getIconButtonFactoryConstructor = () => {
        const iconButtonFactory = window.MrbrCvm?.ViewManagerIconButtonFactory;

        if (!iconButtonFactory) {
            throw new Error(ViewManagerStrings.get("iconFactoryLoadFailed"));
        }

        return iconButtonFactory;
    };

    const ViewManagerIconButtonFactory = getIconButtonFactoryConstructor();





    /**
     * Gets the ViewManagerActionsDropdown constructor.
     *
     * @returns {ViewManagerActionsDropdownConstructor}
     */
    const getActionsDropdownConstructor = () => {
        const actionsDropdown = window.MrbrCvm?.ViewManagerActionsDropdown;

        if (!actionsDropdown) {
            throw new Error(ViewManagerStrings.get("actionsDropdownLoadFailed"));
        }

        return actionsDropdown;
    };

    const ViewManagerActionsDropdown = getActionsDropdownConstructor();


    if (!ConversationScanner) {
        throw new Error(ViewManagerStrings.get("conversationScannerLoadFailed"));
    }


    const Draw = window.MrbrCvm?.Draw;



    const CollapsedBlocksManager = window.MrbrCvm?.CollapsedBlocksManager;




    const MrbrChatGptViewManager = class {
        #rootElement;
        constructor() {
            MrbrChatGptViewManager.collapsedBlocksManager = new CollapsedBlocksManager();
            MrbrChatGptViewManager.collapsedBlocksManager.init();
            let rootElement = this.getScrollRoot();
            this.#rootElement = rootElement;
            console.log('Root element:', rootElement);

            //this.#rootElement = 
            this.#rootElement.addEventListener('onEnterBlock', (event) => {
                console.log('Mouse entered a block:', event.detail);
            });
            this.#rootElement.addEventListener('onExitBlock', (event) => {
                console.log('Mouse exited a block:', event.detail);
            });
        }
        static PANEL_ID = "mrbr-cvm-panel";
        static STORAGE_KEY = "mrbrChatGptViewManagerState";
        static collapsedBlocksManager;
        /**
         * @type {HTMLDivElement | null}
         */
        panelElement = null;

        /**
         * @type {InstanceType<typeof ConversationScanner>}
         */
        scanner = new ConversationScanner();

        /** @type {MrbrCvmConversationState & { ui: MrbrCvmUiState }} */
        state = {
            bookmarks: [],
            collapsedBlocks: [],
            blockNotes: {},
            ui: {
                theme: "auto",
                isPanelCollapsed: false,
                collapsedSections: {
                    bookmarks: false,
                    collapsedBlocks: false
                }
            }
        };

        /**
         * @type {HTMLElement | null}
         */
        pendingCollapseBlock = null;

        /**
        * @type {number}
        */
        mutationRefreshTimeoutId = 0;

        /**
         * @type {number}
         */
        domUpdateAnimationFrameId = 0;

        /**
         * @type {Array<() => void>}
         */
        pendingDomUpdateCallbacks = [];

        /**
         * @type {string}
         */
        conversationKey = "";

        /**
         * @type {ViewManagerActionsDropdown | null}
         */
        actionsDropdown = null;

        /**
         * @type {ViewManagerIconButtonFactory}
         */
        iconButtonFactory = new ViewManagerIconButtonFactory();

        /** @type {MrbrCvmStorageRoot} */
        storageRoot = {
            version: 2,
            globalUi: {
                theme: "auto",
                isPanelCollapsed: false,
                collapsedSections: {
                    bookmarks: false,
                    collapsedBlocks: false
                }
            },
            conversations: {}
        };
        /** @type {string} */
        filterText = "";
        /**
         * Normalises text for filter matching.
         *
         * @param {string | number | undefined | null} value
         * @returns {string}
         */
        normalizeFilterText(value) {
            return String(value ?? "").trim().toLowerCase();
        }
        /**
         * Gets searchable text for a bookmark.
         *
         * @param {MrbrCvmBookmark} bookmark
         * @param {number} index
         * @returns {string}
         */
        getBookmarkSearchText(bookmark, index) {
            return [
                this.getBookmarkTitle(bookmark, index),
                bookmark.notes,
                bookmark.role,
                bookmark.blockKey,
                bookmark.contentHash,
                bookmark.blockIndex
            ]
                .map(value => this.normalizeFilterText(value))
                .join(" ");
        }
        /**
         * Gets searchable text for a collapsed block.
         *
         * @param {MrbrCvmCollapsedBlock} collapsedBlock
         * @returns {string}
         */
        getCollapsedBlockSearchText(collapsedBlock) {
            return [
                this.getCollapsedBlockTitle(collapsedBlock),
                this.getBlockNotes(collapsedBlock.blockKey),
                collapsedBlock.role,
                collapsedBlock.blockKey,
                collapsedBlock.contentHash,
                collapsedBlock.blockIndex
            ]
                .map(value => this.normalizeFilterText(value))
                .join(" ");
        }
        /**
         * Clears the overlay filter text.
         *
         * @returns {void}
         */
        clearFilterText() {
            this.filterText = "";

            if (this.filterDebounceTimeoutId) {
                window.clearTimeout(this.filterDebounceTimeoutId);
                this.filterDebounceTimeoutId = 0;
            }

            this.scheduleDomUpdate(() => {
                const inputElement = this.panelElement?.querySelector(".mrbr-cvm-filter-input"),
                    clearButton = this.#clearButton
                        || this.panelElement?.querySelector(".mrbr-cvm-filter-clear-button");

                if (inputElement instanceof HTMLInputElement) {
                    inputElement.value = "";
                    inputElement.focus();
                }

                if (clearButton instanceof HTMLButtonElement) {
                    clearButton.disabled = true;
                    this.#clearButton = clearButton;
                }

                this.renderListsOnly();
            });
        }

        /**
         * Re-renders only the bookmark list area.
         *
         * @returns {void}
         */
        renderListsOnly() {
            const listsContainerElement = this.panelElement?.querySelector(".mrbr-cvm-lists-container");

            if (!listsContainerElement) {
                this.render();
                return;
            }

            Draw.draw(() => {
                listsContainerElement.replaceChildren(
                    this.createBookmarksListElement()
                );
            });
        }
        /**
         * Creates the compact overlay filter control.
         *
         * @returns {HTMLDivElement}
         */
        createFilterControlElement() {
            const
                self = this,
                containerElement = document.createElement("div"),
                searchIconElement = this.iconButtonFactory.createIconElement("search"),
                inputElement = document.createElement("input"),
                clearButton = this.createIconButton({
                    iconName: "clear",
                    title: this.getString("clearFilter"),
                    onClick: () => {
                        self.clearFilterText();
                    }
                });

            containerElement.className = "mrbr-cvm-filter-control";
            containerElement.title = this.getString("filterItems");

            searchIconElement.classList.add("mrbr-cvm-filter-icon");

            inputElement.className = "mrbr-cvm-filter-input";
            inputElement.type = "text";
            inputElement.value = this.filterText || "";
            inputElement.placeholder = this.getString("filterItemsPlaceholder");
            inputElement.setAttribute("aria-label", this.getString("filterItems"));

            inputElement.addEventListener("input", () => {
                this.setFilterTextDebounced(inputElement.value);
            });

            inputElement.addEventListener("keydown", event => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    this.clearFilterText();
                }
            });

            clearButton.classList.add("mrbr-cvm-filter-clear-button");
            clearButton.disabled = this.filterText === "";
            Draw.draw(() => { containerElement.append(searchIconElement, inputElement, clearButton); });

            return containerElement;
        }
        /**
         * Sets the overlay filter text using a debounce.
         *
         * @param {string} value
         * @returns {void}
         */
        setFilterTextDebounced(value) {
            this.filterText = value || "";

            const clearButton = this.#clearButton
                || this.panelElement?.querySelector(".mrbr-cvm-filter-clear-button");

            if (clearButton instanceof HTMLButtonElement) {
                clearButton.disabled = this.filterText === "";
                this.#clearButton = clearButton;
            }

            if (this.filterDebounceTimeoutId) {
                window.clearTimeout(this.filterDebounceTimeoutId);
            }

            this.filterDebounceTimeoutId = window.setTimeout(() => {
                this.filterDebounceTimeoutId = 0;

                this.scheduleDomUpdate(() => {
                    this.renderListsOnly();
                });
            }, 150);
        }
        /**
         * Cached filter clear button.
         *
         * @type {HTMLButtonElement | null}
         */
        #clearButton = null;
        /**
         * Checks whether a bookmark matches the current filter.
         *
         * @param {MrbrCvmBookmark} bookmark
         * @param {number} index
         * @returns {boolean}
         */
        doesBookmarkMatchFilter(bookmark, index) {
            const filterText = this.normalizeFilterText(this.filterText);

            if (!filterText) {
                return true;
            }

            return this.getBookmarkSearchText(bookmark, index).includes(filterText);
        }
        /**
         * Starts the extension content script.
         *
         * @returns {Promise<void>}
         */
        async start() {
            await this.loadState();

            this.scheduleDomUpdate(() => {
                this.applyThemeClass();
                this.scanner.findBlocks();
                this.removeCollapsedBlocksDomStateForMvp();
                this.createPanel();
                this.render();
                this.startMutationObserver();
                this.startLocationObserver();
            });
        }

        /**
         * Creates the default UI state.
         *
         * @returns {MrbrCvmUiState}
         */
        createDefaultUiState() {
            return {
                theme: "auto",
                isPanelCollapsed: false,
                collapsedSections: {
                    bookmarks: false,
                    collapsedBlocks: false
                }
            };
        }

        /**
        * Watches for single-page-app URL changes.
        *
        * @returns {void}
        */
        startLocationObserver() {
            let previousHref = window.location.href;

            window.setInterval(async () => {
                if (window.location.href === previousHref) {
                    return;
                }

                previousHref = window.location.href;

                await this.handleConversationChanged();
            }, 500);
        }

        /**
         * Reloads conversation-scoped state after navigation.
         *
         * @returns {Promise<void>}
         */
        async handleConversationChanged() {
            await this.loadState();

            this.scheduleDomUpdate(() => {
                this.applyThemeClass();
                this.scanner.findBlocks();
                this.removeCollapsedBlocksDomStateForMvp();
                this.render();
            });
        }
        /**
        * Loads persisted state from chrome.storage.local.
        *
        * @returns {Promise<void>}
        */
        async loadState() {
            this.conversationKey = this.getConversationKey();

            const result = await chrome.storage.local.get(MrbrChatGptViewManager.STORAGE_KEY),
                savedState = result[MrbrChatGptViewManager.STORAGE_KEY];

            if (!savedState || typeof savedState !== "object") {
                const conversationState = this.createEmptyConversationState();

                this.storageRoot = {
                    version: 2,
                    globalUi: this.createDefaultUiState(),
                    conversations: {
                        [this.conversationKey]: conversationState
                    }
                };

                this.state = {
                    bookmarks: conversationState.bookmarks,
                    collapsedBlocks: conversationState.collapsedBlocks,
                    blockNotes: conversationState.blockNotes,
                    ui: this.storageRoot.globalUi
                };

                return;
            }

            if (savedState.version === 2 && savedState.conversations && typeof savedState.conversations === "object") {
                const conversationState = this.normalizeConversationState(
                    savedState.conversations[this.conversationKey]
                );

                this.storageRoot = {
                    version: 2,
                    globalUi: this.normalizeUiState(savedState.globalUi),
                    conversations: {
                        ...savedState.conversations,
                        [this.conversationKey]: conversationState
                    }
                };

                this.state = {
                    bookmarks: conversationState.bookmarks,
                    collapsedBlocks: conversationState.collapsedBlocks,
                    blockNotes: conversationState.blockNotes,
                    ui: this.storageRoot.globalUi
                };

                return;
            }

            const migratedConversationState = this.normalizeConversationState(savedState);

            this.storageRoot = {
                version: 2,
                globalUi: this.normalizeUiState(savedState.ui),
                conversations: {
                    [this.conversationKey]: migratedConversationState
                }
            };

            this.state = {
                bookmarks: migratedConversationState.bookmarks,
                collapsedBlocks: migratedConversationState.collapsedBlocks,
                blockNotes: migratedConversationState.blockNotes,
                ui: this.storageRoot.globalUi
            };

            await this.saveState();
        }
        /**
         * Applies the selected theme class to the document root.
         *
         * @returns {void}
         */
        applyThemeClass() {
            const rootElement = document.documentElement;

            rootElement.classList.remove(
                "mrbr-cvm-theme-auto",
                "mrbr-cvm-theme-dark",
                "mrbr-cvm-theme-light"
            );

            rootElement.classList.add(`mrbr-cvm-theme-${this.state.ui.theme}`);
        }
        /**
         * Gets the storage key for the current ChatGPT conversation.
         *
         * @returns {string}
         */
        getConversationKey() {
            const url = new URL(window.location.href);

            if (url.pathname.startsWith("/c/")) {
                return `${url.origin}${url.pathname}`;
            }

            return `${url.origin}${url.pathname}`;
        }

        /**
         * Creates an empty conversation-specific state.
         *
         * @returns {MrbrCvmConversationState}
         */
        createEmptyConversationState() {
            return {
                bookmarks: [],
                collapsedBlocks: [],
                blockNotes: {}
            };
        }

        /**
         * Gets a safe UI state.
         *
         * @param {any} ui
         * @returns {MrbrCvmUiState}
         */
        normalizeUiState(ui) {
            return {
                theme: ui?.theme === "dark" || ui?.theme === "light" || ui?.theme === "auto"
                    ? ui.theme
                    : "auto",
                isPanelCollapsed: ui?.isPanelCollapsed === true,
                collapsedSections: {
                    bookmarks: ui?.collapsedSections?.bookmarks === true,
                    collapsedBlocks: ui?.collapsedSections?.collapsedBlocks === true
                }
            };
        }

        /**
         * Normalises a saved conversation state.
         *
         * @param {any} conversationState
         * @returns {MrbrCvmConversationState}
         */
        normalizeConversationState(conversationState) {
            /** @type {Record<string, MrbrCvmBlockNote>} */
            const blockNotes = {};

            if (
                conversationState?.blockNotes
                && typeof conversationState.blockNotes === "object"
                && !Array.isArray(conversationState.blockNotes)
            ) {
                Object.entries(conversationState.blockNotes).forEach(([blockKey, value]) => {
                    if (!blockKey || !value || typeof value !== "object") {
                        return;
                    }

                    const blockNote = /** @type {any} */ (value),
                        notes = typeof blockNote.notes === "string"
                            ? blockNote.notes
                            : "";

                    if (!notes) {
                        return;
                    }

                    blockNotes[blockKey] = {
                        blockKey,
                        notes,
                        updatedUtc: typeof blockNote.updatedUtc === "string"
                            ? blockNote.updatedUtc
                            : new Date().toISOString()
                    };
                });
            }

            const collapsedBlocks = Array.isArray(conversationState?.collapsedBlocks)
                ? conversationState.collapsedBlocks.map(/** @param {any} collapsedBlock */ collapsedBlock => {
                    const blockKey = typeof collapsedBlock.blockKey === "string"
                        ? collapsedBlock.blockKey
                        : "",
                        notes = typeof collapsedBlock.notes === "string"
                            ? collapsedBlock.notes
                            : "";

                    if (blockKey && notes && !blockNotes[blockKey]) {
                        blockNotes[blockKey] = {
                            blockKey,
                            notes,
                            updatedUtc: typeof collapsedBlock.updatedUtc === "string"
                                ? collapsedBlock.updatedUtc
                                : new Date().toISOString()
                        };
                    }

                    return {
                        ...collapsedBlock,
                        title: typeof collapsedBlock.title === "string"
                            ? collapsedBlock.title
                            : "",
                        notes,
                        updatedUtc: typeof collapsedBlock.updatedUtc === "string"
                            ? collapsedBlock.updatedUtc
                            : undefined
                    };
                })
                : [];

            return {
                bookmarks: Array.isArray(conversationState?.bookmarks)
                    ? conversationState.bookmarks.map(/** @param {any} bookmark */ bookmark => ({
                        ...bookmark,
                        title: typeof bookmark.title === "string"
                            ? bookmark.title
                            : "",
                        notes: typeof bookmark.notes === "string"
                            ? bookmark.notes
                            : "",
                        updatedUtc: typeof bookmark.updatedUtc === "string"
                            ? bookmark.updatedUtc
                            : undefined
                    }))
                    : [],
                collapsedBlocks,
                blockNotes
            };
        }
        /**
         * Sets and persists the selected UI theme.
         *
         * @param {"auto" | "dark" | "light"} theme
         * @returns {Promise<void>}
         */
        async setTheme(theme) {
            this.state.ui.theme = theme;

            await this.saveState();

            this.scheduleDomUpdate(() => {
                this.applyThemeClass();
                this.render();
            });
        }

        /**
         * Gets display text for a theme option.
         *
         * @param {"auto" | "dark" | "light"} theme
         * @returns {string}
         */
        getThemeLabel(theme) {
            switch (theme) {
                case "dark":
                    return "Dark";
                case "light":
                    return "Light";
                case "auto":
                default:
                    return "Auto";
            }
        }


        /**
         * Saves current state to chrome.storage.local.
         *
         * @returns {Promise<void>}
         */
        async saveState() {
            if (!this.conversationKey) {
                this.conversationKey = this.getConversationKey();
            }

            this.storageRoot.version = 2;
            this.storageRoot.globalUi = this.state.ui;
            this.storageRoot.conversations[this.conversationKey] = {
                bookmarks: this.state.bookmarks,
                collapsedBlocks: this.state.collapsedBlocks,
                blockNotes: this.state.blockNotes
            };

            await chrome.storage.local.set({
                [MrbrChatGptViewManager.STORAGE_KEY]: this.storageRoot
            });
        }
        /**
         * Gets tooltip text for a block-level note.
         *
         * @param {string | undefined} blockKey
         * @returns {string}
         */
        getBlockNotesTooltip(blockKey) {
            const notes = this.getBlockNotes(blockKey);

            return notes
                ? `${this.getString("hasNotes")}: ${notes}`
                : this.getString("noNotes");
        }
        /**
         * Sets notes for a conversation block.
         *
         * @param {string} blockKey
         * @param {string} notes
         * @returns {void}
         */
        setBlockNotes(blockKey, notes) {
            const trimmedNotes = notes.trim();

            if (!trimmedNotes) {
                delete this.state.blockNotes[blockKey];
                return;
            }

            this.state.blockNotes[blockKey] = {
                blockKey,
                notes: trimmedNotes,
                updatedUtc: new Date().toISOString()
            };
        }
        /**
         * Gets notes for a conversation block.
         *
         * @param {string | undefined} blockKey
         * @returns {string}
         */
        getBlockNotes(blockKey) {
            if (!blockKey) {
                return "";
            }

            return this.state.blockNotes[blockKey]?.notes || "";
        }
        /**
         * Creates the floating panel.
         *
         * @returns {void}
         */
        createPanel() {
            const
                existingPanel = document.getElementById(MrbrChatGptViewManager.PANEL_ID),
                self = this;

            if (existingPanel) {
                existingPanel.remove();
            }

            self.panelElement = document.createElement("div");
            self.panelElement.id = MrbrChatGptViewManager.PANEL_ID;
            self.panelElement.className = "mrbr-cvm-panel";
            self.panelElement.dataset.mrbrConversationKey = self.conversationKey;
            /**
             * Get conversation key in Chrome console for the current panel with:
             * document.querySelector("#mrbr-cvm-panel")?.__mrbrConversationKey
             */
            Draw.draw(() => { document.documentElement.appendChild(self.panelElement); });
        }
        /**
         * Collapses the currently visible conversation block.
         *
         * @returns {Promise<void>}
         */
        async collapseVisibleBlock() {
            const block = this.findBestVisibleBlock();

            if (!block) {
                alert(this.getString("noVisibleConversationBlockFound"));
                return;
            }

            const identity = this.scanner.getBlockIdentity(block),
                title = this.scanner.getBlockTitle(block);

            if (!identity.blockKey) {
                alert(this.getString("selectedBlockInvalidKey"));
                return;
            }

            const alreadyCollapsed = this.state.collapsedBlocks.some(item => {
                return item.blockKey === identity.blockKey
                    || item.contentHash === identity.contentHash;
            });

            if (!alreadyCollapsed) {
                this.state.collapsedBlocks.push({
                    turnId: identity.turnId,
                    blockKey: identity.blockKey,
                    blockIndex: identity.blockIndex,
                    role: identity.role,
                    contentHash: identity.contentHash,
                    title,
                    notes: this.getBlockNotes(identity.blockKey),
                    collapsedUtc: new Date().toISOString()
                });
            }

            await this.saveState();
            this.applyCollapsedBlocks();
            this.render();
        }
        /**
         * Renders the full panel.
         *
         * @returns {void}
         */
        render() {
            const self = this;

            self.scheduleDomUpdate(() => {
                if (!self.panelElement) {
                    return;
                }

                if (self.state.ui.isPanelCollapsed) {
                    self.renderCollapsedPanel();
                    return;
                }

                if (self.actionsDropdown) {
                    self.actionsDropdown.dispose();
                    self.actionsDropdown = null;
                }

                self.panelElement.innerHTML = "";
                self.panelElement.classList.remove("mrbr-cvm-panel-collapsed");
                self.#clearButton = null;

                const headerElement = document.createElement("div"),
                    titleElement = document.createElement("h2"),
                    collapsePanelButton = self.createIconButton({
                        iconName: "collapsePanel",
                        title: self.getString("collapseViewManager"),
                        onClick: () => {
                            self.togglePanelCollapsed();
                        }
                    }),
                    statusElement = document.createElement("div"),
                    blocks = self.scanner.findBlocks(),
                    listsContainerElement = document.createElement("div");

                headerElement.className = "mrbr-cvm-header";

                titleElement.className = "mrbr-cvm-header-title";
                titleElement.textContent = self.getString("viewManagerTitle");

                headerElement.append(titleElement, collapsePanelButton);

                statusElement.className = "mrbr-cvm-status";
                statusElement.textContent = self.formatString("blocksDetected", blocks.length);

                listsContainerElement.className = "mrbr-cvm-lists-container";

                Draw.draw(() => {
                    listsContainerElement.append(
                        self.createBookmarksListElement()
                    );

                    self.panelElement.append(
                        headerElement,
                        statusElement,
                        self.createToolbarElement(),
                        listsContainerElement
                    );
                });
            });
        }
        /**
         * Gets a safe display title for a collapsed block.
         *
         * @param {MrbrCvmCollapsedBlock} collapsedBlock
         * @returns {string}
         */
        getCollapsedBlockTitle(collapsedBlock) {
            if (collapsedBlock.title && collapsedBlock.title.trim()) {
                return collapsedBlock.title.trim();
            }

            if (collapsedBlock.role && typeof collapsedBlock.blockIndex === "number") {
                return `${collapsedBlock.role} block ${collapsedBlock.blockIndex + 1}`;
            }

            if (collapsedBlock.role) {
                return `${collapsedBlock.role} block`;
            }

            if (typeof collapsedBlock.blockIndex === "number") {
                return `Collapsed block ${collapsedBlock.blockIndex + 1}`;
            }

            return "Collapsed block";
        }
        /**
         * Creates a compact collapsed-block row for the View Manager overlay.
         *
         * @param {MrbrCvmCollapsedBlock} collapsedBlock
         * @returns {HTMLDivElement}
         */
        createCollapsedBlockElement(collapsedBlock) {
            const rowElement = document.createElement("div"),
                title = this.getCollapsedBlockTitle(collapsedBlock),
                goButton = this.createIconButton({
                    iconName: "go",
                    title: this.getString("goToCollapsedBlockPlaceholder"),
                    onClick: async () => {
                        await this.goToCollapsedBlock(collapsedBlock);
                    }
                }),
                restoreButton = this.createIconButton({
                    iconName: "restore",
                    title: this.getString("restoreCollapsedBlock"),
                    onClick: async () => {
                        await this.restoreCollapsedBlock(collapsedBlock);
                    }
                }),
                deleteButton = this.createIconButton({
                    iconName: "delete",
                    title: this.getString("forgetCollapsedBlockAndRestore"),
                    onClick: async () => {
                        this.state.collapsedBlocks = this.state.collapsedBlocks.filter(item => {
                            return item.blockKey !== collapsedBlock.blockKey;
                        });

                        await this.saveState();

                        this.scheduleDomUpdate(() => {
                            this.applyCollapsedBlocks();
                            this.render();
                        });
                    }
                }),
                labelElement = document.createElement("div"),
                key = collapsedBlock.blockKey || `${collapsedBlock.role || "unknown"}-${collapsedBlock.blockIndex || "?"}`;
            const blockNotes = this.getBlockNotes(collapsedBlock.blockKey);

            rowElement.className = "mrbr-cvm-compact-row";

            labelElement.className = "mrbr-cvm-compact-row-label";
            labelElement.textContent = title;

            labelElement.title = blockNotes
                ? `${title}\n\n${blockNotes}\n\n${key}`
                : `${title}\n${key}`;

            rowElement.append(goButton, restoreButton, deleteButton, labelElement);

            return rowElement;
        }
        /**
         * Scrolls to a collapsed block placeholder.
         *
         * @param {MrbrCvmCollapsedBlock} collapsedBlock
         * @param {boolean} [reportNotFound]
         * @returns {Promise<HTMLElement | null>} The placeholder element or null if not found.
         */
        async goToCollapsedBlock(collapsedBlock, reportNotFound = true) {
            const maxRetries = 4,
                initialRetryDelayMilliseconds = 150;

            /**
             * Waits for two animation frames so ChatGPT has time to paint/hydrate
             * after the scroll position changes or placeholders are applied.
             *
             * @returns {Promise<void>}
             */
            const waitForTwoPaints = () => {
                return new Promise(resolve => {
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            resolve();
                        });
                    });
                });
            };

            /**
             * Waits for a delay.
             *
             * @param {number} milliseconds
             * @returns {Promise<void>}
             */
            const wait = milliseconds => {
                return new Promise(resolve => {
                    window.setTimeout(resolve, milliseconds);
                });
            };

            /**
             * Re-scans, reapplies collapsed state, waits for paint, then finds the placeholder.
             *
             * @returns {Promise<HTMLElement | null>}
             */
            const findPlaceholderAfterApply = async () => {
                this.scanner.findBlocks();
                this.applyCollapsedBlocks();

                await waitForTwoPaints();

                return this.findCollapsePlaceholder(collapsedBlock);
            };

            let placeholder = await findPlaceholderAfterApply();

            if (!placeholder) {
                await this.scrollTurnContainerIntoViewAndVerify(collapsedBlock, "center", maxRetries);
                await this.waitForTurnHydration(500);

                placeholder = await findPlaceholderAfterApply();
            }

            for (let retryIndex = 0; !placeholder && retryIndex < maxRetries; retryIndex++) {
                const retryDelayMilliseconds = initialRetryDelayMilliseconds * Math.pow(2, retryIndex),
                    blockPosition = retryIndex % 2 === 0
                        ? "start"
                        : "center";

                await wait(retryDelayMilliseconds);

                await this.scrollTurnContainerIntoViewAndVerify(
                    collapsedBlock,
                    blockPosition,
                    maxRetries
                );

                await this.waitForTurnHydration(retryDelayMilliseconds);

                placeholder = await findPlaceholderAfterApply();
            }

            if (!placeholder) {
                if (reportNotFound) {
                    alert(this.formatString(
                        "couldNotFindCollapsedBlock",
                        this.getCollapsedBlockTitle(collapsedBlock)
                    ));
                }

                return null;
            }

            await this.scrollTurnContainerIntoViewAndVerify(collapsedBlock, "start", maxRetries);
            await this.waitForTurnHydration(450);

            placeholder = this.findCollapsePlaceholder(collapsedBlock) || placeholder;

            this.flashBlock(placeholder);

            return placeholder;
        }
        /**
         * Creates the toolbar element.
         *
         * @returns {HTMLDivElement}
         */
        createToolbarElement() {
            const toolbarElement = document.createElement("div"),
                leftToolbarElement = document.createElement("div"),
                bookmarkButton = this.createIconButton({
                    iconName: "bookmark",
                    title: this.getString("bookmarkVisibleBlock"),
                    onClick: async () => {
                        await this.addBookmarkForVisibleBlock();
                    }
                }),
                rescanButton = this.createIconButton({
                    iconName: "rescan",
                    title: this.getString("rescanConversationBlocks"),
                    onClick: () => {
                        this.scanner.findBlocks();
                        this.render();
                    }
                }),
                topButton = this.createIconButton({
                    iconName: "top",
                    title: this.getString("scrollToTop"),
                    onClick: () => {
                        this.scrollChatRootTo(0);
                    }
                }),
                filterControlElement = this.createFilterControlElement();

            toolbarElement.className = "mrbr-cvm-toolbar";
            leftToolbarElement.className = "mrbr-cvm-toolbar-left";

            leftToolbarElement.append(
                bookmarkButton,
                rescanButton,
                topButton
            );

            this.actionsDropdown = new ViewManagerActionsDropdown({
                createIconButton: options => this.createIconButton({
                    iconName: options.iconName,
                    title: options.title,
                    onClick: options.onClick
                }),
                strings: {
                    get: key => this.getString(key)
                },
                onExport: () => {
                    this.exportState();
                },
                onImport: () => {
                    this.importState();
                },
                onSetTheme: async theme => {
                    await this.setTheme(theme);
                },
                getCurrentTheme: () => this.state.ui.theme
            });

            toolbarElement.append(
                leftToolbarElement,
                filterControlElement,
                this.actionsDropdown.createElement()
            );

            return toolbarElement;
        }
        /**
         * Restores all collapsed blocks.
         *
         * @returns {Promise<void>}
         */
        async restoreAllCollapsedBlocks() {
            const collapsedBlocks = [...this.state.collapsedBlocks];

            if (!collapsedBlocks.length) {
                return;
            }

            this.state.collapsedBlocks = [];

            await this.saveState();

            this.scheduleDomUpdate(() => {
                collapsedBlocks.forEach(collapsedBlock => {
                    const placeholder = this.findCollapsePlaceholder(collapsedBlock),
                        block = this.scanner.findBlockForBookmark(collapsedBlock);

                    if (placeholder) {
                        placeholder.remove();
                    }

                    if (block) {
                        block.classList.remove("mrbr-cvm-collapsed-block");
                    }
                });

                this.render();
            });
        }
        /**
         * Creates the bookmarks list element.
         *
         * @returns {HTMLDivElement}
         */
        createBookmarksListElement() {
            const listElement = document.createElement("div");
            const filteredBookmarks = this.state.bookmarks
                .map((bookmark, index) => ({
                    bookmark,
                    index
                }))
                .filter(item => this.doesBookmarkMatchFilter(item.bookmark, item.index));

            listElement.className = "mrbr-cvm-compact-list";

            if (!filteredBookmarks.length) {
                const emptyElement = document.createElement("div");

                emptyElement.className = "mrbr-cvm-empty";
                emptyElement.textContent = this.getString("noBookmarksYet");

                listElement.append(emptyElement);
            } else {
                filteredBookmarks.forEach(item => {
                    listElement.append(this.createBookmarkElement(item.bookmark, item.index));
                });
            }

            return this.createCompactSectionElement(
                "bookmarks",
                this.getString("bookmarksSectionTitle"),
                filteredBookmarks.length,
                listElement
            );
        }
        /**
         * Creates the collapsed blocks list element.
         *
         * @returns {HTMLDivElement}
         */
        createCollapsedBlocksListElement() {
            const listElement = document.createElement("div"),
                filteredCollapsedBlocks = this.state.collapsedBlocks.filter(collapsedBlock => {
                    return this.doesCollapsedBlockMatchFilter(collapsedBlock);
                });

            listElement.className = "mrbr-cvm-compact-list";

            if (!filteredCollapsedBlocks.length) {
                const emptyElement = document.createElement("div");

                emptyElement.className = "mrbr-cvm-empty";
                emptyElement.textContent = this.getString("noCollapsedBlocks");

                listElement.append(emptyElement);
            } else {
                filteredCollapsedBlocks.forEach(collapsedBlock => {
                    listElement.append(this.createCollapsedBlockElement(collapsedBlock));
                });
            }

            return this.createCompactSectionElement(
                "collapsedBlocks",
                this.getString("collapsedBlocksSectionTitle"),
                filteredCollapsedBlocks.length,
                listElement
            );
        }
        /**
         * Checks whether a collapsed block matches the current filter.
         *
         * @param {MrbrCvmCollapsedBlock} collapsedBlock
         * @returns {boolean}
         */
        doesCollapsedBlockMatchFilter(collapsedBlock) {
            const filterText = this.normalizeFilterText(this.filterText);

            if (!filterText) {
                return true;
            }

            return this.getCollapsedBlockSearchText(collapsedBlock).includes(filterText);
        }
        /**
         * Exports the full View Manager state as a JSON file.
         *
         * @returns {Promise<void>}
         */
        async exportState() {
            await this.saveState();

            const exportData = {
                exportedBy: this.getString("exportedBy"),
                exportedUtc: new Date().toISOString(),
                storageKey: MrbrChatGptViewManager.STORAGE_KEY,
                activeConversationKey: this.conversationKey,
                data: this.storageRoot
            },
                json = JSON.stringify(exportData, null, 4),
                blob = new Blob([json], {
                    type: "application/json"
                }),
                objectUrl = URL.createObjectURL(blob),
                anchorElement = document.createElement("a");

            anchorElement.href = objectUrl;
            anchorElement.download = this.createExportFileName();

            this.scheduleDomUpdate(() => {
                document.documentElement.append(anchorElement);
                anchorElement.click();
                anchorElement.remove();

                window.setTimeout(() => {
                    URL.revokeObjectURL(objectUrl);
                }, 1000);
            });
        }
        /**
         * Checks whether a value looks like a version 2 storage root.
         *
         * @param {any} value
         * @returns {boolean}
         */
        isValidStorageRoot(value) {
            return value
                && typeof value === "object"
                && value.version === 2
                && value.globalUi
                && typeof value.globalUi === "object"
                && value.conversations
                && typeof value.conversations === "object";
        }

        /**
         * Normalises an imported storage root.
         *
         * @param {any} importedRoot
         * @returns {MrbrCvmStorageRoot}
         */
        normalizeStorageRoot(importedRoot) {
            /** @type {Record<string, MrbrCvmConversationState>} */
            const conversations = {};

            for (const [conversationKey, conversationState] of Object.entries(importedRoot.conversations || {})) {
                conversations[conversationKey] = this.normalizeConversationState(conversationState);
            }

            return {
                version: 2,
                globalUi: this.normalizeUiState(importedRoot.globalUi),
                conversations
            };
        }
        /**
        * Imports View Manager state from a JSON file.
        *
        * @returns {Promise<void>}
        */
        async importState() {
            const jsonText = await this.readImportFileText();

            if (!jsonText) {
                return;
            }

            let parsed;

            try {
                parsed = JSON.parse(jsonText);
            } catch (error) {
                alert(this.getString("importFailedInvalidJson"));
                console.error(this.getString("importJsonParseFailed"), error);
                return;
            }

            const importedRoot = parsed?.data || parsed;

            if (!this.isValidStorageRoot(importedRoot)) {
                alert(this.getString("importFailedInvalidData"));
                return;
            }

            const shouldImport = confirm(this.getString("importConfirmMessage"));

            if (!shouldImport) {
                return;
            }

            this.storageRoot = this.normalizeStorageRoot(importedRoot);

            await chrome.storage.local.set({
                [MrbrChatGptViewManager.STORAGE_KEY]: this.storageRoot
            });

            await this.loadState();

            this.scheduleDomUpdate(() => {
                this.applyThemeClass();
                this.scanner.findBlocks();
                this.render();
            });

            alert(this.getString("importSuccessMessage"));
        }

        /**
         * Prompts the user to choose a JSON file and returns its text.
         *
         * @returns {Promise<string | null>}
         */
        readImportFileText() {
            return new Promise(resolve => {
                const inputElement = document.createElement("input");

                inputElement.type = "file";
                inputElement.accept = "application/json,.json";

                inputElement.addEventListener("change", async () => {
                    const file = inputElement.files?.[0];

                    inputElement.remove();

                    if (!file) {
                        resolve(null);
                        return;
                    }

                    try {
                        resolve(await file.text());
                    } catch (error) {
                        console.error(this.getString("importFileReadFailed"), error);
                        resolve(null);
                    }
                });

                inputElement.addEventListener("cancel", () => {
                    inputElement.remove();
                    resolve(null);
                });

                this.scheduleDomUpdate(() => {
                    document.documentElement.append(inputElement);
                    inputElement.click();
                });
            });
        }

        /**
         * Creates a safe timestamped export filename.
         *
         * @returns {string}
         */
        createExportFileName() {
            const timestamp = new Date()
                .toISOString()
                .replace(/[:.]/g, "-");

            return `${this.getString("exportFilePrefix")}-${timestamp}.json`;
        }
        /**
         * Creates one compact theme toggle icon button.
         *
         * @param {"auto" | "dark" | "light"} theme
         * @returns {HTMLButtonElement}
         */
        createThemeToggleButton(theme) {
            const label = this.getThemeLabel(theme),
                iconName = theme === "light"
                    ? "lightTheme"
                    : theme === "dark"
                        ? "darkTheme"
                        : "autoTheme",
                button = this.createIconButton({
                    iconName,
                    title: `Use ${label} theme`,
                    onClick: () => {
                        this.setTheme(theme);
                    }
                });

            button.classList.add("mrbr-cvm-theme-toggle-button");

            if (this.state.ui.theme === theme) {
                button.classList.add("mrbr-cvm-theme-toggle-button-active");
                button.setAttribute("aria-pressed", "true");
            } else {
                button.setAttribute("aria-pressed", "false");
            }

            return button;
        }

        /**
         * Creates a compact bookmark row.
         *
         * @param {MrbrCvmBookmark} bookmark
         * @param {number} index
         * @returns {HTMLDivElement}
         */
        createBookmarkElement(bookmark, index) {
            const rowElement = document.createElement("div"),
                title = this.getBookmarkTitle(bookmark, index),
                goButton = this.createIconButton({
                    iconName: "go",
                    title: this.getString("goToBookmark"),
                    onClick: async () => {
                        await this.goToBookmark(bookmark);
                    }
                }),
                editButton = this.createIconButton({
                    iconName: "edit",
                    title: this.getString("editBookmark"),
                    onClick: async () => {
                        await this.editBookmark(bookmark);
                    }
                }),
                deleteButton = this.createIconButton({
                    iconName: "delete",
                    title: this.getString("deleteBookmark"),
                    onClick: async () => {
                        this.state.bookmarks = this.state.bookmarks.filter(item => item.id !== bookmark.id);

                        await this.saveState();
                        this.render();
                    }
                }),
                labelElement = document.createElement("div"),
                key = bookmark.blockKey || `${bookmark.role || "unknown"}-${bookmark.blockIndex || "?"}`;

            rowElement.className = "mrbr-cvm-compact-row mrbr-cvm-compact-row-bookmark";

            labelElement.className = "mrbr-cvm-compact-row-label";
            labelElement.textContent = title;

            labelElement.title = bookmark.notes
                ? `${title}\n\n${bookmark.notes}\n\n${key}`
                : `${title}\n${key}`;

            rowElement.append(goButton, editButton, deleteButton, labelElement);

            return rowElement;
        }

        /**
        * Adds a bookmark for the currently visible conversation block.
        *
        * @returns {Promise<void>}
        */
        async addBookmarkForVisibleBlock() {
            const block = this.findBestVisibleBlock();

            if (!block) {
                alert("No visible conversation block was found.");
                return;
            }

            this.highlightPendingBookmark(block);

            const identity = this.scanner.getBlockIdentity(block),
                defaultTitle = this.scanner.getBlockTitle(block),
                title = await this.showTextInputDialog({
                    title: this.getString("addBookmarkTitle"),
                    label: this.getString("bookmarkTitleLabel"),
                    value: defaultTitle
                });

            if (!title || !identity.blockKey) {
                block.classList.remove("mrbr-cvm-pending-bookmark");
                return;
            }

            this.state.bookmarks.push({
                id: crypto.randomUUID(),
                title,
                notes: "",
                turnId: identity.turnId,
                blockKey: identity.blockKey,
                blockIndex: identity.blockIndex,
                role: identity.role,
                contentHash: identity.contentHash,
                createdUtc: new Date().toISOString()
            });

            block.classList.remove("mrbr-cvm-pending-bookmark");

            await this.saveState();
            this.render();
        }
        /**
         * Scrolls to a bookmark's block.
         *
         * @param {MrbrCvmBookmark} bookmark
         * @param {boolean} [reportNotFound]
         * @returns {Promise<HTMLElement | null>} The block element or null if not found.
         */
        async goToBookmark(bookmark, reportNotFound = true) {
            const block = await this.findBlockByIdentityWithTurnContainer(bookmark);

            if (!block) {
                if (reportNotFound) {
                    alert(this.formatString(
                        "couldNotFindBookmark",
                        this.getBookmarkTitle(bookmark, this.state.bookmarks.indexOf(bookmark))
                    ));
                }

                return null;
            }

            await this.scrollTurnContainerIntoViewAndVerify(bookmark, "start", 4);
            await this.waitForTurnHydration(450);

            this.flashBlock(block);

            return block;
        }
        /**
         * Removes collapsed-block DOM effects while the Collapsed Blocks feature is disabled for MVP.
         *
         * @returns {void}
         */
        removeCollapsedBlocksDomStateForMvp() {
            document
                .querySelectorAll(".mrbr-cvm-collapsed-block")
                .forEach(element => {
                    element.classList.remove("mrbr-cvm-collapsed-block");
                });

            document
                .querySelectorAll(".mrbr-cvm-collapsed-placeholder")
                .forEach(element => {
                    element.remove();
                });
        }
        /**
         * Finds a block, using the turn container to trigger hydration if needed.
         *
         * @param {MrbrCvmBookmark | MrbrCvmCollapsedBlock} item
         * @returns {Promise<HTMLElement | null>}
         */
        async findBlockByIdentityWithTurnContainer(item) {
            const maxRetries = 4,
                initialRetryDelayMilliseconds = 150;

            /**
             * Waits for two animation frames so ChatGPT has time to paint/hydrate
             * after the scroll position changes.
             *
             * @returns {Promise<void>}
             */
            const waitForTwoPaints = () => {
                return new Promise(resolve => {
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            resolve();
                        });
                    });
                });
            };

            /**
             * Waits for a delay.
             *
             * @param {number} milliseconds
             * @returns {Promise<void>}
             */
            const wait = milliseconds => {
                return new Promise(resolve => {
                    window.setTimeout(resolve, milliseconds);
                });
            };

            /**
             * Scans and tries to find the target block.
             *
             * @returns {HTMLElement | null}
             */
            const findAfterScan = () => {
                this.scanner.findBlocks();

                return this.scanner.findBlockForBookmark(item);
            };

            let block = findAfterScan();

            if (block) {
                return block;
            }

            if (await this.scrollTurnContainerIntoViewAndVerify(item, "center", maxRetries)) {
                await waitForTwoPaints();
                await this.waitForTurnHydration(500);

                block = findAfterScan();

                if (block) {
                    return block;
                }
            }

            for (let retryIndex = 0; retryIndex < maxRetries; retryIndex++) {
                const retryDelayMilliseconds = initialRetryDelayMilliseconds * Math.pow(2, retryIndex),
                    blockPosition = retryIndex % 2 === 0
                        ? "start"
                        : "center";

                await wait(retryDelayMilliseconds);

                block = findAfterScan();

                if (block) {
                    return block;
                }

                await this.scrollTurnContainerIntoViewAndVerify(item, blockPosition, maxRetries);
                await waitForTwoPaints();
                await this.waitForTurnHydration(retryDelayMilliseconds);

                block = findAfterScan();

                if (block) {
                    return block;
                }
            }

            return null;
        }
        /**
         * Gets the visible ChatGPT fixed/sticky header height.
         *
         * @returns {number}
         */
        getFixedHeaderHeight() {
            const headerElement = document.querySelector("#page-header[data-fixed-header]");

            if (!(headerElement instanceof HTMLElement)) {
                return 0;
            }

            const headerRect = headerElement.getBoundingClientRect();

            if (headerRect.height <= 0) {
                return 0;
            }

            return headerRect.height;
        }
        /**
         * Waits for the scroll root to settle, with a timeout fallback.
         *
         * @param {number} [milliseconds]
         * @returns {Promise<void>}
         */
        waitForScrollSettle(milliseconds = 450) {
            const scrollRoot = this.getScrollRoot();

            return new Promise(resolve => {
                if (!scrollRoot) {
                    window.setTimeout(resolve, milliseconds);
                    return;
                }

                let isResolved = false;

                /**
                 * Resolves once.
                 *
                 * @returns {void}
                 */
                const resolveOnce = () => {
                    if (isResolved) {
                        return;
                    }

                    isResolved = true;
                    scrollRoot.removeEventListener("scrollend", resolveOnce);
                    resolve();
                };

                scrollRoot.addEventListener("scrollend", resolveOnce, { once: true });
                window.setTimeout(resolveOnce, milliseconds);
            });
        }
        /**
         * Scrolls a turn container into view and verifies that the scroll root reached
         * the expected scroll position. Retries when ChatGPT virtualisation or layout
         * changes interrupt the scroll.
         *
         * @param {MrbrCvmBookmark | MrbrCvmCollapsedBlock} item
         * @param {ScrollLogicalPosition} [blockPosition]
         * @param {number} [maxRetries]
         * @returns {Promise<boolean>}
         */
        async scrollTurnContainerIntoViewAndVerify(item, blockPosition = "start", maxRetries = 4) {
            const initialRetryDelayMilliseconds = 150,
                scrollTolerancePixels = 16,
                headerGapPixels = 8;

            /**
             * Waits for two animation frames.
             *
             * @returns {Promise<void>}
             */
            const waitForTwoPaints = () => {
                return new Promise(resolve => {
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            resolve();
                        });
                    });
                });
            };

            /**
             * Gets the target scroll position for the item.
             *
             * @returns {{ scrollRoot: HTMLElement, targetTop: number } | null}
             */
            const getScrollTarget = () => {
                const scrollRoot = this.getScrollRoot(),
                    turnContainer = this.findTurnContainer(item),
                    fixedHeaderHeight = this.getFixedHeaderHeight(),
                    headerOffset = fixedHeaderHeight + headerGapPixels;

                if (!scrollRoot || !turnContainer) {
                    return null;
                }

                const scrollRootRect = scrollRoot.getBoundingClientRect(),
                    turnRect = turnContainer.getBoundingClientRect(),
                    offsetTop = turnRect.top - scrollRootRect.top;

                let targetTop = scrollRoot.scrollTop + offsetTop;

                if (blockPosition === "center") {
                    const visibleHeight = Math.max(0, scrollRoot.clientHeight - headerOffset);

                    targetTop = targetTop - headerOffset - ((visibleHeight - turnRect.height) / 2);
                } else if (blockPosition === "end") {
                    targetTop = targetTop - scrollRoot.clientHeight + turnRect.height;
                } else {
                    targetTop = targetTop - headerOffset;
                }

                const maximumScrollTop = Math.max(0, scrollRoot.scrollHeight - scrollRoot.clientHeight);

                targetTop = Math.max(0, Math.min(targetTop, maximumScrollTop));

                return {
                    scrollRoot,
                    targetTop
                };
            };

            for (let retryIndex = 0; retryIndex <= maxRetries; retryIndex++) {
                const retryDelayMilliseconds = initialRetryDelayMilliseconds * Math.pow(2, retryIndex),
                    scrollTarget = getScrollTarget();

                if (!scrollTarget) {
                    return false;
                }

                scrollTarget.scrollRoot.scrollTo({
                    top: scrollTarget.targetTop,
                    behavior: "smooth"
                });

                await this.waitForScrollSettle(retryDelayMilliseconds);
                await waitForTwoPaints();

                const refreshedScrollTarget = getScrollTarget();

                if (!refreshedScrollTarget) {
                    return false;
                }

                const scrollDifference = Math.abs(
                    refreshedScrollTarget.scrollRoot.scrollTop - refreshedScrollTarget.targetTop
                );

                if (scrollDifference <= scrollTolerancePixels) {
                    return true;
                }
            }

            return false;
        }
        /**
         * Waits briefly for a turn to hydrate after scrolling.
         *
         * @param {number} [milliseconds]
         * @returns {Promise<void>}
         */
        async waitForTurnHydration(milliseconds = 450) {
            await this.waitForScrollSettle(milliseconds);
            this.scanner.findBlocks();
        }
        /**
         * Finds a ChatGPT turn container for a bookmark/collapsed block.
         *
         * @param {MrbrCvmTurnIdentity} item
         * @returns {HTMLElement | null}
         */
        findTurnContainer(item) {
            if (item.turnId) {
                const turnContainer = document.querySelector(
                    `[data-turn-id-container="${CSS.escape(item.turnId)}"]`
                );

                if (turnContainer instanceof HTMLElement) {
                    return turnContainer;
                }

                const turnElement = document.querySelector(
                    `[data-turn-id="${CSS.escape(item.turnId)}"]`
                );

                if (turnElement instanceof HTMLElement) {
                    return turnElement.closest("[data-turn-id-container]") || turnElement;
                }
            }

            if (item.blockKey) {
                const blockElement = document.querySelector(
                    `[data-mrbr-cvm-block-key="${CSS.escape(item.blockKey)}"]`
                );

                if (blockElement instanceof HTMLElement) {
                    return blockElement.closest("[data-turn-id-container]") || blockElement;
                }
            }

            return null;
        }

        /**
         * Gets the ChatGPT scroll root.
         *
         * @returns {HTMLElement | null}
         */
        getScrollRoot() {
            const selectors = [
                ".not-print\\:overflow-y-auto",
                "div[data-scroll-root]",
                "[data-scroll-root]",
                "main"
            ];

            for (const selector of selectors) {
                const element = document.querySelector(selector);

                if (element instanceof HTMLElement) {
                    return element;
                }
            }

            return null;
        }
        /**
         * Scrolls the ChatGPT scroll root to a position.
         *
         * @param {number} top
         * @param {ScrollBehavior} [behavior]
         * @returns {void}
         */
        scrollChatRootTo(top, behavior = "smooth") {
            const scrollRoot = this.getScrollRoot();

            if (!scrollRoot) {
                return;
            }

            scrollRoot.scrollTo({
                top,
                behavior
            });
        }
        /**
         * Scrolls a turn container into view inside the ChatGPT scroll root.
         *
         * @param {MrbrCvmTurnIdentity} item
         * @param {ScrollLogicalPosition} [blockPosition]
         * @returns {boolean}
         */
        scrollTurnContainerIntoView(item, blockPosition = "start") {
            const scrollRoot = this.getScrollRoot(),
                turnContainer = this.findTurnContainer(item);

            if (!scrollRoot || !turnContainer) {
                return false;
            }

            const scrollRootRect = scrollRoot.getBoundingClientRect(),
                turnRect = turnContainer.getBoundingClientRect(),
                offsetTop = turnRect.top - scrollRootRect.top,
                targetTop = scrollRoot.scrollTop + offsetTop;

            let adjustedTop = targetTop;

            if (blockPosition === "center") {
                adjustedTop = targetTop - ((scrollRoot.clientHeight - turnRect.height) / 2);
            }

            scrollRoot.scrollTo({
                top: Math.max(0, adjustedTop),
                behavior: "smooth"
            });

            return true;
        }
        /**
         * Restores the DOM for a collapsed block without changing saved state.
         *
         * @param {MrbrCvmCollapsedBlock} collapsedBlock
         * @returns {Promise<void>}
         */
        restoreCollapsedBlockDomOnly(collapsedBlock) {
            return new Promise(resolve => {
                this.scheduleDomUpdate(() => {
                    const placeholder = this.findCollapsePlaceholder(collapsedBlock),
                        block = this.scanner.findBlockForBookmark(collapsedBlock);

                    if (placeholder) {
                        placeholder.remove();
                    }

                    if (block) {
                        block.classList.remove("mrbr-cvm-collapsed-block");
                    }

                    this.render();

                    window.requestAnimationFrame(() => {
                        resolve();
                    });
                });
            });
        }
        /**
         * Finds the most suitable visible block to bookmark.
         *
         * @returns {HTMLElement | null}
         */
        findBestVisibleBlock() {
            const blocks = this.scanner.findBlocks(),
                viewportCenterY = window.innerHeight / 2;

            let bestBlock = null,
                bestDistance = Number.MAX_VALUE;

            for (const block of blocks) {
                const rect = block.getBoundingClientRect();

                if (rect.bottom < 0 || rect.top > window.innerHeight) {
                    continue;
                }

                const blockCenterY = rect.top + rect.height / 2,
                    distance = Math.abs(blockCenterY - viewportCenterY);

                if (distance < bestDistance) {
                    bestBlock = block;
                    bestDistance = distance;
                }
            }

            return bestBlock;
        }

        /**
         * Briefly highlights a block after navigation.
         *
         * @param {HTMLElement} block
         * @returns {void}
         */
        flashBlock(block) {
            this.scheduleDomUpdate(() => {
                block.classList.add("mrbr-cvm-flash");

                window.setTimeout(() => {
                    this.scheduleDomUpdate(() => {
                        block.classList.remove("mrbr-cvm-flash");
                    });
                }, 1200);
            });
        }

        /**
         * Watches for ChatGPT adding/replacing conversation content.
         *
         * @returns {void}
         */
        startMutationObserver() {
            const observer = new MutationObserver(() => {
                this.scheduleMutationRefresh();
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
        /**
         * Highlights the block that is about to be bookmarked.
         *
         * @param {HTMLElement} block
         * @returns {void}
         */
        highlightPendingBookmark(block) {
            this.scheduleDomUpdate(() => {
                document
                    .querySelectorAll(".mrbr-cvm-pending-bookmark")
                    .forEach(element => element.classList.remove("mrbr-cvm-pending-bookmark"));

                block.classList.add("mrbr-cvm-pending-bookmark");
            });
        }


        /**
         * Highlights the block that will be collapsed if the user clicks
         * Collapse Highlighted.
         *
         * @returns {void}
         */
        highlightCollapseTarget() {
            this.clearCollapseTargetHighlight();

            const block = this.findBestVisibleBlock();

            if (!block) {
                this.pendingCollapseBlock = null;
                return;
            }

            this.pendingCollapseBlock = block;

            this.scheduleDomUpdate(() => {
                block.classList.add("mrbr-cvm-collapse-target");
            });
        }

        /**
         * Clears the pending collapse target highlight.
         *
         * @returns {void}
         */
        clearCollapseTargetHighlight() {
            this.scheduleDomUpdate(() => {
                document
                    .querySelectorAll(".mrbr-cvm-collapse-target")
                    .forEach(element => element.classList.remove("mrbr-cvm-collapse-target"));
            });

            this.pendingCollapseBlock = null;
        }

        /**
         * Collapses the currently highlighted conversation block.
         *
         * @returns {Promise<void>}
         */
        async collapseHighlightedBlock() {
            const block = this.pendingCollapseBlock || this.findBestVisibleBlock();

            if (!block) {
                alert(this.getString("noHighlightedConversationBlockFound"));
                return;
            }

            await this.collapseBlock(block);
        }
        /**
        * Collapses a specific conversation block.
        *
        * @param {HTMLElement} block
        * @returns {Promise<void>}
        */
        async collapseBlock(block) {
            const identity = this.scanner.getBlockIdentity(block),
                title = this.scanner.getBlockTitle(block);

            if (!identity.blockKey) {
                alert("The selected block does not have a valid block key.");
                return;
            }

            const alreadyCollapsed = this.state.collapsedBlocks.some(item => {
                return item.blockKey === identity.blockKey
                    || item.contentHash === identity.contentHash;
            });

            if (!alreadyCollapsed) {
                this.state.collapsedBlocks.push({
                    turnId: identity.turnId,
                    blockKey: identity.blockKey,
                    blockIndex: identity.blockIndex,
                    role: identity.role,
                    contentHash: identity.contentHash,
                    title,
                    notes: this.getBlockNotes(identity.blockKey),
                    collapsedUtc: new Date().toISOString()
                });
            }
            this.clearCollapseTargetHighlight();

            await this.saveState();

            this.scheduleDomUpdate(() => {
                this.applyCollapsedBlocks();
                this.render();
            });
        }
        /**
         * Applies collapsed state to all matching blocks.
         *
         * @param {HTMLElement[]=} blocks
         * @returns {void}
         */
        applyCollapsedBlocks(blocks) {
            const currentBlocks = blocks || this.scanner.findBlocks();

            this.removeOrphanedCollapsePlaceholders();

            for (const collapsedBlock of this.state.collapsedBlocks) {
                const block = this.scanner.findBlockForBookmark(collapsedBlock);

                if (!block || !currentBlocks.includes(block)) {
                    continue;
                }

                this.collapseBlockElement(block, collapsedBlock);
            }
        }

        /**
         * Collapses a single block element and creates its placeholder.
         *
         * @param {HTMLElement} block
         * @param {MrbrCvmCollapsedBlock} collapsedBlock
         * @returns {void}
         */
        collapseBlockElement(block, collapsedBlock) {
            this.scheduleDomUpdate(() => {
                const existingPlaceholder = this.findCollapsePlaceholder(collapsedBlock);

                block.classList.add("mrbr-cvm-collapsed-block");

                if (existingPlaceholder) {
                    return;
                }

                const placeholderElement = this.createCollapsePlaceholder(collapsedBlock);
                Draw.draw(() => { block.insertAdjacentElement("beforebegin", placeholderElement); });
            });
        }

        /**
         * Creates a collapsed block placeholder.
         *
         * @param {MrbrCvmCollapsedBlock} collapsedBlock
         * @returns {HTMLDivElement}
         */
        createCollapsePlaceholder(collapsedBlock) {
            const containerElement = document.createElement("div"),
                title = this.getCollapsedBlockTitle(collapsedBlock),
                blockNotes = this.getBlockNotes(collapsedBlock.blockKey),
                expandButton = this.createIconButton({
                    iconName: "restore",
                    title: this.getString("expandCollapsedBlock"),
                    onClick: async () => {
                        await this.restoreCollapsedBlock(collapsedBlock);
                    }
                }),
                noteButton = this.createIconButton({
                    iconName: "note",
                    title: blockNotes
                        ? `${this.getString("hasNotes")}: ${blockNotes}`
                        : this.getString("noNotes"),
                    onClick: async () => {
                        await this.editCollapsedBlockNotes(collapsedBlock);
                    }
                }),
                titleElement = document.createElement("div");

            containerElement.className = "mrbr-cvm-collapsed-placeholder";
            containerElement.setAttribute("data-mrbr-cvm-placeholder-key", collapsedBlock.blockKey);

            if (collapsedBlock.turnId) {
                containerElement.setAttribute("data-mrbr-cvm-placeholder-turn-id", collapsedBlock.turnId);
            }

            if (blockNotes) {
                noteButton.classList.add("mrbr-cvm-note-button-active");
            }

            titleElement.className = "mrbr-cvm-collapsed-placeholder-title";
            titleElement.title = blockNotes
                ? `${title}\n\n${blockNotes}\n\n${collapsedBlock.blockKey}`
                : `${title}\n${collapsedBlock.blockKey}`;
            titleElement.textContent = title;

            containerElement.append(expandButton, noteButton, titleElement);

            return containerElement;
        }

        /**
         * Finds an existing collapse placeholder.
         *
         * @param {MrbrCvmCollapsedBlock} collapsedBlock
         * @returns {HTMLElement | null}
         */
        findCollapsePlaceholder(collapsedBlock) {
            if (collapsedBlock.turnId) {
                const turnIdPlaceholder = document.querySelector(
                    `[data-mrbr-cvm-placeholder-turn-id="${CSS.escape(collapsedBlock.turnId)}"]`
                );

                if (turnIdPlaceholder instanceof HTMLElement) {
                    return turnIdPlaceholder;
                }
            }

            if (collapsedBlock.blockKey) {
                const keyPlaceholder = document.querySelector(
                    `[data-mrbr-cvm-placeholder-key="${CSS.escape(collapsedBlock.blockKey)}"]`
                );

                if (keyPlaceholder instanceof HTMLElement) {
                    return keyPlaceholder;
                }
            }

            return null;
        }
        /**
         * Restores a collapsed block.
         *
         * @param {MrbrCvmCollapsedBlock} collapsedBlock
         * @returns {Promise<void>}
         */
        async restoreCollapsedBlock(collapsedBlock) {
            this.state.collapsedBlocks = this.state.collapsedBlocks.filter(item => {
                return item.blockKey !== collapsedBlock.blockKey;
            });

            await this.saveState();

            this.scheduleDomUpdate(() => {
                const placeholder = this.findCollapsePlaceholder(collapsedBlock),
                    block = this.scanner.findBlockForBookmark(collapsedBlock);

                if (placeholder) {
                    placeholder.remove();
                }

                if (block) {
                    block.classList.remove("mrbr-cvm-collapsed-block");
                }

                this.render();
            });
        }

        /**
         * Removes placeholder elements that no longer have matching collapsed state.
         *
         * @returns {void}
         */
        removeOrphanedCollapsePlaceholders() {
            const collapsedKeys = new Set(this.state.collapsedBlocks.map(item => item.blockKey));

            document
                .querySelectorAll(".mrbr-cvm-collapsed-placeholder")
                .forEach(element => {
                    const key = element.getAttribute("data-mrbr-cvm-placeholder-key");

                    if (!key || !collapsedKeys.has(key)) {
                        element.remove();
                    }
                });
        }
        /**
         * Schedules DOM work for the next animation frame.
         *
         * This keeps DOM writes grouped together and avoids doing visual updates
         * directly inside event handlers or MutationObserver callbacks.
         *
         * @param {() => void} callback
         * @returns {void}
         */
        scheduleDomUpdate(callback) {
            this.pendingDomUpdateCallbacks.push(callback);

            if (this.domUpdateAnimationFrameId) {
                return;
            }

            this.domUpdateAnimationFrameId = window.requestAnimationFrame(() => {
                const callbacks = this.pendingDomUpdateCallbacks.splice(0);

                this.domUpdateAnimationFrameId = 0;

                for (const pendingCallback of callbacks) {
                    try {
                        pendingCallback();
                    } catch (error) {
                        console.error(this.getString("domUpdateFailed"), error);
                    }
                }
            });
        }

        /**
         * Schedules a debounced refresh after ChatGPT mutates the DOM.
         *
         * @returns {void}
         */
        scheduleMutationRefresh() {
            window.clearTimeout(this.mutationRefreshTimeoutId);

            this.mutationRefreshTimeoutId = window.setTimeout(() => {
                this.mutationRefreshTimeoutId = 0;

                this.scheduleDomUpdate(() => {
                    const blocks = this.scanner.findBlocks();

                    this.updateBlockCountStatus(blocks.length);
                });
            }, 150);
        }
        /**
         * Updates the detected block count in the panel.
         *
         * @param {number} blockCount
         * @returns {void}
         */
        updateBlockCountStatus(blockCount) {
            if (!this.panelElement) {
                return;
            }

            const statusElement = this.panelElement.querySelector(".mrbr-cvm-status");

            if (statusElement) {
                statusElement.textContent = this.formatString("blocksDetected", blockCount);
            }
        }
        /**
        * Shows a non-blocking text input dialog.
        *
        * @param {MrbrCvmTextInputDialogOptions} options
        * @returns {Promise<string | null>}
        */
        showTextInputDialog(options) {
            return new Promise(resolve => {
                const backdropElement = document.createElement("div"),
                    dialogElement = document.createElement("div"),
                    titleElement = document.createElement("h2"),
                    labelElement = document.createElement("label"),
                    inputElement = document.createElement("input"),
                    actionsElement = document.createElement("div"),
                    cancelButton = document.createElement("button"),
                    saveButton = document.createElement("button"),
                    dialogId = `mrbr-cvm-dialog-${crypto.randomUUID()}`,
                    inputId = `${dialogId}-input`;

                let isResolved = false;

                /**
                 * Closes the dialog and resolves once.
                 *
                 * @param {string | null} value
                 * @returns {void}
                 */
                const closeDialog = value => {
                    if (isResolved) {
                        return;
                    }

                    isResolved = true;
                    document.removeEventListener("keydown", handleDocumentKeyDown, true);
                    backdropElement.remove();
                    resolve(value);
                };

                /**
                 * Handles document-level keyboard shortcuts.
                 *
                 * @param {KeyboardEvent} event
                 * @returns {void}
                 */
                const handleDocumentKeyDown = event => {
                    if (event.key === "Escape") {
                        event.preventDefault();
                        event.stopPropagation();
                        closeDialog(null);
                    }
                };

                backdropElement.className = "mrbr-cvm-dialog-backdrop";

                dialogElement.className = "mrbr-cvm-dialog";
                dialogElement.setAttribute("role", "dialog");
                dialogElement.setAttribute("aria-modal", "true");
                dialogElement.setAttribute("aria-labelledby", dialogId);

                titleElement.id = dialogId;
                titleElement.className = "mrbr-cvm-dialog-title";
                titleElement.textContent = options.title;

                labelElement.className = "mrbr-cvm-dialog-label";
                labelElement.htmlFor = inputId;
                labelElement.textContent = options.label;

                inputElement.id = inputId;
                inputElement.className = "mrbr-cvm-dialog-input";
                inputElement.type = "text";
                inputElement.value = options.value;
                inputElement.select();

                inputElement.addEventListener("keydown", event => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        closeDialog(inputElement.value.trim());
                    }
                });

                actionsElement.className = "mrbr-cvm-dialog-actions";

                cancelButton.type = "button";
                cancelButton.textContent = this.getString("cancel");
                cancelButton.addEventListener("click", () => {
                    closeDialog(null);
                });

                saveButton.type = "button";
                saveButton.textContent = this.getString("saveBookmark");
                saveButton.addEventListener("click", () => {
                    closeDialog(inputElement.value.trim());
                });

                backdropElement.addEventListener("click", event => {
                    if (event.target === backdropElement) {
                        closeDialog(null);
                    }
                });

                document.addEventListener("keydown", handleDocumentKeyDown, true);

                actionsElement.append(cancelButton, saveButton);
                dialogElement.append(titleElement, labelElement, inputElement, actionsElement);
                backdropElement.append(dialogElement);
                document.documentElement.append(backdropElement);

                window.requestAnimationFrame(() => {
                    inputElement.focus();
                    inputElement.select();
                });
            });
        }

        /**
         * Creates a compact icon button.
         *
         * @param {MrbrCvmIconButtonOptions} options
         * @returns {HTMLButtonElement}
         */
        createIconButton(options) {
            return this.iconButtonFactory.createIconButton(options);
        }
        /**
         * Creates a compact collapsible panel section with a title, count, and content.
         *
         * @param {"bookmarks" | "collapsedBlocks"} sectionKey
         * @param {string} title
         * @param {number} count
         * @param {HTMLElement} contentElement
         * @returns {HTMLDivElement}
         */
        createCompactSectionElement(sectionKey, title, count, contentElement) {
            const sectionElement = document.createElement("div"),
                headerElement = document.createElement("div"),
                headerLeftElement = document.createElement("div"),
                toggleButton = this.createIconButton({
                    iconName: this.state.ui.collapsedSections[sectionKey]
                        ? "sectionCollapsed"
                        : "sectionExpanded",
                    title: this.state.ui.collapsedSections[sectionKey]
                        ? this.getString("sectionExpand")
                        : this.getString("sectionCollapse"),
                    onClick: async () => {
                        await this.toggleSectionCollapsed(sectionKey);
                    }
                }),
                titleElement = document.createElement("div"),
                countElement = document.createElement("div");

            sectionElement.className = "mrbr-cvm-section";

            headerElement.className = "mrbr-cvm-section-header";
            headerLeftElement.className = "mrbr-cvm-section-header-left";

            toggleButton.classList.add("mrbr-cvm-section-toggle-button");

            titleElement.className = "mrbr-cvm-section-title";
            titleElement.textContent = title;

            countElement.className = "mrbr-cvm-section-count";
            countElement.textContent = String(count);

            headerLeftElement.append(toggleButton, titleElement);
            headerElement.append(headerLeftElement, countElement);
            sectionElement.append(headerElement);

            if (!this.state.ui.collapsedSections[sectionKey]) {
                sectionElement.append(contentElement);
            }

            return sectionElement;
        }
        /**
        * Toggles the View Manager panel collapsed state.
        *
        * @returns {Promise<void>}
        */
        async togglePanelCollapsed() {
            this.state.ui.isPanelCollapsed = !this.state.ui.isPanelCollapsed;

            await this.saveState();

            this.render();
        }

        /**
         * Renders the collapsed panel view.
         *
         * @returns {void}
         */
        renderCollapsedPanel() {
            if (!this.panelElement) {
                return;
            }

            this.panelElement.innerHTML = "";
            this.panelElement.classList.add("mrbr-cvm-panel-collapsed");

            const expandButton = this.createIconButton({
                iconName: "expandPanel",
                title: this.getString("expandViewManager"),
                onClick: () => {
                    this.togglePanelCollapsed();
                }
            });

            this.panelElement.append(expandButton);
        }
        /**
         * Gets a UI string.
         *
         * @param {string} key
         * @returns {string}
         */
        getString(key) {
            return ViewManagerStrings.get(key);
        }

        /**
         * Formats a UI string.
         *
         * @param {string} key
         * @param {...string | number} values
         * @returns {string}
         */
        formatString(key, ...values) {
            const strings = window.MrbrCvm?.ViewManagerStrings;

            if (strings) {
                return strings.format(key, ...values);
            }

            let text = key;

            values.forEach((value, index) => {
                text = text.replaceAll(`{${index}}`, String(value));
            });

            return text;
        }

        /**
         * Shows an editor dialog for a title and notes.
         *
         * @param {MrbrCvmTitleNotesEditorOptions} options
         * @returns {Promise<MrbrCvmTitleNotesEditorResult | null>}
         */
        showTitleNotesEditorDialog(options) {
            return new Promise(resolve => {
                const backdropElement = document.createElement("div"),
                    dialogElement = document.createElement("div"),
                    headingElement = document.createElement("h2"),
                    titleLabelElement = document.createElement("label"),
                    titleInputElement = document.createElement("input"),
                    notesLabelElement = document.createElement("label"),
                    notesTextAreaElement = document.createElement("textarea"),
                    actionsElement = document.createElement("div"),
                    cancelButton = document.createElement("button"),
                    saveButton = document.createElement("button"),
                    dialogId = `mrbr-cvm-dialog-${crypto.randomUUID()}`,
                    titleInputId = `${dialogId}-title`,
                    notesInputId = `${dialogId}-notes`;

                let isResolved = false;

                /**
                 * Closes the dialog and resolves once.
                 *
                 * @param {MrbrCvmTitleNotesEditorResult | null} value
                 * @returns {void}
                 */
                const closeDialog = value => {
                    if (isResolved) {
                        return;
                    }

                    isResolved = true;
                    document.removeEventListener("keydown", handleDocumentKeyDown, true);
                    backdropElement.remove();
                    resolve(value);
                };

                /**
                 * Saves the current dialog values.
                 *
                 * @returns {void}
                 */
                const save = () => {
                    const title = titleInputElement.value.trim(),
                        notes = notesTextAreaElement.value.trim();

                    if (!options.allowEmptyTitle && !title) {
                        titleInputElement.focus();
                        return;
                    }

                    closeDialog({
                        title,
                        notes
                    });
                };

                /**
                 * @param {KeyboardEvent} event
                 * @returns {void}
                 */
                const handleDocumentKeyDown = event => {
                    if (event.key === "Escape") {
                        event.preventDefault();
                        event.stopPropagation();
                        closeDialog(null);
                        return;
                    }

                    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                        event.preventDefault();
                        save();
                    }
                };

                backdropElement.className = "mrbr-cvm-dialog-backdrop";

                dialogElement.className = "mrbr-cvm-dialog";
                dialogElement.setAttribute("role", "dialog");
                dialogElement.setAttribute("aria-modal", "true");
                dialogElement.setAttribute("aria-labelledby", dialogId);

                headingElement.id = dialogId;
                headingElement.className = "mrbr-cvm-dialog-title";
                headingElement.textContent = options.dialogTitle;

                titleLabelElement.className = "mrbr-cvm-dialog-label";
                titleLabelElement.htmlFor = titleInputId;
                titleLabelElement.textContent = options.titleLabel;

                titleInputElement.id = titleInputId;
                titleInputElement.className = "mrbr-cvm-dialog-input";
                titleInputElement.type = "text";
                titleInputElement.value = options.title;

                notesLabelElement.className = "mrbr-cvm-dialog-label";
                notesLabelElement.htmlFor = notesInputId;
                notesLabelElement.textContent = options.notesLabel;

                notesTextAreaElement.id = notesInputId;
                notesTextAreaElement.className = "mrbr-cvm-dialog-textarea";
                notesTextAreaElement.value = options.notes || "";
                notesTextAreaElement.placeholder = this.getString("notesEmptyPlaceholder");

                actionsElement.className = "mrbr-cvm-dialog-actions";

                cancelButton.type = "button";
                cancelButton.textContent = this.getString("cancel");
                cancelButton.addEventListener("click", () => {
                    closeDialog(null);
                });

                saveButton.type = "button";
                saveButton.textContent = this.getString("saveChanges");
                saveButton.addEventListener("click", save);

                backdropElement.addEventListener("click", event => {
                    if (event.target === backdropElement) {
                        closeDialog(null);
                    }
                });

                document.addEventListener("keydown", handleDocumentKeyDown, true);

                actionsElement.append(cancelButton, saveButton);
                dialogElement.append(
                    headingElement,
                    titleLabelElement,
                    titleInputElement,
                    notesLabelElement,
                    notesTextAreaElement,
                    actionsElement
                );
                backdropElement.append(dialogElement);

                this.scheduleDomUpdate(() => {
                    document.documentElement.append(backdropElement);

                    window.requestAnimationFrame(() => {
                        titleInputElement.focus();
                        titleInputElement.select();
                    });
                });
            });
        }
        /**
        * Edits an existing bookmark.
        *
        * @param {MrbrCvmBookmark} bookmark
        * @returns {Promise<void>}
        */
        async editBookmark(bookmark) {
            const result = await this.showTitleNotesEditorDialog({
                dialogTitle: this.getString("editBookmarkTitle"),
                titleLabel: this.getString("bookmarkLabel"),
                notesLabel: this.getString("bookmarkNotes"),
                title: this.getBookmarkTitle(bookmark, this.state.bookmarks.indexOf(bookmark)),
                notes: bookmark.notes || ""
            });

            if (!result || !result.title) {
                return;
            }

            const existingBookmark = this.state.bookmarks.find(item => item.id === bookmark.id);

            if (!existingBookmark) {
                return;
            }

            existingBookmark.title = result.title;
            existingBookmark.notes = result.notes;
            existingBookmark.updatedUtc = new Date().toISOString();

            await this.saveState();
            this.render();
        }
        /**
         * Edits notes for a collapsed block.
         *
         * @param {MrbrCvmCollapsedBlock} collapsedBlock
         * @returns {Promise<void>}
         */
        async editCollapsedBlockNotes(collapsedBlock) {
            if (!collapsedBlock.blockKey) {
                return;
            }

            const result = await this.showTitleNotesEditorDialog({
                dialogTitle: this.getString("collapsedBlockNotesTitle"),
                titleLabel: this.getString("bookmarkLabel"),
                notesLabel: this.getString("bookmarkNotes"),
                title: this.getCollapsedBlockTitle(collapsedBlock),
                notes: this.getBlockNotes(collapsedBlock.blockKey)
            });

            if (!result || !result.title) {
                return;
            }

            const existingCollapsedBlock = this.state.collapsedBlocks.find(item => {
                return item.blockKey === collapsedBlock.blockKey;
            });

            if (existingCollapsedBlock) {
                existingCollapsedBlock.title = result.title;
                existingCollapsedBlock.updatedUtc = new Date().toISOString();
            }

            this.setBlockNotes(collapsedBlock.blockKey, result.notes);

            await this.saveState();
            this.render();
            this.applyCollapsedBlocks();
        }
        /**
         * Toggles a View Manager section collapsed state.
         *
         * @param {"bookmarks" | "collapsedBlocks"} sectionKey
         * @returns {Promise<void>}
         */
        async toggleSectionCollapsed(sectionKey) {
            this.state.ui.collapsedSections[sectionKey] = !this.state.ui.collapsedSections[sectionKey];

            await this.saveState();
            this.render();
        }

        /**
        * Gets a safe display title for a bookmark.
        *
        * @param {MrbrCvmBookmark} bookmark
        * @param {number} index
        * @returns {string}
        */
        getBookmarkTitle(bookmark, index) {
            if (bookmark.title && bookmark.title.trim()) {
                return bookmark.title.trim();
            }

            return this.formatString("bookmarkFallbackTitleWithIndex", index + 1);
        }
        // static {
        //     this.collapsedBlocksManager = new CollapsedBlocksManager();
        //     this.collapsedBlocksManager.init();
        // }

    }; // End of class: MrbrChatGptViewManager



    const manager = new MrbrChatGptViewManager();

    manager.start().catch(error => {
        console.error(ViewManagerStrings.get("startupFailed"), error);
    });
})();


