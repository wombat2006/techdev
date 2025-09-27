interface VectorMapping {
    vectorStoreId: string;
    vectorStoreFileId: string;
}
export declare const rememberDriveVectorMapping: (fileId: string, vectorStoreId: string, vectorStoreFileId: string) => Promise<void>;
export declare const rememberDriveVectorMappingsBulk: (mappings: Array<{
    fileId: string;
    vectorStoreId: string;
    vectorStoreFileId: string;
}>) => Promise<void>;
export declare const resolveDriveVectorMapping: (fileId: string) => Promise<VectorMapping | null>;
export declare const clearDriveVectorMapping: (fileId: string) => Promise<void>;
export {};
