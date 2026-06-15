export { };

declare global {
    const chrome: {
        storage: {
            local: {
                get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, any>>;
                set(items: Record<string, any>): Promise<void>;
            };
        };
    };

    interface Window {
        MrbrCvm?: {
            ConversationScanner?: typeof ConversationScanner;
        };
    }

    class ConversationScanner {
        static BLOCK_KEY_ATTRIBUTE: string;
        static BLOCK_INDEX_ATTRIBUTE: string;
        static BLOCK_ROLE_ATTRIBUTE: string;
        static BLOCK_HASH_ATTRIBUTE: string;

        findBlocks(): HTMLElement[];
        findBlockByKey(blockKey: string): HTMLElement | null;

        findBlockForBookmark(bookmark: {
            blockKey?: string;
            role?: string;
            blockIndex?: number;
            contentHash?: string;
        }): HTMLElement | null;

        getBlockIdentity(block: HTMLElement): {
            blockKey: string;
            blockIndex: number;
            role: string;
            contentHash: string;
        };

        getBlockTitle(block: HTMLElement): string;
    }

}