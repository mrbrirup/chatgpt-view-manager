(() => {
    "use strict";

    window.MrbrCvm = window.MrbrCvm || {};

    /**
     * Scans the current page for conversation blocks.
     */
    class ConversationScanner {
        static BLOCK_KEY_ATTRIBUTE = "data-mrbr-cvm-block-key";
        static BLOCK_INDEX_ATTRIBUTE = "data-mrbr-cvm-block-index";

        static CANDIDATE_SELECTORS = [
            "[data-testid^='conversation-turn-']",
            "article",
            "[data-message-author-role]"
        ];

        /**
         * Finds conversation block elements on the page.
         *
         * @returns {HTMLElement[]}
         */
        findBlocks() {
            const blocks = this.findCandidateBlocks();

            this.assignBlockKeys(blocks);

            return blocks;
        }

        /**
         * Finds likely conversation block candidates.
         *
         * @returns {HTMLElement[]}
         */
        findCandidateBlocks() {
            let elements = [];

            for (const selector of ConversationScanner.CANDIDATE_SELECTORS) {
                elements = Array.from(document.querySelectorAll(selector))
                    .filter(element => element instanceof HTMLElement)
                    .filter(this.isUsableBlockElement.bind(this));

                if (elements.length > 0) {
                    return this.removeNestedDuplicates(elements);
                }
            }

            return [];
        }

        /**
         * Filters out elements that are not useful as message blocks.
         *
         * @param {HTMLElement} element
         * @returns {boolean}
         */
        isUsableBlockElement(element) {
            const text = element.innerText?.trim() || "",
                rect = element.getBoundingClientRect();

            return text.length > 20
                && rect.width > 200
                && !element.closest(".mrbr-cvm-panel")
                && !element.classList.contains("mrbr-cvm-panel");
        }

        /**
         * Removes child candidates where a parent is also present.
         *
         * @param {HTMLElement[]} elements
         * @returns {HTMLElement[]}
         */
        removeNestedDuplicates(elements) {
            return elements.filter(element => {
                return !elements.some(candidate => candidate !== element && candidate.contains(element));
            });
        }

        /**
         * Assigns deterministic per-page block keys.
         *
         * These keys are stable for the current DOM order. Later we can improve
         * this with content hashes or ChatGPT's own IDs if available.
         *
         * @param {HTMLElement[]} blocks
         * @returns {void}
         */
        assignBlockKeys(blocks) {
            blocks.forEach((block, index) => {
                const blockKey = `block-${index + 1}`;

                block.setAttribute(ConversationScanner.BLOCK_KEY_ATTRIBUTE, blockKey);
                block.setAttribute(ConversationScanner.BLOCK_INDEX_ATTRIBUTE, String(index + 1));
            });
        }

        /**
         * Finds a block by its assigned key.
         *
         * @param {string} blockKey
         * @returns {HTMLElement | null}
         */
        findBlockByKey(blockKey) {
            return document.querySelector(`[${ConversationScanner.BLOCK_KEY_ATTRIBUTE}="${CSS.escape(blockKey)}"]`);
        }

        /**
         * Gets a readable title from a block.
         *
         * @param {HTMLElement} block
         * @returns {string}
         */
        getBlockTitle(block) {
            const lines = block.innerText
                .split("\n")
                .map(line => line.trim())
                .filter(Boolean)
                .filter(line => line.length > 0);

            const firstUsefulLine = lines.find(line => line.length > 12) || lines[0] || "Conversation block";

            return firstUsefulLine.length > 90
                ? `${firstUsefulLine.substring(0, 90)}...`
                : firstUsefulLine;
        }
    }

    window.MrbrCvm.ConversationScanner = ConversationScanner;
})();