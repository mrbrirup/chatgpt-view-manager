(() => {
    "use strict";

    window.MrbrCvm = window.MrbrCvm || {};
    class Draw {
        /**
         * @typedef {() => any} DrawRequest
        */

        /**
         * @type {number | null}
        */
        static toDrawHandle = null;
        /**
         * @type {DrawRequest[]}
         */
        static drawRequests = [];
        /**
         * 
         * @param {DrawRequest} drawRequest 
        */
        static draw(drawRequest) {
            const
                self = Draw,
                toDraw = Draw.drawRequests;
            toDraw.push(drawRequest);
            if (!self.toDrawHandle) {
                self.toDrawHandle = requestAnimationFrame(() => {
                    self.toDrawHandle = null;
                    const requests = self.drawRequests;
                    self.drawRequests = [];
                    for (const request of requests) {
                        request();
                    }
                });
            }
        }
    }
    window.MrbrCvm.Draw = Draw;
})();