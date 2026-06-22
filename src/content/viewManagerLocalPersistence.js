(() => {
    "use strict";

    window.MrbrCvm = window.MrbrCvm || {};

    /**
     * UI state for the View Manager overlay.
     */
    class ViewManagerUiState {
        /**
         * @param {Partial<ViewManagerUiState>} [ui]
         */
        constructor(ui = {}) {
            this.theme = ui.theme === "dark" || ui.theme === "light" || ui.theme === "auto"
                ? ui.theme
                : "auto";
            this.isPanelCollapsed = ui.isPanelCollapsed === true;
            this.collapsedSections = {
                bookmarks: ui.collapsedSections?.bookmarks === true,
                collapsedBlocks: ui.collapsedSections?.collapsedBlocks === true
            };
        }

        /**
         * @returns {ViewManagerUiState}
         */
        static createDefault() {
            return new ViewManagerUiState();
        }
    }

    /**
     * Shared notes for a conversation block.
     */
    class ViewManagerBlockNote {
        /**
         * @param {{ blockKey?: string, notes?: string, updatedUtc?: string }} [note]
         */
        constructor(note = {}) {
            this.blockKey = typeof note.blockKey === "string" ? note.blockKey : "";
            this.notes = typeof note.notes === "string" ? note.notes : "";
            this.updatedUtc = typeof note.updatedUtc === "string"
                ? note.updatedUtc
                : new Date().toISOString();
        }
    }

    /**
     * Bookmark record persisted for a conversation.
     */
    class ViewManagerBookmark {
        /**
         * @param {any} [bookmark]
         */
        constructor(bookmark = {}) {
            this.id = typeof bookmark.id === "string" && bookmark.id
                ? bookmark.id
                : crypto.randomUUID();
            this.title = typeof bookmark.title === "string" ? bookmark.title : "";
            this.notes = typeof bookmark.notes === "string" ? bookmark.notes : "";
            this.turnId = typeof bookmark.turnId === "string" ? bookmark.turnId : undefined;
            this.blockKey = typeof bookmark.blockKey === "string" ? bookmark.blockKey : "";
            this.blockIndex = typeof bookmark.blockIndex === "number" ? bookmark.blockIndex : undefined;
            this.role = typeof bookmark.role === "string" ? bookmark.role : undefined;
            this.contentHash = typeof bookmark.contentHash === "string" ? bookmark.contentHash : undefined;
            this.createdUtc = typeof bookmark.createdUtc === "string"
                ? bookmark.createdUtc
                : new Date().toISOString();
            this.updatedUtc = typeof bookmark.updatedUtc === "string"
                ? bookmark.updatedUtc
                : undefined;
        }
    }

    /**
     * Collapsed block record persisted for a conversation.
     *
     * The storage shape stays compatible with the existing version 2 state. Values from
     * the development-only CollapsedBlockInfo shape are accepted during normalisation.
     */
    class ViewManagerCollapsedBlock {
        /**
         * @param {any} [collapsedBlock]
         */
        constructor(collapsedBlock = {}) {
            this.turnId = typeof collapsedBlock.turnId === "string" ? collapsedBlock.turnId : undefined;
            this.turnIdContainer = typeof collapsedBlock.turnIdContainer === "string"
                ? collapsedBlock.turnIdContainer
                : undefined;
            this.blockKey = typeof collapsedBlock.blockKey === "string"
                ? collapsedBlock.blockKey
                : this.turnId || this.turnIdContainer || "";
            this.blockIndex = typeof collapsedBlock.blockIndex === "number" ? collapsedBlock.blockIndex : undefined;
            this.role = typeof collapsedBlock.role === "string" ? collapsedBlock.role : undefined;
            this.contentHash = typeof collapsedBlock.contentHash === "string" ? collapsedBlock.contentHash : undefined;
            this.title = typeof collapsedBlock.title === "string"
                ? collapsedBlock.title
                : typeof collapsedBlock.label === "string"
                    ? collapsedBlock.label
                    : "";
            this.notes = typeof collapsedBlock.notes === "string" ? collapsedBlock.notes : "";
            this.collapsedUtc = typeof collapsedBlock.collapsedUtc === "string"
                ? collapsedBlock.collapsedUtc
                : typeof collapsedBlock.timestamp === "string"
                    ? collapsedBlock.timestamp
                    : new Date().toISOString();
            this.updatedUtc = typeof collapsedBlock.updatedUtc === "string"
                ? collapsedBlock.updatedUtc
                : undefined;
        }

        /**
         * Creates a persistent collapsed-block record from a scanner identity.
         *
         * @param {{ turnId?: string, turnIdContainer?: string, blockKey?: string, blockIndex?: number, role?: string, contentHash?: string }} identity
         * @param {string} title
         * @param {string} [notes]
         * @returns {ViewManagerCollapsedBlock}
         */
        static fromBlock(identity, title, notes = "") {
            return new ViewManagerCollapsedBlock({
                turnId: identity.turnId,
                turnIdContainer: identity.turnIdContainer || identity.turnId,
                blockKey: identity.blockKey || identity.turnId || identity.turnIdContainer || "",
                blockIndex: identity.blockIndex,
                role: identity.role,
                contentHash: identity.contentHash,
                title,
                notes,
                collapsedUtc: new Date().toISOString()
            });
        }

        /**
         * Creates a persistent collapsed-block record from the earlier development shape.
         *
         * @param {{ conversationId?: string, turnIdContainer?: string, turnId?: string, label?: string, timestamp?: string }} info
         * @returns {ViewManagerCollapsedBlock}
         */
        static fromCollapsedBlockInfo(info) {
            return new ViewManagerCollapsedBlock(info);
        }
    }

    /**
     * Per-conversation state.
     */
    class ViewManagerConversationState {
        /**
         * @returns {{ bookmarks: ViewManagerBookmark[], collapsedBlocks: ViewManagerCollapsedBlock[], blockNotes: Record<string, ViewManagerBlockNote> }}
         */
        toJSON() {
            return {
                bookmarks: this.bookmarks,
                collapsedBlocks: this.collapsedBlocks,
                blockNotes: this.blockNotes
            };
        }

        /**
         * @param {any} [conversationState]
         */
        constructor(conversationState = {}) {
            /** @type {Record<string, ViewManagerBlockNote>} */
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

                    const blockNote = new ViewManagerBlockNote({
                        ...value,
                        blockKey
                    });

                    if (!blockNote.notes) {
                        return;
                    }

                    blockNotes[blockKey] = blockNote;
                });
            }

            this.bookmarks = Array.isArray(conversationState?.bookmarks)
                ? conversationState.bookmarks.map(bookmark => new ViewManagerBookmark(bookmark))
                : [];

            this.collapsedBlocks = Array.isArray(conversationState?.collapsedBlocks)
                ? conversationState.collapsedBlocks.map(collapsedBlock => {
                    const normalisedCollapsedBlock = new ViewManagerCollapsedBlock(collapsedBlock);

                    if (
                        normalisedCollapsedBlock.blockKey
                        && normalisedCollapsedBlock.notes
                        && !blockNotes[normalisedCollapsedBlock.blockKey]
                    ) {
                        blockNotes[normalisedCollapsedBlock.blockKey] = new ViewManagerBlockNote({
                            blockKey: normalisedCollapsedBlock.blockKey,
                            notes: normalisedCollapsedBlock.notes,
                            updatedUtc: normalisedCollapsedBlock.updatedUtc
                                || normalisedCollapsedBlock.collapsedUtc
                        });
                    }

                    return normalisedCollapsedBlock;
                })
                : [];

            this.blockNotes = blockNotes;
        }

        /**
         * @returns {ViewManagerConversationState}
         */
        static createEmpty() {
            return new ViewManagerConversationState();
        }
    }

    /**
     * Versioned root state saved to chrome.storage.local.
     */
    class ViewManagerStorageRoot {
        /**
         * @returns {{ version: number, globalUi: ViewManagerUiState, conversations: Record<string, ViewManagerConversationState> }}
         */
        toJSON() {
            return {
                version: this.version,
                globalUi: this.globalUi,
                conversations: this.conversations
            };
        }

        /**
         * @param {any} [root]
         */
        constructor(root = {}) {
            /** @type {Record<string, ViewManagerConversationState>} */
            const conversations = {};

            Object.entries(root.conversations || {}).forEach(([conversationKey, conversationState]) => {
                conversations[conversationKey] = new ViewManagerConversationState(conversationState);
            });

            this.version = 2;
            this.globalUi = new ViewManagerUiState(root.globalUi || root.ui);
            this.conversations = conversations;
        }
    }

    /**
     * Handles local Chrome persistence and state normalisation for View Manager.
     */
    class ViewManagerLocalPersistence {
        /**
         * @param {{ storageKey: string }} options
         */
        constructor(options) {
            if (!options?.storageKey) {
                throw new Error("ViewManagerLocalPersistence requires a storageKey.");
            }

            this.storageKey = options.storageKey;
            this.conversationKey = "";
            this.storageRoot = new ViewManagerStorageRoot();
            this.state = ViewManagerConversationState.createEmpty();
            this.attachUiState(this.state);
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
         * @returns {ViewManagerUiState}
         */
        createDefaultUiState() {
            return ViewManagerUiState.createDefault();
        }

        /**
         * @returns {ViewManagerConversationState}
         */
        createEmptyConversationState() {
            return ViewManagerConversationState.createEmpty();
        }

        /**
         * @param {any} ui
         * @returns {ViewManagerUiState}
         */
        normalizeUiState(ui) {
            return new ViewManagerUiState(ui);
        }

        /**
         * @param {any} conversationState
         * @returns {ViewManagerConversationState}
         */
        normalizeConversationState(conversationState) {
            return new ViewManagerConversationState(conversationState);
        }

        /**
         * @param {any} importedRoot
         * @returns {ViewManagerStorageRoot}
         */
        normalizeStorageRoot(importedRoot) {
            return new ViewManagerStorageRoot(importedRoot);
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
         * Reads the raw saved root and converts old single-conversation state if necessary.
         *
         * @returns {Promise<ViewManagerStorageRoot>}
         */
        async readStorageRoot() {
            const result = await chrome.storage.local.get(this.storageKey),
                savedState = result[this.storageKey];

            if (!savedState || typeof savedState !== "object") {
                return new ViewManagerStorageRoot({
                    version: 2,
                    globalUi: this.createDefaultUiState(),
                    conversations: {}
                });
            }

            if (this.isValidStorageRoot(savedState)) {
                return this.normalizeStorageRoot(savedState);
            }

            return new ViewManagerStorageRoot({
                version: 2,
                globalUi: this.normalizeUiState(savedState.ui),
                conversations: {
                    [this.getConversationKey()]: this.normalizeConversationState(savedState)
                }
            });
        }

        /**
         * Loads persisted state from chrome.storage.local.
         *
         * @returns {Promise<ViewManagerConversationState & { ui: ViewManagerUiState }>}
         */
        async loadState() {
            this.conversationKey = this.getConversationKey();
            this.storageRoot = await this.readStorageRoot();

            const conversationState = this.storageRoot.conversations[this.conversationKey]
                || this.createEmptyConversationState();

            return this.setCurrentConversationState(conversationState);
        }

        /**
         * Sets the active conversation state and attaches the shared UI state.
         *
         * @param {ViewManagerConversationState} conversationState
         * @returns {ViewManagerConversationState & { ui: ViewManagerUiState }}
         */
        setCurrentConversationState(conversationState) {
            this.storageRoot.conversations[this.conversationKey] = conversationState;
            this.state = conversationState;
            this.attachUiState(this.state);

            return this.state;
        }

        /**
         * Attaches global UI state to a conversation state without persisting it inside the conversation.
         *
         * @param {ViewManagerConversationState} conversationState
         * @returns {void}
         */
        attachUiState(conversationState) {
            Object.defineProperty(conversationState, "ui", {
                value: this.storageRoot.globalUi,
                writable: true,
                configurable: true,
                enumerable: false
            });
        }

        /**
         * @param {any} value
         * @returns {number}
         */
        getTimeValue(value) {
            if (typeof value !== "string") {
                return 0;
            }

            const time = Date.parse(value);

            return Number.isFinite(time) ? time : 0;
        }

        /**
         * @param {any} item
         * @returns {number}
         */
        getItemFreshness(item) {
            return Math.max(
                this.getTimeValue(item?.updatedUtc),
                this.getTimeValue(item?.createdUtc),
                this.getTimeValue(item?.collapsedUtc),
                this.getTimeValue(item?.timestamp)
            );
        }

        /**
         * @param {any} existingItem
         * @param {any} incomingItem
         * @returns {any}
         */
        choosePreferredItem(existingItem, incomingItem) {
            if (!existingItem) {
                return incomingItem;
            }

            if (!incomingItem) {
                return existingItem;
            }

            return this.getItemFreshness(incomingItem) >= this.getItemFreshness(existingItem)
                ? {
                    ...existingItem,
                    ...incomingItem
                }
                : {
                    ...incomingItem,
                    ...existingItem
                };
        }

        /**
         * @param {ViewManagerBookmark} bookmark
         * @returns {string}
         */
        getBookmarkMergeKey(bookmark) {
            return bookmark.id
                || bookmark.blockKey
                || bookmark.contentHash
                || bookmark.turnId
                || `${bookmark.role || "unknown"}:${bookmark.blockIndex ?? ""}`;
        }

        /**
         * @param {ViewManagerCollapsedBlock} collapsedBlock
         * @returns {string}
         */
        getCollapsedBlockMergeKey(collapsedBlock) {
            return collapsedBlock.blockKey
                || collapsedBlock.contentHash
                || collapsedBlock.turnId
                || collapsedBlock.turnIdContainer
                || `${collapsedBlock.role || "unknown"}:${collapsedBlock.blockIndex ?? ""}`;
        }

        /**
         * @template T
         * @param {T[]} firstItems
         * @param {T[]} secondItems
         * @param {(item: T) => string} getKey
         * @param {(item: any) => T} createItem
         * @returns {T[]}
         */
        mergeArrayByKey(firstItems, secondItems, getKey, createItem) {
            /** @type {Map<string, T>} */
            const itemsByKey = new Map();

            [...firstItems, ...secondItems].forEach(item => {
                const normalisedItem = createItem(item),
                    key = getKey(normalisedItem);

                if (!key) {
                    return;
                }

                itemsByKey.set(key, this.choosePreferredItem(itemsByKey.get(key), normalisedItem));
            });

            return [...itemsByKey.values()];
        }

        /**
         * @param {Record<string, ViewManagerBlockNote>} firstNotes
         * @param {Record<string, ViewManagerBlockNote>} secondNotes
         * @returns {Record<string, ViewManagerBlockNote>}
         */
        mergeBlockNotes(firstNotes, secondNotes) {
            /** @type {Record<string, ViewManagerBlockNote>} */
            const mergedNotes = {};

            [firstNotes, secondNotes].forEach(notes => {
                Object.entries(notes || {}).forEach(([blockKey, note]) => {
                    const normalisedNote = new ViewManagerBlockNote({
                        ...note,
                        blockKey
                    });

                    if (!normalisedNote.notes) {
                        return;
                    }

                    const existingNote = mergedNotes[blockKey];

                    mergedNotes[blockKey] = this.getItemFreshness(normalisedNote) >= this.getItemFreshness(existingNote)
                        ? normalisedNote
                        : existingNote;
                });
            });

            return mergedNotes;
        }

        /**
         * Merges two conversation states for the same conversation.
         *
         * @param {any} persistedConversationState
         * @param {any} localConversationState
         * @returns {ViewManagerConversationState}
         */
        mergeConversationStates(persistedConversationState, localConversationState) {
            const persistedState = this.normalizeConversationState(persistedConversationState),
                localState = this.normalizeConversationState(localConversationState);

            return new ViewManagerConversationState({
                bookmarks: this.mergeArrayByKey(
                    persistedState.bookmarks,
                    localState.bookmarks,
                    bookmark => this.getBookmarkMergeKey(bookmark),
                    bookmark => new ViewManagerBookmark(bookmark)
                ),
                collapsedBlocks: this.mergeArrayByKey(
                    persistedState.collapsedBlocks,
                    localState.collapsedBlocks,
                    collapsedBlock => this.getCollapsedBlockMergeKey(collapsedBlock),
                    collapsedBlock => new ViewManagerCollapsedBlock(collapsedBlock)
                ),
                blockNotes: this.mergeBlockNotes(persistedState.blockNotes, localState.blockNotes)
            });
        }

        /**
         * Merges this tab's current conversation state with the latest shared persisted state.
         *
         * @param {{ persistMerged?: boolean }} [options]
         * @returns {Promise<boolean>} True when the merged state differs from this tab's previous state.
         */
        async mergeCurrentConversationFromStorage(options = {}) {
            this.conversationKey = this.getConversationKey();

            const previousStateJson = JSON.stringify(this.state),
                localState = this.normalizeConversationState(this.state),
                persistedRoot = await this.readStorageRoot(),
                persistedConversationState = persistedRoot.conversations[this.conversationKey] || this.createEmptyConversationState(),
                mergedConversationState = this.mergeConversationStates(persistedConversationState, localState);

            persistedRoot.conversations[this.conversationKey] = mergedConversationState;
            persistedRoot.globalUi = new ViewManagerUiState(this.state?.ui || persistedRoot.globalUi);
            this.storageRoot = persistedRoot;
            this.setCurrentConversationState(mergedConversationState);

            if (options.persistMerged === true) {
                await chrome.storage.local.set({
                    [this.storageKey]: this.storageRoot
                });
            }

            return JSON.stringify(this.state) !== previousStateJson;
        }

        /**
         * Saves the current state to chrome.storage.local.
         *
         * By default this merges with the latest stored version first so another tab's
         * additions are not overwritten by this tab's older in-memory copy. Pass
         * mergeFromStorage:false for deliberate destructive changes such as delete or restore.
         *
         * @param {ViewManagerConversationState & { ui?: ViewManagerUiState }} [state]
         * @param {{ mergeFromStorage?: boolean }} [options]
         * @returns {Promise<void>}
         */
        async saveState(state = this.state, options = {}) {
            this.conversationKey = this.getConversationKey();

            if (state) {
                this.state = state;
            }

            const shouldMergeFromStorage = options.mergeFromStorage !== false,
                latestRoot = await this.readStorageRoot(),
                currentConversationState = new ViewManagerConversationState({
                    bookmarks: this.state.bookmarks,
                    collapsedBlocks: this.state.collapsedBlocks,
                    blockNotes: this.state.blockNotes
                }),
                nextConversationState = shouldMergeFromStorage
                    ? this.mergeConversationStates(
                        latestRoot.conversations[this.conversationKey] || this.createEmptyConversationState(),
                        currentConversationState
                    )
                    : currentConversationState;

            latestRoot.globalUi = new ViewManagerUiState(this.state.ui || this.storageRoot.globalUi || latestRoot.globalUi);
            latestRoot.conversations[this.conversationKey] = nextConversationState;
            this.storageRoot = latestRoot;
            this.setCurrentConversationState(nextConversationState);

            await chrome.storage.local.set({
                [this.storageKey]: this.storageRoot
            });
        }

        /**
         * Replaces all stored View Manager state with an imported root.
         *
         * @param {any} importedRoot
         * @returns {Promise<void>}
         */
        async replaceStorageRoot(importedRoot) {
            this.storageRoot = this.normalizeStorageRoot(importedRoot);

            await chrome.storage.local.set({
                [this.storageKey]: this.storageRoot
            });

            await this.loadState();
        }
    }

    window.MrbrCvm.ViewManagerUiState = ViewManagerUiState;
    window.MrbrCvm.ViewManagerBlockNote = ViewManagerBlockNote;
    window.MrbrCvm.ViewManagerBookmark = ViewManagerBookmark;
    window.MrbrCvm.ViewManagerCollapsedBlock = ViewManagerCollapsedBlock;
    window.MrbrCvm.ViewManagerConversationState = ViewManagerConversationState;
    window.MrbrCvm.ViewManagerStorageRoot = ViewManagerStorageRoot;
    window.MrbrCvm.ViewManagerLocalPersistence = ViewManagerLocalPersistence;
})();
