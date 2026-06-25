(() => {
    "use strict";

    window.MrbrCvm = window.MrbrCvm || {};

    /**
     * Processes a cached item snapshot over as many animation frames as necessary.
     */
    class AnimationFrameBatchProcessor {
        static FRAME_DURATION_MILLISECONDS = 1000 / 60;

        /**
         * @param {{ frameDurationMilliseconds?: number }} [options]
         */
        constructor(options = {}) {
            this.frameDurationMilliseconds = Number.isFinite(options.frameDurationMilliseconds)
                ? Math.max(1, Number(options.frameDurationMilliseconds))
                : AnimationFrameBatchProcessor.FRAME_DURATION_MILLISECONDS;
        }

        /**
         * @template T
         * @param {T[]} items
         * @param {(item: T, index: number, total: number) => void} processItem
         * @returns {Promise<{ processedCount: number, totalCount: number }>}
         */
        process(items, processItem) {
            const cachedItems = [...items],
                totalCount = cachedItems.length;
            let currentIndex = 0;

            return new Promise((resolve, reject) => {
                const processFrame = () => {
                    const frameStart = performance.now();

                    try {
                        do {
                            processItem(cachedItems[currentIndex], currentIndex, totalCount);
                            currentIndex++;
                        } while (
                            currentIndex < totalCount
                            && performance.now() - frameStart < this.frameDurationMilliseconds
                        );
                    } catch (error) {
                        reject(error);
                        return;
                    }

                    if (currentIndex < totalCount) {
                        window.requestAnimationFrame(processFrame);
                        return;
                    }

                    resolve({
                        processedCount: currentIndex,
                        totalCount
                    });
                };

                if (!totalCount) {
                    resolve({
                        processedCount: 0,
                        totalCount: 0
                    });
                    return;
                }

                window.requestAnimationFrame(processFrame);
            });
        }
    }

    window.MrbrCvm.AnimationFrameBatchProcessor = AnimationFrameBatchProcessor;
})();
