#!/usr/bin/env ts-node

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { GoogleDriveRAGConnector, GoogleDriveConfig, OpenAIConfig } from '../src/services/googledrive-connector';
import { resyncDriveDocuments } from '../src/services/googledrive-manual-sync';
import { logger } from '../src/utils/logger';

interface ManualSyncResult {
  data?: {
    vector_store_name?: string;
    sync_result?: {
      failed_documents?: Array<{ id: string }>;
    };
  };
}

const parseArgs = () => {
  const args = process.argv.slice(2);
  const opts: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.replace(/^--/, '');
      const next = args[i + 1];
      if (!next || next.startsWith('--')) {
        opts[key] = true;
      } else {
        opts[key] = next;
        i++;
      }
    }
  }
  return opts;
};

const options = parseArgs();

const inputPath = options.input as string;
if (!inputPath) {
  console.error('Usage: ts-node scripts/resync-drive-docs.ts --input manual-sync.json [--vector-store name] [--document docId ...] [--dry-run]');
  process.exit(1);
}

const filePath = path.resolve(inputPath);
const fileContent = fs.readFileSync(filePath, 'utf-8');
const manualResult = JSON.parse(fileContent) as ManualSyncResult;

let explicitDocs: string[] = [];
if (Array.isArray(options.document)) {
  explicitDocs = options.document as string[];
} else if (typeof options.document === 'string') {
  explicitDocs = options.document.split(',').map(item => item.trim()).filter(Boolean);
}

const failedDocs = manualResult?.data?.sync_result?.failed_documents?.map(doc => doc.id) || [];
const targetDocs = explicitDocs.length > 0 ? explicitDocs : failedDocs;

if (targetDocs.length === 0) {
  console.error('No document IDs provided or found in the input JSON under data.sync_result.failed_documents.');
  process.exit(1);
}

const googleDriveConfig: GoogleDriveConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob',
  refreshToken: process.env.GOOGLE_REFRESH_TOKEN || ''
};

const openaiConfig: OpenAIConfig = {
  apiKey: process.env.OPENAI_API_KEY || '',
  organization: process.env.OPENAI_ORGANIZATION
};

if (!googleDriveConfig.clientId || !googleDriveConfig.refreshToken || !openaiConfig.apiKey) {
  console.error('Missing Google Drive / OpenAI credentials. Ensure GOOGLE_CLIENT_ID, GOOGLE_REFRESH_TOKEN, and OPENAI_API_KEY are set.');
  process.exit(1);
}

const vectorStoreName = (options['vector-store'] as string | undefined)
  || manualResult?.data?.vector_store_name
  || process.env.DEFAULT_VECTOR_STORE_NAME
  || 'techsapo-realtime-docs';

const dryRun = Boolean(options['dry-run']);

(async () => {
  try {
    if (dryRun) {
      console.log(JSON.stringify({
        dryRun: true,
        vectorStoreName,
        documents: targetDocs
      }, null, 2));
      return;
    }

    const connector = new GoogleDriveRAGConnector(googleDriveConfig, openaiConfig);
    const outcome = await resyncDriveDocuments(connector, vectorStoreName, targetDocs as string[]);

    console.log(JSON.stringify({
      vectorStoreId: outcome.vectorStoreId,
      processed: outcome.processedDocuments,
      failed: outcome.failedDocuments
    }, null, 2));
  } catch (error) {
    logger.error('Drive re-sync script failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    process.exit(1);
  }
})();
