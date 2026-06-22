(() => {
    "use strict";

    window.MrbrCvm = window.MrbrCvm || {};

    /**
     * Shared block-note state manager.
     *
     * This deliberately contains no notes UI. It exists so bookmarks, collapsed blocks,
     * and the future Notes Manager can share the same note storage behaviour.
     */
    class ViewManagerNotesManager {
        /**
         * @param {{ getState: () => { blockNotes: Record<string, any> } }} options
         */
        constructor(options) {
            if (!options?.getState) {
                throw new Error("ViewManagerNotesManager requires a getState callback.");
            }

            this.getState = options.getState;
        }

        /**
         * Gets notes for a conversation block.
         *
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
         * Sets notes for a conversation block.
         *
         * @param {string} blockKey
         * @param {string} notes
         * @returns {void}
         */
        setBlockNotes(blockKey, notes) {
            if (!blockKey) {
                return;
            }

            const state = this.getState(),
                trimmedNotes = notes.trim();

            if (!trimmedNotes) {
                delete state.blockNotes[blockKey];
                return;
            }

            const ViewManagerBlockNote = window.MrbrCvm.ViewManagerBlockNote;

            state.blockNotes[blockKey] = new ViewManagerBlockNote({
                blockKey,
                notes: trimmedNotes,
                updatedUtc: new Date().toISOString()
            });
        }
    }

    window.MrbrCvm.ViewManagerNotesManager = ViewManagerNotesManager;
})();
