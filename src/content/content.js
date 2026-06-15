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
         * @type {{ bookmarks: Array<{ id: string, title: string, blockKey: string, blockIndex?: number, role?: string, contentHash?: string, createdUtc: string }> }}
         */
        state = {
            bookmarks: []
        };

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
                rescanButton = document.createElement("button"),
                topButton = document.createElement("button"),
                bookmarkListElement = document.createElement("div"),
                blocks = this.scanner.findBlocks();

            titleElement.textContent = "View Manager";

            statusElement.className = "mrbr-cvm-status";
            statusElement.textContent = `${blocks.length} blocks detected`;

            actionsElement.className = "mrbr-cvm-actions";

            addBookmarkButton.type = "button";
            addBookmarkButton.textContent = "Bookmark visible";
            addBookmarkButton.addEventListener("click", this.addBookmarkForVisibleBlock.bind(this));

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

            actionsElement.append(addBookmarkButton, rescanButton, topButton);
            this.panelElement.append(titleElement, statusElement, actionsElement, bookmarkListElement);
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