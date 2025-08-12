export declare const prisma: import("../generated/runtime/library").DynamicClientExtensionThis<import("../generated").Prisma.TypeMap<import("../generated/runtime/library").InternalArgs & {
    result: {
        documentVersion: {
            fullContent: () => {
                needs: {
                    content: true;
                    markdownPrepend: true;
                };
                compute(documentVersion: {
                    content: string;
                    markdownPrepend: string | null;
                }): string;
            };
        };
    };
    model: {};
    query: {};
    client: {};
}, {}>, import("../generated").Prisma.TypeMapCb<{
    log: ("query" | "warn" | "error")[];
}>, {
    result: {
        documentVersion: {
            fullContent: () => {
                needs: {
                    content: true;
                    markdownPrepend: true;
                };
                compute(documentVersion: {
                    content: string;
                    markdownPrepend: string | null;
                }): string;
            };
        };
    };
    model: {};
    query: {};
    client: {};
}>;
export { Prisma, type PrismaClient } from '../generated';
//# sourceMappingURL=client.d.ts.map