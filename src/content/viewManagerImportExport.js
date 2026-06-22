(() => {
    "use strict";

    window.MrbrCvm = window.MrbrCvm || {};

    /**
     * Handles View Manager JSON import/export.
     */
    class ViewManagerImportExport {
        /**
         * @param {{
         *     persistence: InstanceType<typeof window.MrbrCvm.ViewManagerLocalPersistence>,
         *     strings: { get: (key: string) => string },
         *     scheduleDomUpdate?: (callback: () => void) => void
         * }} options
         */
        constructor(options) {
            if (!options?.persistence) {
                throw new Error("ViewManagerImportExport requires a persistence instance.");
            }

            this.persistence = options.persistence;
            this.strings = options.strings || window.MrbrCvm.ViewManagerStrings;
            this.scheduleDomUpdate = options.scheduleDomUpdate || (callback => window.requestAnimationFrame(callback));
        }

        /**
         * @param {string} key
         * @returns {string}
         */
        getString(key) {
            return this.strings?.get?.(key) || key;
        }

        /**
         * Exports the full View Manager state as a JSON file.
         *
         * @returns {Promise<void>}
         */
        async exportState() {
            await this.persistence.saveState();

            const exportData = {
                exportedBy: this.getString("exportedBy"),
                exportedUtc: new Date().toISOString(),
                storageKey: this.persistence.storageKey,
                activeConversationKey: this.persistence.conversationKey,
                data: this.persistence.storageRoot
            };

            const json = JSON.stringify(exportData, null, 4),
                blob = new Blob([json], { type: "application/json" }),
                objectUrl = URL.createObjectURL(blob),
                anchorElement = document.createElement("a");

            anchorElement.href = objectUrl;
            anchorElement.download = this.createExportFileName();

            this.scheduleDomUpdate(() => {
                document.documentElement.append(anchorElement);
                anchorElement.click();
                anchorElement.remove();

                window.setTimeout(() => {
                    URL.revokeObjectURL(objectUrl);
                }, 1000);
            });
        }

        /**
         * Imports View Manager state from a JSON file.
         *
         * @returns {Promise<boolean>} True when import completed.
         */
        async importState() {
            const jsonText = await this.readImportFileText();

            if (!jsonText) {
                return false;
            }

            let parsed;

            try {
                parsed = JSON.parse(jsonText);
            } catch (error) {
                alert(this.getString("importFailedInvalidJson"));
                console.error(this.getString("importJsonParseFailed"), error);
                return false;
            }

            const importedRoot = parsed?.data || parsed;

            if (!this.persistence.isValidStorageRoot(importedRoot)) {
                alert(this.getString("importFailedInvalidData"));
                return false;
            }

            const shouldImport = confirm(this.getString("importConfirmMessage"));

            if (!shouldImport) {
                return false;
            }

            await this.persistence.replaceStorageRoot(importedRoot);

            alert(this.getString("importSuccessMessage"));
            return true;
        }

        /**
         * Prompts the user to choose a JSON file and returns its text.
         *
         * @returns {Promise<string | null>}
         */
        readImportFileText() {
            return new Promise(resolve => {
                const inputElement = document.createElement("input");

                inputElement.type = "file";
                inputElement.accept = "application/json,.json";

                inputElement.addEventListener("change", async () => {
                    const file = inputElement.files?.[0];

                    inputElement.remove();

                    if (!file) {
                        resolve(null);
                        return;
                    }

                    try {
                        resolve(await file.text());
                    } catch (error) {
                        console.error(this.getString("importFileReadFailed"), error);
                        resolve(null);
                    }
                });

                inputElement.addEventListener("cancel", () => {
                    inputElement.remove();
                    resolve(null);
                });

                this.scheduleDomUpdate(() => {
                    document.documentElement.append(inputElement);
                    inputElement.click();
                });
            });
        }

        /**
         * Creates a safe timestamped export filename.
         *
         * @returns {string}
         */
        createExportFileName() {
            const timestamp = new Date()
                .toISOString()
                .replace(/[:.]/g, "-");

            return `${this.getString("exportFilePrefix")}-${timestamp}.json`;
        }
    }

    window.MrbrCvm.ViewManagerImportExport = ViewManagerImportExport;
})();
