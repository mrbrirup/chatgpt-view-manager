(() => {
    "use strict";

    window.MrbrCvm = window.MrbrCvm || {};

    /**
     * Minimal dialog-based prompt editor. The dialog stays in the extension's
     * isolated world; ProseMirror updates are delegated to a tiny page-world
     * bridge because ChatGPT's EditorView is owned by the webpage.
     */
    class CustomEditor {
        static BRIDGE_SCRIPT_ID = "mrbr-cvm-custom-editor-main-world-bridge-v3";
        static REQUEST_TYPE = "mrbr-cvm-custom-editor-request-v3";
        static RESPONSE_TYPE = "mrbr-cvm-custom-editor-response-v3";
        static SOURCE = "mrbr-cvm-custom-editor-v3";
        static LAST_RESULT_ELEMENT_ID = "mrbr-cvm-custom-editor-last-result";
        static TEMPLATE = `
            <div class="mrbr-cvm-dialog-backdrop mrbr-cvm-custom-editor-backdrop">
                <div class="mrbr-cvm-dialog mrbr-cvm-custom-editor-dialog" role="dialog" aria-modal="true">
                    <div class="mrbr-cvm-custom-editor-header">
                        <h3 class="mrbr-cvm-dialog-title" data-mrbr-cvm-custom-editor-title></h3>
                        <div class="mrbr-cvm-custom-editor-toolbar" data-mrbr-cvm-custom-editor-toolbar></div>
                    </div>
                    <label class="mrbr-cvm-dialog-label" data-mrbr-cvm-custom-editor-label></label>
                    <textarea class="mrbr-cvm-dialog-textarea mrbr-cvm-custom-editor-textarea" data-mrbr-cvm-custom-editor-textarea></textarea>
                    <div class="mrbr-cvm-custom-editor-status" data-mrbr-cvm-custom-editor-status aria-live="polite"></div>
                    <div class="mrbr-cvm-dialog-actions mrbr-cvm-custom-editor-actions" data-mrbr-cvm-custom-editor-actions></div>
                </div>
            </div>`;

        /**
         * @param {{
         *     createIconButton: (options: any) => HTMLButtonElement,
         *     strings: { get: (key: string) => string }
         * }} options
         */
        constructor(options) {
            this.createIconButton = options.createIconButton;
            this.strings = options.strings;
            this.bridgeReadyPromise = null;
            this.backdropElement = null;
            this.dialogElement = null;
            this.textareaElement = null;
            this.statusElement = null;
            this.expandButton = null;
            this.isExpanded = false;
        }

        /**
         * @param {string} key
         * @returns {string}
         */
        getString(key) {
            return this.strings.get(key);
        }

        /**
         * Ensures the page-world bridge has been loaded.
         *
         * @returns {Promise<void>}
         */
        ensureMainWorldBridge() {
            if (this.bridgeReadyPromise) {
                return this.bridgeReadyPromise;
            }

            this.bridgeReadyPromise = new Promise((resolve, reject) => {
                const existingScript = document.getElementById(CustomEditor.BRIDGE_SCRIPT_ID);

                if (existingScript instanceof HTMLScriptElement) {
                    resolve();
                    return;
                }

                const scriptElement = document.createElement("script");

                scriptElement.id = CustomEditor.BRIDGE_SCRIPT_ID;
                scriptElement.src = chrome.runtime.getURL("src/page/customEditorMainWorldBridge.js");
                scriptElement.onload = () => resolve();
                scriptElement.onerror = () => reject(new Error(this.getString("customEditorBridgeLoadFailed")));

                document.documentElement.append(scriptElement);
            });

            return this.bridgeReadyPromise;
        }

        /**
         * Calls the page-world bridge with plain serializable data.
         *
         * @param {string} action
         * @param {Record<string, any>} [payload]
         * @returns {Promise<Record<string, any>>}
         */
        async callMainWorld(action, payload = {}) {
            await this.ensureMainWorldBridge();

            const requestId = crypto.randomUUID();

            return new Promise((resolve, reject) => {
                const timeoutId = window.setTimeout(() => {
                    window.removeEventListener("message", handleMessage);
                    reject(new Error(this.getString("customEditorBridgeTimedOut")));
                }, 4000);

                /** @param {MessageEvent} event */
                const handleMessage = event => {
                    if (
                        event.source !== window
                        || event.data?.source !== CustomEditor.SOURCE
                        || event.data?.type !== CustomEditor.RESPONSE_TYPE
                        || event.data?.requestId !== requestId
                    ) {
                        return;
                    }

                    window.clearTimeout(timeoutId);
                    window.removeEventListener("message", handleMessage);
                    const result = event.data.result || {
                        ok: false,
                        reason: this.getString("customEditorUnknownBridgeResponse")
                    };

                    this.publishLastResult(action, result);
                    resolve(result);
                };

                window.addEventListener("message", handleMessage);
                window.postMessage({
                    source: CustomEditor.SOURCE,
                    type: CustomEditor.REQUEST_TYPE,
                    requestId,
                    action,
                    payload
                }, window.location.origin);
            });
        }

        /**
         * Publishes the latest MAIN-world response as inert JSON for DevTools.
         *
         * @param {string} action
         * @param {Record<string, any>} result
         * @returns {void}
         */
        publishLastResult(action, result) {
            let outputElement = document.getElementById(CustomEditor.LAST_RESULT_ELEMENT_ID);

            if (!(outputElement instanceof HTMLScriptElement)) {
                outputElement = document.createElement("script");
                outputElement.id = CustomEditor.LAST_RESULT_ELEMENT_ID;
                outputElement.type = "application/json";
                outputElement.hidden = true;
                document.documentElement.append(outputElement);
            }

            outputElement.textContent = JSON.stringify({
                action,
                result,
                capturedUtc: new Date().toISOString()
            });
        }

        /**
         * Creates a text button for dialog actions.
         *
         * @param {string} text
         * @param {() => void | Promise<void>} onClick
         * @returns {HTMLButtonElement}
         */
        createTextButton(text, onClick) {
            const button = document.createElement("button");

            button.type = "button";
            button.textContent = text;
            button.addEventListener("click", event => {
                event.preventDefault();
                Promise.resolve(onClick()).catch(error => this.setStatus(
                    error instanceof Error ? error.message : String(error),
                    true
                ));
            });

            return button;
        }

        /**
         * @returns {HTMLElement}
         */
        createElement() {
            const parsedDocument = new DOMParser().parseFromString(CustomEditor.TEMPLATE, "text/html"),
                backdropElement = parsedDocument.body.firstElementChild;

            if (!(backdropElement instanceof HTMLElement)) {
                throw new Error(this.getString("customEditorCreateFailed"));
            }

            const dialogElement = backdropElement.querySelector(".mrbr-cvm-custom-editor-dialog"),
                titleElement = backdropElement.querySelector("[data-mrbr-cvm-custom-editor-title]"),
                toolbarElement = backdropElement.querySelector("[data-mrbr-cvm-custom-editor-toolbar]"),
                labelElement = backdropElement.querySelector("[data-mrbr-cvm-custom-editor-label]"),
                textareaElement = backdropElement.querySelector("[data-mrbr-cvm-custom-editor-textarea]"),
                statusElement = backdropElement.querySelector("[data-mrbr-cvm-custom-editor-status]"),
                actionsElement = backdropElement.querySelector("[data-mrbr-cvm-custom-editor-actions]");

            if (
                !(dialogElement instanceof HTMLElement)
                || !(titleElement instanceof HTMLElement)
                || !(toolbarElement instanceof HTMLElement)
                || !(labelElement instanceof HTMLLabelElement)
                || !(textareaElement instanceof HTMLTextAreaElement)
                || !(statusElement instanceof HTMLElement)
                || !(actionsElement instanceof HTMLElement)
            ) {
                throw new Error(this.getString("customEditorCreateFailed"));
            }

            const dialogId = `mrbr-cvm-custom-editor-${crypto.randomUUID()}`,
                textareaId = `${dialogId}-textarea`,
                goButton = this.createIconButton({
                    iconName: "go",
                    title: this.getString("customEditorGoToPrompt"),
                    onClick: () => this.focusComposer()
                });

            this.expandButton = this.createIconButton({
                iconName: "expandPanel",
                title: this.getString("customEditorExpandDialog"),
                onClick: () => this.toggleExpanded()
            });

            dialogElement.setAttribute("aria-labelledby", dialogId);
            titleElement.id = dialogId;
            titleElement.textContent = this.getString("customEditorTitle");
            labelElement.textContent = this.getString("customEditorPromptLabel");
            labelElement.setAttribute("for", textareaId);
            textareaElement.id = textareaId;
            textareaElement.placeholder = this.getString("customEditorPromptPlaceholder");

            toolbarElement.append(goButton, this.expandButton);
            actionsElement.append(
                this.createTextButton(this.getString("cancel"), () => this.close()),
                this.createTextButton(this.getString("customEditorSetPrompt"), () => this.setPrompt(false)),
                this.createTextButton(this.getString("customEditorSetPromptAndSend"), () => this.setPrompt(true))
            );

            backdropElement.addEventListener("click", event => {
                if (event.target === backdropElement) {
                    this.close();
                }
            });

            backdropElement.addEventListener("keydown", event => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    this.close();
                }
            });

            this.backdropElement = backdropElement;
            this.dialogElement = dialogElement;
            this.textareaElement = textareaElement;
            this.statusElement = statusElement;

            return backdropElement;
        }

        /**
         * @returns {Promise<void>}
         */
        async show() {
            if (this.backdropElement?.isConnected) {
                this.textareaElement?.focus();
                return;
            }

            document.documentElement.append(this.createElement());
            this.textareaElement?.focus();
            this.setStatus(this.getString("customEditorReady"));
        }

        /**
         * @returns {void}
         */
        close() {
            this.backdropElement?.remove();
            this.backdropElement = null;
            this.dialogElement = null;
            this.textareaElement = null;
            this.statusElement = null;
            this.expandButton = null;
            this.isExpanded = false;
        }

        /**
         * @returns {Promise<void>}
         */
        async focusComposer() {
            const result = await this.callMainWorld("focusComposer");

            this.setStatus(
                result.ok === true
                    ? this.getString("customEditorPromptFocused")
                    : result.reason || this.getString("customEditorPromptNotFound"),
                result.ok !== true
            );
        }

        /**
         * @param {boolean} clickSend
         * @returns {Promise<void>}
         */
        async setPrompt(clickSend) {
            if (!this.textareaElement) {
                return;
            }

            this.setBusy(true);
            this.setStatus(
                clickSend
                    ? this.getString("customEditorSettingPromptAndSending")
                    : this.getString("customEditorSettingPrompt")
            );

            try {
                const result = await this.callMainWorld("setPromptText", {
                    text: this.textareaElement.value,
                    clickSend
                });

                if (result.ok !== true) {
                    this.setStatus(result.reason || this.getString("customEditorPromptUpdateFailed"), true);
                    return;
                }

                if (clickSend && !result.clickedSend) {
                    this.setStatus(this.getString("customEditorPromptSetButSendNotClicked"), true);
                    return;
                }

                this.setStatus(
                    clickSend
                        ? this.getString("customEditorPromptSetAndSent")
                        : this.getString("customEditorPromptSet")
                );
            } catch (error) {
                this.setStatus(error instanceof Error ? error.message : String(error), true);
            } finally {
                this.setBusy(false);
            }
        }

        /**
         * @returns {void}
         */
        toggleExpanded() {
            this.isExpanded = !this.isExpanded;
            this.dialogElement?.classList.toggle("mrbr-cvm-custom-editor-dialog-expanded", this.isExpanded);

            if (this.expandButton) {
                this.expandButton.replaceChildren(
                    window.MrbrCvm.ViewManagerIconButtonFactory
                        ? new window.MrbrCvm.ViewManagerIconButtonFactory().createIconElement(
                            this.isExpanded ? "collapsePanel" : "expandPanel"
                        )
                        : document.createTextNode(this.isExpanded ? "-" : "+")
                );
                this.expandButton.title = this.getString(
                    this.isExpanded ? "customEditorCollapseDialog" : "customEditorExpandDialog"
                );
                this.expandButton.setAttribute("aria-label", this.expandButton.title);
            }
        }

        /**
         * @param {boolean} isBusy
         * @returns {void}
         */
        setBusy(isBusy) {
            this.dialogElement?.classList.toggle("mrbr-cvm-custom-editor-busy", isBusy);
            this.dialogElement?.querySelectorAll("button, textarea").forEach(element => {
                if (element instanceof HTMLButtonElement || element instanceof HTMLTextAreaElement) {
                    element.disabled = isBusy;
                }
            });
        }

        /**
         * @param {string} message
         * @param {boolean} [isError]
         * @returns {void}
         */
        setStatus(message, isError = false) {
            if (!this.statusElement) {
                return;
            }

            this.statusElement.textContent = message;
            this.statusElement.classList.toggle("mrbr-cvm-custom-editor-status-error", isError);
        }
    }

    window.MrbrCvm.CustomEditor = CustomEditor;
})();
