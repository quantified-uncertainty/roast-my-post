export declare function ensureDbConnected(): Promise<void>;
export declare function withDb<T>(fn: () => Promise<T>): Promise<T>;