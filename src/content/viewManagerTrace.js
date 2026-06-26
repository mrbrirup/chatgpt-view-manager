(() => {
    "use strict";

    window.MrbrCvm = window.MrbrCvm || {};

    /**
     * Small page-visible switch for diagnostic trace logging. The content script
     * runs in an isolated world, so localStorage and document attributes are the
     * easiest toggles to reach from the page DevTools console.
     */
    class ViewManagerDebug {
        static LOCAL_STORAGE_KEY = "mrbr-cvm-debug";
        static DATA_ATTRIBUTE = "mrbrCvmDebug";

        /**
         * @param {unknown} value
         * @returns {boolean}
         */
        static isTruthy(value) {
            return value === true
                || value === "true"
                || value === "1"
                || value === "yes"
                || value === "on";
        }

        /**
         * @returns {boolean}
         */
        static isTraceEnabled() {
            if (ViewManagerDebug.isTruthy(window.MrbrCvm.debug)) {
                return true;
            }

            if (ViewManagerDebug.isTruthy(document.documentElement.dataset[ViewManagerDebug.DATA_ATTRIBUTE])) {
                return true;
            }

            try {
                return ViewManagerDebug.isTruthy(window.localStorage.getItem(ViewManagerDebug.LOCAL_STORAGE_KEY));
            } catch {
                return false;
            }
        }
    }

    /**
     * Buffers one user operation into a single console group.
     */
    class ViewManagerTraceOperation {
        /**
         * @param {string} action
         * @param {HTMLElement | null} target
         */
        constructor(action, target) {
            this.id = crypto.randomUUID().substring(0, 8);
            this.action = action;
            this.startedUtc = new Date().toISOString();
            this.startedPerformance = performance.now();
            this.entries = [];
            this.flushTimeoutId = 0;
            this.isFlushed = false;

            this.log("ACTION", `Reacting to ${action} button press.`);
            this.log("TARGET", "Current target at button press.", this.snapshotElement(target));
        }

        /**
         * @param {string} category
         * @param {string} message
         * @param {any} [data]
         * @returns {void}
         */
        log(category, message, data) {
            if (this.isFlushed) {
                return;
            }

            this.entries.push({
                elapsedMilliseconds: Math.round(performance.now() - this.startedPerformance),
                category,
                message,
                data
            });
        }

        /**
         * @param {string} functionName
         * @param {any} [data]
         * @returns {void}
         */
        functionCalled(functionName, data) {
            this.log("FUNCTION", functionName, data);
        }

        /**
         * @param {string} message
         * @param {any} [data]
         * @returns {void}
         */
        expect(message, data) {
            this.log("EXPECT", message, data);
        }

        /**
         * @param {string} message
         * @param {any} [data]
         * @returns {void}
         */
        actual(message, data) {
            this.log("ACTUAL", message, data);
        }

        /**
         * @param {unknown} error
         * @returns {void}
         */
        error(error) {
            this.log("ERROR", error instanceof Error ? error.message : String(error), error);
        }

        /**
         * Allows delayed MutationObserver work to join the same group.
         *
         * @param {number} [milliseconds]
         * @returns {void}
         */
        finishAfter(milliseconds = 500) {
            window.clearTimeout(this.flushTimeoutId);
            this.flushTimeoutId = window.setTimeout(() => this.flush(), milliseconds);
        }

        /**
         * @returns {void}
         */
        flush() {
            if (this.isFlushed) {
                return;
            }

            this.isFlushed = true;
            window.clearTimeout(this.flushTimeoutId);

            if (ViewManagerTrace.isEnabled()) {
                console.groupCollapsed(
                    `[MrbrCvm ${this.id}] ${this.action} — ${this.entries.length} trace entries`
                );
                console.info("Started:", this.startedUtc);

                this.entries.forEach(entry => {
                    const prefix = `+${entry.elapsedMilliseconds}ms [${entry.category}] ${entry.message}`;

                    if (entry.data === undefined) {
                        console.log(prefix);
                    } else {
                        console.log(prefix, entry.data);
                    }
                });

                console.groupEnd();
            }

            const history = window.MrbrCvm.ViewManagerTrace?.history;

            if (Array.isArray(history)) {
                history.push({
                    id: this.id,
                    action: this.action,
                    startedUtc: this.startedUtc,
                    entries: this.entries
                });

                if (history.length > 20) {
                    history.splice(0, history.length - 20);
                }

                window.MrbrCvm.ViewManagerTrace.publishHistory();
            }

            if (window.MrbrCvm.ViewManagerTrace?.currentOperation === this) {
                window.MrbrCvm.ViewManagerTrace.currentOperation = null;
            }
        }

        /**
         * @param {HTMLElement | null | undefined} element
         * @returns {Record<string, any> | null}
         */
        snapshotElement(element) {
            if (!(element instanceof HTMLElement)) {
                return null;
            }

            const host = element.closest("[data-turn-id-container]") || element,
                informationBar = host.querySelector(":scope > .mrbr-cvm-information-bar");

            return {
                tagName: element.tagName,
                className: element.className,
                isConnected: element.isConnected,
                turnIdContainer: host.getAttribute("data-turn-id-container") || "",
                blockKey: element.dataset.mrbrCvmBlockKey
                    || element.querySelector("[data-mrbr-cvm-block-key]")?.getAttribute("data-mrbr-cvm-block-key")
                    || "",
                hostIsShrunk: host.classList.contains("is-shrunk"),
                hostCollapsedKey: host.getAttribute("data-mrbr-cvm-collapsed-host-key") || "",
                hasInformationBar: informationBar instanceof HTMLElement,
                informationBarHidden: informationBar instanceof HTMLElement
                    ? informationBar.hidden
                    : null
            };
        }
    }

    /**
     * Coordinates the currently active collapse/restore trace.
     */
    class ViewManagerTrace {
        static OUTPUT_ELEMENT_ID = "mrbr-cvm-trace-output";
        static currentOperation = null;
        static history = [];

        /**
         * @returns {boolean}
         */
        static isEnabled() {
            return ViewManagerDebug.isTraceEnabled();
        }

        /**
         * @param {string} action
         * @param {HTMLElement | null} target
         * @returns {ViewManagerTraceOperation | null}
         */
        static begin(action, target) {
            if (!ViewManagerTrace.isEnabled()) {
                return null;
            }

            ViewManagerTrace.currentOperation?.flush();

            const operation = new ViewManagerTraceOperation(action, target);

            ViewManagerTrace.currentOperation = operation;
            return operation;
        }

        /**
         * @returns {ViewManagerTraceOperation | null}
         */
        static current() {
            return ViewManagerTrace.isEnabled()
                ? ViewManagerTrace.currentOperation
                : null;
        }

        /**
         * Publishes trace history as inert JSON that can be read from the page's
         * DevTools context without moving the extension into the MAIN world.
         *
         * @returns {void}
         */
        static publishHistory() {
            if (!ViewManagerTrace.isEnabled()) {
                return;
            }

            let outputElement = document.getElementById(ViewManagerTrace.OUTPUT_ELEMENT_ID);

            if (!(outputElement instanceof HTMLScriptElement)) {
                outputElement = document.createElement("script");
                outputElement.id = ViewManagerTrace.OUTPUT_ELEMENT_ID;
                outputElement.type = "application/json";
                outputElement.hidden = true;
                document.documentElement.append(outputElement);
            }

            outputElement.textContent = JSON.stringify(ViewManagerTrace.history);
        }
    }

    window.MrbrCvm.ViewManagerDebug = ViewManagerDebug;
    window.MrbrCvm.ViewManagerTraceOperation = ViewManagerTraceOperation;
    window.MrbrCvm.ViewManagerTrace = ViewManagerTrace;
})();


/*
    Added ViewManagerDebug.
    ViewManagerTrace.begin() now returns null unless debug tracing is enabled.
    ViewManagerTrace.current() and publishHistory() are also gated.
    Removed the noisy startup console.log("window.MrbrCvm", ...).
    Full JS syntax check passed.

    To enable tracing from ChatGPT DevTools, either of these should work:
    ```js
        localStorage.setItem("mrbr-cvm-debug", "true")
    ```
    or, without persistence:
    ```js
        document.documentElement.dataset.mrbrCvmDebug = "true"
    ````
    To disable again:
    ```js
        localStorage.removeItem("mrbr-cvm-debug")
        delete document.documentElement.dataset.mrbrCvmDebug
    ```
    Trace extraction remains the same when enabled:
    ```js
        const traces = JSON.parse(document.querySelector("#mrbr-cvm-trace-output").textContent);
        copy(JSON.stringify(traces.at(-1), null, 2));
    111

*/