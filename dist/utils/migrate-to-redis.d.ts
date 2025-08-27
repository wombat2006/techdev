#!/usr/bin/env node
declare class MigrationTool {
    private redis;
    private sessionManager;
    migrateFromSQLite(sqliteDbPath: string): Promise<void>;
    private checkTableExists;
    private getAllSessions;
    private migrateSession;
    validateMigration(sqliteDbPath: string): Promise<void>;
    cleanupSQLiteData(sqliteDbPath: string): Promise<void>;
}
export declare function migrateSQLiteToRedis(sqliteDbPath: string, options?: any): Promise<any>;
export declare function validateMigration(): Promise<any>;
export declare function cleanupOldData(filesToClean: string[], options?: any): Promise<any>;
export { MigrationTool };
