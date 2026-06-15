(() => {
    "use strict";

    window.MrbrCvm = window.MrbrCvm || {};

    /**
     * Registry for View Manager SVG icon path definitions.
     */
    class ViewManagerIcons {
        /**
         * Gets the SVG path data for an icon.
         *
         * @param {string} iconName
         * @returns {string}
         */
        static getPath(iconName) {
            switch (iconName) {
                case "bookmark":
                    return "M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z";

                case "collapse":
                    return "M5 7h14v2H5V7zm3 4h8v2H8v-2zm2 4h4v2h-4v-2z";

                case "restore":
                    return "M6 5h12v6h-2V7H8v10h4v2H6V5zm8 8h6v6h-6v-6zm2 2v2h2v-2h-2z";

                case "rescan":
                    return "M17.7 6.3A8 8 0 0 0 4.3 10H2l3.5 3.5L9 10H6.4a6 6 0 0 1 10-2.3l1.3-1.4zM6.3 17.7A8 8 0 0 0 19.7 14H22l-3.5-3.5L15 14h2.6a6 6 0 0 1-10 2.3l-1.3 1.4z";

                case "top":
                    return "M12 4l7 7h-5v9h-4v-9H5l7-7z";

                case "go":
                    return "M5 5h8v2H8.4l6.6 6.6-1.4 1.4L7 8.4V13H5V5zm12 2h2v12H7v-2h10V7z";

                case "delete":
                    return "M7 6h10l-1 14H8L7 6zm3-3h4l1 1h4v2H5V4h4l1-1zm0 6v8h2V9h-2zm4 0v8h2V9h-2z";

                case "expandPanel":
                    return "M5 5h14v2H5V5zm0 6h14v2H5v-2zm0 6h14v2H5v-2z";

                case "collapsePanel":
                    return "M6 11h12v2H6v-2z";

                case "lightTheme":
                    return "M12 4a1 1 0 0 1 1-1h0a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0V4zm0 14a6 6 0 1 0 0-12 6 6 0 0 0 0 12zm0-2a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm8-5a1 1 0 0 1 1 1h0a1 1 0 0 1-1 1h-2a1 1 0 0 1 0-2h2zM6 12a1 1 0 0 1-1 1H3a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1zm11.66-6.66a1 1 0 0 1 1.41 0h0a1 1 0 0 1 0 1.41l-1.41 1.41a1 1 0 1 1-1.41-1.41l1.41-1.41zM6.34 16.24a1 1 0 0 1 1.41 1.41l-1.41 1.41a1 1 0 0 1-1.41-1.41l1.41-1.41zm12.73 1.41a1 1 0 0 1-1.41 1.41l-1.41-1.41a1 1 0 0 1 1.41-1.41l1.41 1.41zM7.75 6.75a1 1 0 0 1-1.41 1.41L4.93 6.75a1 1 0 0 1 1.41-1.41l1.41 1.41zM12 20a1 1 0 0 1 1 1h0a1 1 0 0 1-2 0v-2a1 1 0 0 1 2 0v1z";

                case "darkTheme":
                    return "M21 14.5A8.5 8.5 0 0 1 9.5 3a7 7 0 1 0 11.5 11.5z";

                case "autoTheme":
                    return "M12 3a9 9 0 1 0 0 18V3zm0 2v14a7 7 0 0 1 0-14z";

                case "exportState":
                    return "M12 3l5 5h-3v6h-4V8H7l5-5zm-7 13h2v3h10v-3h2v5H5v-5z";

                case "importState":
                    return "M10 3h4v6h3l-5 5-5-5h3V3zm-5 13h2v3h10v-3h2v5H5v-5z";
                case "more":
                    return "M6 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm6 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm6 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4z";
                case "edit":
                    return "M4 17.25V21h3.75L18.8 9.95l-3.75-3.75L4 17.25zM20.7 8.05a1 1 0 0 0 0-1.4l-2.35-2.35a1 1 0 0 0-1.4 0l-1.1 1.1 3.75 3.75 1.1-1.1z";
                case "note":
                    return "M5 4h14v16H5V4zm2 2v12h10V6H7zm2 2h6v2H9V8zm0 4h6v2H9v-2z";

                case "sectionExpanded":
                    return "M7 10l5 5 5-5H7z";

                case "sectionCollapsed":
                    return "M10 7l5 5-5 5V7z";
                default:
                    return "";
            }
        }
    }

    window.MrbrCvm.ViewManagerIcons = ViewManagerIcons;
})();