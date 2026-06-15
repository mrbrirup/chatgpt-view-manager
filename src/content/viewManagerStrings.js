class ViewManagerStrings {
    /**
     * Gets the localized string for the given key.
     *
     * @param {string} key
     * @returns {string}
     */
    static get(key) {
        return ViewManagerStrings.english[key] || key;
    }

    /**
     * English strings for the View Manager.
     * @type {Readonly<Record<string, string>>}
     * @static
     * @readonly
     */
    static english = {
        viewManagerTitle: "View Manager",
        bookmarkVisibleBlock: "Bookmark visible block",
        collapseHighlightedBlock: "Collapse highlighted block",
        restoreAllCollapsedBlocks: "Restore all collapsed blocks",
        rescanConversationBlocks: "Rescan conversation blocks",
        scrollToTop: "Scroll to top",
        moreViewManagerActions: "More View Manager actions",
        exportData: "Export data",
        importData: "Import data",
        lightTheme: "Light theme",
        darkTheme: "Dark theme",
        autoTheme: "Auto theme"
    };
}