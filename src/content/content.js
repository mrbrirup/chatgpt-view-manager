(() => {
    "use strict";

    const ConversationScanner = window.MrbrCvm.ConversationScanner;

    const MrbrChatGptViewManager = class {
        static PANEL_ID = "mrbr-cvm-panel";
        static STORAGE_KEY = "mrbrChatGptViewManagerState";

        /**
         * @type {HTMLDivElement | null}
         */
        panelElement = null;

        /**
         * @type {InstanceType<typeof ConversationScanner>}
         */
        scanner = new ConversationScanner();

        /**
         * @type {{
         *     bookmarks: Array<{ id: string, title: string, blockKey: string, blockIndex?: number, role?: string, contentHash?: string, createdUtc: string }>,
         *     collapsedBlocks: Array<{ blockKey: string, blockIndex?: number, role?: string, contentHash?: string, title: string, collapsedUtc: string }>
         * }}
         */
        state = {
            bookmarks: [],
            collapsedBlocks: []
        };

        /**
         * @type {HTMLElement | null}
         */
        pendingCollapseBlock = null;

        /**
         * Starts the extension content script.
         *
         * @returns {Promise<void>}
         */
        async start() {
            await this.loadState();
            this.scanner.findBlocks();
            this.createPanel();
            this.render();
            this.startMutationObserver();
        }

        /**
         * Loads persisted state from chrome.storage.local.
         *
         * @returns {Promise<void>}
         */
        async loadState() {
            const result = await chrome.storage.local.get(MrbrChatGptViewManager.STORAGE_KEY);
            const savedState = result[MrbrChatGptViewManager.STORAGE_KEY];

            if (savedState && typeof savedState === "object") {
                this.state = {
                    bookmarks: Array.isArray(savedState.bookmarks)
                        ? savedState.bookmarks
                        : [],
                    collapsedBlocks: Array.isArray(savedState.collapsedBlocks)
                        ? savedState.collapsedBlocks
                        : []
                };
            }
        }

        /**
         * Saves current state to chrome.storage.local.
         *
         * @returns {Promise<void>}
         */
        async saveState() {
            await chrome.storage.local.set({
                [MrbrChatGptViewManager.STORAGE_KEY]: this.state
            });
        }

        /**
         * Creates the floating panel.
         *
         * @returns {void}
         */
        createPanel() {
            const existingPanel = document.getElementById(MrbrChatGptViewManager.PANEL_ID);

            if (existingPanel) {
                existingPanel.remove();
            }

            this.panelElement = document.createElement("div");
            this.panelElement.id = MrbrChatGptViewManager.PANEL_ID;
            this.panelElement.className = "mrbr-cvm-panel";

            document.documentElement.appendChild(this.panelElement);
        }
        /**
         * Collapses the currently visible conversation block.
         *
         * @returns {Promise<void>}
         */
        async collapseVisibleBlock() {
            const block = this.findBestVisibleBlock();

            if (!block) {
                alert("No visible conversation block was found.");
                return;
            }

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
                    blockKey: identity.blockKey,
                    blockIndex: identity.blockIndex,
                    role: identity.role,
                    contentHash: identity.contentHash,
                    title,
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
            if (!this.panelElement) {
                return;
            }

            this.panelElement.innerHTML = "";

            const titleElement = document.createElement("h2"),
                statusElement = document.createElement("div"),
                actionsElement = document.createElement("div"),
                addBookmarkButton = document.createElement("button"),
                collapseVisibleButton = document.createElement("button"),
                restoreAllButton = document.createElement("button"),
                rescanButton = document.createElement("button"),
                topButton = document.createElement("button"),
                bookmarkListElement = document.createElement("div"),
                blocks = this.scanner.findBlocks();





            titleElement.textContent = "View Manager";

            statusElement.className = "mrbr-cvm-status";
            statusElement.textContent = `${blocks.length} blocks detected`;

            actionsElement.className = "mrbr-cvm-actions";

            addBookmarkButton.type = "button";
            collapseVisibleButton.textContent = "Collapse Highlighted";
            collapseVisibleButton.addEventListener("mouseenter", this.highlightCollapseTarget.bind(this));
            collapseVisibleButton.addEventListener("mouseleave", this.clearCollapseTargetHighlight.bind(this));
            collapseVisibleButton.addEventListener("click", this.collapseHighlightedBlock.bind(this));


            addBookmarkButton.type = "button";
            addBookmarkButton.textContent = "Bookmark visible";
            addBookmarkButton.addEventListener("click", this.addBookmarkForVisibleBlock.bind(this));

            collapseVisibleButton.type = "button";
            collapseVisibleButton.textContent = "Collapse visible";
            collapseVisibleButton.addEventListener("click", this.collapseVisibleBlock.bind(this));

            restoreAllButton.type = "button";
            restoreAllButton.textContent = "Restore all";
            restoreAllButton.addEventListener("click", this.restoreAllBlocks.bind(this));


            rescanButton.type = "button";
            rescanButton.textContent = "Rescan";
            rescanButton.addEventListener("click", () => {
                this.scanner.findBlocks();
                this.render();
            });

            topButton.type = "button";
            topButton.textContent = "Top";
            topButton.addEventListener("click", () => {
                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });
            });

            bookmarkListElement.className = "mrbr-cvm-bookmarks";

            for (const bookmark of this.state.bookmarks) {
                bookmarkListElement.appendChild(this.createBookmarkElement(bookmark));
            }

            actionsElement.append(addBookmarkButton, collapseVisibleButton, restoreAllButton, rescanButton, topButton);
            this.panelElement.append(titleElement, statusElement, actionsElement, bookmarkListElement);
            this.applyCollapsedBlocks();
        }

        /**
         * Creates a bookmark row.
         *
         * @param {{ id: string, title: string, blockKey: string, createdUtc: string }} bookmark
         * @returns {HTMLDivElement}
         */
        createBookmarkElement(bookmark) {
            const containerElement = document.createElement("div"),
                titleElement = document.createElement("div"),
                blockKeyElement = document.createElement("div"),
                buttonRowElement = document.createElement("div"),
                goButton = document.createElement("button"),
                deleteButton = document.createElement("button");

            containerElement.className = "mrbr-cvm-bookmark";

            titleElement.className = "mrbr-cvm-bookmark-title";
            titleElement.title = bookmark.title;
            titleElement.textContent = bookmark.title;

            blockKeyElement.className = "mrbr-cvm-bookmark-key";
            blockKeyElement.textContent = bookmark.blockKey || `${bookmark.role || "unknown"}-${bookmark.blockIndex || "?"}`;

            buttonRowElement.className = "mrbr-cvm-actions";

            goButton.type = "button";
            goButton.textContent = "Go";
            goButton.addEventListener("click", () => {
                this.goToBookmark(bookmark);
            });

            deleteButton.type = "button";
            deleteButton.textContent = "Delete";
            deleteButton.addEventListener("click", async () => {
                this.state.bookmarks = this.state.bookmarks.filter(item => item.id !== bookmark.id);
                await this.saveState();
                this.render();
            });

            buttonRowElement.append(goButton, deleteButton);
            containerElement.append(titleElement, blockKeyElement, buttonRowElement);

            return containerElement;
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
                    title: "Add bookmark",
                    label: "Bookmark title",
                    value: defaultTitle
                });

            if (!title || !identity.blockKey) {
                block.classList.remove("mrbr-cvm-pending-bookmark");
                return;
            }

            this.state.bookmarks.push({
                id: crypto.randomUUID(),
                title,
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
         * @param {{ id: string, title: string, blockKey?: string, blockIndex?: number, role?: string, contentHash?: string, createdUtc: string }} bookmark
         * @returns {void}
         */
        goToBookmark(bookmark) {
            this.scanner.findBlocks();

            const block = this.scanner.findBlockForBookmark(bookmark);

            if (!block) {
                alert(`Could not find bookmark "${bookmark.title}". Try rescanning after the page has fully loaded.`);
                return;
            }

            const matchingCollapsedBlock = this.state.collapsedBlocks.find(item => {
                return item.blockKey === bookmark.blockKey
                    || item.contentHash === bookmark.contentHash;
            });

            if (matchingCollapsedBlock) {
                this.state.collapsedBlocks = this.state.collapsedBlocks.filter(item => {
                    return item.blockKey !== matchingCollapsedBlock.blockKey;
                });

                const placeholder = this.findCollapsePlaceholder(matchingCollapsedBlock);

                if (placeholder) {
                    placeholder.remove();
                }

                block.classList.remove("mrbr-cvm-collapsed-block");
                this.saveState();
            }

            block.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            this.flashBlock(block);
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
            block.classList.add("mrbr-cvm-flash");

            window.setTimeout(() => {
                block.classList.remove("mrbr-cvm-flash");
            }, 1200);
        }

        /**
         * Watches for ChatGPT adding/replacing conversation content.
         *
         * @returns {void}
         */
        startMutationObserver() {
            let pendingAnimationFrame = 0;

            const observer = new MutationObserver(() => {
                if (pendingAnimationFrame) {
                    return;
                }

                pendingAnimationFrame = requestAnimationFrame(() => {
                    pendingAnimationFrame = 0;
                    this.scanner.findBlocks();
                    this.applyCollapsedBlocks();

                    if (this.panelElement) {
                        const statusElement = this.panelElement.querySelector(".mrbr-cvm-status"),
                            blockCount = this.scanner.findBlocks().length;

                        if (statusElement) {
                            statusElement.textContent = `${blockCount} blocks detected`;
                        }
                    }
                });
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
            document
                .querySelectorAll(".mrbr-cvm-pending-bookmark")
                .forEach(element => element.classList.remove("mrbr-cvm-pending-bookmark"));

            block.classList.add("mrbr-cvm-pending-bookmark");
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
            block.classList.add("mrbr-cvm-collapse-target");
        }

        /**
         * Clears the pending collapse target highlight.
         *
         * @returns {void}
         */
        clearCollapseTargetHighlight() {
            document
                .querySelectorAll(".mrbr-cvm-collapse-target")
                .forEach(element => element.classList.remove("mrbr-cvm-collapse-target"));

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
                alert("No highlighted conversation block was found.");
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
                    blockKey: identity.blockKey,
                    blockIndex: identity.blockIndex,
                    role: identity.role,
                    contentHash: identity.contentHash,
                    title,
                    collapsedUtc: new Date().toISOString()
                });
            }

            this.clearCollapseTargetHighlight();

            await this.saveState();
            this.applyCollapsedBlocks();
            this.render();
            this.clearCollapseTargetHighlight();
        }
        /**
         * Applies collapsed state to all matching blocks.
         *
         * @returns {void}
         */
        applyCollapsedBlocks() {
            this.scanner.findBlocks();
            this.removeOrphanedCollapsePlaceholders();

            for (const collapsedBlock of this.state.collapsedBlocks) {
                const block = this.scanner.findBlockForBookmark(collapsedBlock);

                if (!block) {
                    continue;
                }

                this.collapseBlockElement(block, collapsedBlock);
            }
        }

        /**
         * Collapses a single block element and creates its placeholder.
         *
         * @param {HTMLElement} block
         * @param {{ blockKey: string, blockIndex?: number, role?: string, contentHash?: string, title: string, collapsedUtc: string }} collapsedBlock
         * @returns {void}
         */
        collapseBlockElement(block, collapsedBlock) {
            const existingPlaceholder = this.findCollapsePlaceholder(collapsedBlock);

            block.classList.add("mrbr-cvm-collapsed-block");

            if (existingPlaceholder) {
                return;
            }

            const placeholderElement = this.createCollapsePlaceholder(collapsedBlock);

            block.insertAdjacentElement("beforebegin", placeholderElement);
        }

        /**
         * Creates a collapsed block placeholder.
         *
         * @param {{ blockKey: string, blockIndex?: number, role?: string, contentHash?: string, title: string, collapsedUtc: string }} collapsedBlock
         * @returns {HTMLDivElement}
         */
        createCollapsePlaceholder(collapsedBlock) {
            const containerElement = document.createElement("div"),
                titleElement = document.createElement("div"),
                metaElement = document.createElement("div"),
                restoreButton = document.createElement("button");

            containerElement.className = "mrbr-cvm-collapsed-placeholder";
            containerElement.setAttribute("data-mrbr-cvm-placeholder-key", collapsedBlock.blockKey);

            titleElement.className = "mrbr-cvm-collapsed-title";
            titleElement.title = collapsedBlock.title;
            titleElement.textContent = `Collapsed: ${collapsedBlock.title}`;

            metaElement.className = "mrbr-cvm-collapsed-meta";
            metaElement.textContent = collapsedBlock.blockKey;

            restoreButton.type = "button";
            restoreButton.textContent = "Restore";
            restoreButton.addEventListener("click", async () => {
                await this.restoreCollapsedBlock(collapsedBlock);
            });

            containerElement.append(titleElement, metaElement, restoreButton);

            return containerElement;
        }

        /**
         * Finds an existing collapse placeholder.
         *
         * @param {{ blockKey: string }} collapsedBlock
         * @returns {HTMLElement | null}
         */
        findCollapsePlaceholder(collapsedBlock) {
            return document.querySelector(
                `[data-mrbr-cvm-placeholder-key="${CSS.escape(collapsedBlock.blockKey)}"]`
            );
        }

        /**
         * Restores one collapsed block.
         *
         * @param {{ blockKey: string, blockIndex?: number, role?: string, contentHash?: string, title: string, collapsedUtc: string }} collapsedBlock
         * @returns {Promise<void>}
         */
        async restoreCollapsedBlock(collapsedBlock) {
            const block = this.scanner.findBlockForBookmark(collapsedBlock),
                placeholder = this.findCollapsePlaceholder(collapsedBlock);

            if (block) {
                block.classList.remove("mrbr-cvm-collapsed-block");
                this.flashBlock(block);
            }

            if (placeholder) {
                placeholder.remove();
            }

            this.state.collapsedBlocks = this.state.collapsedBlocks.filter(item => {
                return item.blockKey !== collapsedBlock.blockKey;
            });

            await this.saveState();
            this.render();
        }

        /**
         * Restores all collapsed blocks.
         *
         * @returns {Promise<void>}
         */
        async restoreAllBlocks() {
            document
                .querySelectorAll(".mrbr-cvm-collapsed-block")
                .forEach(element => element.classList.remove("mrbr-cvm-collapsed-block"));

            document
                .querySelectorAll(".mrbr-cvm-collapsed-placeholder")
                .forEach(element => element.remove());

            this.state.collapsedBlocks = [];

            await this.saveState();
            this.render();
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
        * Shows a non-blocking text input dialog.
        *
        * @param {{ title: string, label: string, value: string }} options
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
                cancelButton.textContent = "Cancel";
                cancelButton.addEventListener("click", () => {
                    closeDialog(null);
                });

                saveButton.type = "button";
                saveButton.textContent = "Save bookmark";
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
    };


    const manager = new MrbrChatGptViewManager();

    manager.start().catch(error => {
        console.error("ChatGPT View Manager failed to start.", error);
    });
})();