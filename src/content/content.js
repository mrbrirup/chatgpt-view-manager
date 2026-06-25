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
    const HoverToolbar = window.MrbrCvm?.HoverToolbar;
    const ViewManagerLocalPersistence = window.MrbrCvm?.ViewManagerLocalPersistence;
    const ViewManagerImportExport = window.MrbrCvm?.ViewManagerImportExport;
    const ViewManagerNotesManager = window.MrbrCvm?.ViewManagerNotesManager;

    if (!CollapsedBlocksManager) {
        throw new Error("ChatGPT View Manager failed to load CollapsedBlocksManager.");
    }

    if (!HoverToolbar) {
        throw new Error("ChatGPT View Manager failed to load HoverToolbar.");
    }

    if (!ViewManagerLocalPersistence) {
        throw new Error("ChatGPT View Manager failed to load ViewManagerLocalPersistence.");
    }

    if (!ViewManagerImportExport) {
        throw new Error("ChatGPT View Manager failed to load ViewManagerImportExport.");
    }

    if (!ViewManagerNotesManager) {
        throw new Error("ChatGPT View Manager failed to load ViewManagerNotesManager.");
    }


    const MrbrChatGptViewManager = class {
        #rootElement;
        constructor() {
            this.persistence = new ViewManagerLocalPersistence({
                storageKey: MrbrChatGptViewManager.STORAGE_KEY
            });
            this.notesManager = new ViewManagerNotesManager({
                getState: () => this.state,
                persistence: this.persistence,
                scanner: this.scanner,
                strings: ViewManagerStrings,
                scheduleDomUpdate: callback => this.scheduleDomUpdate(callback),
                render: () => {
                    this.syncStateReferences();
                    this.applyCollapsedBlocks();
                    this.render();
                },
                highlightBlock: block => this.highlightNotesTarget(block),
                clearHighlight: block => this.clearNotesTargetHighlight(block)
            });
            this.importExport = new ViewManagerImportExport({
                persistence: this.persistence,
                strings: ViewManagerStrings,
                scheduleDomUpdate: callback => this.scheduleDomUpdate(callback)
            });

            let rootElement = this.getScrollRoot();
            this.#rootElement = rootElement;

            this.collapsedBlocksManager = new CollapsedBlocksManager({
                scanner: this.scanner,
                persistence: this.persistence,
                notesManager: this.notesManager,
                strings: ViewManagerStrings,
                scheduleDomUpdate: callback => this.scheduleDomUpdate(callback),
                flashBlock: block => this.flashBlock(block),
                getScrollRoot: () => this.getScrollRoot(),
                scrollTurnContainerIntoViewAndVerify: (item, blockPosition, maxRetries) => {
                    return this.scrollTurnContainerIntoViewAndVerify(item, blockPosition, maxRetries);
                },
                waitForTurnHydration: milliseconds => this.waitForTurnHydration(milliseconds)
            });

            MrbrChatGptViewManager.collapsedBlocksManager = this.collapsedBlocksManager;
            this.collapsedBlocksManager.init();

            this.hoverToolbar = new HoverToolbar({
                getRootElement: () => this.getScrollRoot(),
                getTargetElement: element => {
                    const host = element.closest("[data-turn-id-container]");

                    if (!(host instanceof HTMLElement)) {
                        return null;
                    }

                    return this.collapsedBlocksManager.getConversationBlockForElement(host)
                        ? host
                        : null;
                },
                getState: element => this.getHoverToolbarState(element),
                createIconButton: options => this.createIconButton(options),
                strings: ViewManagerStrings,
                onCollapse: element => this.collapseBlock(element),
                onRestore: element => this.restoreCollapsedBlockForElement(element),
                onAddBookmark: element => this.addBookmarkForBlockElement(element),
                onRemoveBookmark: element => this.removeBookmarkForBlockElement(element),
                onEditNotes: element => this.editNotesForBlockElement(element)
            });
            this.hoverToolbar.init();
        }
        static PANEL_ID = "mrbr-cvm-panel";
        static STORAGE_KEY = "mrbrChatGptViewManagerState";
        static collapsedBlocksManager;
        /** @type {InstanceType<typeof ViewManagerLocalPersistence> | null} */
        persistence = null;
        /** @type {InstanceType<typeof ViewManagerNotesManager> | null} */
        notesManager = null;
        /** @type {InstanceType<typeof ViewManagerImportExport> | null} */
        importExport = null;
        /** @type {InstanceType<typeof CollapsedBlocksManager> | null} */
        collapsedBlocksManager = null;
        /** @type {InstanceType<typeof HoverToolbar> | null} */
        hoverToolbar = null;
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
        * @type {number}
        */
        mutationRefreshTimeoutId = 0;

        /**
         * @type {number}
         */
        sharedStateRefreshTimeoutId = 0;

        /**
         * @type {boolean}
         */
        isSynchronizingSharedState = false;

        /**
         * True while Collapse All or Expand All is processing its cached block snapshot.
         *
         * @type {boolean}
         */
        isBatchUpdatingBlocks = false;

        /**
         * Cached number of blocks in the current batch operation.
         *
         * @type {number}
         */
        batchUpdateBlockCount = 0;

        /**
         * True when DOM mutations occurred during a batch and need one final refresh.
         *
         * @type {boolean}
         */
        hasPendingMutationRefreshAfterBatch = false;

        /**
         * True after Chrome invalidates this content-script context, usually because
         * the extension was reloaded while the ChatGPT tab stayed open.
         *
         * @type {boolean}
         */
        isExtensionContextInvalidated = false;

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
                    this.createBookmarksListElement(),
                    this.createCollapsedBlocksListElement()
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
                this.applyCollapsedBlocks();
                this.createPanel();
                this.render();
                this.startMutationObserver();
                this.startLocationObserver();
                this.startSharedStateObserver();
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
         * Checks whether an error was caused by Chrome invalidating this extension
         * content-script context. This normally happens after reloading or updating
         * the extension while a ChatGPT tab is still open.
         *
         * @param {unknown} error
         * @returns {boolean}
         */
        isExtensionContextInvalidatedError(error) {
            const message = error instanceof Error
                ? error.message
                : String(error || "");

            return message.includes("Extension context invalidated");
        }

        /**
         * Marks this content-script instance as stale when Chrome has invalidated
         * the extension context, and prevents repeated background sync attempts.
         *
         * @param {unknown} error
         * @returns {boolean} True when the error was handled as context invalidation.
         */
        handleExtensionContextError(error) {
            if (!this.isExtensionContextInvalidatedError(error)) {
                return false;
            }

            this.isExtensionContextInvalidated = true;

            if (this.sharedStateRefreshTimeoutId) {
                window.clearTimeout(this.sharedStateRefreshTimeoutId);
                this.sharedStateRefreshTimeoutId = 0;
            }

            console.info(
                "ChatGPT View Manager extension context was invalidated. Reload this ChatGPT tab to attach the current extension instance."
            );

            return true;
        }

        /**
         * Safely checks whether Chrome extension storage APIs are still available.
         * Access can throw after the extension is reloaded while this tab remains open.
         *
         * @returns {boolean}
         */
        isChromeExtensionContextAvailable() {
            if (this.isExtensionContextInvalidated) {
                return false;
            }

            try {
                return typeof chrome !== "undefined"
                    && Boolean(chrome.runtime?.id)
                    && Boolean(chrome.storage?.local);
            } catch (error) {
                this.handleExtensionContextError(error);
                return false;
            }
        }

        /**
         * Watches for this tab becoming active and for changes saved by other tabs.
         *
         * @returns {void}
         */
        startSharedStateObserver() {
            const scheduleActiveMerge = () => {
                if (document.visibilityState === "hidden" || !this.isChromeExtensionContextAvailable()) {
                    return;
                }

                this.scheduleSharedStateRefresh(true);
            };

            document.addEventListener("visibilitychange", scheduleActiveMerge);
            window.addEventListener("focus", scheduleActiveMerge);

            try {
                if (!this.isChromeExtensionContextAvailable()) {
                    return;
                }

                chrome.storage.onChanged.addListener((changes, areaName) => {
                    if (areaName !== "local" || !changes[MrbrChatGptViewManager.STORAGE_KEY]) {
                        return;
                    }

                    if (document.visibilityState === "hidden" || !this.isChromeExtensionContextAvailable()) {
                        return;
                    }

                    this.scheduleSharedStateRefresh(false);
                });
            } catch (error) {
                if (!this.handleExtensionContextError(error)) {
                    throw error;
                }
            }
        }

        /**
         * Debounces shared-state refreshes.
         *
         * @param {boolean} persistMerged
         * @returns {void}
         */
        scheduleSharedStateRefresh(persistMerged) {
            if (!this.isChromeExtensionContextAvailable()) {
                return;
            }

            window.clearTimeout(this.sharedStateRefreshTimeoutId);

            this.sharedStateRefreshTimeoutId = window.setTimeout(() => {
                this.sharedStateRefreshTimeoutId = 0;

                if (!this.isChromeExtensionContextAvailable()) {
                    return;
                }

                this.syncSharedStateFromStorage(persistMerged).catch(error => {
                    if (this.handleExtensionContextError(error)) {
                        return;
                    }

                    console.error("ChatGPT View Manager shared state sync failed.", error);
                });
            }, 100);
        }

        /**
         * Merges bookmarks, collapsed blocks, and notes from the latest shared storage
         * into this tab's current conversation state.
         *
         * @param {boolean} persistMerged
         * @returns {Promise<void>}
         */
        async syncSharedStateFromStorage(persistMerged) {
            if (!this.persistence || this.isSynchronizingSharedState || !this.isChromeExtensionContextAvailable()) {
                return;
            }

            this.isSynchronizingSharedState = true;

            try {
                const changed = await this.persistence.mergeCurrentConversationFromStorage({
                    persistMerged
                });

                this.syncStateReferences();

                if (!changed) {
                    return;
                }

                this.scheduleDomUpdate(() => {
                    this.applyThemeClass();
                    this.scanner.findBlocks();
                    this.applyCollapsedBlocks();
                    this.render();
                });
            } finally {
                this.isSynchronizingSharedState = false;
            }
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
                this.applyCollapsedBlocks();
                this.render();
            });
        }
        /**
        * Loads persisted state from chrome.storage.local.
        *
        * @returns {Promise<void>}
        */
        async loadState() {
            if (!this.persistence) {
                throw new Error("View Manager persistence has not been initialised.");
            }

            if (!this.isChromeExtensionContextAvailable()) {
                return;
            }

            try {
                await this.persistence.loadState();
                this.syncStateReferences();
            } catch (error) {
                if (!this.handleExtensionContextError(error)) {
                    throw error;
                }
            }
        }
        /**
         * Synchronises manager field references after persistence load/save.
         *
         * @returns {void}
         */
        syncStateReferences() {
            if (!this.persistence) {
                return;
            }

            this.conversationKey = this.persistence.conversationKey;
            this.storageRoot = this.persistence.storageRoot;
            this.state = this.persistence.state;
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
            const url = new URL(window.location.href),
                path = url.pathname.length > 1
                    ? url.pathname.replace(/\/$/, "")
                    : url.pathname;

            return `${url.origin}${path}`;
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
        async saveState(options = {}) {
            if (!this.persistence) {
                throw new Error("View Manager persistence has not been initialised.");
            }

            if (!this.isChromeExtensionContextAvailable()) {
                return;
            }

            try {
                await this.persistence.saveState(this.state, options);
                this.syncStateReferences();
            } catch (error) {
                if (!this.handleExtensionContextError(error)) {
                    throw error;
                }
            }
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
            this.notesManager.setBlockNotes(blockKey, notes);
        }
        /**
         * Gets notes for a conversation block.
         *
         * @param {string | undefined} blockKey
         * @returns {string}
         */
        getBlockNotes(blockKey) {
            return this.notesManager.getBlockNotes(blockKey);
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
         * Gets current interaction state for a conversation block's hover toolbar.
         *
         * @param {HTMLElement} element
         * @returns {{ isCollapsed: boolean, isBookmarked: boolean, hasNotes: boolean }}
         */
        getHoverToolbarState(element) {
            const identity = this.collapsedBlocksManager.getIdentityForElement(element),
                collapsedBlock = this.collapsedBlocksManager.findCollapsedBlockByIdentity(identity),
                bookmark = this.notesManager.findBookmarkForIdentity(identity);

            return {
                isCollapsed: Boolean(collapsedBlock),
                isBookmarked: Boolean(bookmark),
                hasNotes: Boolean(
                    this.notesManager.hasBlockNotes(identity.blockKey)
                    || this.notesManager.hasBookmarkNotes(bookmark)
                    || this.notesManager.hasCollapsedBlockNotes(collapsedBlock)
                )
            };
        }

        /**
         * Adds a bookmark for a specific conversation block.
         *
         * @param {HTMLElement} element
         * @returns {Promise<boolean>}
         */
        async addBookmarkForBlockElement(element) {
            const block = this.collapsedBlocksManager.getConversationBlockForElement(element) || element,
                identity = this.collapsedBlocksManager.getIdentityForElement(element),
                existingBookmark = this.notesManager.findBookmarkForIdentity(identity);

            if (existingBookmark) {
                return false;
            }

            this.highlightPendingBookmark(block);

            try {
                const defaultTitle = this.scanner.getBlockTitle(block),
                    title = await this.showTextInputDialog({
                        title: this.getString("addBookmarkTitle"),
                        label: this.getString("bookmarkTitleLabel"),
                        value: defaultTitle
                    });

                if (!title || (!identity.blockKey && !identity.turnId)) {
                    return false;
                }

                const ViewManagerBookmark = window.MrbrCvm.ViewManagerBookmark;

                this.state.bookmarks.push(new ViewManagerBookmark({
                    id: crypto.randomUUID(),
                    title: this.notesManager.sanitizeTitleText(title),
                    notes: this.notesManager.getBlockNotes(identity.blockKey),
                    turnId: identity.turnId,
                    blockKey: identity.blockKey || identity.turnId || "",
                    blockIndex: identity.blockIndex,
                    role: identity.role,
                    contentHash: identity.contentHash,
                    createdUtc: new Date().toISOString()
                }));

                await this.saveState();
                this.render();

                return true;
            } finally {
                block.classList.remove("mrbr-cvm-pending-bookmark");
            }
        }

        /**
         * Removes the bookmark associated with a conversation block.
         *
         * Block-level notes remain available after bookmark removal.
         *
         * @param {HTMLElement} element
         * @returns {Promise<boolean>}
         */
        async removeBookmarkForBlockElement(element) {
            const identity = this.collapsedBlocksManager.getIdentityForElement(element),
                bookmark = this.notesManager.findBookmarkForIdentity(identity);

            if (!bookmark) {
                return false;
            }

            this.state.bookmarks = this.state.bookmarks.filter(item => item.id !== bookmark.id);
            await this.saveState({ mergeFromStorage: false });
            this.render();

            return true;
        }

        /**
         * Opens the note editor for a specific conversation block.
         *
         * Clearing the note deletes it. Adding a note to an ordinary block creates a
         * bookmark, matching the existing notes behaviour.
         *
         * @param {HTMLElement} element
         * @returns {Promise<void>}
         */
        async editNotesForBlockElement(element) {
            const block = this.collapsedBlocksManager.getConversationBlockForElement(element) || element;

            await this.notesManager.editNotesForBlockElement(block);
            this.syncStateReferences();
            this.applyCollapsedBlocks();
            this.render();
        }

        /**
         * Restores the collapsed block represented by a conversation element.
         *
         * @param {HTMLElement} element
         * @returns {Promise<void>}
         */
        async restoreCollapsedBlockForElement(element) {
            if (this.isBatchUpdatingBlocks) {
                return;
            }

            await this.collapsedBlocksManager.restoreCollapsedBlockForElement(element);
            this.syncStateReferences();
            this.render();
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

            await this.collapsedBlocksManager.collapseBlock(block);
            this.syncStateReferences();
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
                self.hoverToolbar?.refresh();

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

                listsContainerElement.replaceChildren(
                    self.createBookmarksListElement(),
                    self.createCollapsedBlocksListElement()
                );

                self.panelElement.replaceChildren(
                    headerElement,
                    statusElement,
                    self.createToolbarElement(),
                    listsContainerElement
                );
            });
        }
        /**
         * Gets a safe display title for a collapsed block.
         *
         * @param {MrbrCvmCollapsedBlock} collapsedBlock
         * @returns {string}
         */
        getCollapsedBlockTitle(collapsedBlock) {
            return this.collapsedBlocksManager?.getCollapsedBlockTitle(collapsedBlock) || "Collapsed block";
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
                noteButton = this.createNoteIconButton({
                    title: this.getBlockNotesTooltip(collapsedBlock.blockKey),
                    hasNote: this.notesManager.hasCollapsedBlockNotes(collapsedBlock),
                    onClick: async () => {
                        await this.editCollapsedBlockNotes(collapsedBlock);
                    }
                }),
                deleteButton = this.createIconButton({
                    iconName: "delete",
                    title: this.getString("forgetCollapsedBlockAndRestore"),
                    onClick: async () => {
                        this.state.collapsedBlocks = this.state.collapsedBlocks.filter(item => {
                            return item.blockKey !== collapsedBlock.blockKey;
                        });

                        await this.saveState({ mergeFromStorage: false });

                        this.scheduleDomUpdate(() => {
                            this.applyCollapsedBlocks();
                            this.render();
                        });
                    }
                }),
                labelElement = document.createElement("div"),
                key = collapsedBlock.blockKey || `${collapsedBlock.role || "unknown"}-${collapsedBlock.blockIndex || "?"}`;
            const blockNotes = this.notesManager.getCollapsedBlockNotes(collapsedBlock);

            rowElement.className = "mrbr-cvm-compact-row";

            labelElement.className = "mrbr-cvm-compact-row-label";
            labelElement.textContent = title;

            labelElement.title = blockNotes
                ? `${title}\n\n${blockNotes}\n\n${key}`
                : `${title}\n${key}`;

            rowElement.append(goButton, restoreButton, noteButton, deleteButton, labelElement);

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
            return this.collapsedBlocksManager.goToCollapsedBlock(collapsedBlock, reportNotFound);
        }
        /**
         * Creates the toolbar element.
         *
         * @returns {HTMLDivElement}
         */
        createToolbarElement() {
            const toolbarElement = document.createElement("div"),
                leftToolbarElement = document.createElement("div"),
                topButton = this.createIconButton({
                    iconName: "top",
                    title: this.getString("scrollToTop"),
                    onClick: () => {
                        this.scrollChatRootTo(0);
                    }
                }),
                bottomButton = this.createIconButton({
                    iconName: "bottom",
                    title: this.getString("scrollToBottom"),
                    onClick: () => {
                        this.scrollChatRootToBottom();
                    }
                }),
                collapseAllButton = this.createIconButton({
                    iconName: "collapseAll",
                    title: this.getString("collapseAllBlocks"),
                    onClick: async () => {
                        await this.collapseAllBlocks();
                    }
                }),
                expandAllButton = this.createIconButton({
                    iconName: "expandAll",
                    title: this.getString("expandAllBlocks"),
                    onClick: async () => {
                        await this.expandAllBlocks();
                    }
                }),
                filterControlElement = this.createFilterControlElement();

            toolbarElement.className = "mrbr-cvm-toolbar";
            leftToolbarElement.className = "mrbr-cvm-toolbar-left";

            leftToolbarElement.append(
                topButton,
                bottomButton,
                collapseAllButton,
                expandAllButton
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
            this.applyToolbarBusyState(toolbarElement);

            return toolbarElement;
        }

        /**
         * Applies the current batch busy state to all toolbar controls.
         *
         * @param {HTMLElement} toolbarElement
         * @returns {void}
         */
        applyToolbarBusyState(toolbarElement) {
            toolbarElement.classList.toggle(
                "mrbr-cvm-toolbar-busy",
                this.isBatchUpdatingBlocks
            );
            toolbarElement.setAttribute(
                "aria-busy",
                this.isBatchUpdatingBlocks ? "true" : "false"
            );
            toolbarElement.dataset.mrbrCvmBatchBlockCount = String(this.batchUpdateBlockCount);

            toolbarElement.querySelectorAll("button, input, select, textarea").forEach(control => {
                if (
                    control instanceof HTMLButtonElement
                    || control instanceof HTMLInputElement
                    || control instanceof HTMLSelectElement
                    || control instanceof HTMLTextAreaElement
                ) {
                    if (this.isBatchUpdatingBlocks) {
                        if (!control.dataset.mrbrCvmDisabledBeforeBatch) {
                            control.dataset.mrbrCvmDisabledBeforeBatch = control.disabled
                                ? "true"
                                : "false";
                        }

                        control.disabled = true;
                        return;
                    }

                    if (control.dataset.mrbrCvmDisabledBeforeBatch) {
                        control.disabled = control.dataset.mrbrCvmDisabledBeforeBatch === "true";
                        delete control.dataset.mrbrCvmDisabledBeforeBatch;
                    }
                }
            });
        }

        /**
         * Updates the currently rendered toolbar without rebuilding the panel.
         *
         * @returns {void}
         */
        updateToolbarBusyState() {
            const toolbarElement = this.panelElement?.querySelector(".mrbr-cvm-toolbar");

            if (toolbarElement instanceof HTMLElement) {
                this.applyToolbarBusyState(toolbarElement);
            }
        }

        /**
         * Collapses every block in a cached scanner snapshot.
         *
         * @returns {Promise<void>}
         */
        async collapseAllBlocks() {
            await this.runBlockBatchOperation(blocks => {
                return this.collapsedBlocksManager.collapseAllBlocks(blocks);
            });
        }

        /**
         * Expands every block in a cached scanner snapshot.
         *
         * @returns {Promise<void>}
         */
        async expandAllBlocks() {
            await this.runBlockBatchOperation(blocks => {
                return this.collapsedBlocksManager.expandAllBlocks(blocks);
            });
        }

        /**
         * Runs an exclusive block operation against one cached block snapshot.
         *
         * @param {(blocks: HTMLElement[]) => Promise<any>} operation
         * @returns {Promise<void>}
         */
        async runBlockBatchOperation(operation) {
            if (this.isBatchUpdatingBlocks) {
                return;
            }

            const blocks = this.scanner.findBlocks();

            this.isBatchUpdatingBlocks = true;
            this.batchUpdateBlockCount = blocks.length;
            this.updateToolbarBusyState();

            try {
                await operation(blocks);
                this.syncStateReferences();
            } finally {
                this.isBatchUpdatingBlocks = false;
                this.batchUpdateBlockCount = 0;
                this.updateToolbarBusyState();
                this.render();

                if (this.hasPendingMutationRefreshAfterBatch) {
                    this.hasPendingMutationRefreshAfterBatch = false;
                    this.scheduleMutationRefresh();
                }
            }
        }
        /**
         * Restores all collapsed blocks.
         *
         * @returns {Promise<void>}
         */
        async restoreAllCollapsedBlocks() {
            await this.collapsedBlocksManager.restoreAllCollapsedBlocks();
            this.syncStateReferences();
            this.render();
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
            await this.importExport.exportState();
        }
        /**
         * Checks whether a value looks like a version 2 storage root.
         *
         * @param {any} value
         * @returns {boolean}
         */
        isValidStorageRoot(value) {
            return this.persistence?.isValidStorageRoot(value) === true;
        }

        /**
         * Normalises an imported storage root.
         *
         * @param {any} importedRoot
         * @returns {MrbrCvmStorageRoot}
         */
        normalizeStorageRoot(importedRoot) {
            return this.persistence.normalizeStorageRoot(importedRoot);
        }
        /**
        * Imports View Manager state from a JSON file.
        *
        * @returns {Promise<void>}
        */
        async importState() {
            const imported = await this.importExport.importState();

            if (!imported) {
                return;
            }

            this.syncStateReferences();

            this.scheduleDomUpdate(() => {
                this.applyThemeClass();
                this.scanner.findBlocks();
                this.applyCollapsedBlocks();
                this.render();
            });
        }

        /**
         * Prompts the user to choose a JSON file and returns its text.
         *
         * @returns {Promise<string | null>}
         */
        readImportFileText() {
            return this.importExport.readImportFileText();
        }

        /**
         * Creates a safe timestamped export filename.
         *
         * @returns {string}
         */
        createExportFileName() {
            return this.importExport.createExportFileName();
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
                noteButton = this.createNoteIconButton({
                    title: this.notesManager.hasBookmarkNotes(bookmark)
                        ? `${this.getString("hasNotes")}: ${this.notesManager.getBookmarkNotes(bookmark)}`
                        : this.getString("noNotes"),
                    hasNote: this.notesManager.hasBookmarkNotes(bookmark),
                    onClick: async () => {
                        await this.editBookmarkNotes(bookmark);
                    }
                }),
                deleteButton = this.createIconButton({
                    iconName: "delete",
                    title: this.getString("deleteBookmark"),
                    onClick: async () => {
                        this.state.bookmarks = this.state.bookmarks.filter(item => item.id !== bookmark.id);

                        await this.saveState({ mergeFromStorage: false });
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

            rowElement.append(goButton, editButton, noteButton, deleteButton, labelElement);

            return rowElement;
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
         * Scrolls to the current bottom of the ChatGPT conversation.
         *
         * @param {ScrollBehavior} [behavior]
         * @returns {void}
         */
        scrollChatRootToBottom(behavior = "smooth") {
            const scrollRoot = this.getScrollRoot();

            if (!scrollRoot) {
                return;
            }

            this.scrollChatRootTo(scrollRoot.scrollHeight, behavior);
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
                    const block = this.collapsedBlocksManager.findElementForCollapsedBlock(collapsedBlock);

                    if (block) {
                        this.collapsedBlocksManager.restoreCollapsedBlockDomOnlyForElement(block);
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
         * Highlights the visible UI associated with a block while its notes dialog is open.
         * For collapsed content this is the InformationBar rather than hidden block content.
         *
         * @param {HTMLElement} block
         * @returns {HTMLElement}
         */
        highlightNotesTarget(block) {
            const identity = this.collapsedBlocksManager.getIdentityForElement(block),
                informationBars = Array.from(document.querySelectorAll(
                    "[data-mrbr-cvm-information-bar]:not([hidden])"
                )).filter(element => element instanceof HTMLElement),
                matchingInformationBar = informationBars.find(element => {
                    if (!(element instanceof HTMLElement)) {
                        return false;
                    }

                    const blockKey = element.dataset.mrbrCvmBlockKey || "",
                        turnId = element.dataset.mrbrCvmTurnId || "";

                    return (identity.blockKey && blockKey === identity.blockKey)
                        || (identity.turnId && turnId === identity.turnId)
                        || (identity.turnIdContainer && turnId === identity.turnIdContainer);
                }),
                target = matchingInformationBar instanceof HTMLElement
                    ? matchingInformationBar
                    : block;

            this.highlightPendingBookmark(target);
            target.classList.add("mrbr-cvm-notes-highlight-target");
            target.dataset.mrbrCvmNotesHighlightTarget = "true";
            target.dataset.mrbrCvmNotesHighlightType = matchingInformationBar
                ? "information-bar"
                : "conversation-block-fallback";
            target.dataset.mrbrCvmNotesHighlightBlockKey = identity.blockKey || "";
            target.dataset.mrbrCvmNotesHighlightTurnId = identity.turnId
                || identity.turnIdContainer
                || "";

            return target;
        }

        /**
         * Clears note-dialog highlighting and its diagnostic attributes.
         *
         * @param {HTMLElement} target
         * @returns {void}
         */
        clearNotesTargetHighlight(target) {
            target.classList.remove(
                "mrbr-cvm-pending-bookmark",
                "mrbr-cvm-notes-highlight-target"
            );
            delete target.dataset.mrbrCvmNotesHighlightTarget;
            delete target.dataset.mrbrCvmNotesHighlightType;
            delete target.dataset.mrbrCvmNotesHighlightBlockKey;
            delete target.dataset.mrbrCvmNotesHighlightTurnId;
        }

        /**
        * Collapses a specific conversation block.
        *
        * @param {HTMLElement} block
        * @returns {Promise<void>}
        */
        async collapseBlock(block) {
            if (this.isBatchUpdatingBlocks) {
                return;
            }

            await this.collapsedBlocksManager.collapseBlock(block);
            this.syncStateReferences();
            this.render();
        }
        /**
         * Applies collapsed state to all matching blocks.
         *
         * @param {HTMLElement[]=} blocks
         * @returns {void}
         */
        applyCollapsedBlocks(blocks) {
            this.collapsedBlocksManager.applyPersistedCollapsedBlocks(blocks);
        }

        /**
         * Restores a collapsed block.
         *
         * @param {MrbrCvmCollapsedBlock} collapsedBlock
         * @returns {Promise<void>}
         */
        async restoreCollapsedBlock(collapsedBlock) {
            if (this.isBatchUpdatingBlocks) {
                return;
            }

            await this.collapsedBlocksManager.restoreCollapsedBlock(collapsedBlock);
            this.syncStateReferences();
            this.render();
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
            if (this.isBatchUpdatingBlocks) {
                this.hasPendingMutationRefreshAfterBatch = true;
                return;
            }

            window.clearTimeout(this.mutationRefreshTimeoutId);

            this.mutationRefreshTimeoutId = window.setTimeout(() => {
                this.mutationRefreshTimeoutId = 0;

                this.scheduleDomUpdate(() => {
                    const blocks = this.scanner.findBlocks();

                    this.applyCollapsedBlocks(blocks);
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
         * Creates a note icon button and applies the active-note CSS classes when needed.
         *
         * @param {{ title: string, hasNote: boolean, onClick: (event: MouseEvent) => void | Promise<void> }} options
         * @returns {HTMLButtonElement}
         */
        createNoteIconButton(options) {
            const button = this.createIconButton({
                iconName: "note",
                title: options.title,
                onClick: options.onClick
            });

            button.classList.add("mrbr-cvm-note-button");

            if (options.hasNote) {
                button.classList.add("mrbr-cvm-note-button-active", "mrbr-cvm-has-note");
                button.setAttribute("aria-pressed", "true");
            } else {
                button.setAttribute("aria-pressed", "false");
            }

            return button;
        }

        /**
         * Opens the note-only editor for a bookmark.
         *
         * @param {MrbrCvmBookmark} bookmark
         * @returns {Promise<void>}
         */
        async editBookmarkNotes(bookmark) {
            await this.notesManager.editBookmarkNotes(bookmark);
            this.syncStateReferences();
            this.render();
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

            this.panelElement.classList.add("mrbr-cvm-panel-collapsed");

            const expandButton = this.createIconButton({
                iconName: "expandPanel",
                title: this.getString("expandViewManager"),
                onClick: () => {
                    this.togglePanelCollapsed();
                }
            });

            this.panelElement.replaceChildren(expandButton);
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

            existingBookmark.title = this.notesManager.sanitizeTitleText(result.title);
            this.notesManager.setBookmarkNotes(existingBookmark, result.notes);

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
            await this.notesManager.editCollapsedBlockNotes(collapsedBlock);
            this.syncStateReferences();
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
