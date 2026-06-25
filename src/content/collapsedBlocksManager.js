(() => {
    "use strict";

    window.MrbrCvm = window.MrbrCvm || {};

    /**
     * Manages collapsed block DOM behaviour and collapsed block persistence.
     */
    class CollapsedBlocksManager {
        static ATTRIBUTE_TURN_ID_CONTAINER = "data-turn-id-container";
        static SELECTOR_TURN_ID_CONTAINER_ATTRIBUTE = `div[${CollapsedBlocksManager.ATTRIBUTE_TURN_ID_CONTAINER}]`;
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
         *     strings?: { get: (key: string) => string, format?: (key: string, ...values: Array<string | number>) => string },
         *     scheduleDomUpdate?: (callback: () => void) => void,
         *     flashBlock?: (block: HTMLElement) => void,
         *     getScrollRoot?: () => HTMLElement | null,
         *     scrollTurnContainerIntoViewAndVerify?: (item: any, blockPosition?: ScrollLogicalPosition, maxRetries?: number) => Promise<boolean>,
         *     waitForTurnHydration?: (milliseconds?: number) => Promise<void>,
         *     informationBar?: any
         * }} [options]
         */
        constructor(options = {}) {
            this.scanner = options.scanner || null;
            this.persistence = options.persistence || null;
            this.notesManager = options.notesManager || null;
            this.strings = options.strings || window.MrbrCvm.ViewManagerStrings || null;
            this.scheduleDomUpdate = options.scheduleDomUpdate || (callback => window.requestAnimationFrame(callback));
            this.flashBlock = options.flashBlock || (block => block.classList.add("mrbr-cvm-flash"));
            this.getScrollRootCallback = options.getScrollRoot || null;
            this.scrollTurnContainerIntoViewAndVerify = options.scrollTurnContainerIntoViewAndVerify || null;
            this.waitForTurnHydration = options.waitForTurnHydration || null;
            const InformationBar = window.MrbrCvm.InformationBar;

            this.informationBar = options.informationBar
                || (InformationBar ? new InformationBar({ strings: this.strings }) : null);

            /** @type {HTMLElement | null} */
            this.blockHostElement = null;
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
                || !!element.querySelector("[data-mrbr-cvm-information-bar]:not([hidden])");
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
            const assignedBlock = element.matches?.("[data-mrbr-cvm-block-key]")
                ? element
                : element.querySelector?.("[data-mrbr-cvm-block-key]");

            if (assignedBlock instanceof HTMLElement) {
                return assignedBlock;
            }

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
            this.createCollapsingWrapper(host);

            host.classList.add("is-shrunk");
            host.setAttribute(CollapsedBlocksManager.COLLAPSED_HOST_ATTRIBUTE, collapsedBlock.blockKey || collapsedBlock.turnId || "");

            if (collapsedBlock.turnId) {
                host.setAttribute("data-mrbr-cvm-collapsed-host-turn-id", collapsedBlock.turnId);
            }

            this.updateInformationBar(host, collapsedBlock);
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

        /**
         * Updates the display-only information bar for a collapsed block.
         *
         * @param {HTMLElement} host
         * @param {any} collapsedBlock
         * @returns {void}
         */
        updateInformationBar(host, collapsedBlock) {
            if (!this.informationBar) {
                return;
            }

            this.informationBar.show(host, {
                title: this.getCollapsedBlockTitle(collapsedBlock),
                notes: this.notesManager?.getCollapsedBlockNotes?.(collapsedBlock)
                    || this.notesManager?.getBlockNotes?.(collapsedBlock?.blockKey)
                    || collapsedBlock?.notes
                    || ""
            });
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
            });
        }

        /**
         * @param {HTMLElement} element
         * @returns {void}
         */
        restoreCollapsedBlockDomOnlyForElement(element) {
            const host = this.getCollapseHostElement(element);

            host.classList.remove("is-shrunk");
            host.removeAttribute(CollapsedBlocksManager.COLLAPSED_HOST_ATTRIBUTE);
            host.removeAttribute("data-mrbr-cvm-collapsed-host-turn-id");
            host.removeAttribute("data-mrbr-cvm-collapsing-wrapper");
            host.querySelectorAll("[data-mrbr-cvm-collapsing-content]").forEach(content => {
                content.removeAttribute("data-mrbr-cvm-collapsing-content");
            });

            this.informationBar?.hide?.(host);
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

    }

    window.MrbrCvm.CollapsedBlocksManager = CollapsedBlocksManager;
})();
