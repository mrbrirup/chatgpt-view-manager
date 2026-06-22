(() => {
    "use strict";

    window.MrbrCvm = window.MrbrCvm || {};

    /**
     * Manages collapsed block DOM behaviour and collapsed block persistence.
     */
    class CollapsedBlocksManager {
        static HOVER_BUTTON_DEFAULT_HEIGHT = 32;
        static INPUT_DEBOUNCE_DELAY = 300;
        static ATTRIBUTE_TURN_ID_CONTAINER = "data-turn-id-container";
        static SELECTOR_TURN_ID_CONTAINER_ATTRIBUTE = `div[${CollapsedBlocksManager.ATTRIBUTE_TURN_ID_CONTAINER}]`;
        static TOOLBAR_SELECTOR = "div[data-mrbr-cvm-toolbar-collapsed-block]";
        static COLLAPSED_HOST_ATTRIBUTE = "data-mrbr-cvm-collapsed-host-key";

        static rootSelectors = [
            ".not-print\\:overflow-y-auto",
            "div[data-scroll-root]",
            "[data-scroll-root]",
            "main"
        ];

        /**
         * @param {{
         *     scanner?: any,
         *     persistence?: any,
         *     notesManager?: any,
         *     createIconButton?: (options: any) => HTMLButtonElement,
         *     strings?: { get: (key: string) => string, format?: (key: string, ...values: Array<string | number>) => string },
         *     scheduleDomUpdate?: (callback: () => void) => void,
         *     render?: () => void,
         *     flashBlock?: (block: HTMLElement) => void,
         *     getScrollRoot?: () => HTMLElement | null,
         *     scrollTurnContainerIntoViewAndVerify?: (item: any, blockPosition?: ScrollLogicalPosition, maxRetries?: number) => Promise<boolean>,
         *     waitForTurnHydration?: (milliseconds?: number) => Promise<void>
         * }} [options]
         */
        constructor(options = {}) {
            this.scanner = options.scanner || null;
            this.persistence = options.persistence || null;
            this.notesManager = options.notesManager || null;
            this.createIconButtonCallback = options.createIconButton || null;
            this.strings = options.strings || window.MrbrCvm.ViewManagerStrings || null;
            this.scheduleDomUpdate = options.scheduleDomUpdate || (callback => window.requestAnimationFrame(callback));
            this.render = options.render || (() => { });
            this.flashBlock = options.flashBlock || (block => block.classList.add("mrbr-cvm-flash"));
            this.getScrollRootCallback = options.getScrollRoot || null;
            this.scrollTurnContainerIntoViewAndVerify = options.scrollTurnContainerIntoViewAndVerify || null;
            this.waitForTurnHydration = options.waitForTurnHydration || null;

            /** @type {HTMLElement | null} */
            this.blockHostElement = null;
            /** @type {HTMLButtonElement | null} */
            this.hoverButtonElement = null;
            this.currentHoveredBoxId = "";
            this.containerMouseOverDebounceTimeoutId = 0;
            this.containerMouseOverDebounceMilliseconds = 40;
            this.inputDebounceTimer = 0;
            this.rootElementMouseMoveDebounceTimeoutId = 0;
            this.rootElementMouseMoveDebounceMilliseconds = 40;
            this.buttonHeight = CollapsedBlocksManager.HOVER_BUTTON_DEFAULT_HEIGHT;
            this.isWired = false;
        }

        /**
         * @returns {HTMLElement | null}
         */
        get rootElement() {
            return this.blockHostElement || this.getRootElement();
        }

        /**
         * @returns {any | null}
         */
        get state() {
            return this.persistence?.state || null;
        }

        /**
         * @returns {Array<any>}
         */
        get collapsedBlocks() {
            return this.state?.collapsedBlocks || [];
        }

        /**
         * @param {string} key
         * @returns {string}
         */
        getString(key) {
            return this.strings?.get?.(key) || key;
        }

        /**
         * @param {string} key
         * @param {...string | number} values
         * @returns {string}
         */
        formatString(key, ...values) {
            if (this.strings?.format) {
                return this.strings.format(key, ...values);
            }

            let text = this.getString(key);

            values.forEach((value, index) => {
                text = text.replaceAll(`{${index}}`, String(value));
            });

            return text;
        }

        /**
         * @returns {void}
         */
        init() {
            this.blockHostElement = this.rootElement;

            if (!this.blockHostElement) {
                console.warn("CollapsedBlocksManager: No block host element found.");
                return;
            }

            this.wireEvents();
            this.applyPersistedCollapsedBlocks();
        }

        /**
         * Gets the root element for block management.
         *
         * @returns {HTMLElement | null}
         */
        getRootElement() {
            if (this.blockHostElement) {
                return this.blockHostElement;
            }

            if (this.getScrollRootCallback) {
                const scrollRoot = this.getScrollRootCallback();

                if (scrollRoot) {
                    this.blockHostElement = scrollRoot;
                    return this.blockHostElement;
                }
            }

            for (const selector of CollapsedBlocksManager.rootSelectors) {
                const element = document.querySelector(selector);

                if (element instanceof HTMLElement) {
                    this.blockHostElement = element;
                    return this.blockHostElement;
                }
            }

            return null;
        }

        /**
         * @returns {HTMLElement | null}
         */
        getScrollRoot() {
            return this.getScrollRootCallback?.() || this.getRootElement();
        }

        /**
         * @returns {HTMLButtonElement | null}
         */
        get hoverButton() {
            if (!this.hoverButtonElement) {
                this.hoverButtonElement = this.createHoverButton();
            }

            return this.hoverButtonElement;
        }

        /**
         * @returns {HTMLButtonElement | null}
         */
        createHoverButton() {
            const button = this.createIconButton({
                title: "Collapse",
                iconName: "collapse",
                onClick: event => {
                    this.hoverButtonClickHandler(event);
                }
            });

            if (!button) {
                return null;
            }

            const style = button.style;

            button.id = "mrbr-cvm-collapse-hover-button";
            button.classList.add("mrbr-cvm-hover-button");
            style.position = "fixed";
            style.zIndex = "100000";
            style.top = "0px";
            style.left = "0px";
            style.borderColor = "rgba(0, 0, 0, 0.86)";

            const buttonBackgroundColor = window.getComputedStyle(button).backgroundColor;

            style.backgroundColor = buttonBackgroundColor.replace(/rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/, (match, r, g, b) => {
                return `rgba(${r}, ${g}, ${b}, 0.72)`;
            });

            return button;
        }

        /**
         * @param {{ iconName: string, title: string, onClick?: (event: MouseEvent) => void }} options
         * @returns {HTMLButtonElement | null}
         */
        createIconButton(options) {
            if (this.createIconButtonCallback) {
                return this.createIconButtonCallback(options);
            }

            const ViewManagerIconButtonFactory = window.MrbrCvm?.ViewManagerIconButtonFactory;

            if (!ViewManagerIconButtonFactory) {
                console.warn("CollapsedBlocksManager: ViewManagerIconButtonFactory not found.");
                return null;
            }

            const iconButtonFactory = new ViewManagerIconButtonFactory();

            return iconButtonFactory.createIconButton(options);
        }

        /**
         * @returns {void}
         */
        wireEvents() {
            const container = this.rootElement,
                button = this.hoverButton;

            if (!container || this.isWired) {
                return;
            }

            container.addEventListener("mouseover", this.containerMouseOverHandler.bind(this));
            container.addEventListener("mouseout", this.containerMouseOutHandler.bind(this));
            container.addEventListener("click", this.containerClickHandler.bind(this));
            container.addEventListener("input", this.rootElementInputHandler.bind(this));
            document.addEventListener("mousemove", this.rootElementMouseMoveHandler.bind(this));

            if (button) {
                button.addEventListener("click", this.hoverButtonClickHandler.bind(this));
            }

            this.isWired = true;
        }

        /**
         * @param {HTMLElement} element
         * @returns {string}
         */
        static getTurnContainerIdFromElement(element) {
            return element.getAttribute(CollapsedBlocksManager.ATTRIBUTE_TURN_ID_CONTAINER) || "";
        }

        /**
         * @param {HTMLElement | null} element
         * @returns {HTMLElement | null}
         */
        static getClosestTurnContainerIdFromElement(element) {
            return element?.closest?.(CollapsedBlocksManager.SELECTOR_TURN_ID_CONTAINER_ATTRIBUTE) || null;
        }

        /**
         * @param {HTMLElement} element
         * @returns {boolean}
         */
        static isCurrentBoxCollapsed(element) {
            return element.classList.contains("is-shrunk")
                || element.hasAttribute(CollapsedBlocksManager.COLLAPSED_HOST_ATTRIBUTE)
                || !!element.querySelector(`${CollapsedBlocksManager.TOOLBAR_SELECTOR}:not([data-mrbr-cvm-toolbar-collapsed-block-hidden])`);
        }

        /**
         * @param {MouseEvent} event
         * @returns {void}
         */
        containerMouseOverHandler(event) {
            const targetElement = event.target instanceof HTMLElement ? event.target : null,
                relatedElement = event.relatedTarget instanceof HTMLElement ? event.relatedTarget : null;

            if (!targetElement) {
                return;
            }

            const box = CollapsedBlocksManager.getClosestTurnContainerIdFromElement(targetElement);

            if (!box || box.closest(".mrbr-cvm-panel")) {
                return;
            }

            const boxId = CollapsedBlocksManager.getTurnContainerIdFromElement(box);

            if (!boxId) {
                return;
            }

            const relatedBox = relatedElement
                ? CollapsedBlocksManager.getClosestTurnContainerIdFromElement(relatedElement)
                : null;

            if (relatedBox === box || boxId === this.currentHoveredBoxId) {
                return;
            }

            window.clearTimeout(this.containerMouseOverDebounceTimeoutId);

            this.containerMouseOverDebounceTimeoutId = window.setTimeout(() => {
                this.containerMouseOverDebounceTimeoutId = 0;
                this.applyContainerMouseOver(box, event);
            }, this.containerMouseOverDebounceMilliseconds);
        }

        /**
         * @param {HTMLElement} box
         * @param {MouseEvent} event
         * @returns {void}
         */
        applyContainerMouseOver(box, event) {
            const container = this.rootElement,
                button = this.hoverButton,
                boxId = CollapsedBlocksManager.getTurnContainerIdFromElement(box);

            if (!container || !button || !boxId) {
                return;
            }

            if (this.currentHoveredBoxId && this.currentHoveredBoxId !== boxId) {
                const existingBox = container.querySelector(
                    `div[data-turn-id-container="${CSS.escape(this.currentHoveredBoxId)}"]`
                );

                existingBox?.classList.remove("mrbr-cvm-collapsed-block-target");
            }

            this.currentHoveredBoxId = boxId;
            box.classList.add("mrbr-cvm-collapsed-block-target");

            if (button.parentElement !== container) {
                container.appendChild(button);

                const buttonHeight = button.offsetHeight || CollapsedBlocksManager.HOVER_BUTTON_DEFAULT_HEIGHT,
                    iconStyle = button.querySelector("svg")?.style;

                this.buttonHeight = buttonHeight;

                if (iconStyle) {
                    iconStyle.width = `${buttonHeight}px`;
                    iconStyle.height = `${buttonHeight}px`;
                }
            }

            button.classList.toggle("hidden", CollapsedBlocksManager.isCurrentBoxCollapsed(box));
            this.positionHoverButton(event);
            container.dispatchEvent(this.createOnEnterBlockEvent(event));
        }

        /**
         * @param {MouseEvent} event
         * @returns {void}
         */
        containerMouseOutHandler(event) {
            const container = this.rootElement,
                target = event.target instanceof HTMLElement ? event.target : null,
                related = event.relatedTarget instanceof HTMLElement ? event.relatedTarget : null,
                box = CollapsedBlocksManager.getClosestTurnContainerIdFromElement(target);

            if (!container || !box) {
                return;
            }

            if (!related || !box.contains(related)) {
                box.classList.remove("mrbr-cvm-collapsed-block-target");
                container.dispatchEvent(this.createOnExitBlockEvent(event));
            }
        }

        /**
         * @param {MouseEvent} event
         * @returns {void}
         */
        containerClickHandler(event) {
            const target = event.target instanceof HTMLElement ? event.target : null;

            if (!target) {
                return;
            }

            const button = target.closest(".mrbr-cvm-icon-button"),
                action = button?.getAttribute("data-mrbr-cvm-collapsed-action");

            if (action !== "restore") {
                return;
            }

            const box = CollapsedBlocksManager.getClosestTurnContainerIdFromElement(target);

            if (!box) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            this.restoreCollapsedBlockForElement(box).catch(error => {
                console.error("CollapsedBlocksManager: restore failed.", error);
            });
        }

        /**
         * @param {MouseEvent} event
         * @returns {void}
         */
        hoverButtonClickHandler(event) {
            event.preventDefault();
            event.stopPropagation();

            const box = this.getTurnIdContainerById(this.currentHoveredBoxId);

            if (!box) {
                console.warn("CollapsedBlocksManager: No box found for the current hovered box ID:", this.currentHoveredBoxId);
                return;
            }

            this.collapseBlock(box).catch(error => {
                console.error("CollapsedBlocksManager: collapse failed.", error);
            });
        }

        /**
         * @param {InputEvent} event
         * @returns {void}
         */
        rootElementInputHandler(event) {
            const target = event.target;

            if (!(target instanceof HTMLInputElement)) {
                return;
            }

            if (!target.classList.contains("mrbr-cvm-toolbar-collapsed-block-label")) {
                return;
            }

            window.clearTimeout(this.inputDebounceTimer);

            this.inputDebounceTimer = window.setTimeout(() => {
                const box = CollapsedBlocksManager.getClosestTurnContainerIdFromElement(target),
                    newLabel = target.value.trim();

                if (!box) {
                    return;
                }

                this.updateCollapsedBlockTitleForElement(box, newLabel).catch(error => {
                    console.error("CollapsedBlocksManager: label update failed.", error);
                });
            }, CollapsedBlocksManager.INPUT_DEBOUNCE_DELAY);
        }

        /**
         * Positions the hover collapse button beside the hovered turn.
         *
         * The button is fixed to the viewport so ChatGPT scroll-root changes do not
         * break its movement. It still uses the scroll root bounds so it stays aligned
         * with the conversation area rather than the whole browser window.
         *
         * @param {MouseEvent} event
         * @returns {void}
         */
        positionHoverButton(event) {
            const button = this.hoverButton,
                container = this.getScrollRoot() || this.rootElement;

            if (!button || !container || button.classList.contains("hidden")) {
                return;
            }

            const containerRect = container.getBoundingClientRect(),
                buttonHeight = button.offsetHeight || this.buttonHeight || CollapsedBlocksManager.HOVER_BUTTON_DEFAULT_HEIGHT,
                minimumTop = containerRect.top,
                maximumTop = Math.max(containerRect.top, containerRect.bottom - buttonHeight),
                requestedTop = event.clientY - (buttonHeight / 2),
                boundedTop = Math.min(Math.max(requestedTop, minimumTop), maximumTop),
                requestedLeft = containerRect.left + 4;

            this.buttonHeight = buttonHeight;
            button.style.position = "fixed";
            button.style.top = `${boundedTop}px`;
            button.style.left = `${requestedLeft}px`;
        }

        /**
         * @param {MouseEvent} event
         * @returns {void}
         */
        rootElementMouseMoveHandler(event) {
            window.clearTimeout(this.rootElementMouseMoveDebounceTimeoutId);

            this.rootElementMouseMoveDebounceTimeoutId = window.setTimeout(() => {
                this.positionHoverButton(event);
            }, this.rootElementMouseMoveDebounceMilliseconds);
        }

        /**
         * @param {string} turnId
         * @returns {HTMLElement | null}
         */
        getTurnIdContainerById(turnId) {
            if (!turnId) {
                return null;
            }

            return this.rootElement?.querySelector(`div[data-turn-id-container="${CSS.escape(turnId)}"]`) || null;
        }

        /**
         * @param {HTMLElement} element
         * @returns {HTMLElement}
         */
        getCollapseHostElement(element) {
            return CollapsedBlocksManager.getClosestTurnContainerIdFromElement(element)
                || element.closest?.("[data-turn-id-container]")
                || element;
        }

        /**
         * @param {HTMLElement} element
         * @returns {HTMLElement | null}
         */
        getConversationBlockForElement(element) {
            const blocks = this.scanner?.findBlocks?.() || [];

            return blocks.find(block => {
                const host = this.getCollapseHostElement(block);

                return block === element || element.contains(block) || host === element || host.contains(element);
            }) || (this.scanner?.isUsableBlockElement?.(element) ? element : null);
        }

        /**
         * @param {HTMLElement} element
         * @returns {{ turnId?: string, turnIdContainer?: string, blockKey?: string, blockIndex?: number, role?: string, contentHash?: string }}
         */
        getIdentityForElement(element) {
            const block = this.getConversationBlockForElement(element) || element,
                identity = this.scanner?.getBlockIdentity?.(block) || {},
                host = this.getCollapseHostElement(element),
                hostTurnId = host.getAttribute(CollapsedBlocksManager.ATTRIBUTE_TURN_ID_CONTAINER) || "";

            return {
                ...identity,
                turnId: identity.turnId || hostTurnId,
                turnIdContainer: hostTurnId || identity.turnId,
                blockKey: identity.blockKey || hostTurnId
            };
        }

        /**
         * @param {HTMLElement} block
         * @returns {string}
         */
        getDefaultTitleForBlock(block) {
            const conversationBlock = this.getConversationBlockForElement(block) || block;

            return this.scanner?.getBlockTitle?.(conversationBlock)
                || this.getNormalizedBlockText(conversationBlock).substring(0, 100)
                || "Collapsed block";
        }

        /**
         * @param {HTMLElement} block
         * @returns {string}
         */
        getNormalizedBlockText(block) {
            return (block.innerText || "")
                .split("\n")
                .map(line => line.trim())
                .filter(Boolean)
                .join("\n")
                .replace(/\s+/g, " ")
                .trim();
        }

        /**
         * Collapses and persists a block.
         *
         * @param {HTMLElement} element
         * @param {string} [title]
         * @returns {Promise<any | null>}
         */
        async collapseBlock(element, title) {
            if (!this.persistence) {
                console.warn("CollapsedBlocksManager: persistence is not available.");
                return null;
            }

            const host = this.getCollapseHostElement(element),
                identity = this.getIdentityForElement(element),
                blockTitle = title || this.getDefaultTitleForBlock(element),
                ViewManagerCollapsedBlock = window.MrbrCvm.ViewManagerCollapsedBlock,
                notes = this.notesManager?.getBlockNotes?.(identity.blockKey) || "";

            if (!identity.blockKey && !identity.turnId) {
                alert(this.getString("selectedBlockInvalidKey"));
                return null;
            }

            let collapsedBlock = this.findCollapsedBlockByIdentity(identity);

            if (!collapsedBlock) {
                collapsedBlock = ViewManagerCollapsedBlock.fromBlock(identity, blockTitle, notes);
                this.collapsedBlocks.push(collapsedBlock);
            } else {
                collapsedBlock.title = collapsedBlock.title || blockTitle;
                collapsedBlock.turnId = collapsedBlock.turnId || identity.turnId;
                collapsedBlock.turnIdContainer = collapsedBlock.turnIdContainer || identity.turnIdContainer;
                collapsedBlock.blockKey = collapsedBlock.blockKey || identity.blockKey;
                collapsedBlock.blockIndex = typeof collapsedBlock.blockIndex === "number"
                    ? collapsedBlock.blockIndex
                    : identity.blockIndex;
                collapsedBlock.role = collapsedBlock.role || identity.role;
                collapsedBlock.contentHash = collapsedBlock.contentHash || identity.contentHash;
                collapsedBlock.updatedUtc = new Date().toISOString();
            }

            await this.persistence.saveState();

            this.scheduleDomUpdate(() => {
                this.applyCollapsedBlockToElement(host, collapsedBlock);
                this.hoverButton?.classList.add("hidden");
                this.render();
            });

            return collapsedBlock;
        }

        /**
         * @param {{ turnId?: string, blockKey?: string, contentHash?: string }} identity
         * @returns {any | null}
         */
        findCollapsedBlockByIdentity(identity) {
            return this.collapsedBlocks.find(item => {
                return (identity.blockKey && item.blockKey === identity.blockKey)
                    || (identity.turnId && (item.turnId === identity.turnId || item.turnIdContainer === identity.turnId))
                    || (identity.contentHash && item.contentHash === identity.contentHash);
            }) || null;
        }

        /**
         * @param {HTMLElement} host
         * @param {any} collapsedBlock
         * @returns {void}
         */
        applyCollapsedBlockToElement(host, collapsedBlock) {
            const toolbar = this.getOrCreateCollapsedBlockToolbar(host),
                input = toolbar.querySelector(".mrbr-cvm-toolbar-collapsed-block-label");

            this.createCollapsingWrapper(host);

            host.classList.add("is-shrunk");
            host.setAttribute(CollapsedBlocksManager.COLLAPSED_HOST_ATTRIBUTE, collapsedBlock.blockKey || collapsedBlock.turnId || "");

            if (collapsedBlock.turnId) {
                host.setAttribute("data-mrbr-cvm-collapsed-host-turn-id", collapsedBlock.turnId);
            }

            if (input instanceof HTMLInputElement) {
                input.value = this.getCollapsedBlockTitle(collapsedBlock);
            }

            delete toolbar.dataset.mrbrCvmToolbarCollapsedBlockHidden;
            toolbar.removeAttribute("data-mrbr-cvm-toolbar-collapsed-block-hidden");

            if (toolbar.parentElement !== host) {
                host.appendChild(toolbar);
            }
        }

        /**
         * @param {HTMLElement} host
         * @returns {HTMLElement}
         */
        getOrCreateCollapsedBlockToolbar(host) {
            let toolbar = host.querySelector(CollapsedBlocksManager.TOOLBAR_SELECTOR);

            if (!(toolbar instanceof HTMLElement)) {
                toolbar = this.createCollapsedBlock();
            }

            return toolbar;
        }

        /**
         * @param {HTMLElement} host
         * @returns {HTMLElement | null}
         */
        createCollapsingWrapper(host) {
            host.setAttribute("data-mrbr-cvm-collapsing-wrapper", "");

            const content = host.querySelector("section") || host.firstElementChild;

            if (content instanceof HTMLElement) {
                content.setAttribute("data-mrbr-cvm-collapsing-content", "");
                return content;
            }

            return null;
        }

        static collapsedBlockElement = `
            <div data-mrbr-cvm-toolbar-collapsed-block data-mrbr-cvm-toolbar-collapsed-block-hidden>
                <div class="mrbr-cvm-toolbar" data-mrbr-cvm-toolbar-tools>
                    <div class="mrbr-cvm-toolbar-collapsed-block"></div>
                    <span><input class="mrbr-cvm-toolbar-collapsed-block-label" type="text"></span>
                </div>
            </div>`;

        /**
         * @returns {HTMLElement}
         */
        createCollapsedBlock() {
            const parsedElement = new DOMParser().parseFromString(CollapsedBlocksManager.collapsedBlockElement, "text/html"),
                collapsedBlock = parsedElement.body.firstElementChild,
                toolbar = collapsedBlock?.querySelector(".mrbr-cvm-toolbar-collapsed-block");

            if (!(collapsedBlock instanceof HTMLElement)) {
                throw new Error("CollapsedBlocksManager: Failed to create collapsed block toolbar.");
            }

            if (!(toolbar instanceof HTMLElement)) {
                return collapsedBlock;
            }

            const restoreButton = this.createIconButton({
                    title: "Restore",
                    iconName: "restore"
                }),
                noteButton = this.createIconButton({
                    title: "Note",
                    iconName: "note",
                    onClick: event => {
                        const host = CollapsedBlocksManager.getClosestTurnContainerIdFromElement(event.target instanceof HTMLElement ? event.target : null),
                            identity = host ? this.getIdentityForElement(host) : null,
                            collapsedBlockState = identity ? this.findCollapsedBlockByIdentity(identity) : null;

                        host?.dispatchEvent(new CustomEvent("mrbr-cvm-collapsed-block-note-requested", {
                            detail: { collapsedBlock: collapsedBlockState },
                            bubbles: true,
                            cancelable: true
                        }));
                    }
                });

            if (restoreButton) {
                restoreButton.setAttribute("data-mrbr-cvm-collapsed-action", "restore");
                toolbar.appendChild(restoreButton);
            }

            if (noteButton) {
                noteButton.setAttribute("data-mrbr-cvm-collapsed-action", "note");
                toolbar.appendChild(noteButton);
            }

            return collapsedBlock;
        }

        /**
         * @param {HTMLElement} element
         * @param {string} title
         * @returns {Promise<void>}
         */
        async updateCollapsedBlockTitleForElement(element, title) {
            const identity = this.getIdentityForElement(element),
                collapsedBlock = this.findCollapsedBlockByIdentity(identity);

            if (!collapsedBlock) {
                return;
            }

            collapsedBlock.title = title;
            collapsedBlock.updatedUtc = new Date().toISOString();

            await this.persistence.saveState();
            this.render();
        }

        /**
         * @param {HTMLElement} element
         * @returns {Promise<void>}
         */
        async restoreCollapsedBlockForElement(element) {
            const identity = this.getIdentityForElement(element),
                collapsedBlock = this.findCollapsedBlockByIdentity(identity);

            if (!collapsedBlock) {
                this.restoreCollapsedBlockDomOnlyForElement(element);
                return;
            }

            await this.restoreCollapsedBlock(collapsedBlock);
        }

        /**
         * @param {any} collapsedBlock
         * @returns {Promise<void>}
         */
        async restoreCollapsedBlock(collapsedBlock) {
            if (!this.persistence) {
                return;
            }

            this.state.collapsedBlocks = this.collapsedBlocks.filter(item => {
                return !this.areSameCollapsedBlock(item, collapsedBlock);
            });

            await this.persistence.saveState(this.state, { mergeFromStorage: false });

            this.scheduleDomUpdate(() => {
                const element = this.findElementForCollapsedBlock(collapsedBlock);

                if (element) {
                    this.restoreCollapsedBlockDomOnlyForElement(element);
                }

                this.render();
            });
        }

        /**
         * @returns {Promise<void>}
         */
        async restoreAllCollapsedBlocks() {
            const collapsedBlocks = [...this.collapsedBlocks];

            if (!collapsedBlocks.length || !this.persistence) {
                return;
            }

            this.state.collapsedBlocks = [];
            await this.persistence.saveState(this.state, { mergeFromStorage: false });

            this.scheduleDomUpdate(() => {
                collapsedBlocks.forEach(collapsedBlock => {
                    const element = this.findElementForCollapsedBlock(collapsedBlock);

                    if (element) {
                        this.restoreCollapsedBlockDomOnlyForElement(element);
                    }
                });

                this.removeOrphanedCollapsedDomState();
                this.render();
            });
        }

        /**
         * @param {HTMLElement} element
         * @returns {void}
         */
        restoreCollapsedBlockDomOnlyForElement(element) {
            const host = this.getCollapseHostElement(element),
                toolbar = host.querySelector(CollapsedBlocksManager.TOOLBAR_SELECTOR);

            host.classList.remove("is-shrunk");
            host.removeAttribute(CollapsedBlocksManager.COLLAPSED_HOST_ATTRIBUTE);
            host.removeAttribute("data-mrbr-cvm-collapsed-host-turn-id");
            host.removeAttribute("data-mrbr-cvm-collapsing-wrapper");
            host.querySelectorAll("[data-mrbr-cvm-collapsing-content]").forEach(content => {
                content.removeAttribute("data-mrbr-cvm-collapsing-content");
            });

            if (toolbar instanceof HTMLElement) {
                toolbar.dataset.mrbrCvmToolbarCollapsedBlockHidden = "true";
                toolbar.setAttribute("data-mrbr-cvm-toolbar-collapsed-block-hidden", "true");
            }
        }

        /**
         * @param {any} left
         * @param {any} right
         * @returns {boolean}
         */
        areSameCollapsedBlock(left, right) {
            return (left.blockKey && right.blockKey && left.blockKey === right.blockKey)
                || (left.turnId && right.turnId && left.turnId === right.turnId)
                || (left.turnIdContainer && right.turnIdContainer && left.turnIdContainer === right.turnIdContainer)
                || (left.contentHash && right.contentHash && left.contentHash === right.contentHash);
        }

        /**
         * Applies saved collapsed state to matching blocks.
         *
         * @param {HTMLElement[]} [blocks]
         * @returns {void}
         */
        applyPersistedCollapsedBlocks(blocks) {
            if (!this.scanner || !this.persistence) {
                return;
            }

            const currentBlocks = blocks || this.scanner.findBlocks();

            this.removeOrphanedCollapsedDomState();

            this.collapsedBlocks.forEach(collapsedBlock => {
                const block = this.scanner.findBlockForBookmark(collapsedBlock)
                    || this.findTurnContainer(collapsedBlock);

                if (!block) {
                    return;
                }

                const host = this.getCollapseHostElement(block);

                if (currentBlocks.length && !currentBlocks.includes(block) && !currentBlocks.some(currentBlock => host.contains(currentBlock) || currentBlock.contains(host))) {
                    return;
                }

                this.applyCollapsedBlockToElement(host, collapsedBlock);
            });
        }

        /**
         * Removes collapsed DOM state where no persisted record exists.
         *
         * @returns {void}
         */
        removeOrphanedCollapsedDomState() {
            const activeKeys = new Set(this.collapsedBlocks.map(item => item.blockKey).filter(Boolean)),
                activeTurnIds = new Set(this.collapsedBlocks.flatMap(item => [item.turnId, item.turnIdContainer]).filter(Boolean));

            document.querySelectorAll(`[${CollapsedBlocksManager.COLLAPSED_HOST_ATTRIBUTE}]`).forEach(element => {
                if (!(element instanceof HTMLElement)) {
                    return;
                }

                const key = element.getAttribute(CollapsedBlocksManager.COLLAPSED_HOST_ATTRIBUTE),
                    turnId = element.getAttribute("data-mrbr-cvm-collapsed-host-turn-id");

                if ((key && activeKeys.has(key)) || (turnId && activeTurnIds.has(turnId))) {
                    return;
                }

                this.restoreCollapsedBlockDomOnlyForElement(element);
            });
        }

        /**
         * @param {any} collapsedBlock
         * @returns {HTMLElement | null}
         */
        findElementForCollapsedBlock(collapsedBlock) {
            return this.scanner?.findBlockForBookmark?.(collapsedBlock)
                || this.findTurnContainer(collapsedBlock)
                || null;
        }

        /**
         * @param {{ turnId?: string, turnIdContainer?: string, blockKey?: string }} item
         * @returns {HTMLElement | null}
         */
        findTurnContainer(item) {
            const turnId = item.turnId || item.turnIdContainer;

            if (turnId) {
                const turnContainer = document.querySelector(
                    `[data-turn-id-container="${CSS.escape(turnId)}"]`
                );

                if (turnContainer instanceof HTMLElement) {
                    return turnContainer;
                }

                const turnElement = document.querySelector(
                    `[data-turn-id="${CSS.escape(turnId)}"]`
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
         * @param {any} collapsedBlock
         * @param {boolean} [reportNotFound]
         * @returns {Promise<HTMLElement | null>}
         */
        async goToCollapsedBlock(collapsedBlock, reportNotFound = true) {
            this.scanner?.findBlocks?.();
            this.applyPersistedCollapsedBlocks();

            let element = this.findElementForCollapsedBlock(collapsedBlock);

            if (!element && this.scrollTurnContainerIntoViewAndVerify) {
                await this.scrollTurnContainerIntoViewAndVerify(collapsedBlock, "center", 4);
                await this.waitForTurnHydration?.(500);
                this.applyPersistedCollapsedBlocks();
                element = this.findElementForCollapsedBlock(collapsedBlock);
            }

            if (!element) {
                if (reportNotFound) {
                    alert(this.formatString("couldNotFindCollapsedBlock", this.getCollapsedBlockTitle(collapsedBlock)));
                }

                return null;
            }

            if (this.scrollTurnContainerIntoViewAndVerify) {
                await this.scrollTurnContainerIntoViewAndVerify(collapsedBlock, "start", 4);
                await this.waitForTurnHydration?.(450);
            } else {
                element.scrollIntoView({ behavior: "smooth", block: "start" });
            }

            const refreshedElement = this.findElementForCollapsedBlock(collapsedBlock) || element;

            this.flashBlock(refreshedElement);

            return refreshedElement;
        }

        /**
         * @param {any} collapsedBlock
         * @returns {string}
         */
        getCollapsedBlockTitle(collapsedBlock) {
            if (collapsedBlock.title && collapsedBlock.title.trim()) {
                return collapsedBlock.title.trim();
            }

            if (collapsedBlock.label && collapsedBlock.label.trim()) {
                return collapsedBlock.label.trim();
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
         * @param {MouseEvent} event
         * @returns {CustomEvent}
         */
        createOnEnterBlockEvent(event) {
            return new CustomEvent("onEnterBlock", {
                detail: {
                    message: "Mouse entered a block",
                    time: new Date(),
                    originalEvent: event
                },
                bubbles: true,
                cancelable: true
            });
        }

        /**
         * @param {MouseEvent} event
         * @returns {CustomEvent}
         */
        createOnExitBlockEvent(event) {
            return new CustomEvent("onExitBlock", {
                detail: {
                    message: "Mouse exited a block",
                    time: new Date(),
                    originalEvent: event
                },
                bubbles: true,
                cancelable: true
            });
        }
    }

    window.MrbrCvm.CollapsedBlocksManager = CollapsedBlocksManager;
})();
