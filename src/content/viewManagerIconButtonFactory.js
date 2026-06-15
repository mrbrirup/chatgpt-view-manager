(() => {
    "use strict";

    window.MrbrCvm = window.MrbrCvm || {};
    /**
     * @typedef {{
     *     iconName: string,
     *     title: string,
     *     onClick: (event: MouseEvent) => void,
     *     onMouseEnter?: (event: MouseEvent) => void,
     *     onMouseLeave?: (event: MouseEvent) => void
     * }} MrbrCvmIconButtonOptions
     */
    /**
     * @typedef {{ getPath: (iconName: string) => string }} ViewManagerIconsType
     */

    /**
     * Gets the ViewManagerIcons registry loaded by viewManagerIcons.js.
     *
     * @returns {ViewManagerIconsType}
     */
    const getViewManagerIcons = () => {
        const viewManagerIcons = window.MrbrCvm?.ViewManagerIcons;

        if (!viewManagerIcons) {
            throw new Error("ChatGPT View Manager failed to load ViewManagerIcons.");
        }

        return viewManagerIcons;
    };

    const ViewManagerIcons = getViewManagerIcons();

    /**
     * Creates SVG icons and compact icon buttons for View Manager UI.
     */
    class ViewManagerIconButtonFactory {
        /**
         * Creates an SVG icon element.
         *
         * @param {string} iconName
         * @returns {SVGSVGElement}
         */
        createIconElement(iconName) {
            const svgNamespace = "http://www.w3.org/2000/svg",
                svgElement = document.createElementNS(svgNamespace, "svg"),
                pathElement = document.createElementNS(svgNamespace, "path");

            svgElement.setAttribute("viewBox", "0 0 24 24");
            svgElement.setAttribute("aria-hidden", "true");
            svgElement.setAttribute("focusable", "false");

            pathElement.setAttribute("d", ViewManagerIcons.getPath(iconName));
            pathElement.setAttribute("fill", "currentColor");

            svgElement.append(pathElement);

            return svgElement;
        }

        /**
         * Creates a compact icon button.
         *
         * @param {MrbrCvmIconButtonOptions} options
         * @returns {HTMLButtonElement}
         */
        createIconButton(options) {
            const button = document.createElement("button");

            button.type = "button";
            button.className = "mrbr-cvm-icon-button";
            button.title = options.title;
            button.setAttribute("aria-label", options.title);
            button.append(this.createIconElement(options.iconName));
            button.addEventListener("click", options.onClick);

            if (options.onMouseEnter) {
                button.addEventListener("mouseenter", options.onMouseEnter);
            }

            if (options.onMouseLeave) {
                button.addEventListener("mouseleave", options.onMouseLeave);
            }

            return button;
        }
    }

    window.MrbrCvm.ViewManagerIconButtonFactory = ViewManagerIconButtonFactory;
})();