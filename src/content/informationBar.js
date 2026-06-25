(() => {
    "use strict";

    window.MrbrCvm = window.MrbrCvm || {};

    /**
     * Renders non-interactive state information for a collapsed conversation block.
     */
    class InformationBar {
        static SELECTOR = "[data-mrbr-cvm-information-bar]";
        static TEMPLATE = `
            <div class="mrbr-cvm-information-bar" data-mrbr-cvm-information-bar hidden>
                <span class="mrbr-cvm-information-bar-status" data-mrbr-cvm-information-bar-status></span>
                <span class="mrbr-cvm-information-bar-participant" data-mrbr-cvm-information-bar-participant></span>
                <span class="mrbr-cvm-information-bar-note" data-mrbr-cvm-information-bar-note hidden></span>
                <span class="mrbr-cvm-information-bar-title" data-mrbr-cvm-information-bar-title></span>
            </div>`;

        /**
         * @param {{
         *     strings?: { get: (key: string) => string },
         *     createIconElement?: (iconName: string) => SVGSVGElement
         * }} [options]
         */
        constructor(options = {}) {
            this.strings = options.strings || window.MrbrCvm.ViewManagerStrings || null;
            this.createIconElement = options.createIconElement || null;
        }

        /**
         * @param {string} key
         * @returns {string}
         */
        getString(key) {
            return this.strings?.get?.(key) || key;
        }

        /**
         * @returns {HTMLElement}
         */
        createElement() {
            const parsedDocument = new DOMParser().parseFromString(InformationBar.TEMPLATE, "text/html"),
                element = parsedDocument.body.firstElementChild;

            if (!(element instanceof HTMLElement)) {
                throw new Error("InformationBar failed to create its element.");
            }

            return element;
        }

        /**
         * @param {HTMLElement} host
         * @returns {HTMLElement}
         */
        getOrCreate(host) {
            const existing = host.querySelector(InformationBar.SELECTOR);

            if (existing instanceof HTMLElement) {
                return existing;
            }

            const element = this.createElement();

            host.append(element);
            return element;
        }

        /**
         * @param {HTMLElement} host
         * @param {{
         *     title?: string,
         *     notes?: string,
         *     blockKey?: string,
         *     turnId?: string,
         *     participant?: "user" | "assistant" | "other"
         * }} state
         * @returns {HTMLElement}
         */
        show(host, state) {
            const element = this.getOrCreate(host),
                status = element.querySelector("[data-mrbr-cvm-information-bar-status]"),
                participantElement = element.querySelector("[data-mrbr-cvm-information-bar-participant]"),
                note = element.querySelector("[data-mrbr-cvm-information-bar-note]"),
                title = element.querySelector("[data-mrbr-cvm-information-bar-title]"),
                notes = String(state.notes || "").trim(),
                participant = this.normalizeParticipant(state.participant);

            if (status instanceof HTMLElement) {
                status.textContent = this.getString("collapsedStatus");
            }

            if (note instanceof HTMLElement) {
                note.textContent = this.getString("noteStatus");
                note.hidden = !notes;
                note.title = notes;
            }

            if (participantElement instanceof HTMLElement) {
                const participantLabel = this.getString(
                    participant === "user"
                        ? "participantUser"
                        : participant === "assistant"
                            ? "participantAssistant"
                            : "participantOther"
                );

                participantElement.replaceChildren();
                participantElement.title = participantLabel;
                participantElement.setAttribute("aria-label", participantLabel);
                participantElement.dataset.mrbrCvmParticipant = participant;

                if (this.createIconElement) {
                    participantElement.append(this.createIconElement(
                        participant === "user"
                            ? "participantUser"
                            : participant === "assistant"
                                ? "participantAssistant"
                                : "participantOther"
                    ));
                } else {
                    participantElement.textContent = participantLabel;
                }
            }

            if (title instanceof HTMLElement) {
                title.textContent = String(state.title || this.getString("collapsedBlockFallback"));
                title.title = title.textContent;
            }

            element.hidden = false;
            element.classList.toggle("mrbr-cvm-information-bar-has-note", Boolean(notes));
            element.dataset.mrbrCvmBlockKey = String(state.blockKey || "");
            element.dataset.mrbrCvmTurnId = String(state.turnId || "");
            element.dataset.mrbrCvmParticipant = participant;

            return element;
        }

        /**
         * @param {unknown} value
         * @returns {"user" | "assistant" | "other"}
         */
        normalizeParticipant(value) {
            return value === "user" || value === "assistant"
                ? value
                : "other";
        }

        /**
         * @param {HTMLElement} host
         * @returns {void}
         */
        hide(host) {
            const element = host.querySelector(InformationBar.SELECTOR);

            if (element instanceof HTMLElement) {
                element.hidden = true;
            }
        }
    }

    window.MrbrCvm.InformationBar = InformationBar;
})();
