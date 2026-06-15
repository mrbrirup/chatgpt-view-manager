(() => {
    "use strict";

    /**
     * ChatGPT View Manager bootstrap.
     *
     * This first version proves:
     * - content script injection works
     * - a floating panel can be created
     * - data can persist using chrome.storage.local
     * - bookmarks can scroll to approximate page positions
     */

    const MrbrChatGptViewManager = class {
        static PANEL_ID = "mrbr-cvm-panel";
        static STORAGE_KEY = "mrbrChatGptViewManagerState";

        /**
         * @type {HTMLDivElement | null}
         */
        panelElement = null;

        /**
         * @type {{ bookmarks: Array<{ id: string, title: string, scrollY: number, createdUtc: string }> }}
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
            this.createPanel();
            this.render();
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
                actionsElement = document.createElement("div"),
                addBookmarkButton = document.createElement("button"),
                topButton = document.createElement("button"),
                bookmarkListElement = document.createElement("div");

            titleElement.textContent = "View Manager";

            actionsElement.className = "mrbr-cvm-actions";

            addBookmarkButton.type = "button";
            addBookmarkButton.textContent = "Bookmark";
            addBookmarkButton.addEventListener("click", this.addBookmark.bind(this));

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

            actionsElement.append(addBookmarkButton, topButton);
            this.panelElement.append(titleElement, actionsElement, bookmarkListElement);
        }

        /**
         * Creates a bookmark row.
         *
         * @param {{ id: string, title: string, scrollY: number, createdUtc: string }} bookmark
         * @returns {HTMLDivElement}
         */
        createBookmarkElement(bookmark) {
            const containerElement = document.createElement("div"),
                titleElement = document.createElement("div"),
                buttonRowElement = document.createElement("div"),
                goButton = document.createElement("button"),
                deleteButton = document.createElement("button");

            containerElement.className = "mrbr-cvm-bookmark";

            titleElement.className = "mrbr-cvm-bookmark-title";
            titleElement.title = bookmark.title;
            titleElement.textContent = bookmark.title;

            buttonRowElement.className = "mrbr-cvm-actions";

            goButton.type = "button";
            goButton.textContent = "Go";
            goButton.addEventListener("click", () => {
                window.scrollTo({
                    top: bookmark.scrollY,
                    behavior: "smooth"
                });
            });

            deleteButton.type = "button";
            deleteButton.textContent = "Delete";
            deleteButton.addEventListener("click", async () => {
                this.state.bookmarks = this.state.bookmarks.filter(item => item.id !== bookmark.id);
                await this.saveState();
                this.render();
            });

            buttonRowElement.append(goButton, deleteButton);
            containerElement.append(titleElement, buttonRowElement);

            return containerElement;
        }

        /**
         * Adds a bookmark using the current scroll position.
         *
         * @returns {Promise<void>}
         */
        async addBookmark() {
            const defaultTitle = this.getDefaultBookmarkTitle(),
                title = prompt("Bookmark title", defaultTitle);

            if (!title) {
                return;
            }

            this.state.bookmarks.push({
                id: crypto.randomUUID(),
                title,
                scrollY: window.scrollY,
                createdUtc: new Date().toISOString()
            });

            await this.saveState();
            this.render();
        }

        /**
         * Gets a simple default title based on nearby visible text.
         *
         * @returns {string}
         */
        getDefaultBookmarkTitle() {
            const visibleText = document.body.innerText
                .split("\n")
                .map(line => line.trim())
                .filter(Boolean)
                .find(line => line.length > 20);

            if (!visibleText) {
                return "Bookmark";
            }

            return visibleText.length > 80
                ? `${visibleText.substring(0, 80)}...`
                : visibleText;
        }
    };

    const manager = new MrbrChatGptViewManager();

    manager.start().catch(error => {
        console.error("ChatGPT View Manager failed to start.", error);
    });
})();