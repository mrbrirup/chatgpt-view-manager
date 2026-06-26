(() => {
    "use strict";

    window.MrbrCvm = window.MrbrCvm || {};

    /**
     * Owns note sanitising, editing, and persistence for bookmarks, collapsed blocks,
     * and ordinary conversation blocks that should become bookmarks when annotated.
     */
    class ViewManagerNotesManager {
        static MAX_NOTE_LENGTH = 20000;
        static MAX_TITLE_LENGTH = 180;

        /**
         * @param {{
         *     getState: () => { bookmarks: any[], collapsedBlocks: any[], blockNotes: Record<string, any> },
         *     persistence?: any,
         *     scanner?: any,
         *     strings?: { get: (key: string) => string, format?: (key: string, ...values: Array<string | number>) => string },
         *     scheduleDomUpdate?: (callback: () => void) => void,
         *     render?: () => void,
         *     highlightBlock?: (block: HTMLElement) => HTMLElement | void,
         *     clearHighlight?: (block: HTMLElement) => void
         * }} options
         */
        constructor(options) {
            if (!options?.getState) {
                throw new Error("ViewManagerNotesManager requires a getState callback.");
            }

            this.getState = options.getState;
            this.persistence = options.persistence || null;
            this.scanner = options.scanner || null;
            this.strings = options.strings || window.MrbrCvm.ViewManagerStrings || null;
            this.scheduleDomUpdate = options.scheduleDomUpdate || (callback => window.requestAnimationFrame(callback));
            this.render = options.render || (() => { });
            this.highlightBlock = options.highlightBlock || (block => block.classList.add("mrbr-cvm-pending-bookmark"));
            this.clearHighlight = options.clearHighlight || (block => block.classList.remove("mrbr-cvm-pending-bookmark"));
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
         * Sanitises note text while preserving useful whitespace.
         *
         * Notes are stored as plain text and must only be rendered through textContent
         * or form control value properties. This method removes control characters that
         * have no useful note meaning and limits size so storage/UI cannot be abused.
         *
         * @param {unknown} value
         * @returns {string}
         */
        sanitizeNoteText(value) {
            return String(value ?? "")
                .replace(/\r\n?/g, "\n")
                .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
                .trim()
                .substring(0, ViewManagerNotesManager.MAX_NOTE_LENGTH);
        }

        /**
         * Sanitises a single-line title.
         *
         * @param {unknown} value
         * @returns {string}
         */
        sanitizeTitleText(value) {
            return String(value ?? "")
                .replace(/[\u0000-\u001F\u007F]/g, " ")
                .replace(/\s+/g, " ")
                .trim()
                .substring(0, ViewManagerNotesManager.MAX_TITLE_LENGTH);
        }

        /**
         * @param {string | undefined} blockKey
         * @returns {string}
         */
        getBlockNotes(blockKey) {
            if (!blockKey) {
                return "";
            }

            return this.getState().blockNotes[blockKey]?.notes || "";
        }

        /**
         * @param {string | undefined} blockKey
         * @returns {boolean}
         */
        hasBlockNotes(blockKey) {
            return this.getBlockNotes(blockKey).length > 0;
        }

        /**
         * @param {string} blockKey
         * @param {string} notes
         * @returns {void}
         */
        setBlockNotes(blockKey, notes) {
            if (!blockKey) {
                return;
            }

            const state = this.getState(),
                safeNotes = this.sanitizeNoteText(notes);

            if (!safeNotes) {
                delete state.blockNotes[blockKey];
                return;
            }

            const ViewManagerBlockNote = window.MrbrCvm.ViewManagerBlockNote;

            state.blockNotes[blockKey] = new ViewManagerBlockNote({
                blockKey,
                notes: safeNotes,
                updatedUtc: new Date().toISOString()
            });
        }

        /**
         * @param {any} bookmark
         * @returns {string}
         */
        getBookmarkNotes(bookmark) {
            return this.sanitizeNoteText(bookmark?.notes || this.getBlockNotes(bookmark?.blockKey));
        }

        /**
         * @param {any} bookmark
         * @returns {boolean}
         */
        hasBookmarkNotes(bookmark) {
            return this.getBookmarkNotes(bookmark).length > 0;
        }

        /**
         * @param {any} bookmark
         * @param {string} notes
         * @returns {void}
         */
        setBookmarkNotes(bookmark, notes) {
            if (!bookmark) {
                return;
            }

            const safeNotes = this.sanitizeNoteText(notes);

            bookmark.notes = safeNotes;
            bookmark.updatedUtc = new Date().toISOString();

            if (bookmark.blockKey) {
                this.setBlockNotes(bookmark.blockKey, safeNotes);
            }
        }

        /**
         * @param {any} collapsedBlock
         * @returns {string}
         */
        getCollapsedBlockNotes(collapsedBlock) {
            return this.sanitizeNoteText(collapsedBlock?.notes || this.getBlockNotes(collapsedBlock?.blockKey));
        }

        /**
         * @param {any} collapsedBlock
         * @returns {boolean}
         */
        hasCollapsedBlockNotes(collapsedBlock) {
            return this.getCollapsedBlockNotes(collapsedBlock).length > 0;
        }

        /**
         * @param {any} collapsedBlock
         * @param {string} notes
         * @returns {void}
         */
        setCollapsedBlockNotes(collapsedBlock, notes) {
            if (!collapsedBlock) {
                return;
            }

            const safeNotes = this.sanitizeNoteText(notes);

            collapsedBlock.notes = safeNotes;
            collapsedBlock.updatedUtc = new Date().toISOString();

            if (collapsedBlock.blockKey) {
                this.setBlockNotes(collapsedBlock.blockKey, safeNotes);
            }
        }

        /**
         * @param {{ dialogTitle: string, label?: string, notes?: string, requireText?: boolean }} options
         * @returns {Promise<{ notes: string, deleteNote?: boolean } | null>}
         */
        showNotesDialog(options) {
            return new Promise(resolve => {
                const backdropElement = document.createElement("div"),
                    dialogElement = document.createElement("div"),
                    headingElement = document.createElement("h2"),
                    notesLabelElement = document.createElement("label"),
                    notesTextAreaElement = document.createElement("textarea"),
                    actionsElement = document.createElement("div"),
                    deleteButton = document.createElement("button"),
                    actionsSpacerElement = document.createElement("span"),
                    cancelButton = document.createElement("button"),
                    saveButton = document.createElement("button"),
                    dialogId = `mrbr-cvm-notes-dialog-${crypto.randomUUID()}`,
                    notesInputId = `${dialogId}-notes`;

                let isResolved = false;

                /**
                 * @param {{ notes: string, deleteNote?: boolean } | null} value
                 * @returns {void}
                 */
                const closeDialog = value => {
                    if (isResolved) {
                        return;
                    }

                    isResolved = true;
                    document.removeEventListener("keydown", handleDocumentKeyDown, true);
                    backdropElement.remove();
                    resolve(value);
                };

                const save = () => {
                    const notes = this.sanitizeNoteText(notesTextAreaElement.value);

                    if (options.requireText === true && !notes) {
                        notesTextAreaElement.focus();
                        return;
                    }

                    closeDialog({ notes });
                };

                const deleteNote = () => {
                    if (!window.confirm(this.getString("deleteNoteConfirm"))) {
                        return;
                    }

                    closeDialog({
                        notes: "",
                        deleteNote: true
                    });
                };

                /**
                 * @param {KeyboardEvent} event
                 * @returns {void}
                 */
                const handleDocumentKeyDown = event => {
                    if (event.key === "Escape") {
                        event.preventDefault();
                        event.stopPropagation();
                        closeDialog(null);
                        return;
                    }

                    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                        event.preventDefault();
                        save();
                    }
                };

                backdropElement.className = "mrbr-cvm-dialog-backdrop mrbr-cvm-notes-dialog-backdrop";

                dialogElement.className = "mrbr-cvm-dialog mrbr-cvm-notes-dialog";
                dialogElement.setAttribute("role", "dialog");
                dialogElement.setAttribute("aria-modal", "true");
                dialogElement.setAttribute("aria-labelledby", dialogId);

                headingElement.id = dialogId;
                headingElement.className = "mrbr-cvm-dialog-title";
                headingElement.textContent = options.dialogTitle;

                notesLabelElement.className = "mrbr-cvm-dialog-label";
                notesLabelElement.htmlFor = notesInputId;
                notesLabelElement.textContent = options.label || this.getString("notesLabel");

                notesTextAreaElement.id = notesInputId;
                notesTextAreaElement.className = "mrbr-cvm-dialog-textarea mrbr-cvm-notes-textarea";
                notesTextAreaElement.value = this.sanitizeNoteText(options.notes || "");
                notesTextAreaElement.placeholder = this.getString("notesEmptyPlaceholder");

                actionsElement.className = "mrbr-cvm-dialog-actions mrbr-cvm-notes-dialog-actions";

                deleteButton.type = "button";
                deleteButton.className = "mrbr-cvm-notes-delete-button";
                deleteButton.textContent = this.getString("deleteNote");
                deleteButton.disabled = !this.sanitizeNoteText(options.notes || "");
                deleteButton.addEventListener("click", deleteNote);

                actionsSpacerElement.className = "mrbr-cvm-notes-dialog-actions-spacer";
                actionsSpacerElement.setAttribute("aria-hidden", "true");

                cancelButton.type = "button";
                cancelButton.textContent = this.getString("cancel");
                cancelButton.addEventListener("click", () => closeDialog(null));

                saveButton.type = "button";
                saveButton.textContent = this.getString("saveNotes");
                saveButton.addEventListener("click", save);

                backdropElement.addEventListener("click", event => {
                    if (event.target === backdropElement) {
                        closeDialog(null);
                    }
                });

                document.addEventListener("keydown", handleDocumentKeyDown, true);

                actionsElement.append(
                    deleteButton,
                    actionsSpacerElement,
                    cancelButton,
                    saveButton
                );
                dialogElement.append(headingElement, notesLabelElement, notesTextAreaElement, actionsElement);
                backdropElement.append(dialogElement);

                this.scheduleDomUpdate(() => {
                    document.documentElement.append(backdropElement);

                    window.requestAnimationFrame(() => {
                        notesTextAreaElement.focus();
                        notesTextAreaElement.select();
                    });
                });
            });
        }

        /**
         * @param {boolean} [mergeFromStorage]
         * @returns {Promise<void>}
         */
        async saveAndRender(mergeFromStorage = true) {
            if (this.persistence) {
                await this.persistence.saveState(this.getState(), {
                    mergeFromStorage
                });
            }

            this.render();
        }

        /**
         * @param {any} bookmark
         * @returns {Promise<boolean>}
         */
        async editBookmarkNotes(bookmark) {
            const hadNotes = this.hasBookmarkNotes(bookmark);
            const result = await this.showNotesDialog({
                dialogTitle: this.getString("editBookmarkNotesTitle"),
                label: this.getString("bookmarkNotes"),
                notes: this.getBookmarkNotes(bookmark)
            });

            if (!result) {
                return false;
            }

            this.setBookmarkNotes(bookmark, result.deleteNote ? "" : result.notes);
            await this.saveAndRender(!(hadNotes && (result.deleteNote || !result.notes)));

            return true;
        }

        /**
         * @param {any} collapsedBlock
         * @returns {Promise<boolean>}
         */
        async editCollapsedBlockNotes(collapsedBlock) {
            const hadNotes = this.hasCollapsedBlockNotes(collapsedBlock);
            const result = await this.showNotesDialog({
                dialogTitle: this.getString("collapsedBlockNotesTitle"),
                label: this.getString("bookmarkNotes"),
                notes: this.getCollapsedBlockNotes(collapsedBlock)
            });

            if (!result) {
                return false;
            }

            this.setCollapsedBlockNotes(collapsedBlock, result.deleteNote ? "" : result.notes);
            await this.saveAndRender(!(hadNotes && (result.deleteNote || !result.notes)));

            return true;
        }

        /**
         * @param {{ turnId?: string, turnIdContainer?: string, blockKey?: string, contentHash?: string, role?: string, blockIndex?: number }} identity
         * @param {any} item
         * @returns {boolean}
         */
        identityMatches(identity, item) {
            return window.MrbrCvm.ViewManagerIdentity.matches(identity, item);
        }

        /**
         * @param {any} identity
         * @returns {any | null}
         */
        findBookmarkForIdentity(identity) {
            return this.getState().bookmarks.find(bookmark => this.identityMatches(identity, bookmark)) || null;
        }

        /**
         * @param {any} identity
         * @returns {any | null}
         */
        findCollapsedBlockForIdentity(identity) {
            return this.getState().collapsedBlocks.find(collapsedBlock => this.identityMatches(identity, collapsedBlock)) || null;
        }

        /**
         * @param {HTMLElement} block
         * @returns {{ turnId?: string, turnIdContainer?: string, blockKey?: string, blockIndex?: number, role?: string, contentHash?: string }}
         */
        getIdentityForBlock(block) {
            const identity = this.scanner?.getBlockIdentity?.(block) || {},
                host = block.closest?.("[data-turn-id-container]") || block,
                hostTurnId = host instanceof HTMLElement
                    ? host.getAttribute("data-turn-id-container") || ""
                    : "";

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
            const title = this.scanner?.getBlockTitle?.(block)
                || (block.innerText || "").replace(/\s+/g, " ").trim()
                || this.getString("noteCreatedBookmarkTitle");

            return this.sanitizeTitleText(title);
        }

        /**
         * Creates a bookmark for an ordinary block because it now has a note.
         *
         * @param {HTMLElement} block
         * @param {string} notes
         * @returns {any | null}
         */
        createBookmarkForBlockNote(block, notes) {
            const identity = this.getIdentityForBlock(block),
                safeNotes = this.sanitizeNoteText(notes),
                ViewManagerBookmark = window.MrbrCvm.ViewManagerBookmark;

            if (!safeNotes || (!identity.blockKey && !identity.turnId)) {
                return null;
            }

            const title = this.getDefaultTitleForBlock(block),
                bookmark = new ViewManagerBookmark({
                    id: crypto.randomUUID(),
                    title: title || this.getString("noteCreatedBookmarkTitle"),
                    notes: safeNotes,
                    turnId: identity.turnId,
                    blockKey: identity.blockKey || identity.turnId || "",
                    blockIndex: identity.blockIndex,
                    role: identity.role,
                    contentHash: identity.contentHash,
                    createdUtc: new Date().toISOString()
                });

            this.getState().bookmarks.push(bookmark);

            if (bookmark.blockKey) {
                this.setBlockNotes(bookmark.blockKey, safeNotes);
            }

            return bookmark;
        }

        /**
         * Opens notes for a visible/plain block. If the block has no bookmark or
         * collapsed-block record yet, saving a note creates a bookmark with that note.
         *
         * @param {HTMLElement | null} block
         * @returns {Promise<boolean>}
         */
        async editNotesForBlockElement(block) {
            if (!(block instanceof HTMLElement)) {
                alert(this.getString("noVisibleConversationBlockFound"));
                return false;
            }

            const highlightedElement = this.highlightBlock(block) || block;

            try {
                const identity = this.getIdentityForBlock(block),
                    collapsedBlock = this.findCollapsedBlockForIdentity(identity),
                    bookmark = this.findBookmarkForIdentity(identity);

                if (collapsedBlock) {
                    return await this.editCollapsedBlockNotes(collapsedBlock);
                }

                if (bookmark) {
                    return await this.editBookmarkNotes(bookmark);
                }

                const existingBlockNotes = this.getBlockNotes(identity.blockKey);
                const result = await this.showNotesDialog({
                    dialogTitle: this.getString("editBookmarkNotesTitle"),
                    label: this.getString("bookmarkNotes"),
                    notes: existingBlockNotes,
                    requireText: !existingBlockNotes
                });

                if (!result) {
                    return false;
                }

                if (result.deleteNote || !result.notes) {
                    this.setBlockNotes(identity.blockKey, "");
                    await this.saveAndRender(false);
                    return true;
                }

                this.createBookmarkForBlockNote(block, result.notes);
                await this.saveAndRender();

                return true;
            } finally {
                this.clearHighlight(highlightedElement);
            }
        }

        /**
         * Handles a note request coming from a collapsed-block toolbar.
         *
         * @param {{ element?: HTMLElement | null, identity?: any, collapsedBlock?: any }} request
         * @returns {Promise<boolean>}
         */
        async editNotesForBlockRequest(request) {
            if (request?.collapsedBlock) {
                return await this.editCollapsedBlockNotes(request.collapsedBlock);
            }

            if (request?.identity) {
                const collapsedBlock = this.findCollapsedBlockForIdentity(request.identity),
                    bookmark = this.findBookmarkForIdentity(request.identity);

                if (collapsedBlock) {
                    return await this.editCollapsedBlockNotes(collapsedBlock);
                }

                if (bookmark) {
                    return await this.editBookmarkNotes(bookmark);
                }
            }

            if (request?.element instanceof HTMLElement) {
                return await this.editNotesForBlockElement(request.element);
            }

            return false;
        }
    }

    window.MrbrCvm.ViewManagerNotesManager = ViewManagerNotesManager;
})();
