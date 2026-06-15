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
         *     collapsedBlocks: Array<{ blockKey: string, blockIndex?: number, role?: string, contentHash?: string, title: string, collapsedUtc: string }>,
         *     ui: {
         *         theme: "auto" | "dark" | "light",
         *         isPanelCollapsed: boolean
         *     }
         * }}
         */
        state = {
            bookmarks: [],
            collapsedBlocks: [],
            ui: {
                theme: "auto",
                isPanelCollapsed: false
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
         * @type {{
         *     version: number,
         *     globalUi: {
         *         theme: "auto" | "dark" | "light",
         *         isPanelCollapsed: boolean
         *     },
         *     conversations: Record<string, {
         *         bookmarks: Array<{ id: string, title: string, blockKey: string, blockIndex?: number, role?: string, contentHash?: string, createdUtc: string }>,
         *         collapsedBlocks: Array<{ blockKey: string, blockIndex?: number, role?: string, contentHash?: string, title: string, collapsedUtc: string }>
         *     }>
         * }}
         */
        storageRoot = {
            version: 2,
            globalUi: {
                theme: "auto",
                isPanelCollapsed: false
            },
            conversations: {}
        };

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
                this.createPanel();
                this.render();
                this.startMutationObserver();
                this.startLocationObserver();
            });
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
                this.storageRoot = {
                    version: 2,
                    globalUi: this.normalizeUiState(null),
                    conversations: {
                        [this.conversationKey]: this.createEmptyConversationState()
                    }
                };

                this.state = {
                    ...this.createEmptyConversationState(),
                    ui: this.storageRoot.globalUi
                };

                return;
            }

            if (savedState.version === 2 && savedState.conversations && typeof savedState.conversations === "object") {
                this.storageRoot = {
                    version: 2,
                    globalUi: this.normalizeUiState(savedState.globalUi),
                    conversations: savedState.conversations
                };

                const conversationState = this.normalizeConversationState(
                    this.storageRoot.conversations[this.conversationKey]
                );

                this.storageRoot.conversations[this.conversationKey] = conversationState;

                this.state = {
                    bookmarks: conversationState.bookmarks,
                    collapsedBlocks: conversationState.collapsedBlocks,
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
         * Gets a blank per-conversation state object.
         *
         * @returns {{
         *     bookmarks: Array<{ id: string, title: string, blockKey: string, blockIndex?: number, role?: string, contentHash?: string, createdUtc: string }>,
         *     collapsedBlocks: Array<{ blockKey: string, blockIndex?: number, role?: string, contentHash?: string, title: string, collapsedUtc: string }>
         * }}
         */
        createEmptyConversationState() {
            return {
                bookmarks: [],
                collapsedBlocks: []
            };
        }

        /**
         * Gets a safe UI state.
         *
         * @param {any} ui
         * @returns {{ theme: "auto" | "dark" | "light", isPanelCollapsed: boolean }}
         */
        normalizeUiState(ui) {
            return {
                theme: ui?.theme === "dark" || ui?.theme === "light" || ui?.theme === "auto"
                    ? ui.theme
                    : "auto",
                isPanelCollapsed: ui?.isPanelCollapsed === true
            };
        }

        /**
         * Normalises a saved conversation state.
         *
         * @param {any} conversationState
         * @returns {{
         *     bookmarks: Array<{ id: string, title: string, blockKey: string, blockIndex?: number, role?: string, contentHash?: string, createdUtc: string }>,
         *     collapsedBlocks: Array<{ blockKey: string, blockIndex?: number, role?: string, contentHash?: string, title: string, collapsedUtc: string }>
         * }}
         */
        normalizeConversationState(conversationState) {
            return {
                bookmarks: Array.isArray(conversationState?.bookmarks)
                    ? conversationState.bookmarks
                    : [],
                collapsedBlocks: Array.isArray(conversationState?.collapsedBlocks)
                    ? conversationState.collapsedBlocks
                    : []
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
                collapsedBlocks: this.state.collapsedBlocks
            };

            await chrome.storage.local.set({
                [MrbrChatGptViewManager.STORAGE_KEY]: this.storageRoot
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
            this.panelElement.__mrbrConversationKey = this.conversationKey;
            /**
             * Get conversation key in Chrome console for the current panel with:
             * document.querySelector("#mrbr-cvm-panel")?.__mrbrConversationKey
             */
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
            this.scheduleDomUpdate(() => {
                if (!this.panelElement) {
                    return;
                }

                if (this.state.ui.isPanelCollapsed) {
                    this.renderCollapsedPanel();
                    return;
                }

                this.panelElement.innerHTML = "";
                this.panelElement.classList.remove("mrbr-cvm-panel-collapsed");

                const headerElement = document.createElement("div"),
                    titleElement = document.createElement("h2"),
                    collapsePanelButton = this.createIconButton({
                        iconName: "collapsePanel",
                        title: "Collapse View Manager",
                        onClick: () => {
                            this.togglePanelCollapsed();
                        }
                    }),
                    statusElement = document.createElement("div"),
                    toolbarElement = this.createToolbarElement(),
                    bookmarkSectionElement = this.createBookmarkSectionElement(),
                    collapsedSectionElement = this.createCollapsedBlocksSectionElement(),
                    blocks = this.scanner.findBlocks();

                headerElement.className = "mrbr-cvm-header";

                titleElement.className = "mrbr-cvm-header-title";
                titleElement.textContent = "View Manager";

                headerElement.append(titleElement, collapsePanelButton);

                statusElement.className = "mrbr-cvm-status";
                statusElement.textContent = `${blocks.length} blocks detected`;

                this.panelElement.append(
                    headerElement,
                    statusElement,
                    toolbarElement,
                    bookmarkSectionElement,
                    collapsedSectionElement
                );

                this.applyCollapsedBlocks(blocks);
            });
        }
        /**
         * Creates the collapsed blocks management section.
         *
         * @returns {HTMLDivElement}
         */
        createCollapsedBlocksSectionElement() {
            const listElement = document.createElement("div");

            listElement.className = "mrbr-cvm-compact-list";

            if (this.state.collapsedBlocks.length === 0) {
                const emptyElement = document.createElement("div");

                emptyElement.className = "mrbr-cvm-empty-section";
                emptyElement.textContent = "No collapsed blocks.";

                listElement.append(emptyElement);
            } else {
                for (const collapsedBlock of this.state.collapsedBlocks) {
                    listElement.appendChild(this.createCollapsedBlockElement(collapsedBlock));
                }
            }

            return this.createCompactSectionElement("Collapsed Blocks", this.state.collapsedBlocks.length, listElement);
        }
        /**
        * Creates one compact collapsed block management row.
        *
        * @param {{ blockKey: string, blockIndex?: number, role?: string, contentHash?: string, title: string, collapsedUtc: string }} collapsedBlock
        * @returns {HTMLDivElement}
        */
        createCollapsedBlockElement(collapsedBlock) {
            const rowElement = document.createElement("div"),
                goButton = this.createIconButton({
                    iconName: "go",
                    title: "Go to collapsed block placeholder",
                    onClick: () => {
                        this.goToCollapsedBlock(collapsedBlock);
                    }
                }),
                restoreButton = this.createIconButton({
                    iconName: "restore",
                    title: "Restore collapsed block",
                    onClick: async () => {
                        await this.restoreCollapsedBlock(collapsedBlock);
                    }
                }),
                forgetButton = this.createIconButton({
                    iconName: "delete",
                    title: "Forget collapsed block and restore it",
                    onClick: async () => {
                        await this.forgetCollapsedBlock(collapsedBlock);
                    }
                }),
                labelElement = document.createElement("div");

            rowElement.className = "mrbr-cvm-compact-row mrbr-cvm-compact-row-collapsed";

            labelElement.className = "mrbr-cvm-compact-label";
            labelElement.textContent = collapsedBlock.title;
            labelElement.title = `${collapsedBlock.title}\n${collapsedBlock.blockKey}`;

            rowElement.append(goButton, restoreButton, forgetButton, labelElement);

            return rowElement;
        }
        /**
        * Scrolls to a collapsed block placeholder or block.
        *
        * @param {{ blockKey: string, blockIndex?: number, role?: string, contentHash?: string, title: string, collapsedUtc: string }} collapsedBlock
        * @returns {void}
        */
        goToCollapsedBlock(collapsedBlock) {
            this.scanner.findBlocks();

            const placeholder = this.findCollapsePlaceholder(collapsedBlock),
                block = this.scanner.findBlockForBookmark(collapsedBlock),
                target = placeholder || block;

            if (!target) {
                alert(`Could not find collapsed block "${collapsedBlock.title}". Try rescanning after the page has fully loaded.`);
                return;
            }

            this.scheduleDomUpdate(() => {
                target.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

                target.classList.add("mrbr-cvm-flash");

                window.setTimeout(() => {
                    this.scheduleDomUpdate(() => {
                        target.classList.remove("mrbr-cvm-flash");
                    });
                }, 1200);
            });
        }
        /**
         * Forgets a collapsed block record and restores the block if currently hidden.
         *
         * @param {{ blockKey: string, blockIndex?: number, role?: string, contentHash?: string, title: string, collapsedUtc: string }} collapsedBlock
         * @returns {Promise<void>}
         */
        async forgetCollapsedBlock(collapsedBlock) {
            const block = this.scanner.findBlockForBookmark(collapsedBlock),
                placeholder = this.findCollapsePlaceholder(collapsedBlock);

            this.state.collapsedBlocks = this.state.collapsedBlocks.filter(item => {
                return item.blockKey !== collapsedBlock.blockKey;
            });

            await this.saveState();

            this.scheduleDomUpdate(() => {
                if (block) {
                    block.classList.remove("mrbr-cvm-collapsed-block");
                }

                if (placeholder) {
                    placeholder.remove();
                }

                this.render();
            });
        }
        /**
         * Creates the bookmark management section.
         *
         * @returns {HTMLDivElement}
         */
        createBookmarkSectionElement() {
            const listElement = document.createElement("div");

            listElement.className = "mrbr-cvm-compact-list";

            if (this.state.bookmarks.length === 0) {
                const emptyElement = document.createElement("div");

                emptyElement.className = "mrbr-cvm-empty-section";
                emptyElement.textContent = "No bookmarks yet.";

                listElement.append(emptyElement);
            } else {
                for (const bookmark of this.state.bookmarks) {
                    listElement.appendChild(this.createBookmarkElement(bookmark));
                }
            }

            return this.createCompactSectionElement("Bookmarks", this.state.bookmarks.length, listElement);
        }

        /**
         * Creates the compact action toolbar.
         *
         * @returns {HTMLDivElement}
         */
        createToolbarElement() {
            const toolbarElement = document.createElement("div"),
                actionGroupElement = document.createElement("div"),
                themeGroupElement = document.createElement("div");

            toolbarElement.className = "mrbr-cvm-toolbar";

            actionGroupElement.className = "mrbr-cvm-icon-toolbar";
            themeGroupElement.className = "mrbr-cvm-theme-toggle-group";

            actionGroupElement.append(
                this.createIconButton({
                    iconName: "bookmark",
                    title: "Bookmark visible block",
                    onClick: () => {
                        this.addBookmarkForVisibleBlock();
                    }
                }),
                this.createIconButton({
                    iconName: "collapse",
                    title: "Collapse highlighted block",
                    onMouseEnter: () => {
                        this.highlightCollapseTarget();
                    },
                    onMouseLeave: () => {
                        this.clearCollapseTargetHighlight();
                    },
                    onClick: () => {
                        this.collapseHighlightedBlock();
                    }
                }),
                this.createIconButton({
                    iconName: "restore",
                    title: "Restore all collapsed blocks",
                    onClick: () => {
                        this.restoreAllBlocks();
                    }
                }),
                this.createIconButton({
                    iconName: "rescan",
                    title: "Rescan conversation blocks",
                    onClick: () => {
                        this.scheduleDomUpdate(() => {
                            const rescannedBlocks = this.scanner.findBlocks();

                            this.applyCollapsedBlocks(rescannedBlocks);
                            this.updateBlockCountStatus(rescannedBlocks.length);
                        });
                    }
                }),
                this.createIconButton({
                    iconName: "top",
                    title: "Scroll to top",
                    onClick: () => {
                        window.scrollTo({
                            top: 0,
                            behavior: "smooth"
                        });
                    }
                })
            );

            themeGroupElement.append(
                this.createThemeToggleButton("light"),
                this.createThemeToggleButton("dark"),
                this.createThemeToggleButton("auto")
            );

            toolbarElement.append(actionGroupElement, themeGroupElement);

            return toolbarElement;
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
         * @param {{ id: string, title: string, blockKey?: string, blockIndex?: number, role?: string, contentHash?: string, createdUtc: string }} bookmark
         * @returns {HTMLDivElement}
         */
        createBookmarkElement(bookmark) {
            const rowElement = document.createElement("div"),
                goButton = this.createIconButton({
                    iconName: "go",
                    title: "Go to bookmark",
                    onClick: () => {
                        this.goToBookmark(bookmark);
                    }
                }),
                deleteButton = this.createIconButton({
                    iconName: "delete",
                    title: "Delete bookmark",
                    onClick: async () => {
                        this.state.bookmarks = this.state.bookmarks.filter(item => item.id !== bookmark.id);

                        await this.saveState();
                        this.render();
                    }
                }),
                labelElement = document.createElement("div"),
                key = bookmark.blockKey || `${bookmark.role || "unknown"}-${bookmark.blockIndex || "?"}`;

            rowElement.className = "mrbr-cvm-compact-row";

            labelElement.className = "mrbr-cvm-compact-label";
            labelElement.textContent = bookmark.title;
            labelElement.title = `${bookmark.title}\n${key}`;

            rowElement.append(goButton, deleteButton, labelElement);

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

                this.saveState();

                this.scheduleDomUpdate(() => {
                    const placeholder = this.findCollapsePlaceholder(matchingCollapsedBlock);

                    if (placeholder) {
                        placeholder.remove();
                    }

                    block.classList.remove("mrbr-cvm-collapsed-block");
                    this.render();
                });
            }

            this.scheduleDomUpdate(() => {
                block.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

                this.flashBlock(block);
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
         * @param {{ blockKey: string, blockIndex?: number, role?: string, contentHash?: string, title: string, collapsedUtc: string }} collapsedBlock
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

                block.insertAdjacentElement("beforebegin", placeholderElement);
            });
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

            this.state.collapsedBlocks = this.state.collapsedBlocks.filter(item => {
                return item.blockKey !== collapsedBlock.blockKey;
            });

            await this.saveState();

            this.scheduleDomUpdate(() => {
                if (block) {
                    block.classList.remove("mrbr-cvm-collapsed-block");
                    this.flashBlock(block);
                }

                if (placeholder) {
                    placeholder.remove();
                }

                this.render();
            });
        }

        /**
         * Restores all collapsed blocks.
         *
         * @returns {Promise<void>}
         */
        async restoreAllBlocks() {
            this.state.collapsedBlocks = [];

            await this.saveState();

            this.scheduleDomUpdate(() => {
                document
                    .querySelectorAll(".mrbr-cvm-collapsed-block")
                    .forEach(element => element.classList.remove("mrbr-cvm-collapsed-block"));

                document
                    .querySelectorAll(".mrbr-cvm-collapsed-placeholder")
                    .forEach(element => element.remove());

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
                        console.error("ChatGPT View Manager DOM update failed.", error);
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
                statusElement.textContent = `${blockCount} blocks detected`;
            }
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
        /**
 * Gets the SVG path data for an icon.
 *
 * @param {"bookmark" | "collapse" | "restore" | "rescan" | "top" | "go" | "delete" | "expandPanel" | "collapsePanel"| "lightTheme" | "darkTheme" | "autoTheme"} iconName
 * @returns {string}
 */
        getIconPath(iconName) {
            switch (iconName) {
                case "bookmark":
                    return "M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z";
                case "collapse":
                    return "M5 7h14v2H5V7zm3 4h8v2H8v-2zm2 4h4v2h-4v-2z";
                case "restore":
                    return "M6 5h12v6h-2V7H8v10h4v2H6V5zm8 8h6v6h-6v-6zm2 2v2h2v-2h-2z";
                case "rescan":
                    return "M17.7 6.3A8 8 0 0 0 4.3 10H2l3.5 3.5L9 10H6.4a6 6 0 0 1 10-2.3l1.3-1.4zM6.3 17.7A8 8 0 0 0 19.7 14H22l-3.5-3.5L15 14h2.6a6 6 0 0 1-10 2.3l-1.3 1.4z";
                case "top":
                    return "M12 4l7 7h-5v9h-4v-9H5l7-7z";
                case "go":
                    return "M5 5h8v2H8.4l6.6 6.6-1.4 1.4L7 8.4V13H5V5zm12 2h2v12H7v-2h10V7z";
                case "delete":
                    return "M7 6h10l-1 14H8L7 6zm3-3h4l1 1h4v2H5V4h4l1-1zm0 6v8h2V9h-2zm4 0v8h2V9h-2z";
                case "expandPanel":
                    return "M5 5h14v2H5V5zm0 6h14v2H5v-2zm0 6h14v2H5v-2z";
                case "collapsePanel":
                    return "M6 11h12v2H6v-2z";
                case "lightTheme":
                    return "M12 4a1 1 0 0 1 1-1h0a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0V4zm0 14a6 6 0 1 0 0-12 6 6 0 0 0 0 12zm0-2a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm8-5a1 1 0 0 1 1 1h0a1 1 0 0 1-1 1h-2a1 1 0 0 1 0-2h2zM6 12a1 1 0 0 1-1 1H3a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1zm11.66-6.66a1 1 0 0 1 1.41 0h0a1 1 0 0 1 0 1.41l-1.41 1.41a1 1 0 1 1-1.41-1.41l1.41-1.41zM6.34 16.24a1 1 0 0 1 1.41 1.41l-1.41 1.41a1 1 0 0 1-1.41-1.41l1.41-1.41zm12.73 1.41a1 1 0 0 1-1.41 1.41l-1.41-1.41a1 1 0 0 1 1.41-1.41l1.41 1.41zM7.75 6.75a1 1 0 0 1-1.41 1.41L4.93 6.75a1 1 0 0 1 1.41-1.41l1.41 1.41zM12 20a1 1 0 0 1 1 1h0a1 1 0 0 1-2 0v-2a1 1 0 0 1 2 0v1z";

                case "darkTheme":
                    return "M21 14.5A8.5 8.5 0 0 1 9.5 3a7 7 0 1 0 11.5 11.5z";

                case "autoTheme":
                    return "M12 3a9 9 0 1 0 0 18V3zm0 2v14a7 7 0 0 1 0-14z";
                default:
                    return "";
            }
        }

        /**
         * Creates an SVG icon element.
         *
         * @param {"bookmark" | "collapse" | "restore" | "rescan" | "top" | "go" | "delete" | "expandPanel" | "collapsePanel"| "lightTheme" | "darkTheme" | "autoTheme"} iconName
         * @returns {SVGSVGElement}
         */
        createIconElement(iconName) {
            const svgNamespace = "http://www.w3.org/2000/svg",
                svgElement = document.createElementNS(svgNamespace, "svg"),
                pathElement = document.createElementNS(svgNamespace, "path");

            svgElement.setAttribute("viewBox", "0 0 24 24");
            svgElement.setAttribute("aria-hidden", "true");
            svgElement.setAttribute("focusable", "false");

            pathElement.setAttribute("d", this.getIconPath(iconName));
            pathElement.setAttribute("fill", "currentColor");

            svgElement.append(pathElement);

            return svgElement;
        }

        /**
         * Creates a compact icon button.
         *
         * @param {{
         *     iconName: "bookmark" | "collapse" | "restore" | "rescan" | "top" | "go" | "delete" | "expandPanel" | "collapsePanel",
         *     title: string,
         *     onClick: (event: MouseEvent) => void,
         *     onMouseEnter?: (event: MouseEvent) => void,
         *     onMouseLeave?: (event: MouseEvent) => void
         * }} options
         * @returns {HTMLButtonElement}
         */
        createIconButton(options) {
            const button = document.createElement("button");

            button.type = "button";
            button.className = "mrbr-cvm-icon-button";
            button.title = options.title;
            button.setAttribute("aria-label", options.title);
            button.append(this.createIconElement(options.iconName));
            button.addEventListener("click", options.onClick);

            if (options.onMouseEnter) {
                button.addEventListener("mouseenter", options.onMouseEnter);
            }

            if (options.onMouseLeave) {
                button.addEventListener("mouseleave", options.onMouseLeave);
            }

            return button;
        }
        /**
        * Creates a compact panel section with a title, count, and content.
        *
        * @param {string} title
        * @param {number} count
        * @param {HTMLElement} contentElement
        * @returns {HTMLDivElement}
        */
        createCompactSectionElement(title, count, contentElement) {
            const sectionElement = document.createElement("div"),
                headerElement = document.createElement("div"),
                titleElement = document.createElement("div"),
                countElement = document.createElement("div");

            sectionElement.className = "mrbr-cvm-section";

            headerElement.className = "mrbr-cvm-section-header";

            titleElement.className = "mrbr-cvm-section-title";
            titleElement.textContent = title;

            countElement.className = "mrbr-cvm-section-count";
            countElement.textContent = String(count);

            headerElement.append(titleElement, countElement);
            sectionElement.append(headerElement, contentElement);

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
                title: "Expand View Manager",
                onClick: () => {
                    this.togglePanelCollapsed();
                }
            });

            this.panelElement.append(expandButton);
        }
    };



    const manager = new MrbrChatGptViewManager();

    manager.start().catch(error => {
        console.error("ChatGPT View Manager failed to start.", error);
    });
})();


