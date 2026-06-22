/**
 * Todo: Restore Block Functionality
 * Group: Collapsed Blocks
 * Label: feature
 * Description: Implement the functionality to restore a collapsed block when the user clicks the restore button on the collapsed block toolbar.
 * File: src/content/collapsedBlocksManager.js
 * Line: 1
 * Id: {6256af64-55fa-4160-ab3d-c4f9e149bf8c}
 * Date: 2026-06-22
 * Time: 14:37:31
 * Status: Open
 * Completed: 
 * GitUrl: https://github.com/mrbrirup/chatgpt-view-manager/issues/16
 */
/**
 * Todo: Collapse All
 * Group: Collapsed Blocks
 * Label: feature
 * Description: 
 * File: src/content/collapsedBlocksManager.js
 * Line: 15
 * Id: {25bdf4af-c176-4594-b2d3-2bf259ea81f7}
 * Date: 2026-06-22
 * Time: 17:01:54
 * Status: Open
 * Completed: 
 * GitUrl: https://github.com/mrbrirup/chatgpt-view-manager/issues/18
 */
/**
 * Todo: Add icon for Collapsed Block Type
 * Group: Collapsed Blocks
 * Label: feature
 * Description: 
 * File: src/content/collapsedBlocksManager.js
 * Line: 29
 * Id: {5231fdda-57b9-42c6-b8a5-d9b729a19996}
 * Date: 2026-06-22
 * Time: 17:02:33
 * Status: Open
 * Completed: 
 * GitUrl: https://github.com/mrbrirup/chatgpt-view-manager/issues/19
 */
/**
 * Todo: Persist Collapsed Block State Across Sessions
 * Group: Collapsed Blocks
 * Label: feature
 * Description: 
 * File: src/content/collapsedBlocksManager.js
 * Line: 43
 * Id: {25edba9f-6739-4192-8b98-53f2014dfc91}
 * Date: 2026-06-22
 * Time: 17:03:10
 * Status: Open
 * Completed: 
 * GitUrl: https://github.com/mrbrirup/chatgpt-view-manager/issues/20
 */
/**
 * Todo: Style Hover button Correctly
 * Group: Collapsed Blocks
 * Label: bug
 * Description: 
 * File: src/content/collapsedBlocksManager.js
 * Line: 57
 * Id: {f846b1c4-59c2-454a-a478-32b3c283757c}
 * Date: 2026-06-22
 * Time: 17:04:10
 * Status: Open
 * Completed: 
 * GitUrl: https://github.com/mrbrirup/chatgpt-view-manager/issues/21
 */
/**
 * Todo: Navigate to top of block on Collapse
 * Group: Collapsed Blocks
 * Label: feature
 * Description: 
 * File: src/content/collapsedBlocksManager.js
 * Line: 71
 * Id: {b83afc73-c3a8-4d76-88df-33a6c4c79253}
 * Date: 2026-06-22
 * Time: 17:14:15
 * Status: Open
 * Completed: 
 * GitUrl: https://github.com/mrbrirup/chatgpt-view-manager/issues/22
 */
(() => {
    /**
     * @typedef {{
     * conversationId: string,
     * turnIdContainer: string,
     * turnId: string,
     * label: string,
     * timestamp: string
     * }} CollapsedBlockInfo
     */

    /**
     * @typedef {{
     * result: boolean,
     * value: any
     * }} TryResult
     */
    /**
     * @typedef {Omit<TryResult, 'value'> & { value: HTMLElement|null }} TryElementResult
     */


    class CollapsedBlocksManager {
        /**
         * Static property to store collapsed blocks for each conversation.
         * The outer Map's key is the conversation identifier (string).
         * The inner Map's key is the turnId (string), and its value is an object containing:
         * @type {Map<string, Map<string, CollapsedBlockInfo>>}
         */
        static collapsedBlocks = new Map(); // Map to store collapsed blocks with their unique identifiers
        /**
         * @type {string[]}
         * List of CSS selectors to find the root element for block management.
         * The first selector that matches an element in the DOM will be used as the root.
         * This allows flexibility in different page structures or layouts.
         * The selectors are ordered by priority, with the most specific ones first.
         */
        static rootSelectors = [
            ".not-print\\:overflow-y-auto",
            "div[data-scroll-root]",
            "[data-scroll-root]",
            "main"
        ];

        /**
         * Gets the root element for block management based on the defined selectors.
         * @type {HTMLElement|null} The root element if found, otherwise null.
        */
        #blockHostElement = null;
        constructor() { }
        /**
         * Gets the root element for block management based on the defined selectors.
         *
         * @returns {HTMLElement | null} The root element if found, otherwise null.
         */
        getRootElement() {
            if (this.#blockHostElement) {
                return this.#blockHostElement;
            }

            for (const selector of CollapsedBlocksManager.rootSelectors) {
                const element = document.querySelector(selector);

                if (element instanceof HTMLElement) {
                    this.#blockHostElement = element;
                    return this.#blockHostElement;
                }
            }
            return null;
        }
        /**
         * Gets the root element for block management.
         * If the root element has already been found and stored, it returns that.
         * Otherwise, it attempts to find the root element using the defined selectors.
         * @returns {HTMLElement|null} The root element if found, otherwise null.
         */
        get rootElement() {
            return this.#blockHostElement || this.getRootElement();
        }

        /**
         * Initializes the CollapsedBlocksManager by finding the root element and wiring up event listeners.
         * @returns {void}
         */
        init() {

            this.#blockHostElement = /** @type {HTMLElement} */ (this.rootElement);

            if (!this.#blockHostElement) {
                console.warn("CollapsedBlocksManager: No block host element found.");
                return;
            }
            console.log("CollapsedBlocksManager: Block host element found:", this.#blockHostElement);
            this.wireEvents();
        }
        /**
         * @type {HTMLButtonElement?}
         * The hover button that appears when hovering over a block.
         * This button allows users to collapse the block.
         */
        #hoverButton = null;
        /**
         * Gets the hover button, creating it if it doesn't already exist.
         * @returns {HTMLButtonElement} The hover button element, or null if it couldn't be created.
         */
        get hoverButton() {
            const self = this;
            return self.#hoverButton = self.#hoverButton || self.createHoverButton();
        }
        /**
         * Creates a hover button for collapsing blocks and appends it to the block host element.
         * @returns {HTMLButtonElement?} 
         */
        createHoverButton() {
            const
                self = this,
                container = self.#blockHostElement,
                ViewManagerIconButtonFactory = window.MrbrCvm?.ViewManagerIconButtonFactory;
            if (ViewManagerIconButtonFactory == null) {
                console.warn("CollapsedBlocksManager: ViewManagerIconButtonFactory not found.");
                return null;
            }

            const
                iconButtonFactory = new ViewManagerIconButtonFactory(),
                button = iconButtonFactory.createIconButton({ title: "Collapse", iconName: "collapse" }),
                style = button.style;
            button.id = 'actionBtn';
            style.zIndex = '100000'; // Ensure the button is on top of other elements
            style.top = '0px';
            style.left = '0px';
            style.borderColor = 'rgba(0, 0, 0, 0.86)';
            button.classList.add('mrbr-cvm-hover-button');
            var buttonBackgroundColor = window.getComputedStyle(button).backgroundColor;
            // Set the backgroudn to .72 alpha of the current background color
            style.backgroundColor = buttonBackgroundColor.replace(/rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/, (match, r, g, b) => {
                return `rgba(${r}, ${g}, ${b}, 0.72)`;
            });
            self.#hoverButton = button;
            return button;
        }
        #currentHoveredBoxId = "";
        get currentHoveredBoxId() { return this.#currentHoveredBoxId; }
        static HOVER_BUTTON_DEFAULT_HEIGHT = 32; // Default height for the hover button in pixels
        static ATTRIBUTE_TURN_ID_CONTAINER = 'data-turn-id-container';
        static SELECTOR_TURN_ID_CONTAINER_ATTRIBUTE = `div[${CollapsedBlocksManager.ATTRIBUTE_TURN_ID_CONTAINER}]`;
        /**
         * 
         * @param {HTMLElement} element 
         * @returns {string} The turn container ID, or an empty string if not found.
         */
        static getTurnContainerIdFromElement(element) { return element.getAttribute(CollapsedBlocksManager.ATTRIBUTE_TURN_ID_CONTAINER) || ""; }
        /**
         * Gets the closest ancestor element with the data-turn-id-container attribute.
         * @param {HTMLElement} element 
         * @returns {HTMLElement | null} The closest ancestor element with the data-turn-id-container attribute, or null if not found.
         */
        static getClosestTurnContainerIdFromElement(element) {
            return /** @type {HTMLElement | null} */ ((element)?.closest(CollapsedBlocksManager.SELECTOR_TURN_ID_CONTAINER_ATTRIBUTE));
        }

        /**
         * Checks if the current box is collapsed by looking for the presence of a collapsed toolbar within it.
         * @param {HTMLElement} element 
         * @returns {boolean} True if the current box is collapsed, false otherwise.
         */
        static isCurrentBoxCollapsed(element) {
            const
                collapsedToolbar = element?.querySelector('.mrbr-cvm-toolbar'),
                toolbarHost = collapsedToolbar?.closest('div[data-mrbr-cvm-toolbar-collapsed-block][data-mrbr-cvm-toolbar-collapsed-block-hidden]');


            return (element?.contains(collapsedToolbar) && (!toolbarHost)) || false;
        }
        /**
        * @type {number}
        */
        #containerMouseOverDebounceTimeoutId = 0;

        /**
         * @type {number}
         */
        #containerMouseOverDebounceMilliseconds = 40;
        /**
         * Handles the mouse over event on the container.
         *
         * The raw mouseover event fires frequently when moving between child elements
         * inside the same ChatGPT turn. This handler ignores those internal movements
         * and debounces only real changes between turn containers.
         *
         * @param {MouseEvent} event
         * @returns {void}
         */
        containerMouseOverHandler(event) {
            const CBM = CollapsedBlocksManager,
                targetElement = event.target instanceof HTMLElement
                    ? event.target
                    : null,
                relatedElement = event.relatedTarget instanceof HTMLElement
                    ? event.relatedTarget
                    : null;

            if (!targetElement) {
                return;
            }

            const box = CBM.getClosestTurnContainerIdFromElement(targetElement);

            if (!box) {
                return;
            }

            const boxId = CBM.getTurnContainerIdFromElement(box);

            if (!boxId) {
                console.warn("Hovered box does not have a data-turn-id-container attribute.");
                return;
            }

            const relatedBox = relatedElement
                ? CBM.getClosestTurnContainerIdFromElement(relatedElement)
                : null;

            if (relatedBox === box) {
                return;
            }

            if (boxId === this.#currentHoveredBoxId) { return; }

            window.clearTimeout(this.#containerMouseOverDebounceTimeoutId);

            this.#containerMouseOverDebounceTimeoutId = window.setTimeout(() => {
                this.#containerMouseOverDebounceTimeoutId = 0;
                this.applyContainerMouseOver(box, event);
            }, this.#containerMouseOverDebounceMilliseconds);
        }
        /**
         * Applies the hover state for a ChatGPT turn container.
         *
         * @param {HTMLElement} box
         * @param {MouseEvent} event
         * @returns {void}
         */
        applyContainerMouseOver(box, event) {
            const CBM = CollapsedBlocksManager,
                container = /** @type {HTMLElement} */ (this.rootElement),
                button = /** @type {HTMLElement} */ (this.hoverButton),
                boxId = CBM.getTurnContainerIdFromElement(box);

            if (!boxId) {
                console.warn("Hovered box does not have a data-turn-id-container attribute.");
                return;
            }

            if (this.currentHoveredBoxId && this.currentHoveredBoxId !== boxId) {
                const existingBox = container?.querySelector(
                    `div[data-turn-id-container="${CSS.escape(this.currentHoveredBoxId)}"]`
                );

                existingBox?.classList.remove("mrbr-cvm-collapsed-block-target");
            }

            this.#currentHoveredBoxId = boxId;

            const currentlyCollapsed = CBM.isCurrentBoxCollapsed(box);

            box.classList.add("mrbr-cvm-collapsed-block-target");

            if (button.parentElement !== container) {
                container?.appendChild(button);

                const buttonHeight = button.offsetHeight,
                    iconStyle = button.querySelector("svg")?.style;

                if (iconStyle) {
                    iconStyle.width = `${buttonHeight}px`;
                    iconStyle.height = `${buttonHeight}px`;
                }
            }

            button.classList.toggle("hidden", currentlyCollapsed);

            container?.dispatchEvent(this.createOnEnterBlockEvent(event));
        }
        /**
         * Creates a custom event for when the mouse enters a block.
         * @param {MouseEvent} event 
         */
        containerMouseOutHandler(event) {
            const
                self = this,
                container = /** @type {HTMLElement} */ (self.#blockHostElement || self.getRootElement()),
                box = CollapsedBlocksManager.getClosestTurnContainerIdFromElement(/** @type {HTMLElement} */(event.target));


            if (!(box?.contains(/** @type {HTMLElement} */(event.relatedTarget)))) {
                if (self.hoverButton.parentElement === box) {
                    container?.dispatchEvent(self.createOnExitBlockEvent(event));
                }
            }
        }

        /**
         * Handles the click event on the container element.
         * Restore the block if the click is on the collapse button inside the hovered box.
         * @param {MouseEvent} event 
         */
        containerClickHandler(event) {
            const
                CBM = CollapsedBlocksManager,
                /** @type {HTMLElement} */ target = event.target,
                box = CBM.getClosestTurnContainerIdFromElement(target);
            if (!box || !target) { return; }
            const button = /** @type {HTMLElement} */ (target).closest('.mrbr-cvm-icon-button');
            if (box.contains(button)) {
                const labelText = /** @type {HTMLInputElement} */ (box.querySelector('.mrbr-cvm-toolbar-collapsed-block-label'))?.value || "N/A";
                /**
                 * Todo: Implement the restore functionality.
                 * Group: Collapsed Blocks
                 * Label: feature
                 * Description: Restore a collapsed block when the user clicks the restore button on the collapsed block toolbar.
                 * File: src/content/collapsedBlocksManager.js
                 * Line: 315
                 * Id: {0343fc1b-883d-4b0d-bf41-48d2769a228b}
                 * Date: 2026-06-22
                 * Time: 14:43:53
                 * Status: Open
                 * Completed: 
                 * GitUrl: https://github.com/mrbrirup/chatgpt-view-manager/issues/17
                 */
                box.classList.remove('is-shrunk');
                const toolbar = /** @type {HTMLElement|null} */ (box.querySelector('div[data-mrbr-cvm-toolbar-collapsed-block]'));
                if (toolbar) {
                    toolbar.dataset.mrbrCvmToolbarCollapsedBlockHidden = "true";
                }




            }
        }
        /**
         * Gets the container element for a specific turn ID.
         * @param {string} turnId 
         * @returns {HTMLElement | null}
         */
        getTurnIdContainerById(turnId) {
            const self = this;
            return self.rootElement?.querySelector(`div[data-turn-id-container="${turnId}"]`) || null;
        }
        /**
         * Handles the click event on the hover button to collapse the currently hovered block.
         * Collapses the block and updates the collapsed blocks state.
         * @returns {void}
         * @fires CollapsedBlocksManager#onEnterBlock
         * @param {MouseEvent} event 
         */
        hoverButtonClickHandler(event) {
            const
                self = this,
                button = /** @type {HTMLButtonElement} */  (self.#hoverButton || self.createHoverButton());

            //button.addEventListener('click', (event) => {
            // const container = /** @type {HTMLElement} */ (this.rootElement),
            //     box = container?.querySelector('div[data-turn-id-container="' + self.#currentHoveredBoxId + '"]');
            const box = self.getTurnIdContainerById(self.#currentHoveredBoxId);
            if(!box) {
                console.warn("No box found for the current hovered box ID:", self.#currentHoveredBoxId);
                return;
            }
            let
                //collapsedBlock = self.createCollapsedBlock();
                collapsedBlockResult = /** @type {TryElementResult} */ ({ result: false, value: null }),
                hasCollapsedBlock = self.tryGetCollapsedBlock(box, collapsedBlockResult);

            if (!box || !hasCollapsedBlock) {
                console.warn("No box found for the current hovered box ID:", self.#currentHoveredBoxId);
                return;
            }
            const
                labelText = self.getNormalizedBlockText(box);
            let key = this.tryAddConversation(),
                turnId = box?.getAttribute('data-turn-id-container') || "";
            if (key && turnId) {
                let collapsedBlocksForConversation = this.tryGetCollapsedBlocksForCurrentConversation();
                if (!collapsedBlocksForConversation.has(turnId)) {
                    collapsedBlocksForConversation.set(turnId, { turnId, label: labelText, timestamp: new Date().toISOString() });
                }
            }
            const collapsingWrapper = self.createCollapsingWrapper(box);
            requestAnimationFrame(() => {
                collapsedBlockResult.value.querySelector('input').value = labelText; // Set the label text
                box.appendChild(collapsedBlockResult.value); // Add the collapsed block content
                button.classList.add('hidden'); // Hide the button after collapsing

                key = this.tryAddConversation();
                turnId = box?.getAttribute('data-turn-id-container') || "";
                console.log("Updating collapsed block label for turnId:", turnId, "with new label:", labelText, "Key:", key);
                if (key && turnId) {
                    this.tryUpdateConversationCollapsedBlock(turnId, labelText);
                }



                requestAnimationFrame(() => {
                    box.classList.add('is-shrunk'); // Add a class to the box to indicate it's collapsed
                    delete collapsedBlockResult.value.dataset.mrbrCvmToolbarCollapsedBlockHidden; // Remove the hidden attribute to show the collapsed block
                });
            });
        }

        /**
         * 
         * @param {HTMLElement} element 
         * @param {TryElementResult} elementResult 
         * @returns {boolean} True if an existing toolbar was found, false otherwise.
         */
        tryGetCollapsedBlock(element, elementResult) {
            if (!element) { return false; }
            if (!elementResult) {
                throw new Error("ElementResult is missing, null, or undefined!");
            }
            let existingCollapsedBlock = /** @type {HTMLElement | null} */ (element?.querySelector('div[data-mrbr-cvm-toolbar-collapsed-block]'));

            if (!existingCollapsedBlock) {
                existingCollapsedBlock = this.createCollapsedBlock();
            }
            elementResult.result = !!existingCollapsedBlock;
            if (existingCollapsedBlock) {
                elementResult.value = existingCollapsedBlock;
            }
            return !!existingCollapsedBlock;
        }

        static INPUT_DEBOUNCE_DELAY = 300; // milliseconds
        #inputDebounceTimer = -1;
        /**
         * Handles the input event for all the collapsed block label inputs within the root element.
         * This method is debounced to avoid excessive updates when the user is typing.
         * It checks if the input event target is a collapsed block label input, and if so,
         * Debounces the input to avoid excessive updates.
         * @returns {void}
         * @param {InputEvent} event 
         */
        rootElementInputHandler(event) {
            const
                self = this,
                { target } = event,
                CBM = CollapsedBlocksManager;
            if (!(target instanceof HTMLInputElement)) {
                console.log("Input change event ignored for non-input target:", target);
                return;
            }
            if (target.classList.contains('mrbr-cvm-toolbar-collapsed-block-label') == false) {
                console.log("Input change event ignored for target:", target);
                return;
            }
            clearTimeout(self.#inputDebounceTimer);
            self.#inputDebounceTimer = setTimeout(() => {

                //const collapsedBlock = inputElement.closest('.mrbr-cvm-toolbar');
                const box = CBM.getClosestTurnContainerIdFromElement(target);
                let newLabel = "";
                if (box) {
                    newLabel = target.value.trim();
                    // Here you can handle the new label, e.g., save it or update the UI
                    console.log('New label for collapsed block:', newLabel);
                }

                const
                    key = this.tryAddConversation(),
                    turnId = box?.getAttribute('data-turn-id-container') || "";
                console.log("Updating collapsed block label for turnId:", turnId, "with new label:", newLabel, "Key:", key);
                if (key && turnId) {
                    this.tryUpdateConversationCollapsedBlock(turnId, newLabel);
                }
            }, CollapsedBlocksManager.INPUT_DEBOUNCE_DELAY);
        }
        /**
         * Handles the mouse move event on the root element.
         * Debounces the event to avoid excessive processing when the mouse is moving rapidly.
         * @param {MouseEvent} event
         * @returns {void}
         * 
         */
        rootElementMouseMoveHandler(event) {
            const self = this;
            // Debounce the mouse move event to avoid excessive processing
            if (self.#rootElementMouseMoveDebounceTimeoutId) {
                clearTimeout(self.#rootElementMouseMoveDebounceTimeoutId);
            }
            self.#rootElementMouseMoveDebounceTimeoutId = setTimeout(() => {
                const
                    button = /** @type {HTMLElement} */ (self.hoverButton),
                    container = /** @type {HTMLElement} */ (self.rootElement);
                // Get the vertical (Y) coordinate of the mouse
                const mouseScaleY = event.clientY;

                // Change the box's top position to match the mouse Y position
                button.style.top = `${-(self.buttonHeight / 2) + mouseScaleY + container.scrollTop}px`;
            }, self.#rootElementMouseMoveDebounceMilliseconds);

        }
        #rootElementMouseMoveDebounceTimeoutId = 0;
        #rootElementMouseMoveDebounceMilliseconds = 40;
        #buttonHeight = 32;
        get buttonHeight() { return this.#buttonHeight; }
        /**
         * Wires up event listeners for the block host element, including mouseover, mouseout, and click events.
         * @returns {void} The custom event with the type 'onEnterBlock'.
         */
        wireEvents() {
            const
                self = this,
                container = /** @type {HTMLElement} */ (self.rootElement);

            container.addEventListener('mouseover', self.containerMouseOverHandler.bind(self));

            container.addEventListener('mouseout', self.containerMouseOutHandler.bind(self));

            container.addEventListener('click', self.containerClickHandler.bind(self));

            self.hoverButton.addEventListener('click', self.hoverButtonClickHandler.bind(self));

            container.addEventListener('input', self.rootElementInputHandler.bind(self));

            document.addEventListener('mousemove', self.rootElementMouseMoveHandler.bind(self));
        }

        /**
         * 
         * @param {string} turnId 
         * @param {string} labelText 
         */
        tryUpdateConversationCollapsedBlock(turnId, labelText) {
            const self = this;
            let key = this.tryAddConversation();
            if (key && turnId) {
                let collapsedBlocksForConversation = this.tryGetCollapsedBlocksForCurrentConversation();
                if (!collapsedBlocksForConversation) {
                    console.warn("CollapsedBlocksManager: No collapsed blocks found for the current conversation.");
                    return;
                }
                if (collapsedBlocksForConversation.has(turnId)) {
                    let collapsedBlockInfo = /** @type {CollapsedBlockInfo} */ (collapsedBlocksForConversation.get(turnId));
                    collapsedBlockInfo.label = labelText;
                    collapsedBlockInfo.timestamp = new Date().toISOString();
                }
                else {
                    let collapseBlockInfo = self.createCollapsedBlockInfo(key, turnId, turnId, labelText);
                    collapsedBlocksForConversation.set(turnId, collapseBlockInfo);
                }
                console.log(collapsedBlocksForConversation);
            }
        }

        /**
         * @param {string} conversationId
         * @param {string} turnId 
         * @param {string} turnIdContainer
         * @param {string} labelText 
         * @returns {CollapsedBlockInfo} The created CollapsedBlockInfo object.
         * 
         * Creates a CollapsedBlockInfo object with the provided parameters.
         */
        createCollapsedBlockInfo(conversationId, turnIdContainer, turnId, labelText) {
            return /** @type {CollapsedBlockInfo} */ ({ conversationId, turnId, turnIdContainer, label: labelText, timestamp: new Date().toISOString() });
        }

        /**
         * Gets normalized text for hashing and title generation.
         *
         * @param {HTMLElement} block
         * @returns {string}
         */
        getNormalizedBlockText(block) {
            let returnText = (block.innerText || "")
                .split("\n")
                .map(line => line.trim())
                .filter(Boolean)
                .join("\n")
                .replace(/\s+/g, " ")
                .trim()
                .substring(0, 100); // Limit to first 100 characters
            return returnText;

        }
        /**
         * 
         * @param {HTMLElement} targetElement 
         * @returns {HTMLElement} 
         */
        createCollapsingWrapper(targetElement) {
            targetElement.dataMrbrCvmCollapsingWrapper = true;
            targetElement.setAttribute('data-mrbr-cvm-collapsing-wrapper', '');
            const content = targetElement.querySelector("section");
            content.dataMrbrCvmCollapsingContent = true;
            content.setAttribute('data-mrbr-cvm-collapsing-content', '');
            return content;
        }

        /**
         * 
         * @param {MouseEvent} event 
         * @returns {CustomEvent}         
         */
        createOnEnterBlockEvent(event) {
            const customEvent = new CustomEvent('onEnterBlock', {
                detail: {
                    message: 'Mouse entered a block',
                    time: new Date(),
                    originalEvent: event
                },
                bubbles: true,
                cancelable: true
            });
            return customEvent;
        }
        /**
         * 
         * @param {MouseEvent} event 
         * @returns {CustomEvent}
         */
        createOnExitBlockEvent(event) {
            const customEvent = new CustomEvent('onExitBlock', {
                detail: {
                    message: 'Mouse exited a block',
                    time: new Date(),
                    originalEvent: event
                },
                bubbles: true,
                cancelable: true
            });
            return customEvent;
        }
        static collapsedBlockElement =
            `         
            <div data-mrbr-cvm-toolbar-collapsed-block data-mrbr-cvm-toolbar-collapsed-block-hidden>           
                <div class="mrbr-cvm-toolbar" data-mrbr-cvm-toolbar-tools >
                    <div class="mrbr-cvm-toolbar-collapsed-block"></div>
                    <span><input class="mrbr-cvm-toolbar-collapsed-block-label" type="text"></input></span>
                </div>
            </div>
            `;
        /**
         * Creates a collapsed block element with a toolbar and label input.
         * @returns {HTMLElement} The collapsed block element.
         */
        createCollapsedBlock() {
            const
                /**
                 * Create the collapsed block element from the static HTML string defined in `collapsedBlockElement`.
                 */
                parsedElement = new DOMParser().parseFromString(CollapsedBlocksManager.collapsedBlockElement, 'text/html'),
                collapsedBlock = /** @type {HTMLElement} */ (parsedElement.body.childNodes[0]),
                ViewManagerIconButtonFactory = window.MrbrCvm?.ViewManagerIconButtonFactory;
            if (!ViewManagerIconButtonFactory) {
                console.warn("CollapsedBlocksManager: ViewManagerIconButtonFactory not found.");
                return collapsedBlock;
            }
            const
                iconButtonFactory = new (ViewManagerIconButtonFactory)(),
                toolbar = /** @type {HTMLElement|null} */ (collapsedBlock.querySelector('.mrbr-cvm-toolbar-collapsed-block'));
            if (!toolbar) {
                console.warn("CollapsedBlocksManager: Toolbar element not found in collapsed block.");
                return collapsedBlock;
            }
            const buttons = [{ title: "Collapse", iconName: "restore" }, { title: "Note", iconName: "note" }];
            toolbar.append(...buttons.map(btn => iconButtonFactory.createIconButton({ title: btn.title, iconName: btn.iconName })));
            return collapsedBlock;
        }
        /**
         * Gets the storage key for the current ChatGPT conversation.
         *
         * @returns {string|null} The storage key for the current ChatGPT conversation, or null if not found.
         */
        getConversationKey() {
            const url = new URL(window.location.href);

            if (url.pathname.startsWith("/c/")) {
                return `${url.origin}${url.pathname}`;
            }
            const keyRegex = /\/c\/(?<conversationKey>[a-zA-Z0-9-]*)[?#]*$/gm;
            const match = keyRegex.exec(url.pathname);
            if (match && match.groups && match.groups.conversationKey) {
                return match.groups.conversationKey;
            }
            return null;
        }
        /**
         * @returns {string|null} The storage key for the current ChatGPT conversation.         
         */
        tryAddConversation() {
            const conversationKey = this.getConversationKey();
            if (!conversationKey) {
                console.warn("CollapsedBlocksManager: No conversation key found.");
                return null;
            }
            if (!CollapsedBlocksManager.collapsedBlocks.has(conversationKey)) {
                CollapsedBlocksManager.collapsedBlocks.set(conversationKey, new Map());
            }
            console.log("CollapsedBlocksManager: Current conversation key:", conversationKey);
            return conversationKey;
        }
        /**
         * @returns {Map<string, CollapsedBlockInfo>|null} The collapsed blocks for the current ChatGPT conversation.
         */
        tryGetCollapsedBlocksForCurrentConversation() {
            const conversationKey = this.getConversationKey();
            if (!conversationKey) {
                console.warn("CollapsedBlocksManager: No conversation key found.");
                return null;
            }
            var collapsedBlocks = CollapsedBlocksManager.collapsedBlocks.get(conversationKey);
            if (!collapsedBlocks) {
                collapsedBlocks = new Map();
                CollapsedBlocksManager.collapsedBlocks.set(conversationKey, collapsedBlocks);
            }
            return collapsedBlocks;
        }
    }
    window.MrbrCvm.CollapsedBlocksManager = CollapsedBlocksManager;
})()
/**
 * Todo: Something to do
 * Group: Saving files
 * Label: Just stuff
 * Description: 
 * File: src/content/collapsedBlocksManager.js
 * Line: 662
 * Id: {468f82c0-b526-4724-867a-1704db0ea359}
 * Date: 2026-06-22
 * Time: 13:01:47
 * Status: Open
 * Completed: 
 * GitUrl: 
 */