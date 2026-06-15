(() => {
    "use strict";

    window.MrbrCvm = window.MrbrCvm || {};

    /**
     * Central string provider for View Manager UI text.
     *
     * Currently returns default English strings.
     * Later this can be changed to use chrome.i18n without changing UI code.
     */
    class ViewManagerStrings {
        /**
         * Gets the localized string for the given key.
         *
         * @param {string} key
         * @returns {string}
         */
        static get(key) {
            return ViewManagerStrings.getDefaultString(key);
        }

        /**
         * Formats a localized string using simple {0}, {1}, {2} placeholders.
         *
         * @param {string} key
         * @param {...string | number} values
         * @returns {string}
         */
        static format(key, ...values) {
            let text = ViewManagerStrings.get(key);

            values.forEach((value, index) => {
                text = text.replaceAll(`{${index}}`, String(value));
            });

            return text;
        }

        /**
         * Gets a default English string.
         *
         * @param {string} key
         * @returns {string}
         */
        static getDefaultString(key) {
            return ViewManagerStrings.defaultEnglish[key] || key;
        }

        /**
         * Default English strings for the View Manager.
         *
         * @type {Readonly<Record<string, string>>}
         */
        static defaultEnglish = {
            viewManagerTitle: "View Manager",
            blocksDetected: "{0} blocks detected",

            bookmarkVisibleBlock: "Bookmark visible block",
            collapseHighlightedBlock: "Collapse highlighted block",
            restoreAllCollapsedBlocks: "Restore all collapsed blocks",
            rescanConversationBlocks: "Rescan conversation blocks",
            scrollToTop: "Scroll to top",
            moreViewManagerActions: "More View Manager actions",

            expandViewManager: "Expand View Manager",
            collapseViewManager: "Collapse View Manager",

            addBookmarkTitle: "Add bookmark",
            bookmarkTitleLabel: "Bookmark title",
            saveBookmark: "Save bookmark",
            cancel: "Cancel",

            goToBookmark: "Go to bookmark",
            deleteBookmark: "Delete bookmark",
            noBookmarksYet: "No bookmarks yet.",
            bookmarksSectionTitle: "Bookmarks",

            collapsedBlocksSectionTitle: "Collapsed Blocks",
            noCollapsedBlocks: "No collapsed blocks.",
            goToCollapsedBlockPlaceholder: "Go to collapsed block placeholder",
            restoreCollapsedBlock: "Restore collapsed block",
            forgetCollapsedBlockAndRestore: "Forget collapsed block and restore it",
            collapsedPrefix: "Collapsed: {0}",

            exportData: "Export data",
            exportViewManagerData: "Export View Manager data",
            importData: "Import data",
            importViewManagerData: "Import View Manager data",

            lightTheme: "Light theme",
            darkTheme: "Dark theme",
            autoTheme: "Auto theme",
            useLightTheme: "Use Light theme",
            useDarkTheme: "Use Dark theme",
            useAutoTheme: "Use Auto theme",

            importFailedInvalidJson: "Import failed. The selected file is not valid JSON.",
            importFailedInvalidData: "Import failed. The selected file does not contain valid View Manager data.",
            importConfirmMessage: "Import View Manager data?\n\nThis will replace your current View Manager bookmarks, collapsed blocks, and UI settings.",
            importSuccessMessage: "View Manager data imported successfully.",

            noVisibleConversationBlockFound: "No visible conversation block was found.",
            noHighlightedConversationBlockFound: "No highlighted conversation block was found.",
            selectedBlockInvalidKey: "The selected block does not have a valid block key.",

            conversationScannerLoadFailed: "ChatGPT View Manager failed to load ConversationScanner.",
            iconFactoryLoadFailed: "ChatGPT View Manager failed to load ViewManagerIconButtonFactory.",
            actionsDropdownLoadFailed: "ChatGPT View Manager failed to load ViewManagerActionsDropdown.",
            iconsLoadFailed: "ChatGPT View Manager failed to load ViewManagerIcons.",
            stringsLoadFailed: "ChatGPT View Manager failed to load ViewManagerStrings.",

            couldNotFindBookmark: "Could not find bookmark \"{0}\". Try rescanning after the page has fully loaded.",
            couldNotFindCollapsedBlock: "Could not find collapsed block \"{0}\". Try rescanning after the page has fully loaded.",

            exportFilePrefix: "chatgpt-view-manager",
            exportedBy: "ChatGPT View Manager",

            domUpdateFailed: "ChatGPT View Manager DOM update failed.",
            startupFailed: "ChatGPT View Manager failed to start.",
            importFileReadFailed: "Failed to read import file.",
            importJsonParseFailed: "View Manager import JSON parse failed."
        };
    }

    window.MrbrCvm.ViewManagerStrings = ViewManagerStrings;
})();