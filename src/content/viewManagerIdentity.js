(() => {
    "use strict";

    window.MrbrCvm = window.MrbrCvm || {};

    /**
     * Central identity rules for bookmarks, notes, and collapsed blocks.
     */
    class ViewManagerIdentity {
        /**
         * @param {any} identity
         * @returns {string}
         */
        static getTurnId(identity) {
            return typeof identity?.turnId === "string" && identity.turnId
                ? identity.turnId
                : typeof identity?.turnIdContainer === "string"
                    ? identity.turnIdContainer
                    : "";
        }

        /**
         * Matches two identities without allowing a fallback key to override
         * contradictory turn IDs.
         *
         * @param {any} left
         * @param {any} right
         * @returns {boolean}
         */
        static matches(left, right) {
            const leftTurnId = ViewManagerIdentity.getTurnId(left),
                rightTurnId = ViewManagerIdentity.getTurnId(right);

            if (leftTurnId && rightTurnId) {
                return leftTurnId === rightTurnId;
            }

            if (left?.blockKey && right?.blockKey && left.blockKey === right.blockKey) {
                return true;
            }

            if (left?.contentHash && right?.contentHash && left.contentHash === right.contentHash) {
                return true;
            }

            return Boolean(
                left?.role
                && right?.role
                && left.role === right.role
                && typeof left.blockIndex === "number"
                && typeof right.blockIndex === "number"
                && left.blockIndex === right.blockIndex
            );
        }
    }

    window.MrbrCvm.ViewManagerIdentity = ViewManagerIdentity;
})();
