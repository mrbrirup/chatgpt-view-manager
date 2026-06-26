(() => {
    "use strict";

    window.MrbrCvm = window.MrbrCvm || {};

    /**
     * Floating custom prompt editor. The editor UI stays in the extension's
     * isolated world; prompt updates are delegated to a page-world bridge because
     * ChatGPT's composer belongs to the webpage.
     */
    class CustomEditor {
        static BRIDGE_SCRIPT_ID = "mrbr-cvm-custom-editor-main-world-bridge-v3";
        static REQUEST_TYPE = "mrbr-cvm-custom-editor-request-v3";
        static RESPONSE_TYPE = "mrbr-cvm-custom-editor-response-v3";
        static SOURCE = "mrbr-cvm-custom-editor-v3";
        static LAST_RESULT_ELEMENT_ID = "mrbr-cvm-custom-editor-last-result";
        static GEOMETRY_STORAGE_KEY = "mrbrCvmCustomPromptDialogGeometry";
        static DEFAULT_WIDTH = 640;
        static DEFAULT_HEIGHT = 480;
        static MIN_WIDTH = 360;
        static MIN_HEIGHT = 260;
        static VIEWPORT_MARGIN = 12;
        static TEMPLATE = `
            <div class="mrbr-cvm-custom-editor-window" role="dialog" aria-modal="false">
                <div class="mrbr-cvm-custom-editor-titlebar" data-mrbr-cvm-custom-editor-drag-handle>
                    <h3 class="mrbr-cvm-dialog-title" data-mrbr-cvm-custom-editor-title></h3>
                    <div class="mrbr-cvm-custom-editor-titlebar-actions" data-mrbr-cvm-custom-editor-titlebar-actions></div>
                </div>
                <div class="mrbr-cvm-custom-editor-body">
                    <label class="mrbr-cvm-dialog-label" data-mrbr-cvm-custom-editor-label></label>
                    <textarea class="mrbr-cvm-dialog-textarea mrbr-cvm-custom-editor-textarea" data-mrbr-cvm-custom-editor-textarea></textarea>
                    <div class="mrbr-cvm-custom-editor-status" data-mrbr-cvm-custom-editor-status aria-live="polite"></div>
                </div>
                <div class="mrbr-cvm-dialog-actions mrbr-cvm-custom-editor-actions" data-mrbr-cvm-custom-editor-actions></div>
                <div class="mrbr-cvm-custom-editor-resize-handle mrbr-cvm-custom-editor-resize-n" data-mrbr-cvm-custom-editor-resize="n"></div>
                <div class="mrbr-cvm-custom-editor-resize-handle mrbr-cvm-custom-editor-resize-e" data-mrbr-cvm-custom-editor-resize="e"></div>
                <div class="mrbr-cvm-custom-editor-resize-handle mrbr-cvm-custom-editor-resize-s" data-mrbr-cvm-custom-editor-resize="s"></div>
                <div class="mrbr-cvm-custom-editor-resize-handle mrbr-cvm-custom-editor-resize-w" data-mrbr-cvm-custom-editor-resize="w"></div>
                <div class="mrbr-cvm-custom-editor-resize-handle mrbr-cvm-custom-editor-resize-ne" data-mrbr-cvm-custom-editor-resize="ne"></div>
                <div class="mrbr-cvm-custom-editor-resize-handle mrbr-cvm-custom-editor-resize-se" data-mrbr-cvm-custom-editor-resize="se"></div>
                <div class="mrbr-cvm-custom-editor-resize-handle mrbr-cvm-custom-editor-resize-sw" data-mrbr-cvm-custom-editor-resize="sw"></div>
                <div class="mrbr-cvm-custom-editor-resize-handle mrbr-cvm-custom-editor-resize-nw" data-mrbr-cvm-custom-editor-resize="nw"></div>
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
            this.dialogElement = null;
            this.textareaElement = null;
            this.statusElement = null;
            this.maximiseButton = null;
            this.draftText = "";
            this.draftPageKey = this.getPageKey();
            this.geometry = null;
            this.restoreGeometry = null;
            this.isMaximised = false;
            this.isPointerInteractionActive = false;
            this.pageKeyMonitorIntervalId = 0;
            this.boundWindowResize = () => this.handleWindowResize();
        }

        /**
         * @param {string} key
         * @returns {string}
         */
        getString(key) {
            return this.strings.get(key);
        }

        /**
         * @returns {string}
         */
        getPageKey() {
            return `${window.location.origin}${window.location.pathname}`;
        }

        /**
         * Keeps the page-lifetime draft scoped to the current ChatGPT page URL.
         *
         * @returns {boolean} True when the draft was cleared because the page changed.
         */
        syncDraftToCurrentPage() {
            const pageKey = this.getPageKey();

            if (this.draftPageKey === pageKey) {
                return false;
            }

            this.draftPageKey = pageKey;
            this.draftText = "";

            if (this.textareaElement) {
                this.textareaElement.value = "";
            }

            return true;
        }

        /**
         * @returns {void}
         */
        startPageKeyMonitor() {
            this.stopPageKeyMonitor();
            this.pageKeyMonitorIntervalId = window.setInterval(() => {
                if (!this.dialogElement?.isConnected) {
                    this.stopPageKeyMonitor();
                    return;
                }

                if (this.syncDraftToCurrentPage()) {
                    this.flashEditableArea();
                    this.setStatus(this.getString("customEditorClearedForPageChange"));
                }
            }, 500);
        }

        /**
         * @returns {void}
         */
        stopPageKeyMonitor() {
            if (!this.pageKeyMonitorIntervalId) {
                return;
            }

            window.clearInterval(this.pageKeyMonitorIntervalId);
            this.pageKeyMonitorIntervalId = 0;
        }

        /**
         * @param {unknown} value
         * @returns {{ left: number, top: number, width: number, height: number } | null}
         */
        normalizeGeometry(value) {
            if (!value || typeof value !== "object") {
                return null;
            }

            const geometry = {
                left: Number(value.left),
                top: Number(value.top),
                width: Number(value.width),
                height: Number(value.height)
            };

            return Object.values(geometry).every(Number.isFinite)
                ? this.clampGeometry(geometry)
                : null;
        }

        /**
         * @returns {{ left: number, top: number, width: number, height: number }}
         */
        createDefaultGeometry() {
            const width = Math.min(CustomEditor.DEFAULT_WIDTH, window.innerWidth - (CustomEditor.VIEWPORT_MARGIN * 2)),
                height = Math.min(CustomEditor.DEFAULT_HEIGHT, window.innerHeight - (CustomEditor.VIEWPORT_MARGIN * 2));

            return this.clampGeometry({
                width,
                height,
                left: window.innerWidth - width - 24,
                top: window.innerHeight - height - 140
            });
        }

        /**
         * @param {{ left: number, top: number, width: number, height: number }} geometry
         * @returns {{ left: number, top: number, width: number, height: number }}
         */
        clampGeometry(geometry) {
            const margin = CustomEditor.VIEWPORT_MARGIN,
                maxWidth = Math.max(CustomEditor.MIN_WIDTH, window.innerWidth - (margin * 2)),
                maxHeight = Math.max(CustomEditor.MIN_HEIGHT, window.innerHeight - (margin * 2)),
                width = Math.min(Math.max(geometry.width, CustomEditor.MIN_WIDTH), maxWidth),
                height = Math.min(Math.max(geometry.height, CustomEditor.MIN_HEIGHT), maxHeight),
                left = Math.min(
                    Math.max(geometry.left, margin),
                    Math.max(margin, window.innerWidth - width - margin)
                ),
                top = Math.min(
                    Math.max(geometry.top, margin),
                    Math.max(margin, window.innerHeight - height - margin)
                );

            return {
                left: Math.round(left),
                top: Math.round(top),
                width: Math.round(width),
                height: Math.round(height)
            };
        }

        /**
         * @returns {Promise<{ left: number, top: number, width: number, height: number }>}
         */
        async loadGeometry() {
            try {
                const result = await chrome.storage.local.get(CustomEditor.GEOMETRY_STORAGE_KEY),
                    savedGeometry = this.normalizeGeometry(result[CustomEditor.GEOMETRY_STORAGE_KEY]);

                return savedGeometry || this.createDefaultGeometry();
            } catch {
                return this.createDefaultGeometry();
            }
        }

        /**
         * @returns {Promise<void>}
         */
        async saveGeometry() {
            if (!this.geometry || this.isMaximised) {
                return;
            }

            try {
                await chrome.storage.local.set({
                    [CustomEditor.GEOMETRY_STORAGE_KEY]: this.geometry
                });
            } catch {
                // Persistence is helpful, but the editor should keep working if
                // Chrome storage is temporarily unavailable.
            }
        }

        /**
         * @param {{ left: number, top: number, width: number, height: number }} geometry
         * @returns {void}
         */
        applyGeometry(geometry) {
            const clampedGeometry = this.clampGeometry(geometry);

            this.geometry = clampedGeometry;

            if (!this.dialogElement) {
                return;
            }

            this.dialogElement.style.left = `${clampedGeometry.left}px`;
            this.dialogElement.style.top = `${clampedGeometry.top}px`;
            this.dialogElement.style.width = `${clampedGeometry.width}px`;
            this.dialogElement.style.height = `${clampedGeometry.height}px`;
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
                dialogElement = parsedDocument.body.firstElementChild;

            if (!(dialogElement instanceof HTMLElement)) {
                throw new Error(this.getString("customEditorCreateFailed"));
            }

            const titleElement = dialogElement.querySelector("[data-mrbr-cvm-custom-editor-title]"),
                titlebarActionsElement = dialogElement.querySelector("[data-mrbr-cvm-custom-editor-titlebar-actions]"),
                labelElement = dialogElement.querySelector("[data-mrbr-cvm-custom-editor-label]"),
                textareaElement = dialogElement.querySelector("[data-mrbr-cvm-custom-editor-textarea]"),
                statusElement = dialogElement.querySelector("[data-mrbr-cvm-custom-editor-status]"),
                actionsElement = dialogElement.querySelector("[data-mrbr-cvm-custom-editor-actions]");

            if (
                !(titleElement instanceof HTMLElement)
                || !(titlebarActionsElement instanceof HTMLElement)
                || !(labelElement instanceof HTMLLabelElement)
                || !(textareaElement instanceof HTMLTextAreaElement)
                || !(statusElement instanceof HTMLElement)
                || !(actionsElement instanceof HTMLElement)
            ) {
                throw new Error(this.getString("customEditorCreateFailed"));
            }

            const dialogId = `mrbr-cvm-custom-editor-${crypto.randomUUID()}`,
                textareaId = `${dialogId}-textarea`,
                closeButton = this.createIconButton({
                    iconName: "windowClose",
                    title: this.getString("customEditorCloseDialog"),
                    onClick: () => this.close()
                }),
                clearButton = this.createTextButton(this.getString("customEditorClear"), () => this.clearEditor());

            this.maximiseButton = this.createIconButton({
                iconName: "windowMaximise",
                title: this.getString("customEditorMaximiseDialog"),
                onClick: () => this.toggleMaximised()
            });

            dialogElement.setAttribute("aria-labelledby", dialogId);
            titleElement.id = dialogId;
            titleElement.textContent = this.getString("customEditorTitle");
            labelElement.textContent = this.getString("customEditorPromptLabel");
            labelElement.setAttribute("for", textareaId);
            textareaElement.id = textareaId;
            textareaElement.placeholder = this.getString("customEditorPromptPlaceholder");
            textareaElement.value = this.draftText;

            titlebarActionsElement.append(this.maximiseButton, closeButton);
            actionsElement.append(
                clearButton,
                this.createTextButton(this.getString("customEditorSetPrompt"), () => this.setPrompt(false)),
                this.createTextButton(this.getString("customEditorSetPromptAndSend"), () => this.setPrompt(true))
            );

            textareaElement.addEventListener("input", () => {
                this.draftText = textareaElement.value;
            });
            dialogElement.addEventListener("keydown", event => this.handleKeyDown(event));
            this.wireDragging(dialogElement);
            this.wireResizing(dialogElement);

            this.dialogElement = dialogElement;
            this.textareaElement = textareaElement;
            this.statusElement = statusElement;

            return dialogElement;
        }

        /**
         * @returns {Promise<void>}
         */
        async show() {
            const wasDraftCleared = this.syncDraftToCurrentPage();

            if (this.dialogElement?.isConnected) {
                this.textareaElement?.focus();
                if (wasDraftCleared) {
                    this.flashEditableArea();
                    this.setStatus(this.getString("customEditorClearedForPageChange"));
                }
                return;
            }

            const dialogElement = this.createElement();

            this.applyGeometry(await this.loadGeometry());
            document.documentElement.append(dialogElement);
            window.addEventListener("resize", this.boundWindowResize);
            this.startPageKeyMonitor();
            this.textareaElement?.focus();
            if (wasDraftCleared) {
                this.flashEditableArea();
                this.setStatus(this.getString("customEditorClearedForPageChange"));
            } else {
                this.setStatus(this.getString("customEditorReady"));
            }
        }

        /**
         * @returns {void}
         */
        close() {
            if (this.textareaElement) {
                this.draftText = this.textareaElement.value;
            }

            this.saveGeometry();
            window.removeEventListener("resize", this.boundWindowResize);
            this.stopPageKeyMonitor();
            this.dialogElement?.remove();
            this.dialogElement = null;
            this.textareaElement = null;
            this.statusElement = null;
            this.maximiseButton = null;
            this.isMaximised = false;
        }

        /**
         * @returns {void}
         */
        clearEditor() {
            this.draftText = "";

            if (this.textareaElement) {
                this.textareaElement.value = "";
                this.textareaElement.focus();
            }

            this.flashEditableArea();
            this.setStatus(this.getString("customEditorCleared"));
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

            this.syncDraftToCurrentPage();

            const promptText = this.textareaElement.value;

            this.setBusy(true);
            this.setStatus(
                clickSend
                    ? this.getString("customEditorSettingPromptAndSending")
                    : this.getString("customEditorSettingPrompt")
            );

            try {
                const result = await this.callMainWorld("setPromptText", {
                    text: promptText,
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

                this.clearEditorAfterSuccess();
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
        clearEditorAfterSuccess() {
            this.draftText = "";

            if (this.textareaElement) {
                this.textareaElement.value = "";
                this.textareaElement.focus();
            }
        }

        /**
         * @returns {void}
         */
        toggleMaximised() {
            if (!this.dialogElement) {
                return;
            }

            if (!this.isMaximised) {
                this.restoreGeometry = this.geometry;
                this.isMaximised = true;
                this.dialogElement.classList.add("mrbr-cvm-custom-editor-window-maximised");
                this.applyGeometry({
                    left: CustomEditor.VIEWPORT_MARGIN,
                    top: CustomEditor.VIEWPORT_MARGIN,
                    width: window.innerWidth - (CustomEditor.VIEWPORT_MARGIN * 2),
                    height: window.innerHeight - (CustomEditor.VIEWPORT_MARGIN * 2)
                });
            } else {
                this.isMaximised = false;
                this.dialogElement.classList.remove("mrbr-cvm-custom-editor-window-maximised");
                this.applyGeometry(this.restoreGeometry || this.createDefaultGeometry());
            }

            this.updateMaximiseButton();
        }

        /**
         * @returns {void}
         */
        updateMaximiseButton() {
            if (!this.maximiseButton) {
                return;
            }

            const iconFactory = window.MrbrCvm.ViewManagerIconButtonFactory
                    ? new window.MrbrCvm.ViewManagerIconButtonFactory()
                    : null,
                iconName = this.isMaximised ? "windowRestore" : "windowMaximise",
                title = this.getString(
                    this.isMaximised ? "customEditorRestoreDialog" : "customEditorMaximiseDialog"
                );

            this.maximiseButton.replaceChildren(
                iconFactory
                    ? iconFactory.createIconElement(iconName)
                    : document.createTextNode(this.isMaximised ? "-" : "+")
            );
            this.maximiseButton.title = title;
            this.maximiseButton.setAttribute("aria-label", title);
        }

        /**
         * @param {KeyboardEvent} event
         * @returns {void}
         */
        handleKeyDown(event) {
            if (event.key === "Escape") {
                event.preventDefault();
                this.close();
                return;
            }

            if (event.key !== "Enter" || event.altKey) {
                return;
            }

            if (event.metaKey && !event.shiftKey) {
                event.preventDefault();
                this.setPrompt(true);
                return;
            }

            if (event.ctrlKey && event.shiftKey) {
                event.preventDefault();
                this.setPrompt(false);
                return;
            }

            if (event.ctrlKey) {
                event.preventDefault();
                this.setPrompt(true);
            }
        }

        /**
         * @param {HTMLElement} dialogElement
         * @returns {void}
         */
        wireDragging(dialogElement) {
            const handleElement = dialogElement.querySelector("[data-mrbr-cvm-custom-editor-drag-handle]");

            if (!(handleElement instanceof HTMLElement)) {
                return;
            }

            handleElement.addEventListener("pointerdown", event => {
                if (
                    !(event.target instanceof Node)
                    || (event.target instanceof HTMLElement && event.target.closest("button"))
                    || this.isMaximised
                ) {
                    return;
                }

                event.preventDefault();
                this.isPointerInteractionActive = true;
                handleElement.setPointerCapture(event.pointerId);

                const startX = event.clientX,
                    startY = event.clientY,
                    startGeometry = this.geometry || this.createDefaultGeometry(),
                    move = /** @param {PointerEvent} moveEvent */ moveEvent => {
                        this.applyGeometry({
                            ...startGeometry,
                            left: startGeometry.left + moveEvent.clientX - startX,
                            top: startGeometry.top + moveEvent.clientY - startY
                        });
                    },
                    end = () => {
                        this.isPointerInteractionActive = false;
                        handleElement.removeEventListener("pointermove", move);
                        handleElement.removeEventListener("pointerup", end);
                        handleElement.removeEventListener("pointercancel", end);
                        this.saveGeometry();
                    };

                handleElement.addEventListener("pointermove", move);
                handleElement.addEventListener("pointerup", end);
                handleElement.addEventListener("pointercancel", end);
            });
        }

        /**
         * @param {HTMLElement} dialogElement
         * @returns {void}
         */
        wireResizing(dialogElement) {
            dialogElement.querySelectorAll("[data-mrbr-cvm-custom-editor-resize]").forEach(handleElement => {
                if (!(handleElement instanceof HTMLElement)) {
                    return;
                }

                handleElement.addEventListener("pointerdown", event => {
                    if (this.isMaximised) {
                        return;
                    }

                    event.preventDefault();
                    this.isPointerInteractionActive = true;
                    handleElement.setPointerCapture(event.pointerId);

                    const direction = handleElement.dataset.mrbrCvmCustomEditorResize || "",
                        startX = event.clientX,
                        startY = event.clientY,
                        startGeometry = this.geometry || this.createDefaultGeometry(),
                        move = /** @param {PointerEvent} moveEvent */ moveEvent => {
                            const deltaX = moveEvent.clientX - startX,
                                deltaY = moveEvent.clientY - startY,
                                nextGeometry = {
                                    ...startGeometry
                                };

                            if (direction.includes("e")) {
                                nextGeometry.width = startGeometry.width + deltaX;
                            }

                            if (direction.includes("s")) {
                                nextGeometry.height = startGeometry.height + deltaY;
                            }

                            if (direction.includes("w")) {
                                nextGeometry.left = startGeometry.left + deltaX;
                                nextGeometry.width = startGeometry.width - deltaX;
                            }

                            if (direction.includes("n")) {
                                nextGeometry.top = startGeometry.top + deltaY;
                                nextGeometry.height = startGeometry.height - deltaY;
                            }

                            this.applyGeometry(nextGeometry);
                        },
                        end = () => {
                            this.isPointerInteractionActive = false;
                            handleElement.removeEventListener("pointermove", move);
                            handleElement.removeEventListener("pointerup", end);
                            handleElement.removeEventListener("pointercancel", end);
                            this.saveGeometry();
                        };

                    handleElement.addEventListener("pointermove", move);
                    handleElement.addEventListener("pointerup", end);
                    handleElement.addEventListener("pointercancel", end);
                });
            });
        }

        /**
         * @returns {void}
         */
        handleWindowResize() {
            if (!this.dialogElement || this.isPointerInteractionActive) {
                return;
            }

            if (this.isMaximised) {
                this.applyGeometry({
                    left: CustomEditor.VIEWPORT_MARGIN,
                    top: CustomEditor.VIEWPORT_MARGIN,
                    width: window.innerWidth - (CustomEditor.VIEWPORT_MARGIN * 2),
                    height: window.innerHeight - (CustomEditor.VIEWPORT_MARGIN * 2)
                });
                return;
            }

            this.applyGeometry(this.geometry || this.createDefaultGeometry());
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

        /**
         * @returns {void}
         */
        flashEditableArea() {
            const textareaElement = this.textareaElement;

            if (!textareaElement) {
                return;
            }

            textareaElement.classList.remove("mrbr-cvm-custom-editor-textarea-cleared");
            void textareaElement.offsetWidth;
            textareaElement.classList.add("mrbr-cvm-custom-editor-textarea-cleared");
            window.setTimeout(() => {
                textareaElement.classList.remove("mrbr-cvm-custom-editor-textarea-cleared");
            }, 900);
        }
    }

    window.MrbrCvm.CustomEditor = CustomEditor;
})();
