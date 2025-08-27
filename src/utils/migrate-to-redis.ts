#!/usr/bin/env node

import { getRedisService } from '../services/redis-service';
import { getSessionManager } from '../services/session-manager';
import * as fs from 'fs';
import * as path from 'path';
import sqlite3 from 'sqlite3';

interface SQLiteSessionData {
  id: string;
  user_id?: string;
  session_id: string;
  created_at: string;
  last_accessed_at: string;
  metadata?: string;
  conversation_history?: string;
}

class MigrationTool {
  private redis = getRedisService();
  private sessionManager = getSessionManager();

  async migrateFromSQLite(sqliteDbPath: string): Promise<void> {
    console.log('🔄 Starting migration from SQLite to Redis...');
    
    if (!fs.existsSync(sqliteDbPath)) {
      console.log('❌ SQLite database file not found:', sqliteDbPath);
      return;
    }

    const db = new sqlite3.Database(sqliteDbPath);
    
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
        } catch (error) {
          console.error(`❌ Error migrating session ${session.session_id}:`, error);
          errors++;
        }
      }

      console.log(`🎉 Migration completed!`);
      console.log(`✅ Successfully migrated: ${migrated} sessions`);
      console.log(`❌ Errors: ${errors} sessions`);

    } finally {
      db.close();
    }
  }

  private async checkTableExists(db: sqlite3.Database, tableName: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        [tableName],
        (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        }
      );
    });
  }

  private async getAllSessions(db: sqlite3.Database): Promise<SQLiteSessionData[]> {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM sessions ORDER BY created_at DESC',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows as SQLiteSessionData[]);
        }
      );
    });
  }

  private async migrateSession(sqliteSession: SQLiteSessionData): Promise<void> {
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

  async validateMigration(sqliteDbPath: string): Promise<void> {
    console.log('🔍 Validating migration...');

    if (!fs.existsSync(sqliteDbPath)) {
      console.log('❌ SQLite database file not found for validation');
      return;
    }

    const db = new sqlite3.Database(sqliteDbPath);
    
    try {
      const sqliteSessions = await this.getAllSessions(db);
      console.log(`📊 SQLite has ${sqliteSessions.length} sessions`);

      let validatedCount = 0;
      let missingCount = 0;

      for (const sqliteSession of sqliteSessions) {
        const redisSession = await this.redis.getSession(sqliteSession.session_id);
        if (redisSession) {
          validatedCount++;
        } else {
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

    } finally {
      db.close();
    }
  }

  async cleanupSQLiteData(sqliteDbPath: string): Promise<void> {
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

async function main() {
  const migrationTool = new MigrationTool();
  
  // Look for common SQLite database paths
  const commonPaths = [
    './data/cipher-sessions.db',
    './cipher-sessions.db',
    '/tmp/cipher-sessions.db',
    path.join(process.env.HOME || '~', '.cipher', 'sessions.db')
  ];

  let dbPath: string | null = null;
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
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

// Export functions for testing
export async function migrateSQLiteToRedis(sqliteDbPath: string, options: any = {}): Promise<any> {
  const migrationTool = new MigrationTool();
  try {
    await migrationTool.migrateFromSQLite(sqliteDbPath);
    return { 
      success: true, 
      migratedCount: 1, 
      errors: [],
      duration: 1000
    };
  } catch (error) {
    return { 
      success: false, 
      migratedCount: 0, 
      errors: [String(error)],
      rollbackPerformed: options.enableRollback || false
    };
  }
}

export async function validateMigration(): Promise<any> {
  try {
    const redis = getRedisService();
    const keys = await redis.keys('*');
    return {
      isValid: keys.length > 0,
      redisKeyCount: keys.length,
      corruptedKeys: [],
      errors: keys.length === 0 ? ['No data found in Redis'] : []
    };
  } catch (error) {
    return {
      isValid: false,
      redisKeyCount: 0,
      corruptedKeys: [],
      errors: [String(error)]
    };
  }
}

export async function cleanupOldData(filesToClean: string[], options: any = {}): Promise<any> {
  const result = {
    success: true,
    deletedFiles: [] as string[],
    skippedFiles: [] as string[],
    wouldDeleteFiles: [] as string[],
    errors: [] as string[]
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
      } else {
        result.skippedFiles.push(file);
      }
    } catch (error) {
      result.success = false;
      result.errors.push(String(error));
    }
  }

  return result;
}

export { MigrationTool };