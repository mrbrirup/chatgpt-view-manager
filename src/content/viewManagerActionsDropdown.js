(() => {
    "use strict";

    window.MrbrCvm = window.MrbrCvm || {};

    /**
     * @typedef {{
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
     * }} ViewManagerActionsDropdownOptions
     */

    /**
     * Small command dropdown for lower-frequency View Manager actions.
     */
    class ViewManagerActionsDropdown {

        /**
         * @param {ViewManagerActionsDropdownOptions} options
         */
        constructor(options) {
            this.createIconButton = options.createIconButton;
            this.strings = options.strings;
            this.onImport = options.onImport;
            this.onExport = options.onExport;
            this.onSetTheme = options.onSetTheme;
            this.getCurrentTheme = options.getCurrentTheme;
            this.rootElement = null;
            this.menuElement = null;
        }

        /**
         * Creates the dropdown root element.
         *
         * @returns {HTMLDivElement}
         */
        createElement() {
            const
                ViewManagerStrings = window.MrbrCvm?.ViewManagerStrings,
                rootElement = document.createElement("div"),
                toggleButton = this.createIconButton({
                    iconName: "more",
                    title: this.strings.get("moreViewManagerActions"),
                    onClick: /** @param {MouseEvent} event */ event => {
                        event.stopPropagation();
                        this.toggle();
                    }
                }),
                menuElement = document.createElement("div");

            rootElement.className = "mrbr-cvm-actions-dropdown";
            menuElement.className = "mrbr-cvm-actions-dropdown-menu";
            menuElement.hidden = true;

            menuElement.append(
                this.createMenuButton(this.strings.get("exportData"), this.strings.get("exportViewManagerData"), () => {
                    this.close();
                    this.onExport();
                }),
                this.createMenuButton(this.strings.get("importData"), this.strings.get("importViewManagerData"), () => {
                    this.close();
                    this.onImport();
                }),
                this.createSeparator(),
                this.createMenuButton(this.strings.get("lightTheme"), this.strings.get("useLightTheme"), () => {
                    this.close();
                    this.onSetTheme("light");
                }, () => this.getCurrentTheme() === "light"),
                this.createMenuButton(this.strings.get("darkTheme"), this.strings.get("useDarkTheme"), () => {
                    this.close();
                    this.onSetTheme("dark");
                }, () => this.getCurrentTheme() === "dark"),
                this.createMenuButton(this.strings.get("autoTheme"), this.strings.get("useAutoTheme"), () => {
                    this.close();
                    this.onSetTheme("auto");
                }, () => this.getCurrentTheme() === "auto")
            );

            rootElement.append(toggleButton, menuElement);

            this.rootElement = rootElement;
            this.menuElement = menuElement;

            document.addEventListener("click", this.handleDocumentClick, true);
            document.addEventListener("keydown", this.handleDocumentKeyDown, true);

            return rootElement;
        }

        /**
         * Creates one menu command button.
         *
         * @param {string} text
         * @param {string} title
         * @param {() => void} onClick
         * @param {() => boolean=} isActive
         * @returns {HTMLButtonElement}
         */
        createMenuButton(text, title, onClick, isActive) {
            const button = document.createElement("button");

            button.type = "button";
            button.className = "mrbr-cvm-actions-dropdown-item";
            button.textContent = isActive?.() ? `✓ ${text}` : text;
            button.title = title;
            button.setAttribute("aria-label", title);

            if (isActive?.()) {
                button.classList.add("mrbr-cvm-actions-dropdown-item-active");
            }

            button.addEventListener("click", event => {
                event.stopPropagation();
                onClick();
            });

            return button;
        }

        /**
         * Creates a menu separator.
         *
         * @returns {HTMLDivElement}
         */
        createSeparator() {
            const separatorElement = document.createElement("div");

            separatorElement.className = "mrbr-cvm-actions-dropdown-separator";
            separatorElement.setAttribute("role", "separator");

            return separatorElement;
        }

        /**
         * Opens the dropdown.
         *
         * @returns {void}
         */
        open() {
            if (this.menuElement) {
                this.menuElement.hidden = false;
            }
        }

        /**
         * Closes the dropdown.
         *
         * @returns {void}
         */
        close() {
            if (this.menuElement) {
                this.menuElement.hidden = true;
            }
        }

        /**
         * Toggles the dropdown.
         *
         * @returns {void}
         */
        toggle() {
            if (!this.menuElement) {
                return;
            }

            this.menuElement.hidden = !this.menuElement.hidden;
        }

        /**
         * Handles outside clicks.
         *
         * @param {MouseEvent} event
         * @returns {void}
         */
        handleDocumentClick = event => {
            if (!this.rootElement || !this.menuElement) {
                return;
            }

            if (event.target instanceof Node && this.rootElement.contains(event.target)) {
                return;
            }

            this.close();
        };

        /**
         * Handles Escape.
         *
         * @param {KeyboardEvent} event
         * @returns {void}
         */
        handleDocumentKeyDown = event => {
            if (event.key === "Escape") {
                this.close();
            }
        };

        /**
         * Removes document listeners.
         *
         * @returns {void}
         */
        dispose() {
            document.removeEventListener("click", this.handleDocumentClick, true);
            document.removeEventListener("keydown", this.handleDocumentKeyDown, true);
        }
    }

    window.MrbrCvm.ViewManagerActionsDropdown = ViewManagerActionsDropdown;
})();