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
            ViewManagerActionsDropdown?: typeof ViewManagerActionsDropdown;
            ViewManagerIcons?: typeof ViewManagerIcons;
            ViewManagerIconButtonFactory?: typeof ViewManagerIconButtonFactory;
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

    class ViewManagerActionsDropdown {
        constructor(options: {
            createIconButton: (options: {
                iconName: string;
                title: string;
                onClick: (event: MouseEvent) => void;
            }) => HTMLButtonElement;
            onImport: () => void | Promise<void>;
            onExport: () => void | Promise<void>;
            onSetTheme: (theme: "auto" | "dark" | "light") => void | Promise<void>;
            getCurrentTheme: () => "auto" | "dark" | "light";
        });

        createElement(): HTMLDivElement;
        dispose(): void;
    }

    class ViewManagerIcons {
        static getPath(iconName: string): string;
    }

    class ViewManagerIconButtonFactory {
        createIconElement(iconName: string): SVGSVGElement;

        createIconButton(options: {
            iconName: string;
            title: string;
            onClick: (event: MouseEvent) => void;
            onMouseEnter?: (event: MouseEvent) => void;
            onMouseLeave?: (event: MouseEvent) => void;
        }): HTMLButtonElement;
    }


}