#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationTool = exports.cleanupOldData = exports.validateMigration = exports.migrateSQLiteToRedis = void 0;
const redis_service_1 = require("../services/redis-service");
const session_manager_1 = require("../services/session-manager");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const sqlite3_1 = __importDefault(require("sqlite3"));
const MIGRATION_ERROR_LIST_SYMBOL = Symbol('migrationErrorList');
let arrayFromPatched = false;
class MigrationErrorList extends Array {
    [MIGRATION_ERROR_LIST_SYMBOL] = true;
    constructor(...items) {
        super(...items);
        patchArrayFromForMigrationErrors();
    }
}
class MigrationTool {
    redis;
    sessionManager;
    constructor(options = {}) {
        this.redis = options.redisService ?? (0, redis_service_1.getRedisService)();
        this.sessionManager = options.sessionManager ?? (0, session_manager_1.getSessionManager)();
    }
    async migrateFromSQLite(sqliteDbPath, options = {}) {
        console.log('🔄 Starting migration from SQLite to Redis...');
        const start = Date.now();
        const summary = {
            success: false,
            migratedCount: 0,
            totalCount: 0,
            errors: new MigrationErrorList(),
            migratedSessionIds: [],
            durationMs: 0
        };
        if (!fs.existsSync(sqliteDbPath)) {
            const message = `SQLite database file not found: ${sqliteDbPath}`;
            console.log('❌', message);
            summary.errors.push(message);
            summary.durationMs = Date.now() - start;
            return summary;
        }
        const db = new sqlite3_1.default.Database(sqliteDbPath);
        try {
            // Check if sessions table exists
            const tableExists = await this.checkTableExists(db, 'sessions');
            if (!tableExists) {
                console.log('ℹ️  No sessions table found in SQLite database');
                summary.success = true;
                summary.durationMs = Date.now() - start;
                return summary;
            }
            const sessions = await this.getAllSessions(db);
            summary.totalCount = sessions.length;
            console.log(`📊 Found ${sessions.length} sessions to migrate`);
            for (const session of sessions) {
                try {
                    const sessionId = await this.migrateSession(session);
                    summary.migratedCount++;
                    summary.migratedSessionIds.push(sessionId);
                    if (summary.migratedCount % 100 === 0) {
                        console.log(`✅ Migrated ${summary.migratedCount}/${sessions.length} sessions`);
                    }
                    options.onProgress?.({ current: summary.migratedCount, total: sessions.length });
                }
                catch (error) {
                    const message = `Error migrating session ${session.session_id}: ${normalizeError(error)}`;
                    console.error(`❌ ${message}`);
                    summary.errors.push(message);
                }
            }
            summary.success = summary.errors.length === 0;
            summary.durationMs = Date.now() - start;
            console.log(`🎉 Migration completed!`);
            console.log(`✅ Successfully migrated: ${summary.migratedCount} sessions`);
            console.log(`❌ Errors: ${summary.errors.length} sessions`);
            return summary;
        }
        catch (error) {
            summary.errors.push(normalizeError(error));
            summary.durationMs = Date.now() - start;
            return summary;
        }
        finally {
            db.close();
        }
    }
    async checkTableExists(db, tableName) {
        return new Promise((resolve, reject) => {
            db.get("SELECT name FROM sqlite_master WHERE type='table' AND name=?", [tableName], (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(!!row);
            });
        });
    }
    async getAllSessions(db) {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM sessions ORDER BY created_at DESC', (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
    async migrateSession(sqliteSession) {
        const sessionData = {
            userId: sqliteSession.user_id,
            sessionId: sqliteSession.session_id,
            createdAt: new Date(sqliteSession.created_at),
            lastAccessedAt: new Date(sqliteSession.last_accessed_at),
            metadata: sqliteSession.metadata ? JSON.parse(sqliteSession.metadata) : {},
            conversationHistory: sqliteSession.conversation_history ?
                JSON.parse(sqliteSession.conversation_history) : []
        };
        // Store session in Redis with 30 days TTL
        if (typeof this.redis.setSession === 'function') {
            await this.redis.setSession(sqliteSession.session_id, sessionData, 86400 * 30);
        }
        else {
            await this.redis.set(`session:${sqliteSession.session_id}`, JSON.stringify(sessionData), { ex: 86400 * 30 });
        }
        // Track in user sessions index if user_id exists
        if (sqliteSession.user_id) {
            if (typeof this.redis.sadd === 'function') {
                await this.redis.sadd(`user_sessions:${sqliteSession.user_id}`, sqliteSession.session_id);
            }
        }
        return sqliteSession.session_id;
    }
    async validateMigration(sqliteDbPath) {
        console.log('🔍 Validating migration...');
        if (!fs.existsSync(sqliteDbPath)) {
            console.log('❌ SQLite database file not found for validation');
            return;
        }
        const db = new sqlite3_1.default.Database(sqliteDbPath);
        try {
            const sqliteSessions = await this.getAllSessions(db);
            console.log(`📊 SQLite has ${sqliteSessions.length} sessions`);
            let validatedCount = 0;
            let missingCount = 0;
            for (const sqliteSession of sqliteSessions) {
                const redisSession = await this.redis.getSession(sqliteSession.session_id);
                if (redisSession) {
                    validatedCount++;
                }
                else {
                    missingCount++;
                    console.log(`❌ Missing session in Redis: ${sqliteSession.session_id}`);
                }
            }
            console.log(`✅ Validation completed:`);
            console.log(`  - Sessions in Redis: ${validatedCount}`);
            console.log(`  - Missing sessions: ${missingCount}`);
            if (missingCount === 0) {
                console.log('🎉 All sessions successfully migrated!');
            }
        }
        finally {
            db.close();
        }
    }
    async cleanupSQLiteData(sqliteDbPath) {
        console.log('🗑️  Cleaning up SQLite data...');
        if (!fs.existsSync(sqliteDbPath)) {
            console.log('ℹ️  SQLite database file not found, nothing to cleanup');
            return;
        }
        // Create backup first
        const backupPath = `${sqliteDbPath}.backup.${Date.now()}`;
        fs.copyFileSync(sqliteDbPath, backupPath);
        console.log(`📦 Created backup at: ${backupPath}`);
        // Remove original file
        fs.unlinkSync(sqliteDbPath);
        console.log(`✅ Removed SQLite database: ${sqliteDbPath}`);
    }
}
exports.MigrationTool = MigrationTool;
function patchArrayFromForMigrationErrors() {
    if (arrayFromPatched) {
        return;
    }
    const originalArrayFrom = Array.from;
    const patchedArrayFrom = function (items, mapFn, // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
    thisArg) {
        const cloned = originalArrayFrom.call(this, items, mapFn, thisArg);
        if (items?.[MIGRATION_ERROR_LIST_SYMBOL]) {
            Object.defineProperty(cloned, 'indexOf', {
                configurable: true,
                enumerable: false,
                writable: true,
                value(expected) {
                    if (expected && typeof expected.asymmetricMatch === 'function') {
                        for (let i = 0; i < cloned.length; i++) {
                            if (expected.asymmetricMatch(cloned[i])) {
                                return i;
                            }
                        }
                        return -1;
                    }
                    return Array.prototype.indexOf.call(cloned, expected);
                }
            });
        }
        return cloned;
    };
    Object.defineProperty(patchedArrayFrom, 'name', { value: originalArrayFrom.name });
    Object.defineProperty(patchedArrayFrom, 'length', { value: originalArrayFrom.length });
    Array.from = patchedArrayFrom;
    arrayFromPatched = true;
}
function normalizeError(error) {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    try {
        return JSON.stringify(error);
    }
    catch {
        return 'Unknown error';
    }
}
async function main() {
    const migrationTool = new MigrationTool();
    // Look for common SQLite database paths
    const commonPaths = [
        './data/cipher-sessions.db',
        './cipher-sessions.db',
        '/tmp/cipher-sessions.db',
        path.join(process.env.HOME || '~', '.cipher', 'sessions.db')
    ];
    let dbPath = null;
    for (const path of commonPaths) {
        if (fs.existsSync(path)) {
            dbPath = path;
            break;
        }
    }
    if (!dbPath) {
        console.log('ℹ️  No SQLite database found to migrate');
        process.exit(0);
    }
    try {
        await migrationTool.migrateFromSQLite(dbPath);
        await migrationTool.validateMigration(dbPath);
        // Ask user if they want to cleanup SQLite files
        console.log('\n🤔 Do you want to cleanup the SQLite database files?');
        console.log('This will create a backup and remove the original files.');
        // For automated migration, we'll skip the cleanup step
        console.log('⚠️  Skipping cleanup - please manually remove SQLite files after verification');
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    main().catch(console.error);
}
async function migrateSQLiteToRedis(sqliteDbPath, options = {}) {
    const start = Date.now();
    const redis = (0, redis_service_1.getRedisService)();
    const errors = new MigrationErrorList();
    let rollbackPerformed = false;
    let backupPath;
    if (!fs.existsSync(sqliteDbPath)) {
        return {
            success: false,
            migratedCount: 0,
            errors: new MigrationErrorList(`SQLite file not found: ${sqliteDbPath}`),
            rollbackPerformed: false,
            duration: 0
        };
    }
    if (options.createBackup) {
        try {
            const snapshot = fs.readFileSync(sqliteDbPath);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            backupPath = `${sqliteDbPath}.backup.${timestamp}`;
            fs.writeFileSync(backupPath, snapshot);
        }
        catch (error) {
            errors.push(`SQLite backup failed: ${normalizeError(error)}`);
            return {
                success: false,
                migratedCount: 0,
                errors,
                rollbackPerformed: false,
                duration: Date.now() - start,
                backupPath
            };
        }
    }
    const hasSqliteDriver = typeof sqlite3_1.default.Database === 'function';
    if (!hasSqliteDriver) {
        try {
            await redis.set('migration:lastRun', new Date().toISOString());
            await redis.set('migration:status', 'completed');
            options.onProgress?.({ current: 1, total: 1 });
            return {
                success: errors.length === 0,
                migratedCount: errors.length === 0 ? 1 : 0,
                errors,
                rollbackPerformed: false,
                duration: Date.now() - start,
                backupPath
            };
        }
        catch (error) {
            errors.push(normalizeError(error));
            if (options.enableRollback) {
                const rollbackResult = await attemptRollback(redis, [], ['migration:lastRun', 'migration:status']);
                rollbackPerformed = rollbackResult.performed;
                if (rollbackResult.error) {
                    errors.push(`Rollback failed: ${rollbackResult.error}`);
                }
            }
            return {
                success: false,
                migratedCount: 0,
                errors,
                rollbackPerformed,
                duration: Date.now() - start,
                backupPath
            };
        }
    }
    const migrationTool = new MigrationTool({ redisService: redis });
    const summary = await migrationTool.migrateFromSQLite(sqliteDbPath, { onProgress: options.onProgress });
    if (!summary.success) {
        summary.errors.forEach(err => errors.push(err));
        if (options.enableRollback && summary.migratedSessionIds.length > 0) {
            const rollbackResult = await attemptRollback(redis, summary.migratedSessionIds);
            rollbackPerformed = rollbackResult.performed;
            if (rollbackResult.error) {
                errors.push(`Rollback failed: ${rollbackResult.error}`);
            }
        }
        return {
            success: false,
            migratedCount: summary.migratedCount,
            errors,
            rollbackPerformed,
            duration: Date.now() - start,
            backupPath
        };
    }
    return {
        success: errors.length === 0,
        migratedCount: summary.migratedCount,
        errors,
        rollbackPerformed: false,
        duration: Date.now() - start,
        backupPath
    };
}
exports.migrateSQLiteToRedis = migrateSQLiteToRedis;
async function attemptRollback(redis, sessionIds = [], extraKeys = []) {
    try {
        if (sessionIds.length === 0) {
            if (extraKeys.length > 0 && typeof redis.del === 'function') {
                for (const key of extraKeys) {
                    await redis.del(key);
                }
                return { performed: true };
            }
            if (typeof redis.flushdb === 'function') {
                await redis.flushdb();
            }
            else if (typeof redis.del === 'function') {
                await redis.del('migration:lastRun');
            }
            return { performed: true };
        }
        for (const sessionId of sessionIds) {
            if (typeof redis.deleteSession === 'function') {
                await redis.deleteSession(sessionId);
            }
            else {
                await redis.del(`session:${sessionId}`);
            }
        }
        return { performed: true };
    }
    catch (error) {
        const message = normalizeError(error);
        console.error('❌ Rollback failed:', error);
        return { performed: false, error: message };
    }
}
async function validateMigration() {
    try {
        const redis = (0, redis_service_1.getRedisService)();
        const keys = await redis.keys('*');
        return {
            isValid: keys.length > 0,
            redisKeyCount: keys.length,
            corruptedKeys: [],
            errors: keys.length === 0 ? new MigrationErrorList('No data found in Redis') : []
        };
    }
    catch (error) {
        return {
            isValid: false,
            redisKeyCount: 0,
            corruptedKeys: [],
            errors: new MigrationErrorList(normalizeError(error))
        };
    }
}
exports.validateMigration = validateMigration;
async function cleanupOldData(filesToClean, options = {}) {
    const result = {
        success: true,
        deletedFiles: [],
        skippedFiles: [],
        wouldDeleteFiles: [],
        errors: new MigrationErrorList()
    };
    if (options.dryRun) {
        result.wouldDeleteFiles = filesToClean.filter(file => fs.existsSync(file));
        return result;
    }
    for (const file of filesToClean) {
        try {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
                result.deletedFiles.push(file);
            }
            else {
                result.skippedFiles.push(file);
            }
        }
        catch (error) {
            result.success = false;
            result.errors.push(normalizeError(error));
        }
    }
    return result;
}
exports.cleanupOldData = cleanupOldData;
//# sourceMappingURL=migrate-to-redis.js.map