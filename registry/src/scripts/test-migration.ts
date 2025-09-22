#!/usr/bin/env tsx

import { ContextRegistryManager } from "../index.js";
import { Principal } from "@dfinity/principal";

interface MigrationResult {
  success: boolean;
  logs: string[];
  checksum?: string;
}

interface Version {
  major: number;
  minor: number;
  patch: number;
}

class MigrationTester {
  private manager: ContextRegistryManager;

  constructor() {
    this.manager = new ContextRegistryManager();
  }

  async init() {
    console.log("🔧 Initializing migration test environment...");
    await this.manager.init(undefined, "http://localhost:4943");
  }

  async testEnhancedOrthogonalPersistence() {
    console.log("\n📊 Testing Enhanced Orthogonal Persistence...");

    const actor = this.manager.getActor();
    if (!actor) throw new Error("Actor not initialized");

    try {
      // Test version information
      const version = await actor.getCanisterVersion();
      console.log(`✅ Current version: ${version.major}.${version.minor}.${version.patch}`);

      // Test upgrade info
      const upgradeInfo = await actor.getUpgradeInfo();
      console.log(`✅ Total seasons: ${upgradeInfo.totalSeasons}`);
      console.log(`✅ Total name records: ${upgradeInfo.totalNameRecords}`);
      console.log(`✅ Migration history entries: ${upgradeInfo.migrationHistory.length}`);

      return true;
    } catch (error) {
      console.error("❌ EOP test failed:", error);
      return false;
    }
  }

  async testSystemValidation() {
    console.log("\n🔍 Testing system state validation...");

    const actor = this.manager.getActor();
    if (!actor) throw new Error("Actor not initialized");

    try {
      const validation = await actor.validateSystemState();

      if (validation.valid) {
        console.log("✅ System state validation passed");
      } else {
        console.log("⚠️  System state validation issues found:");
        validation.issues.forEach(issue => console.log(`   - ${issue}`));
      }

      return validation.valid;
    } catch (error) {
      console.error("❌ System validation test failed:", error);
      return false;
    }
  }

  async testMigrationHistory() {
    console.log("\n📈 Testing migration history...");

    const actor = this.manager.getActor();
    if (!actor) throw new Error("Actor not initialized");

    try {
      const history = await actor.getMigrationHistory();
      console.log(`✅ Migration history contains ${history.length} entries`);

      if (history.length > 0) {
        const latest = history[history.length - 1];
        console.log(`   Latest: v${latest.fromVersion.major}.${latest.fromVersion.minor}.${latest.fromVersion.patch} → v${latest.toVersion.major}.${latest.toVersion.minor}.${latest.toVersion.patch}`);
        console.log(`   Success: ${latest.success}`);
        console.log(`   Logs: ${latest.logs.length} entries`);
      }

      return true;
    } catch (error) {
      console.error("❌ Migration history test failed:", error);
      return false;
    }
  }

  async testMigrationExecution() {
    console.log("\n🚀 Testing migration execution...");

    const actor = this.manager.getActor();
    if (!actor) throw new Error("Actor not initialized");

    try {
      // Test migration to a newer version
      const targetVersion: Version = { major: 2, minor: 1, patch: 0 };

      console.log(`   Attempting migration to v${targetVersion.major}.${targetVersion.minor}.${targetVersion.patch}...`);

      const result = await actor.performDataMigration(targetVersion, true);

      if (result.success) {
        console.log("✅ Migration executed successfully");
        console.log(`   Checksum: ${result.checksum || 'N/A'}`);
        console.log(`   Logs: ${result.logs.length} entries`);

        // Show some logs
        result.logs.slice(0, 3).forEach(log => console.log(`     - ${log}`));
        if (result.logs.length > 3) {
          console.log(`     ... and ${result.logs.length - 3} more`);
        }
      } else {
        console.log("❌ Migration failed");
        result.logs.forEach(log => console.log(`     - ${log}`));
      }

      return result.success;
    } catch (error) {
      console.error("❌ Migration execution test failed:", error);
      return false;
    }
  }

  async testEmergencyRollback() {
    console.log("\n🔄 Testing emergency rollback...");

    const actor = this.manager.getActor();
    if (!actor) throw new Error("Actor not initialized");

    try {
      // Test rollback to previous version
      const rollbackVersion: Version = { major: 2, minor: 0, patch: 0 };

      console.log(`   Attempting rollback to v${rollbackVersion.major}.${rollbackVersion.minor}.${rollbackVersion.patch}...`);

      const result = await actor.emergencyRollback(rollbackVersion);

      if (result.success) {
        console.log("✅ Emergency rollback executed successfully");
        console.log(`   Logs: ${result.logs.length} entries`);

        result.logs.forEach(log => console.log(`     - ${log}`));
      } else {
        console.log("❌ Emergency rollback failed");
        result.logs.forEach(log => console.log(`     - ${log}`));
      }

      return result.success;
    } catch (error) {
      console.error("❌ Emergency rollback test failed:", error);
      return false;
    }
  }

  async runFullTestSuite() {
    console.log("🏢 Enhanced Orthogonal Persistence Migration Test Suite");
    console.log("=====================================================");

    const results = {
      eop: false,
      validation: false,
      history: false,
      migration: false,
      rollback: false
    };

    try {
      results.eop = await this.testEnhancedOrthogonalPersistence();
      results.validation = await this.testSystemValidation();
      results.history = await this.testMigrationHistory();
      results.migration = await this.testMigrationExecution();
      results.rollback = await this.testEmergencyRollback();

      console.log("\n📊 Test Results Summary:");
      console.log("========================");
      console.log(`Enhanced Orthogonal Persistence: ${results.eop ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`System Validation: ${results.validation ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Migration History: ${results.history ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Migration Execution: ${results.migration ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Emergency Rollback: ${results.rollback ? '✅ PASS' : '❌ FAIL'}`);

      const passCount = Object.values(results).filter(Boolean).length;
      const totalTests = Object.keys(results).length;

      console.log(`\n🎯 Overall Result: ${passCount}/${totalTests} tests passed`);

      if (passCount === totalTests) {
        console.log("🎉 All migration tests PASSED! System is ready for production.");
      } else {
        console.log("⚠️  Some tests FAILED. Please review the implementation.");
      }

      return passCount === totalTests;

    } catch (error) {
      console.error("❌ Test suite execution failed:", error);
      return false;
    }
  }
}

async function main() {
  const tester = new MigrationTester();

  try {
    await tester.init();
    const success = await tester.runFullTestSuite();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error("💥 Test initialization failed:", error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}