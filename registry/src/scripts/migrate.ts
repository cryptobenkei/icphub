#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ContextRegistryManager } from "../index.js";
import fs from "fs/promises";
import path from "path";

interface MigrationConfig {
  backupDir: string;
  mainMotokoFile: string;
  canisterName: string;
  requireMigrationFunction: boolean;
}

const CONFIG: MigrationConfig = {
  backupDir: './backups',
  mainMotokoFile: './src/context-registry/main.mo',
  canisterName: 'context_registry',
  requireMigrationFunction: true
};

interface BackupData {
  timestamp: string;
  canisterId: string;
  seasons: any[];
  nameRecords: any[];
  userProfiles: any[];
  fileReferences: any[];
  metadata: any[];
  markdown: any[];
}

class MigrationOrchestrator {
  private timestamp: string;
  private manager: ContextRegistryManager;

  constructor() {
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.manager = new ContextRegistryManager();
  }

  private log(message: string, level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' = 'INFO') {
    const colors = {
      INFO: '\x1b[36m',
      WARN: '\x1b[33m',
      ERROR: '\x1b[31m',
      SUCCESS: '\x1b[32m'
    };
    const reset = '\x1b[0m';
    console.log(`${colors[level]}[${level}]${reset} ${message}`);
  }

  private exec(command: string, silent = false): string {
    try {
      const result = execSync(command, { encoding: 'utf-8', stdio: silent ? 'pipe' : 'inherit' });
      return result;
    } catch (error: any) {
      if (!silent) {
        this.log(`Command failed: ${command}`, 'ERROR');
        this.log(`Error: ${error.message}`, 'ERROR');
      }
      throw error;
    }
  }

  private async checkGitChanges(): Promise<boolean> {
    this.log('🔍 Checking for uncommitted changes...');

    try {
      const status = this.exec('git status --porcelain', true);
      if (status.trim()) {
        this.log('Found uncommitted changes:', 'WARN');
        console.log(status);
        return true;
      }

      this.log('No uncommitted changes found', 'SUCCESS');
      return false;
    } catch {
      this.log('Not a git repository - skipping git checks', 'WARN');
      return false;
    }
  }

  private async checkMigrationFunction(): Promise<boolean> {
    if (!CONFIG.requireMigrationFunction) {
      return true;
    }

    this.log('🔍 Checking for migration function in Motoko code...');

    if (!existsSync(CONFIG.mainMotokoFile)) {
      this.log(`Main Motoko file not found: ${CONFIG.mainMotokoFile}`, 'ERROR');
      return false;
    }

    const content = readFileSync(CONFIG.mainMotokoFile, 'utf-8');

    // Check for EOP usage and migration patterns
    const migrationPatterns = [
      /with\s+migration\s*\(/,
      /Migration\s*\.\s*migrate/,
      /migration\s*:\s*\(/,
      /enhanced-orthogonal-persistence/,
      /stable\s+var/
    ];

    const hasMigration = migrationPatterns.some(pattern => pattern.test(content));

    if (hasMigration) {
      this.log('Migration support detected (EOP or migration function)', 'SUCCESS');
      return true;
    }

    this.log('No migration function found - this may cause data loss during upgrade', 'WARN');
    return false;
  }

  private async checkBuildCompatibility(): Promise<boolean> {
    this.log('🔨 Checking build compatibility...');

    try {
      this.exec('dfx build', true);
      this.log('Build successful', 'SUCCESS');
      return true;
    } catch {
      this.log('Build failed - fix compilation errors before migration', 'ERROR');
      return false;
    }
  }

  private async createFileSystemBackup(): Promise<string> {
    this.log('💾 Creating filesystem backup...');

    const backupPath = `${CONFIG.backupDir}/fs-backup-${this.timestamp}`;

    try {
      // Ensure backup directory exists
      this.exec(`mkdir -p ${backupPath}`);

      // Create comprehensive backup
      const backupCommands = [
        `cp -r .dfx ${backupPath}/.dfx 2>/dev/null || true`,
        `cp -r src ${backupPath}/src`,
        `cp dfx.json ${backupPath}/dfx.json`,
        `cp package.json ${backupPath}/package.json`,
        `cp .env ${backupPath}/.env 2>/dev/null || true`
      ];

      for (const cmd of backupCommands) {
        try {
          this.exec(cmd, true);
        } catch {
          // Continue if some files don't exist
        }
      }

      this.log(`Filesystem backup created at: ${backupPath}`, 'SUCCESS');
      return backupPath;
    } catch (error: any) {
      this.log(`Filesystem backup failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  private async createCanisterDataBackup(): Promise<BackupData | null> {
    this.log('📦 Creating canister data backup...');

    try {
      await this.manager.init(undefined, "http://localhost:4943");
      const actor = this.manager.getActor();
      if (!actor) {
        this.log('Actor not initialized - skipping data backup', 'WARN');
        return null;
      }

      // Backup all data
      const [seasons, nameRecords, fileReferences] = await Promise.all([
        actor.listSeasons(),
        actor.listNameRecords(),
        actor.listFileReferences()
      ]);

      const backup: BackupData = {
        timestamp: new Date().toISOString(),
        canisterId: process.env.CANISTER_ID_CONTEXT_REGISTRY || "",
        seasons,
        nameRecords,
        userProfiles: [],
        fileReferences,
        metadata: [],
        markdown: []
      };

      // Save backup to file
      const backupDir = CONFIG.backupDir;
      await fs.mkdir(backupDir, { recursive: true });

      const filename = `data-backup-${this.timestamp}.json`;
      const filepath = path.join(backupDir, filename);

      // Handle BigInt serialization
      await fs.writeFile(filepath, JSON.stringify(backup, (key, value) =>
        typeof value === 'bigint' ? value.toString() + 'n' : value, 2));

      this.log(`Canister data backup saved to: ${filepath}`, 'SUCCESS');
      return backup;
    } catch (error: any) {
      this.log(`Canister data backup failed: ${error.message}`, 'WARN');
      return null;
    }
  }

  private async performMigration(): Promise<boolean> {
    this.log('🚀 Performing migration...');

    try {
      // Deploy with upgrade mode
      this.log('Deploying canister upgrade...');
      this.exec(`dfx deploy --mode upgrade`);

      this.log('Migration completed successfully', 'SUCCESS');
      return true;
    } catch (error: any) {
      this.log(`Migration failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  private async rollback(backupPath: string): Promise<void> {
    this.log('🔄 Rolling back to backup...');

    try {
      // Stop current replica
      this.exec('dfx stop', true);

      // Restore files
      this.exec(`cp -r ${backupPath}/.dfx ./ 2>/dev/null || true`);
      this.exec(`cp -r ${backupPath}/src ./`);
      this.exec(`cp ${backupPath}/dfx.json ./`);
      this.exec(`cp ${backupPath}/.env ./ 2>/dev/null || true`);

      // Restart replica
      this.exec('dfx start --background');

      this.log('Rollback completed', 'SUCCESS');
    } catch (error: any) {
      this.log(`Rollback failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  private async verifyMigration(): Promise<boolean> {
    this.log('✅ Verifying migration...');

    try {
      // Check canister status
      const status = this.exec(`dfx canister status ${CONFIG.canisterName}`, true);
      if (!status.includes('Running')) {
        this.log('Canister is not running', 'ERROR');
        return false;
      }

      // Test basic functionality
      try {
        this.exec(`dfx canister call ${CONFIG.canisterName} getCurrentTime`, true);
        this.log('Basic canister functionality verified', 'SUCCESS');
      } catch {
        this.log('Canister functionality test failed', 'ERROR');
        return false;
      }

      return true;
    } catch (error: any) {
      this.log(`Verification failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async migrate(): Promise<void> {
    this.log('🎯 Starting Migration Orchestrator', 'INFO');
    this.log(`Timestamp: ${this.timestamp}`, 'INFO');

    let fsBackupPath = '';

    try {
      // Step 1: Pre-migration checks
      this.log('\n=== PRE-MIGRATION CHECKS ===');

      const hasChanges = await this.checkGitChanges();
      const hasMigrationFn = await this.checkMigrationFunction();
      const buildSuccess = await this.checkBuildCompatibility();

      if (!buildSuccess) {
        throw new Error('Build compatibility check failed');
      }

      if (!hasMigrationFn) {
        this.log('⚠️  WARNING: No migration function detected', 'WARN');
        this.log('This upgrade may result in data loss!', 'WARN');
      }

      // Step 2: Create backups
      this.log('\n=== BACKUP CREATION ===');
      fsBackupPath = await this.createFileSystemBackup();
      await this.createCanisterDataBackup();

      // Step 3: Perform migration
      this.log('\n=== MIGRATION EXECUTION ===');
      const migrationSuccess = await this.performMigration();

      if (!migrationSuccess) {
        throw new Error('Migration failed');
      }

      // Step 4: Verify migration
      this.log('\n=== POST-MIGRATION VERIFICATION ===');
      const verificationSuccess = await this.verifyMigration();

      if (!verificationSuccess) {
        throw new Error('Migration verification failed');
      }

      // Success!
      this.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY! 🎉', 'SUCCESS');
      this.log(`Backups available in: ${CONFIG.backupDir}`, 'INFO');

    } catch (error: any) {
      this.log(`\n❌ MIGRATION FAILED: ${error.message}`, 'ERROR');

      if (fsBackupPath) {
        this.log('\n=== ATTEMPTING ROLLBACK ===');
        try {
          await this.rollback(fsBackupPath);
          this.log('System restored to previous state', 'SUCCESS');
        } catch (rollbackError: any) {
          this.log(`Rollback failed: ${rollbackError.message}`, 'ERROR');
          this.log(`Manual restore required from: ${fsBackupPath}`, 'ERROR');
        }
      }

      process.exit(1);
    }
  }

  async backupOnly(): Promise<void> {
    const fsBackupPath = await this.createFileSystemBackup();
    await this.createCanisterDataBackup();
    this.log('Backup completed', 'SUCCESS');
  }

  async restoreData(backupFile: string): Promise<void> {
    await this.manager.init(undefined, "http://localhost:4943");
    const actor = this.manager.getActor();
    if (!actor) throw new Error("Actor not initialized");

    this.log(`📥 Restoring data from: ${backupFile}`);

    // Handle BigInt deserialization
    const backupText = await fs.readFile(backupFile, "utf-8");
    const backupData = JSON.parse(backupText, (key, value) => {
      if (typeof value === 'string' && value.endsWith('n') && /^\d+n$/.test(value)) {
        return BigInt(value.slice(0, -1));
      }
      return value;
    }) as BackupData;

    // Initialize access control first
    await actor.initializeAccessControl();

    // Restore seasons
    for (const season of backupData.seasons) {
      try {
        const seasonId = await actor.createSeason(
          season.name,
          season.startTime,
          season.endTime,
          season.maxNames,
          season.minNameLength,
          season.maxNameLength,
          season.price
        );

        if (season.status.active) {
          await actor.activateSeason(seasonId);
        } else if (season.status.ended) {
          await actor.activateSeason(seasonId);
          await actor.endSeason(seasonId);
        } else if (season.status.cancelled) {
          await actor.activateSeason(seasonId);
          await actor.cancelSeason(seasonId);
        }

        this.log(`✅ Restored season: ${season.name}`, 'SUCCESS');
      } catch (error) {
        this.log(`❌ Failed to restore season ${season.name}: ${error}`, 'ERROR');
      }
    }

    this.log("✅ Data restoration completed", 'SUCCESS');
  }

  async listBackups(): Promise<string[]> {
    try {
      const backupDir = CONFIG.backupDir;
      const files = await fs.readdir(backupDir);
      return files.filter(f => (f.startsWith("backup-") || f.startsWith("data-backup-") || f.startsWith("fs-backup-")) && (f.endsWith(".json") || !f.includes(".")));
    } catch {
      return [];
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const orchestrator = new MigrationOrchestrator();

  switch (command) {
    case 'backup':
      await orchestrator.backupOnly();
      break;
    case 'restore':
      if (!args[1]) {
        console.error("Usage: npm run migrate restore <backup-file>");
        process.exit(1);
      }
      await orchestrator.restoreData(args[1]);
      break;
    case 'list':
      const backups = await orchestrator.listBackups();
      if (backups.length === 0) {
        console.log("No backups found");
      } else {
        console.log("Available backups:");
        backups.forEach(backup => console.log(`  ${backup}`));
      }
      break;
    case 'verify':
      await orchestrator['verifyMigration']();
      break;
    case 'full':
    case undefined:
      await orchestrator.migrate();
      break;
    default:
      console.log(`
Usage: npm run migrate [command]

Commands:
  full      Full migration with all checks (default)
  backup    Create backups only
  restore   Restore data from backup file
  list      List available backup files
  verify    Verify current deployment only

Examples:
  npm run migrate              # Full migration
  npm run migrate backup       # Backup only
  npm run migrate restore file # Restore data
  npm run migrate list         # List backups
  npm run migrate verify       # Verify only
`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}