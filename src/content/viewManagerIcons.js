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
         * @returns {string|Array<string>} The SVG path data for the icon, or an array of path data strings for multi-path icons.
         */
        static getPath(iconName) {
            switch (iconName) {
                case "bookmark":
                    return "M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z";

                case "collapse":
                    return "M5 7h14v2H5V7zm3 4h8v2H8v-2zm2 4h4v2h-4v-2z";

                case "restore":
                    return "M6 5h12v6h-2V7H8v10h4v2H6V5zm8 8h6v6h-6v-6zm2 2v2h2v-2h-2z";

                case "top":
                    return "M12 4l7 7h-5v9h-4v-9H5l7-7z";

                case "bottom":
                    return "M12 20l-7-7h5V4h4v9h5l-7 7z";

                case "collapseAll":
                    return "M5 6h14v2H5V6zm2 4h10v2H7v-2zm2 4h6v2H9v-2zm2 4h2v2h-2v-2z";

                case "expandAll":
                    return "M11 4h2v2h-2V4zM9 8h6v2H9V8zm-2 4h10v2H7v-2zm-2 4h14v2H5v-2z";

                case "go":
                    return "M5 5h8v2H8.4l6.6 6.6-1.4 1.4L7 8.4V13H5V5zm12 2h2v12H7v-2h10V7z";

                case "delete":
                    return ["M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z",
                        "M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"];
                //"M7 6h10l-1 14H8L7 6zm3-3h4l1 1h4v2H5V4h4l1-1zm0 6v8h2V9h-2zm4 0v8h2V9h-2z";

                case "expandPanel":
                    return "M5 5h14v2H5V5zm0 6h14v2H5v-2zm0 6h14v2H5v-2z";

                case "collapsePanel":
                    return "M6 11h12v2H6v-2z";

                case "windowMaximise":
                    return "M5 5h14v14H5V5zm2 2v10h10V7H7z";

                case "windowRestore":
                    return "M8 5h11v11h-3v3H5V8h3V5zm2 3h6v6h1V7h-7v1zm-3 2v7h7v-7H7z";

                case "windowClose":
                    return "M6.4 5L12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5z";

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

                case "participantUser":
                    return "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 8a7 7 0 0 1 14 0v1H5v-1z";

                case "participantAssistant":
                    return "M7 5h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3zm1 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM9 16h6v-2H9v2zM11 2h2v3h-2V2z";

                case "participantOther":
                    return "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 16a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm-1-4h2v2h-2v-2zm1-9a4 4 0 0 1 2.4 7.2c-.9.7-1.4 1.1-1.4 1.8h-2c0-1.7 1-2.5 2.2-3.4A2 2 0 1 0 10 10H8a4 4 0 0 1 4-4z";

                case "sectionExpanded":
                    return "M7 10l5 5 5-5H7z";

                case "sectionCollapsed":
                    return "M10 7l5 5-5 5V7z";
                case "search":
                    return "M9.5 3a6.5 6.5 0 0 1 5.18 10.43l4.45 4.44-1.42 1.42-4.44-4.45A6.5 6.5 0 1 1 9.5 3zm0 2a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z";
                case "clear":
                    return "M6.4 5l5.6 5.6L17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5z";
                default:
                    return "";
            }
        }
    }

    window.MrbrCvm.ViewManagerIcons = ViewManagerIcons;
})();
