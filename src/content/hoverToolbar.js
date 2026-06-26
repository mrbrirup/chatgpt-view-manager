(() => {
    "use strict";

    window.MrbrCvm = window.MrbrCvm || {};

    /**
     * Encapsulates the contextual toolbar shown beside a hovered conversation block.
     *
     * The toolbar owns only interaction and presentation state. Feature operations are
     * supplied as callbacks so storage, notes, bookmarks, and collapse behaviour remain
     * in their respective classes.
     */
    class HoverToolbar {
        static TEMPLATE = `
            <div class="mrbr-cvm-hover-toolbar" data-mrbr-cvm-hover-toolbar hidden>
                <div class="mrbr-cvm-hover-toolbar-actions" data-mrbr-cvm-hover-toolbar-actions></div>
                <div class="mrbr-cvm-hover-toolbar-minimise" data-mrbr-cvm-hover-toolbar-minimise></div>
            </div>`;

        /**
         * @param {{
         *     rootElement?: HTMLElement | null,
         *     getRootElement?: () => HTMLElement | null,
         *     getTargetElement: (element: HTMLElement) => HTMLElement | null,
         *     getState: (element: HTMLElement) => {
         *         isCollapsed?: boolean,
         *         isBookmarked?: boolean,
         *         hasNotes?: boolean
         *     },
         *     createIconButton: (options: any) => HTMLButtonElement,
         *     strings?: { get: (key: string) => string },
         *     onCollapse: (element: HTMLElement, trace?: any) => void | Promise<void>,
         *     onRestore: (element: HTMLElement, trace?: any) => void | Promise<void>,
         *     onAddBookmark: (element: HTMLElement) => void | Promise<void>,
         *     onRemoveBookmark: (element: HTMLElement) => void | Promise<void>,
         *     onEditNotes: (element: HTMLElement) => void | Promise<void>
         * }} options
         */
        constructor(options) {
            if (!options?.getTargetElement || !options?.getState || !options?.createIconButton) {
                throw new Error("HoverToolbar requires target, state, and icon-button providers.");
            }

            this.rootElement = options.rootElement || null;
            this.getRootElement = options.getRootElement || (() => this.rootElement);
            this.getTargetElement = options.getTargetElement;
            this.getState = options.getState;
            this.createIconButton = options.createIconButton;
            this.strings = options.strings || window.MrbrCvm.ViewManagerStrings || null;
            this.onCollapse = options.onCollapse;
            this.onRestore = options.onRestore;
            this.onAddBookmark = options.onAddBookmark;
            this.onRemoveBookmark = options.onRemoveBookmark;
            this.onEditNotes = options.onEditNotes;
            this.instanceId = crypto.randomUUID().substring(0, 8);

            /** @type {HTMLElement | null} */
            this.element = null;
            /** @type {HTMLElement | null} */
            this.targetElement = null;
            /** @type {HTMLElement | null} */
            this.renderedTargetElement = null;
            /** @type {string} */
            this.renderedStateSignature = "";
            /** @type {MouseEvent | null} */
            this.lastPointerEvent = null;
            this.isMinimised = false;
            this.isActionPending = false;
            this.hideTimeoutId = 0;
            this.positionAnimationFrameId = 0;
            this.pointerReconcileAnimationFrameId = 0;
            this.isWired = false;

            this.boundMouseOver = event => this.handleMouseOver(event);
            this.boundMouseOut = event => this.handleMouseOut(event);
            this.boundMouseMove = event => this.handleMouseMove(event);
        }

        /**
         * @param {string} key
         * @returns {string}
         */
        getString(key) {
            return this.strings?.get?.(key) || key;
        }

        /**
         * Starts hover tracking.
         *
         * @returns {void}
         */
        init() {
            const root = this.getRootElement();

            if (!root || this.isWired) {
                return;
            }

            this.rootElement = root;
            root.addEventListener("mouseover", this.boundMouseOver);
            root.addEventListener("mouseout", this.boundMouseOut);
            document.addEventListener("mousemove", this.boundMouseMove, { passive: true });
            this.isWired = true;
        }

        /**
         * Removes listeners and UI created by this instance.
         *
         * @returns {void}
         */
        dispose() {
            this.rootElement?.removeEventListener("mouseover", this.boundMouseOver);
            this.rootElement?.removeEventListener("mouseout", this.boundMouseOut);
            document.removeEventListener("mousemove", this.boundMouseMove);
            window.clearTimeout(this.hideTimeoutId);

            if (this.positionAnimationFrameId) {
                window.cancelAnimationFrame(this.positionAnimationFrameId);
            }

            if (this.pointerReconcileAnimationFrameId) {
                window.cancelAnimationFrame(this.pointerReconcileAnimationFrameId);
            }

            this.element?.remove();
            this.element = null;
            this.targetElement = null;
            this.renderedTargetElement = null;
            this.renderedStateSignature = "";
            this.isWired = false;
        }

        /**
         * Creates the toolbar structure from an inert HTML template.
         *
         * @returns {HTMLElement}
         */
        createElement() {
            const parsedDocument = new DOMParser().parseFromString(HoverToolbar.TEMPLATE, "text/html"),
                element = parsedDocument.body.firstElementChild;

            if (!(element instanceof HTMLElement)) {
                throw new Error("HoverToolbar failed to create its element.");
            }

            element.addEventListener("mouseenter", () => {
                window.clearTimeout(this.hideTimeoutId);
            });
            element.addEventListener("mouseleave", event => {
                const related = event.relatedTarget;

                if (!(related instanceof Node) || !this.targetElement?.contains(related)) {
                    this.scheduleHide();
                }
            });

            return element;
        }

        /**
         * @returns {HTMLElement}
         */
        ensureElement() {
            if (!this.element) {
                this.element = this.createElement();
                document.documentElement.append(this.element);
            }

            return this.element;
        }

        /**
         * @param {MouseEvent} event
         * @returns {void}
         */
        handleMouseOver(event) {
            const source = event.target instanceof HTMLElement ? event.target : null,
                target = source ? this.getTargetElement(source) : null;

            if (!target || target.closest(".mrbr-cvm-panel") || target.closest(".mrbr-cvm-hover-toolbar")) {
                return;
            }

            window.clearTimeout(this.hideTimeoutId);
            this.lastPointerEvent = event;

            if (this.targetElement !== target) {
                this.targetElement?.classList.remove("mrbr-cvm-hover-toolbar-target");
                this.targetElement = target;
                target.classList.add("mrbr-cvm-hover-toolbar-target");
                this.render();
            }

            this.show();
            this.schedulePosition();
        }

        /**
         * @param {MouseEvent} event
         * @returns {void}
         */
        handleMouseOut(event) {
            if (!this.targetElement) {
                return;
            }

            const related = event.relatedTarget;

            if (related instanceof Node) {
                if (this.targetElement.contains(related) || this.element?.contains(related)) {
                    return;
                }

                if (related instanceof HTMLElement && this.getTargetElement(related) === this.targetElement) {
                    return;
                }
            }

            this.scheduleHide();
        }

        /**
         * @param {MouseEvent} event
         * @returns {void}
         */
        handleMouseMove(event) {
            this.lastPointerEvent = event;
            this.schedulePointerReconciliation();
        }

        /**
         * Reconciles the toolbar target at most once per animation frame.
         *
         * @returns {void}
         */
        schedulePointerReconciliation() {
            if (this.pointerReconcileAnimationFrameId) {
                return;
            }

            this.pointerReconcileAnimationFrameId = window.requestAnimationFrame(() => {
                this.pointerReconcileAnimationFrameId = 0;
                this.reconcileTargetFromPointer();
            });
        }

        /**
         * Re-evaluates the live block beneath the last pointer position.
         *
         * @returns {void}
         */
        reconcileTargetFromPointer() {
            const pointer = this.lastPointerEvent;

            if (!pointer) {
                return;
            }

            const source = this.getElementFromPointBelowToolbar(
                    pointer.clientX,
                    pointer.clientY
                ),
                target = source instanceof HTMLElement
                    ? this.getTargetElement(source)
                    : null;

            if (target?.closest(".mrbr-cvm-panel")) {
                this.scheduleHide();
                return;
            }

            if (!target) {
                const directHit = document.elementFromPoint(pointer.clientX, pointer.clientY);

                if (directHit instanceof Node && this.element?.contains(directHit)) {
                    this.render();
                    this.show();
                    this.schedulePosition();
                    return;
                }

                this.scheduleHide();
                return;
            }

            window.clearTimeout(this.hideTimeoutId);

            if (this.targetElement !== target) {
                this.targetElement?.classList.remove("mrbr-cvm-hover-toolbar-target");
                this.targetElement = target;
                target.classList.add("mrbr-cvm-hover-toolbar-target");
            }

            this.render();
            this.show();
            this.schedulePosition();
        }

        /**
         * Gets the live element under the pointer, looking through the toolbar itself.
         *
         * @param {number} clientX
         * @param {number} clientY
         * @returns {Element | null}
         */
        getElementFromPointBelowToolbar(clientX, clientY) {
            const directHit = document.elementFromPoint(clientX, clientY),
                toolbar = this.element;

            if (!toolbar || !(directHit instanceof Node) || !toolbar.contains(directHit)) {
                return directHit;
            }

            const previousPointerEvents = toolbar.style.pointerEvents;

            toolbar.style.pointerEvents = "none";

            try {
                return document.elementFromPoint(clientX, clientY);
            } finally {
                toolbar.style.pointerEvents = previousPointerEvents;
            }
        }

        /**
         * @returns {void}
         */
        scheduleHide() {
            window.clearTimeout(this.hideTimeoutId);
            this.hideTimeoutId = window.setTimeout(() => this.hide(), 140);
        }

        /**
         * @returns {void}
         */
        show() {
            this.ensureElement().hidden = false;
        }

        /**
         * @returns {void}
         */
        hide() {
            if (this.element) {
                this.element.hidden = true;
            }

            this.targetElement?.classList.remove("mrbr-cvm-hover-toolbar-target");
            this.targetElement = null;
            this.renderedTargetElement = null;
            this.renderedStateSignature = "";
        }

        /**
         * Rebuilds the small action surface from current block state.
         *
         * @returns {void}
         */
        render(force = false) {
            if (!this.targetElement) {
                return;
            }

            const element = this.ensureElement(),
                actions = element.querySelector("[data-mrbr-cvm-hover-toolbar-actions]"),
                minimise = element.querySelector("[data-mrbr-cvm-hover-toolbar-minimise]"),
                targetElement = this.targetElement,
                state = this.getState(targetElement),
                stateSignature = this.createStateSignature(state);

            if (!(actions instanceof HTMLElement) || !(minimise instanceof HTMLElement)) {
                return;
            }

            if (
                !force
                && this.renderedTargetElement === targetElement
                && this.renderedStateSignature === stateSignature
            ) {
                this.updateActionDisabledState();
                return;
            }

            actions.replaceChildren(
                state.isCollapsed
                    ? this.createActionButton(
                        "restore",
                        "restoreBlock",
                        trace => this.onRestore(targetElement, trace),
                        false,
                        "",
                        "expand"
                    )
                    : this.createActionButton(
                        "collapse",
                        "collapseBlock",
                        trace => this.onCollapse(targetElement, trace),
                        false,
                        "",
                        "collapse"
                    ),
                state.isBookmarked
                    ? this.createActionButton("bookmark", "removeBookmark", () => this.onRemoveBookmark(targetElement), true)
                    : this.createActionButton("bookmark", "addBookmark", () => this.onAddBookmark(targetElement)),
                this.createActionButton(
                    "note",
                    state.hasNotes ? "editOrDeleteNotes" : "addNotes",
                    () => this.onEditNotes(targetElement),
                    state.hasNotes,
                    "mrbr-cvm-note-button"
                )
            );

            minimise.replaceChildren(this.createActionButton(
                this.isMinimised ? "expandPanel" : "collapsePanel",
                this.isMinimised ? "expandHoverToolbar" : "minimiseHoverToolbar",
                () => {
                    this.isMinimised = !this.isMinimised;
                    element.classList.toggle("mrbr-cvm-hover-toolbar-minimised", this.isMinimised);
                    this.render();
                    this.schedulePosition();
                }
            ));

            element.classList.toggle("mrbr-cvm-hover-toolbar-minimised", this.isMinimised);
            this.renderedTargetElement = targetElement;
            this.renderedStateSignature = stateSignature;
            this.updateActionDisabledState();
        }

        /**
         * Creates a compact signature for the state that changes toolbar controls.
         *
         * @param {{ isCollapsed?: boolean, isBookmarked?: boolean, hasNotes?: boolean }} state
         * @returns {string}
         */
        createStateSignature(state) {
            return [
                state.isCollapsed === true ? "1" : "0",
                state.isBookmarked === true ? "1" : "0",
                state.hasNotes === true ? "1" : "0",
                this.isMinimised ? "1" : "0"
            ].join("");
        }

        /**
         * @param {string} iconName
         * @param {string} stringKey
         * @param {(trace?: any) => void | Promise<void>} action
         * @param {boolean} [isActive]
         * @param {string} [className]
         * @param {string} [traceAction]
         * @returns {HTMLButtonElement}
         */
        createActionButton(iconName, stringKey, action, isActive = false, className = "", traceAction = "") {
            const button = this.createIconButton({
                iconName,
                title: this.getString(stringKey),
                onClick: event => {
                    event.preventDefault();
                    event.stopPropagation();

                    if (this.isActionPending) {
                        return;
                    }

                    this.isActionPending = true;
                    this.updateActionDisabledState();

                    const trace = traceAction
                        ? window.MrbrCvm.ViewManagerTrace?.begin(traceAction, this.targetElement)
                        : null;

                    trace?.functionCalled("HoverToolbar.createActionButton.onClick", {
                        stringKey,
                        hoverToolbarInstanceId: this.instanceId,
                        hoverToolbarElementCount: document.querySelectorAll(
                            "[data-mrbr-cvm-hover-toolbar]"
                        ).length,
                        panelElementCount: document.querySelectorAll("#mrbr-cvm-panel").length,
                        target: trace.snapshotElement(this.targetElement)
                    });
                    trace?.expect(`${traceAction} should update this target once.`);

                    Promise.resolve(action(trace)).catch(error => {
                        trace?.error(error);
                        console.error(`HoverToolbar action failed: ${stringKey}`, error);
                    }).finally(() => {
                        this.isActionPending = false;

                        window.requestAnimationFrame(() => {
                            this.reconcileTargetFromPointer();
                            trace?.actual("Pointer target after action reconciliation.", {
                                target: trace.snapshotElement(this.targetElement)
                            });
                            trace?.finishAfter(500);
                        });
                    });
                }
            });

            button.classList.add("mrbr-cvm-hover-toolbar-button");

            if (className) {
                button.classList.add(className);
            }

            if (isActive) {
                button.classList.add("mrbr-cvm-hover-toolbar-button-active");

                if (className === "mrbr-cvm-note-button") {
                    button.classList.add("mrbr-cvm-has-note");
                }

                button.setAttribute("aria-pressed", "true");
            } else {
                button.setAttribute("aria-pressed", "false");
            }

            return button;
        }

        /**
         * Prevents contradictory toolbar actions while one async operation is pending.
         *
         * @returns {void}
         */
        updateActionDisabledState() {
            const element = this.element;

            if (!element) {
                return;
            }

            element.classList.toggle("mrbr-cvm-hover-toolbar-busy", this.isActionPending);
            element.setAttribute("aria-busy", this.isActionPending ? "true" : "false");
            element.querySelectorAll("button").forEach(button => {
                if (button instanceof HTMLButtonElement) {
                    button.disabled = this.isActionPending;
                }
            });
        }

        /**
         * @returns {void}
         */
        refresh() {
            if (this.lastPointerEvent) {
                this.schedulePointerReconciliation();
                return;
            }

            if (this.targetElement) {
                this.render();
            }
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
                this.position();
            });
        }

        /**
         * Positions the toolbar beside the conversation viewport and pointer.
         *
         * @returns {void}
         */
        position() {
            const element = this.element,
                root = this.getRootElement(),
                pointer = this.lastPointerEvent;

            if (!element || element.hidden || !root || !pointer) {
                return;
            }

            const rootRect = root.getBoundingClientRect(),
                toolbarRect = element.getBoundingClientRect(),
                top = Math.min(
                    Math.max(pointer.clientY - (toolbarRect.height / 2), rootRect.top + 4),
                    Math.max(rootRect.top + 4, rootRect.bottom - toolbarRect.height - 4)
                ),
                preferredLeft = rootRect.left + 6,
                left = Math.min(
                    Math.max(preferredLeft, 4),
                    Math.max(4, window.innerWidth - toolbarRect.width - 4)
                );

            element.style.top = `${top}px`;
            element.style.left = `${left}px`;
        }
    }

    window.MrbrCvm.HoverToolbar = HoverToolbar;
})();
