(() => {
    "use strict";

    window.MrbrCvm = window.MrbrCvm || {};

    /**
     * Scans the current page for conversation blocks.
     */
    class ConversationScanner {
        static BLOCK_KEY_ATTRIBUTE = "data-mrbr-cvm-block-key";
        static BLOCK_INDEX_ATTRIBUTE = "data-mrbr-cvm-block-index";
        static BLOCK_ROLE_ATTRIBUTE = "data-mrbr-cvm-block-role";
        static BLOCK_HASH_ATTRIBUTE = "data-mrbr-cvm-block-hash";

        static CANDIDATE_SELECTORS = [
            "[data-testid^='conversation-turn-']",
            "article",
            "[data-message-author-role]"
        ];

        static ROLE_SELECTORS = [
            "[data-message-author-role]",
            "[data-testid^='conversation-turn-']"
        ];

        /**
         * Finds conversation block elements on the page.
         *
         * @returns {HTMLElement[]}
         */
        findBlocks() {
            const blocks = this.findCandidateBlocks();

            this.assignBlockIdentity(blocks);

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
         * Assigns stable-ish per-page block identities.
         *
         * @param {HTMLElement[]} blocks
         * @returns {void}
         */
        assignBlockIdentity(blocks) {
            blocks.forEach((block, index) => {
                const blockIndex = index + 1,
                    role = this.getBlockRole(block),
                    normalizedText = this.getNormalizedBlockText(block),
                    hash = this.createShortHash(normalizedText),
                    blockKey = this.createBlockKey(role, blockIndex, hash);

                block.setAttribute(ConversationScanner.BLOCK_KEY_ATTRIBUTE, blockKey);
                block.setAttribute(ConversationScanner.BLOCK_INDEX_ATTRIBUTE, String(blockIndex));
                block.setAttribute(ConversationScanner.BLOCK_ROLE_ATTRIBUTE, role);
                block.setAttribute(ConversationScanner.BLOCK_HASH_ATTRIBUTE, hash);
            });
        }

        /**
         * Creates the bookmark key for a block.
         *
         * @param {string} role
         * @param {number} blockIndex
         * @param {string} hash
         * @returns {string}
         */
        createBlockKey(role, blockIndex, hash) {
            return `cvm-${role}-${blockIndex}-${hash}`;
        }

        /**
         * Attempts to detect the role of the block.
         *
         * @param {HTMLElement} block
         * @returns {"user" | "assistant" | "system" | "tool" | "unknown"}
         */
        getBlockRole(block) {
            const directRole = block.getAttribute("data-message-author-role");

            if (directRole) {
                return this.normalizeRole(directRole);
            }

            for (const selector of ConversationScanner.ROLE_SELECTORS) {
                const roleElement = block.matches(selector)
                    ? block
                    : block.querySelector(selector);

                if (!(roleElement instanceof HTMLElement)) {
                    continue;
                }

                const role = roleElement.getAttribute("data-message-author-role");

                if (role) {
                    return this.normalizeRole(role);
                }
            }

            const testId = block.getAttribute("data-testid") || "";

            if (testId.includes("user")) {
                return "user";
            }

            if (testId.includes("assistant")) {
                return "assistant";
            }

            return "unknown";
        }

        /**
         * Normalises ChatGPT role values into key-safe values.
         *
         * @param {string} role
         * @returns {"user" | "assistant" | "system" | "tool" | "unknown"}
         */
        normalizeRole(role) {
            const normalizedRole = role.trim().toLowerCase();

            switch (normalizedRole) {
                case "user":
                case "assistant":
                case "system":
                case "tool":
                    return normalizedRole;
                default:
                    return "unknown";
            }
        }

        /**
         * Gets normalized text for hashing and title generation.
         *
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
         * Creates a short non-cryptographic hash for block identity.
         *
         * This is based on FNV-1a style hashing and is intended only for
         * compact local identity, not security.
         *
         * @param {string} text
         * @returns {string}
         */
        createShortHash(text) {
            let hash = 0x811c9dc5;

            for (let index = 0; index < text.length; index++) {
                hash ^= text.charCodeAt(index);
                hash = Math.imul(hash, 0x01000193);
            }

            return (hash >>> 0).toString(16).padStart(8, "0");
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
         * Finds a block using bookmark identity.
         *
         * This allows older bookmarks to keep working even if the full block key
         * changes slightly.
         *
         * @param {{ blockKey?: string, role?: string, blockIndex?: number, contentHash?: string }} bookmark
         * @returns {HTMLElement | null}
         */
        findBlockForBookmark(bookmark) {
            if (bookmark.blockKey) {
                const exactBlock = this.findBlockByKey(bookmark.blockKey);

                if (exactBlock) {
                    return exactBlock;
                }
            }

            if (bookmark.contentHash) {
                const hashBlock = document.querySelector(
                    `[${ConversationScanner.BLOCK_HASH_ATTRIBUTE}="${CSS.escape(bookmark.contentHash)}"]`
                );

                if (hashBlock instanceof HTMLElement) {
                    return hashBlock;
                }
            }

            if (bookmark.role && bookmark.blockIndex) {
                const roleIndexBlock = document.querySelector(
                    `[${ConversationScanner.BLOCK_ROLE_ATTRIBUTE}="${CSS.escape(bookmark.role)}"]` +
                    `[${ConversationScanner.BLOCK_INDEX_ATTRIBUTE}="${CSS.escape(String(bookmark.blockIndex))}"]`
                );

                if (roleIndexBlock instanceof HTMLElement) {
                    return roleIndexBlock;
                }
            }

            return null;
        }

        /**
         * Gets identity data from a block.
         *
         * @param {HTMLElement} block
         * @returns {{ blockKey: string, blockIndex: number, role: string, contentHash: string }}
         */
        getBlockIdentity(block) {
            const blockKey = block.getAttribute(ConversationScanner.BLOCK_KEY_ATTRIBUTE) || "",
                blockIndexText = block.getAttribute(ConversationScanner.BLOCK_INDEX_ATTRIBUTE) || "0",
                role = block.getAttribute(ConversationScanner.BLOCK_ROLE_ATTRIBUTE) || "unknown",
                contentHash = block.getAttribute(ConversationScanner.BLOCK_HASH_ATTRIBUTE) || "";

            return {
                blockKey,
                blockIndex: Number.parseInt(blockIndexText, 10) || 0,
                role,
                contentHash
            };
        }

        /**
         * Gets a readable title from a block.
         *
         * @param {HTMLElement} block
         * @returns {string}
         */
        getBlockTitle(block) {
            const normalizedText = this.getNormalizedBlockText(block),
                firstUsefulText = normalizedText || "Conversation block";

            return firstUsefulText.length > 90
                ? `${firstUsefulText.substring(0, 90)}...`
                : firstUsefulText;
        }
    }

    window.MrbrCvm.ConversationScanner = ConversationScanner;
})();