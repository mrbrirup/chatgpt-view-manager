(() => {
    "use strict";

    const REQUEST_TYPE = "mrbr-cvm-custom-editor-request-v3",
        RESPONSE_TYPE = "mrbr-cvm-custom-editor-response-v3",
        SOURCE = "mrbr-cvm-custom-editor-v3";

    if (window.__mrbrCvmCustomEditorBridgeInstalledV3) {
        return;
    }

    window.__mrbrCvmCustomEditorBridgeInstalledV3 = true;

    /**
     * @param {unknown} value
     * @returns {boolean}
     */
    const isEditorView = value => {
        return Boolean(
            value
            && typeof value === "object"
            && typeof value.dispatch === "function"
            && value.state
            && value.state.doc
            && value.state.tr
        );
    };

    /**
     * Searches a small object graph for an EditorView-shaped object. This handles
     * ProseMirror builds where pmViewDesc exists but the view reference is no
     * longer on the direct parent chain.
     *
     * @param {unknown} root
     * @param {{ maxDepth?: number, maxNodes?: number }} [options]
     * @returns {any | null}
     */
    const findEditorViewInObjectGraph = (root, options = {}) => {
        const maxDepth = options.maxDepth ?? 5,
            maxNodes = options.maxNodes ?? 600,
            seen = new WeakSet(),
            queue = [{
                value: root,
                depth: 0
            }];

        let visited = 0;

        while (queue.length && visited < maxNodes) {
            const item = queue.shift(),
                value = item?.value;

            if (!value || typeof value !== "object") {
                continue;
            }

            if (seen.has(value)) {
                continue;
            }

            seen.add(value);
            visited += 1;

            if (isEditorView(value)) {
                return value;
            }

            if (item.depth >= maxDepth || value instanceof Node || value === window || value === document) {
                continue;
            }

            Object.getOwnPropertyNames(value).forEach(propertyName => {
                let childValue;

                try {
                    childValue = value[propertyName];
                } catch {
                    return;
                }

                if (childValue && typeof childValue === "object" && !seen.has(childValue)) {
                    queue.push({
                        value: childValue,
                        depth: item.depth + 1
                    });
                }
            });
        }

        return null;
    };

    /**
     * @returns {HTMLElement[]}
     */
    const getPromptCandidates = () => {
        return Array.from(document.querySelectorAll([
            ".ProseMirror",
            "#prompt-textarea",
            "[contenteditable='true'][data-testid*='composer']",
            "[contenteditable='true'][aria-label*='Message']",
            "[contenteditable='true']"
        ].join(","))).filter(element => element instanceof HTMLElement);
    };

    /**
     * @param {HTMLElement} element
     * @returns {any | null}
     */
    const findEditorViewFromElementProperties = element => {
        const propertyNames = Object.getOwnPropertyNames(element);

        for (const propertyName of propertyNames) {
            let value;

            try {
                value = element[propertyName];
            } catch {
                continue;
            }

            if (isEditorView(value)) {
                return value;
            }

            const view = findEditorViewInObjectGraph(value, {
                maxDepth: 4,
                maxNodes: 400
            });

            if (view) {
                return view;
            }
        }

        return null;
    };

    /**
     * @param {HTMLElement} element
     * @returns {any | null}
     */
    const findEditorViewFromElement = element => {
        let current = element;

        while (current) {
            const propertyView = findEditorViewFromElementProperties(current);

            if (propertyView) {
                return propertyView;
            }

            const directView = findEditorViewInObjectGraph(current.pmViewDesc, {
                maxDepth: 7,
                maxNodes: 1000
            });

            if (directView) {
                return directView;
            }

            current = current.parentElement;
        }

        return null;
    };

    /**
     * @returns {Record<string, any>}
     */
    const getEditorDiagnostics = () => {
        const candidates = getPromptCandidates();

        return {
            candidateCount: candidates.length,
            candidates: candidates.slice(0, 8).map(element => {
                const rect = element.getBoundingClientRect();

                return {
                    tagName: element.tagName,
                    id: element.id || "",
                    className: String(element.className || ""),
                    isContentEditable: element.isContentEditable,
                    hasPmViewDesc: Boolean(element.pmViewDesc),
                    ownPropertyNames: Object.getOwnPropertyNames(element).filter(propertyName => {
                        return propertyName.includes("pm")
                            || propertyName.includes("Prose")
                            || propertyName.includes("react")
                            || propertyName.includes("view");
                    }).slice(0, 12),
                    ancestorWithPmViewDesc: Boolean(element.closest(".ProseMirror")?.pmViewDesc),
                    textLength: element.textContent?.length || 0,
                    visible: rect.width > 0 && rect.height > 0
                };
            })
        };
    };

    /**
     * Finds ChatGPT's ProseMirror EditorView from the page's own JS world.
     *
     * @returns {any | null}
     */
    const findEditorView = () => {
        const candidates = getPromptCandidates();

        for (const candidate of candidates) {
            const view = findEditorViewFromElement(candidate);

            if (view) {
                return view;
            }
        }

        return null;
    };

    /**
     * Fallback for experiments where EditorView is not reachable. This is less
     * precise than ProseMirror transactions, but gives us a useful comparison.
     *
     * @param {string} text
     * @returns {boolean}
     */
    const setPromptTextViaDomFallback = text => {
        const hostElement = getPromptCandidates()[0];

        if (!hostElement) {
            return false;
        }

        hostElement.focus();

        const selection = window.getSelection(),
            range = document.createRange();

        range.selectNodeContents(hostElement);
        selection?.removeAllRanges();
        selection?.addRange(range);

        document.execCommand("delete", false);

        if (!text) {
            return true;
        }

        return document.execCommand("insertText", false, text);
    };

    /**
     * @returns {Promise<void>}
     */
    const nextAnimationFrame = () => {
        return new Promise(resolve => {
            requestAnimationFrame(() => resolve());
        });
    };

    /**
     * @returns {HTMLButtonElement | null}
     */
    const findSendButton = () => {
        const byId = document.getElementById("composer-submit-button");

        if (byId instanceof HTMLButtonElement) {
            return byId;
        }

        const bySelector = document.querySelector(
            "button[data-testid='send-button'], button[aria-label='Send prompt'], button[aria-label='Send message']"
        );

        return bySelector instanceof HTMLButtonElement
            ? bySelector
            : null;
    };

    /**
     * @param {HTMLButtonElement | null} button
     * @returns {{ found: boolean, disabled: boolean, id: string, ariaLabel: string }}
     */
    const describeButton = button => {
        return {
            found: button instanceof HTMLButtonElement,
            disabled: button instanceof HTMLButtonElement
                ? button.disabled || button.getAttribute("aria-disabled") === "true"
                : false,
            id: button instanceof HTMLButtonElement ? button.id : "",
            ariaLabel: button instanceof HTMLButtonElement ? button.getAttribute("aria-label") || "" : ""
        };
    };

    /**
     * Creates paragraph block content from plain text.
     *
     * @param {any} state
     * @param {string} text
     * @returns {any}
     */
    const createPromptContent = (state, text) => {
        const schema = state.schema,
            paragraphType = schema.nodes.paragraph,
            fragmentConstructor = state.doc.content.constructor,
            lines = String(text ?? "").split(/\r?\n/),
            paragraphs = lines.length
                ? lines.map(line => {
                    return paragraphType.create(
                        null,
                        line ? schema.text(line) : null
                    );
                })
                : [paragraphType.create()];

        return paragraphs.length === 1
            ? paragraphs[0]
            : fragmentConstructor.fromArray(paragraphs);
    };

    /**
     * @param {any} view
     * @param {string} text
     * @returns {boolean}
     */
    const setPromptTextViaProseMirror = (view, text) => {
        const state = view.state,
            content = createPromptContent(state, text),
            tr = state.tr.replaceWith(0, state.doc.content.size, content);

        view.dispatch(tr.scrollIntoView());
        view.focus();

        return true;
    };

    /**
     * @param {any | null} view
     * @param {string} text
     * @returns {boolean}
     */
    const setPromptTextWithBestAvailableMethod = (view, text) => {
        return view
            ? setPromptTextViaProseMirror(view, text)
            : setPromptTextViaDomFallback(text);
    };

    /**
     * Runs the composer update in deliberate render-sized steps:
     * 1. clear text in one animation frame;
     * 2. set text in the next animation frame;
     * 3. find/click the send button in the next animation frame.
     *
     * When sending, the sequence is retried because ChatGPT sometimes creates
     * the send button only after React has observed the composer update.
     *
     * @param {{ view: any | null, text: string, clickSend: boolean }} options
     * @returns {Promise<Record<string, any>>}
     */
    const runPromptUpdateSequence = async options => {
        const method = options.view ? "proseMirror" : "domFallback",
            maxAttempts = options.clickSend ? 5 : 1;

        let lastSendButtonState = describeButton(null);

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            await nextAnimationFrame();

            const cleared = setPromptTextWithBestAvailableMethod(options.view, "");

            if (!cleared) {
                return {
                    ok: false,
                    method,
                    attempts: attempt,
                    reason: "Prompt composer not found.",
                    diagnostics: getEditorDiagnostics()
                };
            }

            await nextAnimationFrame();

            const updated = setPromptTextWithBestAvailableMethod(options.view, options.text);

            if (!updated) {
                return {
                    ok: false,
                    method,
                    attempts: attempt,
                    reason: "Prompt update failed.",
                    diagnostics: getEditorDiagnostics()
                };
            }

            await nextAnimationFrame();

            const sendButton = findSendButton();

            lastSendButtonState = describeButton(sendButton);

            if (!options.clickSend) {
                return {
                    ok: true,
                    method,
                    attempts: attempt,
                    sendButton: lastSendButtonState,
                    clickedSend: false
                };
            }

            if (sendButton && !lastSendButtonState.disabled) {
                sendButton.click();

                return {
                    ok: true,
                    method,
                    attempts: attempt,
                    sendButton: lastSendButtonState,
                    clickedSend: true
                };
            }
        }

        return {
            ok: true,
            method,
            attempts: maxAttempts,
            sendButton: lastSendButtonState,
            clickedSend: false,
            diagnostics: getEditorDiagnostics()
        };
    };

    /**
     * @param {{ text?: string, clickSend?: boolean }} payload
     * @returns {Promise<Record<string, any>>}
     */
    const setPromptText = async payload => {
        const view = findEditorView();

        if (!view) {
            const hasFallbackCandidate = getPromptCandidates().length > 0;

            if (!hasFallbackCandidate) {
                return {
                    ok: false,
                    reason: "ProseMirror view not found.",
                    diagnostics: getEditorDiagnostics()
                };
            }
        }

        return runPromptUpdateSequence({
            view,
            text: payload.text || "",
            clickSend: payload.clickSend === true
        });
    };

    /**
     * @returns {Record<string, any>}
     */
    const focusComposer = () => {
        const view = findEditorView();

        if (!view) {
            const hostElement = getPromptCandidates()[0];

            if (hostElement) {
                hostElement.scrollIntoView({
                    block: "center",
                    inline: "nearest"
                });
                hostElement.focus();

                return {
                    ok: true,
                    method: "domFallback",
                    diagnostics: getEditorDiagnostics()
                };
            }

            return {
                ok: false,
                reason: "ProseMirror view not found.",
                diagnostics: getEditorDiagnostics()
            };
        }

        view.dom?.scrollIntoView?.({
            block: "center",
            inline: "nearest"
        });
        view.focus();

        return {
            ok: true,
            method: "proseMirror"
        };
    };

    window.addEventListener("message", async event => {
        if (event.source !== window || event.data?.source !== SOURCE || event.data?.type !== REQUEST_TYPE) {
            return;
        }

        const { requestId, action, payload } = event.data;

        try {
            const result = action === "setPromptText"
                ? await setPromptText(payload || {})
                : action === "focusComposer"
                    ? focusComposer()
                    : {
                        ok: false,
                        reason: `Unknown CustomEditor action: ${action}`
                    };

            window.postMessage({
                source: SOURCE,
                type: RESPONSE_TYPE,
                requestId,
                result
            }, window.location.origin);
        } catch (error) {
            window.postMessage({
                source: SOURCE,
                type: RESPONSE_TYPE,
                requestId,
                result: {
                    ok: false,
                    reason: error instanceof Error ? error.message : String(error)
                }
            }, window.location.origin);
        }
    });
})();
