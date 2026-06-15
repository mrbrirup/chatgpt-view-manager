/* eslint-disable no-console */
"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.cwd();

const files = {
    manifest: path.join(repoRoot, "manifest.json"),
    content: path.join(repoRoot, "src/content/content.js"),
    dropdown: path.join(repoRoot, "src/content/viewManagerActionsDropdown.js"),
    strings: path.join(repoRoot, "src/content/viewManagerStrings.js"),
    globals: path.join(repoRoot, "types/chrome-extension-globals.d.ts")
};

/**
 * Reads a UTF-8 file.
 *
 * @param {string} filePath
 * @returns {string}
 */
function read(filePath) {
    return fs.readFileSync(filePath, "utf8");
}

/**
 * Writes a UTF-8 file.
 *
 * @param {string} filePath
 * @param {string} text
 * @returns {void}
 */
function write(filePath, text) {
    fs.writeFileSync(filePath, text, "utf8");
}

/**
 * Replaces text once or many times.
 *
 * @param {string} text
 * @param {string | RegExp} search
 * @param {string} replacement
 * @returns {string}
 */
function replaceAll(text, search, replacement) {
    const before = text,
        after = text.replace(search, replacement);

    if (before === after) {
        console.warn(`No replacement made for: ${String(search).substring(0, 120)}`);
    }

    return after;
}

/**
 * Ensures a directory exists.
 *
 * @param {string} directoryPath
 * @returns {void}
 */
function ensureDirectory(directoryPath) {
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
    }
}

/**
 * Inserts text before a marker if the text is not already present.
 *
 * @param {string} source
 * @param {string} marker
 * @param {string} insertion
 * @param {string} alreadyContains
 * @returns {string}
 */
function insertBefore(source, marker, insertion, alreadyContains) {
    if (source.includes(alreadyContains)) {
        return source;
    }

    const index = source.indexOf(marker);

    if (index < 0) {
        console.warn(`Marker not found: ${marker}`);
        return source;
    }

    return source.slice(0, index) + insertion + source.slice(index);
}

/**
 * Creates the ViewManagerStrings file.
 *
 * @returns {void}
 */
function createStringsFile() {
    ensureDirectory(path.dirname(files.strings));

    const text = `(() => {
    "use strict";

    window.MrbrCvm = window.MrbrCvm || {};

    /**
     * Central string registry for View Manager UI text.
     */
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
         * Formats a string using simple {0}, {1}, {2} placeholders.
         *
         * @param {string} key
         * @param {...string | number} values
         * @returns {string}
         */
        static format(key, ...values) {
            let text = ViewManagerStrings.get(key);

            values.forEach((value, index) => {
                text = text.replaceAll(\`{\${index}}\`, String(value));
            });

            return text;
        }

        /**
         * English strings for the View Manager.
         *
         * @type {Readonly<Record<string, string>>}
         */
        static english = {
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
            importConfirmMessage: "Import View Manager data?\\n\\nThis will replace your current View Manager bookmarks, collapsed blocks, and UI settings.",
            importSuccessMessage: "View Manager data imported successfully.",

            noVisibleConversationBlockFound: "No visible conversation block was found.",
            noHighlightedConversationBlockFound: "No highlighted conversation block was found.",
            selectedBlockInvalidKey: "The selected block does not have a valid block key.",

            conversationScannerLoadFailed: "ChatGPT View Manager failed to load ConversationScanner.",
            iconFactoryLoadFailed: "ChatGPT View Manager failed to load ViewManagerIconButtonFactory.",
            actionsDropdownLoadFailed: "ChatGPT View Manager failed to load ViewManagerActionsDropdown.",
            iconsLoadFailed: "ChatGPT View Manager failed to load ViewManagerIcons.",
            stringsLoadFailed: "ChatGPT View Manager failed to load ViewManagerStrings.",

            couldNotFindBookmark: "Could not find bookmark \\"{0}\\". Try rescanning after the page has fully loaded.",
            couldNotFindCollapsedBlock: "Could not find collapsed block \\"{0}\\". Try rescanning after the page has fully loaded.",

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
`;

    write(files.strings, text);
    console.log("Created/updated viewManagerStrings.js");
}

/**
 * Updates manifest script order.
 *
 * @returns {void}
 */
function updateManifest() {
    const manifest = JSON.parse(read(files.manifest));

    for (const contentScript of manifest.content_scripts || []) {
        const js = contentScript.js || [];

        if (!js.includes("src/content/viewManagerStrings.js")) {
            const iconIndex = js.indexOf("src/content/viewManagerIcons.js"),
                insertIndex = iconIndex >= 0 ? iconIndex : Math.max(0, js.indexOf("src/content/content.js"));

            js.splice(insertIndex, 0, "src/content/viewManagerStrings.js");
        }

        contentScript.js = js;
    }

    write(files.manifest, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log("Updated manifest.json");
}

/**
 * Updates global declarations.
 *
 * @returns {void}
 */
function updateGlobals() {
    let text = read(files.globals);

    if (!text.includes("ViewManagerStrings?: typeof ViewManagerStrings;")) {
        text = text.replace(
            /interface Window\s*{\s*MrbrCvm\??:\s*{/,
            match => `${match}\n            ViewManagerStrings?: typeof ViewManagerStrings;`
        );
    }

    if (!text.includes("class ViewManagerStrings")) {
        text += `

class ViewManagerStrings {
    static get(key: string): string;
    static format(key: string, ...values: Array<string | number>): string;
}
`;
    }

    write(files.globals, text);
    console.log("Updated chrome-extension-globals.d.ts");
}

/**
 * Updates content.js.
 *
 * @returns {void}
 */
function updateContent() {
    let text = read(files.content);

    const resolver = `
/**
 * @typedef {{ get: (key: string) => string, format: (key: string, ...values: Array<string | number>) => string }} ViewManagerStringsType
 */

/**
 * Gets the ViewManagerStrings registry.
 *
 * @returns {ViewManagerStringsType}
 */
const getViewManagerStrings = () => {
    const viewManagerStrings = window.MrbrCvm?.ViewManagerStrings;

    if (!viewManagerStrings) {
        throw new Error("ChatGPT View Manager failed to load ViewManagerStrings.");
    }

    return viewManagerStrings;
};

const ViewManagerStrings = getViewManagerStrings();

`;

    if (!text.includes("const ViewManagerStrings = getViewManagerStrings();")) {
        text = insertBefore(text, "/**\n * @typedef", resolver, "const ViewManagerStrings = getViewManagerStrings();");
    }

    const convenienceMethods = `
        /**
         * Gets a UI string.
         *
         * @param {string} key
         * @returns {string}
         */
        getString(key) {
            return ViewManagerStrings.get(key);
        }

        /**
         * Formats a UI string.
         *
         * @param {string} key
         * @param {...string | number} values
         * @returns {string}
         */
        formatString(key, ...values) {
            return ViewManagerStrings.format(key, ...values);
        }

`;

    if (!text.includes("getString(key)")) {
        text = insertBefore(text, "        /**\n         * Starts the extension content script.", convenienceMethods, "getString(key)");
    }

    const replacements = [
        [`throw new Error("ChatGPT View Manager failed to load ConversationScanner.");`, `throw new Error(ViewManagerStrings.get("conversationScannerLoadFailed"));`],
        [`throw new Error("ChatGPT View Manager failed to load ViewManagerIconButtonFactory.");`, `throw new Error(ViewManagerStrings.get("iconFactoryLoadFailed"));`],
        [`throw new Error("ChatGPT View Manager failed to load ViewManagerActionsDropdown.");`, `throw new Error(ViewManagerStrings.get("actionsDropdownLoadFailed"));`],
        [`console.error("ChatGPT View Manager failed to start.", error);`, `console.error(ViewManagerStrings.get("startupFailed"), error);`],

        [`titleElement.textContent = "View Manager";`, `titleElement.textContent = this.getString("viewManagerTitle");`],
        [/statusElement\.textContent = `\$\{blocks\.length\} blocks detected`;/g, `statusElement.textContent = this.formatString("blocksDetected", blocks.length);`],
        [/statusElement\.textContent = `\$\{blockCount\} blocks detected`;/g, `statusElement.textContent = this.formatString("blocksDetected", blockCount);`],

        [`title: "Collapse View Manager",`, `title: this.getString("collapseViewManager"),`],
        [`title: "Expand View Manager",`, `title: this.getString("expandViewManager"),`],

        [`title: "Bookmark visible block",`, `title: this.getString("bookmarkVisibleBlock"),`],
        [`title: "Collapse highlighted block",`, `title: this.getString("collapseHighlightedBlock"),`],
        [`title: "Restore all collapsed blocks",`, `title: this.getString("restoreAllCollapsedBlocks"),`],
        [`title: "Rescan conversation blocks",`, `title: this.getString("rescanConversationBlocks"),`],
        [`title: "Scroll to top",`, `title: this.getString("scrollToTop"),`],

        [`title: "Add bookmark",`, `title: this.getString("addBookmarkTitle"),`],
        [`label: "Bookmark title"`, `label: this.getString("bookmarkTitleLabel")`],
        [`cancelButton.textContent = "Cancel";`, `cancelButton.textContent = this.getString("cancel");`],
        [`saveButton.textContent = "Save bookmark";`, `saveButton.textContent = this.getString("saveBookmark");`],

        [`return this.createCompactSectionElement("Bookmarks", this.state.bookmarks.length, listElement);`, `return this.createCompactSectionElement(this.getString("bookmarksSectionTitle"), this.state.bookmarks.length, listElement);`],
        [`emptyElement.textContent = "No bookmarks yet.";`, `emptyElement.textContent = this.getString("noBookmarksYet");`],
        [`title: "Go to bookmark",`, `title: this.getString("goToBookmark"),`],
        [`title: "Delete bookmark",`, `title: this.getString("deleteBookmark"),`],

        [`return this.createCompactSectionElement("Collapsed Blocks", this.state.collapsedBlocks.length, listElement);`, `return this.createCompactSectionElement(this.getString("collapsedBlocksSectionTitle"), this.state.collapsedBlocks.length, listElement);`],
        [`emptyElement.textContent = "No collapsed blocks.";`, `emptyElement.textContent = this.getString("noCollapsedBlocks");`],
        [`title: "Go to collapsed block placeholder",`, `title: this.getString("goToCollapsedBlockPlaceholder"),`],
        [`title: "Restore collapsed block",`, `title: this.getString("restoreCollapsedBlock"),`],
        [`title: "Forget collapsed block and restore it",`, `title: this.getString("forgetCollapsedBlockAndRestore"),`],

        [/titleElement\.textContent = `Collapsed: \$\{collapsedBlock\.title\}`;/g, `titleElement.textContent = this.formatString("collapsedPrefix", collapsedBlock.title);`],
        [`restoreButton.textContent = "Restore";`, `restoreButton.textContent = this.getString("restoreCollapsedBlock");`],

        [`alert("No visible conversation block was found.");`, `alert(this.getString("noVisibleConversationBlockFound"));`],
        [`alert("No highlighted conversation block was found.");`, `alert(this.getString("noHighlightedConversationBlockFound"));`],
        [`alert("The selected block does not have a valid block key.");`, `alert(this.getString("selectedBlockInvalidKey"));`],
        [/alert\(`Could not find bookmark "\$\{bookmark\.title\}"\. Try rescanning after the page has fully loaded\.`\);/g, `alert(this.formatString("couldNotFindBookmark", bookmark.title));`],
        [/alert\(`Could not find collapsed block "\$\{collapsedBlock\.title\}"\. Try rescanning after the page has fully loaded\.`\);/g, `alert(this.formatString("couldNotFindCollapsedBlock", collapsedBlock.title));`],

        [/return `chatgpt-view-manager-\$\{timestamp\}\.json`;/g, `return \`\${this.getString("exportFilePrefix")}-\${timestamp}.json\`;`],
        [`exportedBy: "ChatGPT View Manager",`, `exportedBy: this.getString("exportedBy"),`],

        [`console.error("Failed to read import file.", error);`, `console.error(this.getString("importFileReadFailed"), error);`],
        [`alert("Import failed. The selected file is not valid JSON.");`, `alert(this.getString("importFailedInvalidJson"));`],
        [`console.error("View Manager import JSON parse failed.", error);`, `console.error(this.getString("importJsonParseFailed"), error);`],
        [`alert("Import failed. The selected file does not contain valid View Manager data.");`, `alert(this.getString("importFailedInvalidData"));`],
        [`alert("View Manager data imported successfully.");`, `alert(this.getString("importSuccessMessage"));`],
        [`console.error("ChatGPT View Manager DOM update failed.", error);`, `console.error(this.getString("domUpdateFailed"), error);`]
    ];

    for (const [search, replacement] of replacements) {
        text = replaceAll(text, search, replacement);
    }

    text = text.replace(
        /const shouldImport = confirm\(\s*"Import View Manager data\?\\n\\n" \+\s*"This will replace your current View Manager bookmarks, collapsed blocks, and UI settings\."\s*\);/m,
        `const shouldImport = confirm(this.getString("importConfirmMessage"));`
    );

    write(files.content, text);
    console.log("Updated content.js");
}

/**
 * Updates viewManagerActionsDropdown.js.
 *
 * @returns {void}
 */
function updateDropdown() {
    let text = read(files.dropdown);

    const resolver = `
/**
 * @typedef {{ get: (key: string) => string }} ViewManagerStringsType
 */

/**
 * Gets the ViewManagerStrings registry.
 *
 * @returns {ViewManagerStringsType}
 */
const getViewManagerStrings = () => {
    const viewManagerStrings = window.MrbrCvm?.ViewManagerStrings;

    if (!viewManagerStrings) {
        throw new Error("ChatGPT View Manager failed to load ViewManagerStrings.");
    }

    return viewManagerStrings;
};

const ViewManagerStrings = getViewManagerStrings();

`;

    if (!text.includes("const ViewManagerStrings = getViewManagerStrings();")) {
        text = text.replace(`    window.MrbrCvm = window.MrbrCvm || {};\n`, `    window.MrbrCvm = window.MrbrCvm || {};\n${resolver}`);
    }

    const replacements = [
        [`title: "More View Manager actions",`, `title: ViewManagerStrings.get("moreViewManagerActions"),`],
        [`this.createMenuButton("Export data", "Export View Manager data", () => {`, `this.createMenuButton(ViewManagerStrings.get("exportData"), ViewManagerStrings.get("exportViewManagerData"), () => {`],
        [`this.createMenuButton("Import data", "Import View Manager data", () => {`, `this.createMenuButton(ViewManagerStrings.get("importData"), ViewManagerStrings.get("importViewManagerData"), () => {`],
        [`this.createMenuButton("Light theme", "Use Light theme", () => {`, `this.createMenuButton(ViewManagerStrings.get("lightTheme"), ViewManagerStrings.get("useLightTheme"), () => {`],
        [`this.createMenuButton("Dark theme", "Use Dark theme", () => {`, `this.createMenuButton(ViewManagerStrings.get("darkTheme"), ViewManagerStrings.get("useDarkTheme"), () => {`],
        [`this.createMenuButton("Auto theme", "Use Auto theme", () => {`, `this.createMenuButton(ViewManagerStrings.get("autoTheme"), ViewManagerStrings.get("useAutoTheme"), () => {`]
    ];

    for (const [search, replacement] of replacements) {
        text = replaceAll(text, search, replacement);
    }

    write(files.dropdown, text);
    console.log("Updated viewManagerActionsDropdown.js");
}

createStringsFile();
updateManifest();
updateGlobals();
updateContent();
updateDropdown();

console.log("Milestone 1.10 string replacement script completed.");