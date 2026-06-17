(() => {
    class CollapsedBlocksManager {

        static rootSelectors = [
            ".not-print\\:overflow-y-auto",
            "div[data-scroll-root]",
            "[data-scroll-root]",
            "main"
        ];

        /**
         * @type {HTMLElement|null}
         */
        #blockHostElement = null;
        constructor() {
        }
        getRootElement() {
            return CollapsedBlocksManager
                .rootSelectors
                .reduce(/** @type {(foundElement: HTMLElement | null, selector: string) => HTMLElement | null} */(foundElement, selector) => {
                    if (foundElement) {
                        return foundElement; // If we've already found an element, return it
                    }
                    const element = document.querySelector(selector);
                    return /** @type {HTMLElement | null} */ (element) || foundElement; // Return the found element or the previous found element
                }, null);

        }
        init() {
            // Iterate through the root selectors and find the first one that exists in the DOM
            this.#blockHostElement = this.getRootElement();

            if (!this.#blockHostElement) {
                console.warn("CollapsedBlocksManager: No block host element found.");
            }
            console.log("CollapsedBlocksManager: Block host element found:", this.#blockHostElement);
            this.wireEvents();
        }


        wireEvents() {
            const self = this;
            const container = self.#blockHostElement;
            console.log("CollapsedBlocksManager: Wiring events on container:", container);
            let ViewManagerIconButtonFactory = window.MrbrCvm?.ViewManagerIconButtonFactory;
            let button;

            if (ViewManagerIconButtonFactory) {
                const iconButtonFactory = new ViewManagerIconButtonFactory();
                button = iconButtonFactory.createIconButton({ title: "Collapse", iconName: "collapse" });
                button.id = 'actionBtn';
                button.style.zIndex = '100000'; // Ensure the button is on top of other elements

                button.style.top = '0px';
                button.style.left = '0px';

                const icon= button.querySelector('svg');
                if (icon) {
                    icon.style.width = '32';
                    icon.style.height = '32';
                }
                // let iconElement = iconButtonFactory?.createIconElement("expand");
                // if (iconElement) {
                //     button.appendChild(iconElement);
                // } else {
                //     //button.textContent = 'Action';
                // }
            }

            // 1. Move and show button when entering a box
            let buttonHeight = 32;
            let currentBoxId = "";
            container.addEventListener('mouseover', (event) => {
                // Find the closest box div that was hovered over
                const box = event.target.closest('div[data-turn-id-container]');
                //     container?.append(button);

                if (box) {

                    if (currentBoxId !== box.getAttribute('data-turn-id-container')) {
                        const existingBox = container?.querySelector('div[data-turn-id-container="' + currentBoxId + '"]');
                        existingBox?.classList.remove('mrbr-cvm-collapsed-block-target');
                        currentBoxId = box.getAttribute('data-turn-id-container') || "";
                    }

                    box.classList.add('mrbr-cvm-collapsed-block-target');
                    if (button.parentElement !== container) {
                        container?.appendChild(button);
                        buttonHeight = button.offsetHeight; // Update button height after it's added to the DOM
                    }
                    //box.appendChild(button);
                    container?.dispatchEvent(self.createOnEnterBlockEvent(event));
                    currentBoxId = box.getAttribute('data-turn-id-container') || "";
                    //button.style.display = 'block';
                }
            });

            // 2. Hide button when leaving a box
            container.addEventListener('mouseout', (event) => {
                const box = event.target.closest('div[data-turn-id-container]');

                // Check if the mouse actually left the box entirely
                if (box && !box.contains(event.relatedTarget)) {
                    //box.classList.remove('mrbr-cvm-collapsed-block-target');
                    if (button.parentElement === box) {
                        //box.removeChild(button);
                        container?.dispatchEvent(self.createOnExitBlockEvent(event));
                    }
                    if (button.parentElement === box) {
                        //button.style.display = 'none';
                    }
                }
            });

            // // 3. Perform action on click
            button.addEventListener('click', (event) => {
                // const currentBox = button.parentElement;
                // currentBox.style.backgroundColor = 'lightgreen';
                // console.info('Action done on: ' + currentBox.innerText);
                // get the element under the button
                //const elementUnderButton = document.elementFromPoint(event.clientX, event.clientY);
                // find the closest box div that contains the element under the button
                const box = container?.querySelector('div[data-turn-id-container="' + currentBoxId + '"]');
                alert('Action done on: ' + box?.innerText);
            });

            document.addEventListener('mousemove', function (event) {

                // Get the vertical (Y) coordinate of the mouse
                const mouseScaleY = event.clientY;

                // Change the box's top position to match the mouse Y position
                button.style.top = `${-(buttonHeight / 2) + mouseScaleY + container.scrollTop}px`;
            });
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
    }
    window.MrbrCvm.CollapsedBlocksManager = CollapsedBlocksManager;
})()