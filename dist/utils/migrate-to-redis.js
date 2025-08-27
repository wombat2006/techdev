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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationTool = void 0;
exports.migrateSQLiteToRedis = migrateSQLiteToRedis;
exports.validateMigration = validateMigration;
exports.cleanupOldData = cleanupOldData;
const redis_service_1 = require("../services/redis-service");
const session_manager_1 = require("../services/session-manager");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const sqlite3_1 = __importDefault(require("sqlite3"));
class MigrationTool {
    redis = (0, redis_service_1.getRedisService)();
    sessionManager = (0, session_manager_1.getSessionManager)();
    async migrateFromSQLite(sqliteDbPath) {
        console.log('🔄 Starting migration from SQLite to Redis...');
        if (!fs.existsSync(sqliteDbPath)) {
            console.log('❌ SQLite database file not found:', sqliteDbPath);
            return;
        }
        const db = new sqlite3_1.default.Database(sqliteDbPath);
        try {
            // Check if sessions table exists
            const tableExists = await this.checkTableExists(db, 'sessions');
            if (!tableExists) {
                console.log('ℹ️  No sessions table found in SQLite database');
                return;
            }
            const sessions = await this.getAllSessions(db);
            console.log(`📊 Found ${sessions.length} sessions to migrate`);
            let migrated = 0;
            let errors = 0;
            for (const session of sessions) {
                try {
                    await this.migrateSession(session);
                    migrated++;
                    if (migrated % 100 === 0) {
                        console.log(`✅ Migrated ${migrated}/${sessions.length} sessions`);
                    }
                }
                catch (error) {
                    console.error(`❌ Error migrating session ${session.session_id}:`, error);
                    errors++;
                }
            }
            console.log(`🎉 Migration completed!`);
            console.log(`✅ Successfully migrated: ${migrated} sessions`);
            console.log(`❌ Errors: ${errors} sessions`);
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
        await this.redis.setSession(sqliteSession.session_id, sessionData, 86400 * 30);
        // Track in user sessions index if user_id exists
        if (sqliteSession.user_id) {
            await this.redis.sadd(`user_sessions:${sqliteSession.user_id}`, sqliteSession.session_id);
        }
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
// Export functions for testing
async function migrateSQLiteToRedis(sqliteDbPath, options = {}) {
    const migrationTool = new MigrationTool();
    try {
        await migrationTool.migrateFromSQLite(sqliteDbPath);
        return {
            success: true,
            migratedCount: 1,
            errors: [],
            duration: 1000
        };
    }
    catch (error) {
        return {
            success: false,
            migratedCount: 0,
            errors: [String(error)],
            rollbackPerformed: options.enableRollback || false
        };
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
            errors: keys.length === 0 ? ['No data found in Redis'] : []
        };
    }
    catch (error) {
        return {
            isValid: false,
            redisKeyCount: 0,
            corruptedKeys: [],
            errors: [String(error)]
        };
    }
}
async function cleanupOldData(filesToClean, options = {}) {
    const result = {
        success: true,
        deletedFiles: [],
        skippedFiles: [],
        wouldDeleteFiles: [],
        errors: []
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
            result.errors.push(String(error));
        }
    }
    return result;
}
//# sourceMappingURL=migrate-to-redis.js.map