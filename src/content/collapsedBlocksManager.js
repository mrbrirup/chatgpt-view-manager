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
         *     informationBar?: any,
         *     batchProcessor?: any,
         *     createIconElement?: (iconName: string) => SVGSVGElement
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
            const AnimationFrameBatchProcessor = window.MrbrCvm.AnimationFrameBatchProcessor;

            this.informationBar = options.informationBar
                || (InformationBar ? new InformationBar({
                    strings: this.strings,
                    createIconElement: options.createIconElement
                }) : null);
            this.batchProcessor = options.batchProcessor
                || (AnimationFrameBatchProcessor ? new AnimationFrameBatchProcessor() : null);

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
         * @param {any} [trace]
         * @returns {Promise<any | null>}
         */
        async collapseBlock(element, title, trace) {
            if (!this.persistence) {
                console.warn("CollapsedBlocksManager: persistence is not available.");
                return null;
            }

            trace?.functionCalled("CollapsedBlocksManager.collapseBlock", {
                targetBeforeStateChange: trace.snapshotElement(element),
                collapsedBlockCountBefore: this.collapsedBlocks.length
            });
            const collapsedBlock = this.createOrUpdateCollapsedBlock(element, title);

            if (!collapsedBlock) {
                trace?.actual("No collapsed-block record could be created.");
                alert(this.getString("selectedBlockInvalidKey"));
                return null;
            }

            trace?.actual("Collapsed-block state record created or found.", {
                collapsedBlock,
                collapsedBlockCount: this.collapsedBlocks.length
            });
            trace?.expect("The live target should gain is-shrunk and an InformationBar in the next animation frame.");

            await this.runOnAnimationFrame(() => {
                const liveElement = this.findElementForCollapsedBlock(collapsedBlock)
                    || (element.isConnected ? element : null);

                trace?.functionCalled("CollapsedBlocksManager.collapseBlock.animationFrame", {
                    originalTarget: trace.snapshotElement(element),
                    resolvedLiveTarget: trace.snapshotElement(liveElement)
                });

                if (liveElement) {
                    this.applyCollapsedBlockToElement(
                        this.getCollapseHostElement(liveElement),
                        collapsedBlock
                    );
                }

                trace?.actual("DOM immediately after collapse frame.", {
                    resolvedLiveTarget: trace.snapshotElement(liveElement)
                });
            });

            trace?.functionCalled("ViewManagerLocalPersistence.saveState", {
                mergeFromStorage: true,
                collapsedBlockCount: this.collapsedBlocks.length
            });
            await this.persistence.saveState();
            trace?.actual("Persistence completed after collapse.", {
                collapsedBlockCount: this.persistence.state?.collapsedBlocks?.length,
                liveTarget: trace.snapshotElement(this.findElementForCollapsedBlock(collapsedBlock))
            });

            return collapsedBlock;
        }

        /**
         * Creates or refreshes collapsed state without saving or scheduling DOM work.
         *
         * @param {HTMLElement} element
         * @param {string} [title]
         * @returns {any | null}
         */
        createOrUpdateCollapsedBlock(element, title) {
            const identity = this.getIdentityForElement(element),
                blockTitle = title || this.getDefaultTitleForBlock(element),
                ViewManagerCollapsedBlock = window.MrbrCvm.ViewManagerCollapsedBlock,
                notes = this.notesManager?.getBlockNotes?.(identity.blockKey) || "";

            if (!identity.blockKey && !identity.turnId) {
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

            return collapsedBlock;
        }

        /**
         * Collapses a cached snapshot of conversation blocks over multiple frames.
         *
         * @param {HTMLElement[]} blocks
         * @returns {Promise<{ processedCount: number, totalCount: number }>}
         */
        async collapseAllBlocks(blocks) {
            if (!this.persistence || !this.batchProcessor) {
                return {
                    processedCount: 0,
                    totalCount: blocks.length
                };
            }

            const result = await this.batchProcessor.process(blocks, block => {
                this.collapseBlockWithoutPersistence(block);
            });

            await this.waitForAnimationFrame();

            const liveBlocksNeedingRetry = this.scanner.findBlocks().filter(block => {
                const host = this.getCollapseHostElement(block);

                return !host.querySelector(":scope > div.mrbr-cvm-information-bar");
            });

            if (liveBlocksNeedingRetry.length) {
                await this.batchProcessor.process(liveBlocksNeedingRetry, block => {
                    this.collapseBlockWithoutPersistence(block);
                });
            }

            await this.persistence.saveState(this.state);

            return result;
        }

        /**
         * Applies the normal collapse state and DOM path without saving.
         *
         * @param {HTMLElement} block
         * @returns {any | null}
         */
        collapseBlockWithoutPersistence(block) {
            const collapsedBlock = this.createOrUpdateCollapsedBlock(block);

            if (!collapsedBlock) {
                return null;
            }

            this.applyCollapsedBlockToElement(
                this.getCollapseHostElement(block),
                collapsedBlock
            );

            return collapsedBlock;
        }

        /**
         * Waits for one new animation frame before inspecting the live ChatGPT DOM.
         *
         * @returns {Promise<void>}
         */
        waitForAnimationFrame() {
            return new Promise(resolve => {
                window.requestAnimationFrame(() => resolve());
            });
        }

        /**
         * Runs a DOM operation in the next animation frame and waits for completion.
         *
         * @param {() => void} callback
         * @returns {Promise<void>}
         */
        runOnAnimationFrame(callback) {
            return new Promise((resolve, reject) => {
                window.requestAnimationFrame(() => {
                    try {
                        callback();
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                });
            });
        }

        /**
         * Expands a cached snapshot of conversation blocks over multiple frames.
         *
         * @param {HTMLElement[]} blocks
         * @returns {Promise<{ processedCount: number, totalCount: number }>}
         */
        async expandAllBlocks(blocks) {
            if (!this.persistence || !this.batchProcessor) {
                return {
                    processedCount: 0,
                    totalCount: blocks.length
                };
            }

            this.state.collapsedBlocks = [];

            const result = await this.batchProcessor.process(blocks, block => {
                this.restoreCollapsedBlockDomOnlyForElement(block);
            });

            this.removeOrphanedCollapsedDomState();
            await this.persistence.saveState(this.state, { mergeFromStorage: false });

            return result;
        }

        /**
         * @param {{ turnId?: string, blockKey?: string, contentHash?: string }} identity
         * @returns {any | null}
         */
        findCollapsedBlockByIdentity(identity) {
            const ViewManagerIdentity = window.MrbrCvm.ViewManagerIdentity;

            return this.collapsedBlocks.find(item => {
                return ViewManagerIdentity.matches(identity, item);
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
            return host;
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
                    || "",
                blockKey: collapsedBlock?.blockKey || "",
                turnId: collapsedBlock?.turnId || collapsedBlock?.turnIdContainer || "",
                participant: this.getParticipantForHost(host, collapsedBlock)
            });
        }

        /**
         * Gets the participant source from ChatGPT's turn section, with saved role fallback.
         *
         * @param {HTMLElement} host
         * @param {any} collapsedBlock
         * @returns {"user" | "assistant" | "other"}
         */
        getParticipantForHost(host, collapsedBlock) {
            const turnSection = host.matches("section[data-turn]")
                ? host
                : host.querySelector("section[data-turn]"),
                source = turnSection instanceof HTMLElement
                    ? turnSection.dataset.turn
                    : collapsedBlock?.role;

            return source === "user" || source === "assistant"
                ? source
                : "other";
        }

        /**
         * @param {HTMLElement} element
         * @param {any} [trace]
         * @returns {Promise<void>}
         */
        async restoreCollapsedBlockForElement(element, trace) {
            trace?.functionCalled("CollapsedBlocksManager.restoreCollapsedBlockForElement", {
                target: trace.snapshotElement(element),
                collapsedBlockCountBefore: this.collapsedBlocks.length
            });
            const identity = this.getIdentityForElement(element),
                collapsedBlock = this.findCollapsedBlockByIdentity(identity);

            if (!collapsedBlock) {
                trace?.actual("No persisted collapsed-block record matched; applying DOM-only restore.", {
                    identity
                });
                await this.runOnAnimationFrame(() => {
                    if (element.isConnected) {
                        this.restoreCollapsedBlockDomOnlyForElement(element);
                    }
                    trace?.actual("DOM after recordless restore frame.", {
                        target: trace.snapshotElement(element)
                    });
                });
                return;
            }

            trace?.actual("Matched collapsed-block record for restore.", {
                identity,
                collapsedBlock
            });
            await this.restoreCollapsedBlock(collapsedBlock, trace);
        }

        /**
         * @param {any} collapsedBlock
         * @param {any} [trace]
         * @returns {Promise<void>}
         */
        async restoreCollapsedBlock(collapsedBlock, trace) {
            if (!this.persistence) {
                return;
            }

            trace?.functionCalled("CollapsedBlocksManager.restoreCollapsedBlock", {
                collapsedBlock,
                collapsedBlockCountBefore: this.collapsedBlocks.length
            });
            this.state.collapsedBlocks = this.collapsedBlocks.filter(item => {
                return !this.areSameCollapsedBlock(item, collapsedBlock);
            });
            trace?.actual("Collapsed-block state record removed locally.", {
                collapsedBlockCount: this.state.collapsedBlocks.length
            });
            trace?.expect("The live target should lose is-shrunk and hide its InformationBar in the next animation frame.");

            await this.runOnAnimationFrame(() => {
                const element = this.findElementForCollapsedBlock(collapsedBlock);

                trace?.functionCalled("CollapsedBlocksManager.restoreCollapsedBlock.animationFrame", {
                    resolvedLiveTarget: trace.snapshotElement(element)
                });

                if (element) {
                    this.restoreCollapsedBlockDomOnlyForElement(element);
                }

                trace?.actual("DOM immediately after restore frame.", {
                    resolvedLiveTarget: trace.snapshotElement(element)
                });
            });

            trace?.functionCalled("ViewManagerLocalPersistence.saveState", {
                mergeFromStorage: false,
                collapsedBlockCount: this.state.collapsedBlocks.length
            });
            await this.persistence.saveState(this.state, { mergeFromStorage: false });
            trace?.actual("Persistence completed after restore.", {
                collapsedBlockCount: this.persistence.state?.collapsedBlocks?.length,
                liveTarget: trace.snapshotElement(this.findElementForCollapsedBlock(collapsedBlock))
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

            this.informationBar?.hide?.(host);
        }

        /**
         * @param {any} left
         * @param {any} right
         * @returns {boolean}
         */
        areSameCollapsedBlock(left, right) {
            return window.MrbrCvm.ViewManagerIdentity.matches(left, right);
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

            const currentBlocks = blocks || this.scanner.findBlocks(),
                trace = window.MrbrCvm.ViewManagerTrace?.current();

            trace?.functionCalled("CollapsedBlocksManager.applyPersistedCollapsedBlocks", {
                scannedBlockCount: currentBlocks.length,
                collapsedBlockCount: this.collapsedBlocks.length
            });

            this.removeOrphanedCollapsedDomState();

            this.collapsedBlocks.forEach(collapsedBlock => {
                const block = this.findTurnContainer(collapsedBlock)
                    || this.scanner.findBlockForBookmark(collapsedBlock);

                if (!block) {
                    return;
                }

                const host = this.getCollapseHostElement(block);

                if (currentBlocks.length && !currentBlocks.includes(block) && !currentBlocks.some(currentBlock => host.contains(currentBlock) || currentBlock.contains(host))) {
                    return;
                }

                this.applyCollapsedBlockToElement(host, collapsedBlock);
            });

            trace?.actual("applyPersistedCollapsedBlocks completed.", {
                collapsedHostCount: document.querySelectorAll(
                    "[data-mrbr-cvm-collapsed-host-key]"
                ).length,
                informationBarCount: document.querySelectorAll(
                    "[data-mrbr-cvm-information-bar]:not([hidden])"
                ).length
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

                const isActive = turnId
                    ? activeTurnIds.has(turnId)
                    : Boolean(key && activeKeys.has(key));

                if (isActive) {
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
         * Finds the visible Information Bar for a collapsed block identity.
         *
         * @param {any} collapsedBlock
         * @returns {HTMLElement | null}
         */
        findInformationBarForCollapsedBlock(collapsedBlock) {
            const ViewManagerIdentity = window.MrbrCvm.ViewManagerIdentity;
            const informationBars = document.querySelectorAll(
                "[data-mrbr-cvm-information-bar]:not([hidden])"
            );

            for (const element of informationBars) {
                if (!(element instanceof HTMLElement)) {
                    continue;
                }

                if (ViewManagerIdentity.matches({
                    blockKey: element.dataset.mrbrCvmBlockKey || "",
                    turnId: element.dataset.mrbrCvmTurnId || ""
                }, collapsedBlock)) {
                    return element;
                }
            }

            return null;
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

                return null;
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

            const refreshedElement = this.findInformationBarForCollapsedBlock(collapsedBlock)
                || this.findElementForCollapsedBlock(collapsedBlock)
                || element;

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
