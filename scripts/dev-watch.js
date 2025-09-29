#!/usr/bin/env node
/**
 * TechSapo Development File Watcher with Smart Deployment
 * Monitors development files and triggers production deployment
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const chokidar = require('chokidar');

const CONFIG = {
    devDir: '/ai/prj/techdev',
    prodDir: '/prod/techsapo',
    deployScript: './scripts/deploy-to-prod.sh',
    debounceMs: 3000,
    watchPatterns: [
        'src/**/*',
        'config/**/*',
        'scripts/**/*',
        'package.json',
        'tsconfig.json',
        '*.md'
    ],
    ignorePatterns: [
        'node_modules/**',
        '.git/**',
        'logs/**',
        'tmp/**',
        '.claude/**',
        '**/*.log',
        '**/*.tmp',
        '**/dist/**'
    ]
};

class DeploymentWatcher {
    constructor() {
        this.lastDeployment = 0;
        this.deploymentQueue = null;
        this.isDeploying = false;
        this.deploymentCount = 0;
    }

    start() {
        console.log('👀 TechSapo Development Watcher Started');
        console.log(`   Development: ${CONFIG.devDir}`);
        console.log(`   Production: ${CONFIG.prodDir}`);
        console.log(`   Debounce: ${CONFIG.debounceMs}ms`);
        console.log('   Press Ctrl+C to stop\n');

        // Initialize file watcher
        const watcher = chokidar.watch(CONFIG.watchPatterns, {
            cwd: CONFIG.devDir,
            ignored: CONFIG.ignorePatterns,
            ignoreInitial: true,
            persistent: true,
            awaitWriteFinish: {
                stabilityThreshold: 500,
                pollInterval: 100
            }
        });

        // Set up event handlers
        watcher
            .on('change', (filePath) => this.handleFileChange(filePath, 'changed'))
            .on('add', (filePath) => this.handleFileChange(filePath, 'added'))
            .on('unlink', (filePath) => this.handleFileChange(filePath, 'removed'))
            .on('error', (error) => console.error('❌ Watcher error:', error))
            .on('ready', () => console.log('✅ File watcher ready\n'));

        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down watcher...');
            watcher.close();
            process.exit(0);
        });
    }

    handleFileChange(filePath, action) {
        const fullPath = path.join(CONFIG.devDir, filePath);
        const ext = path.extname(filePath);
        
        // Only trigger deployment for significant files
        const significantExtensions = ['.ts', '.js', '.json', '.md', '.sh', '.toml'];
        const isSignificant = significantExtensions.includes(ext) || 
                             filePath.includes('/src/') || 
                             filePath.includes('/config/');

        if (!isSignificant) {
            return;
        }

        console.log(`📝 File ${action}: ${filePath}`);
        this.queueDeployment();
    }

    queueDeployment() {
        // Clear existing queue
        if (this.deploymentQueue) {
            clearTimeout(this.deploymentQueue);
        }

        // Queue new deployment with debouncing
        this.deploymentQueue = setTimeout(() => {
            this.deploy();
        }, CONFIG.debounceMs);
    }

    async deploy() {
        if (this.isDeploying) {
            console.log('⏳ Deployment already in progress, skipping...');
            return;
        }

        this.isDeploying = true;
        this.deploymentCount++;
        
        const deploymentId = this.deploymentCount;
        const startTime = Date.now();

        console.log(`🚀 Starting deployment #${deploymentId}...`);

        try {
            await this.runDeploymentScript();
            const duration = Date.now() - startTime;
            console.log(`✅ Deployment #${deploymentId} completed in ${duration}ms\n`);
        } catch (error) {
            console.error(`❌ Deployment #${deploymentId} failed:`, error.message);
            console.error('   Check the deployment script for details\n');
        } finally {
            this.isDeploying = false;
            this.lastDeployment = Date.now();
        }
    }

    runDeploymentScript() {
        return new Promise((resolve, reject) => {
            const deployProcess = spawn('bash', [CONFIG.deployScript], {
                cwd: CONFIG.devDir,
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            deployProcess.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                // Real-time output for important messages
                if (output.includes('✅') || output.includes('❌') || output.includes('🎯')) {
                    process.stdout.write(output);
                }
            });

            deployProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            deployProcess.on('close', (code) => {
                if (code === 0) {
                    resolve({ stdout, stderr });
                } else {
                    reject(new Error(`Deployment script exited with code ${code}\n${stderr}`));
                }
            });

            deployProcess.on('error', (error) => {
                reject(error);
            });
        });
    }
}

// Check if required dependencies are available
try {
    require.resolve('chokidar');
} catch (error) {
    console.error('❌ Missing dependency: chokidar');
    console.error('   Install it with: npm install chokidar');
    process.exit(1);
}

// Start the watcher
const watcher = new DeploymentWatcher();
watcher.start();