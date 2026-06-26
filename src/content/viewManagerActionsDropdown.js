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
            this.toggleButton = null;
            this.menuElement = null;
            this.positionAnimationFrameId = 0;
        }

        /**
         * Creates the dropdown root element.
         *
         * @returns {HTMLDivElement}
         */
        createElement() {
            const
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
            menuElement.setAttribute("role", "menu");
            toggleButton.setAttribute("aria-haspopup", "menu");
            toggleButton.setAttribute("aria-expanded", "false");

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

            rootElement.append(toggleButton);
            document.documentElement.append(menuElement);

            this.rootElement = rootElement;
            this.toggleButton = toggleButton;
            this.menuElement = menuElement;

            document.addEventListener("click", this.handleDocumentClick, true);
            document.addEventListener("keydown", this.handleDocumentKeyDown, true);
            document.addEventListener("scroll", this.handleViewportChange, true);
            window.addEventListener("resize", this.handleViewportChange);

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
            if (this.menuElement && this.toggleButton) {
                this.menuElement.hidden = false;
                this.toggleButton.setAttribute("aria-expanded", "true");
                this.schedulePosition();
            }
        }

        /**
         * Closes the dropdown.
         *
         * @returns {void}
         */
        close() {
            if (this.menuElement && this.toggleButton) {
                this.menuElement.hidden = true;
                this.toggleButton.setAttribute("aria-expanded", "false");
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

            if (this.menuElement.hidden) {
                this.open();
            } else {
                this.close();
            }
        }

        /**
         * Positions the menu as a viewport overlay. The default anchor is:
         * menu top-right to toggle button bottom-right. The final position is
         * clamped into the viewport so a future draggable panel cannot push the
         * menu off-screen.
         *
         * @returns {void}
         */
        positionMenu() {
            const menuElement = this.menuElement,
                toggleButton = this.toggleButton;

            if (!menuElement || !toggleButton || menuElement.hidden) {
                return;
            }

            if (!toggleButton.isConnected) {
                this.close();
                return;
            }

            const viewportPadding = 8,
                gap = 4,
                availableWidth = Math.max(160, window.innerWidth - (viewportPadding * 2)),
                availableHeight = Math.max(120, window.innerHeight - (viewportPadding * 2));

            menuElement.style.maxWidth = `${availableWidth}px`;
            menuElement.style.maxHeight = `${availableHeight}px`;

            const buttonRect = toggleButton.getBoundingClientRect(),
                menuRect = menuElement.getBoundingClientRect(),
                menuWidth = Math.min(menuRect.width, availableWidth),
                menuHeight = Math.min(menuRect.height, availableHeight),
                preferredLeft = buttonRect.right - menuWidth,
                preferredTop = buttonRect.bottom + gap,
                topWhenAbove = buttonRect.top - menuHeight - gap;

            const left = Math.min(
                Math.max(preferredLeft, viewportPadding),
                Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding)
            );

            let top = preferredTop;

            if (
                preferredTop + menuHeight > window.innerHeight - viewportPadding
                && topWhenAbove >= viewportPadding
            ) {
                top = topWhenAbove;
            }

            top = Math.min(
                Math.max(top, viewportPadding),
                Math.max(viewportPadding, window.innerHeight - menuHeight - viewportPadding)
            );

            menuElement.style.left = `${Math.round(left)}px`;
            menuElement.style.top = `${Math.round(top)}px`;
        }

        /**
         * @returns {void}
         */
        schedulePosition() {
            if (this.positionAnimationFrameId) {
                return;
            }

            this.positionAnimationFrameId = window.requestAnimationFrame(() => {
                this.positionAnimationFrameId = 0;
                this.positionMenu();
            });
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

            if (
                event.target instanceof Node
                && (
                    this.rootElement.contains(event.target)
                    || this.menuElement.contains(event.target)
                )
            ) {
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
         * Repositions the open menu when the viewport or a scroll container moves.
         *
         * @returns {void}
         */
        handleViewportChange = () => {
            if (!this.menuElement || this.menuElement.hidden) {
                return;
            }

            this.schedulePosition();
        };

        /**
         * Removes document listeners.
         *
         * @returns {void}
         */
        dispose() {
            document.removeEventListener("click", this.handleDocumentClick, true);
            document.removeEventListener("keydown", this.handleDocumentKeyDown, true);
            document.removeEventListener("scroll", this.handleViewportChange, true);
            window.removeEventListener("resize", this.handleViewportChange);
            window.cancelAnimationFrame(this.positionAnimationFrameId);
            this.menuElement?.remove();
            this.menuElement = null;
            this.toggleButton = null;
            this.rootElement = null;
        }
    }

    window.MrbrCvm.ViewManagerActionsDropdown = ViewManagerActionsDropdown;
})();
