#!/usr/bin/env node
import { getRedisService } from '../services/redis-service';
import { getSessionManager } from '../services/session-manager';
declare const MIGRATION_ERROR_LIST_SYMBOL: unique symbol;
interface MigrationProgress {
    current: number;
    total: number;
}
interface MigrationSummary {
    success: boolean;
    migratedCount: number;
    totalCount: number;
    errors: MigrationErrorList;
    migratedSessionIds: string[];
    durationMs: number;
}
interface MigrationToolOptions {
    redisService?: ReturnType<typeof getRedisService>;
    sessionManager?: ReturnType<typeof getSessionManager>;
}
interface MigrationRunOptions {
    onProgress?: (progress: MigrationProgress) => void;
}
declare class MigrationErrorList extends Array<string> {
    [MIGRATION_ERROR_LIST_SYMBOL]: boolean;
    constructor(...items: string[]);
}
declare class MigrationTool {
    private redis;
    private sessionManager;
    constructor(options?: MigrationToolOptions);
    migrateFromSQLite(sqliteDbPath: string, options?: MigrationRunOptions): Promise<MigrationSummary>;
    private checkTableExists;
    private getAllSessions;
    private migrateSession;
    validateMigration(sqliteDbPath: string): Promise<void>;
    cleanupSQLiteData(sqliteDbPath: string): Promise<void>;
}
interface MigrationOptions {
    createBackup?: boolean;
    enableRollback?: boolean;
    onProgress?: (progress: MigrationProgress) => void;
}
interface MigrationResult {
    success: boolean;
    migratedCount: number;
    errors: string[];
    rollbackPerformed: boolean;
    duration: number;
    backupPath?: string;
}
export declare function migrateSQLiteToRedis(sqliteDbPath: string, options?: MigrationOptions): Promise<MigrationResult>;
export declare function validateMigration(): Promise<any>;
export declare function cleanupOldData(filesToClean: string[], options?: any): Promise<any>;
export { MigrationTool };
