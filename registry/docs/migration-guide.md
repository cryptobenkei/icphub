# Migration Guide

Complete guide for upgrading and migrating the Context Registry canister with the enhanced stable variable system.

## 🎉 Enhanced Migration System (v1.0.0+)

Starting from version 1.0.0, the Context Registry uses **Enhanced Orthogonal Persistence** with automatic migration:

### ✅ What Changed
- **Automatic data persistence** across upgrades
- **Version tracking** with semantic versioning (major.minor.patch)
- **Migration functions** that run automatically during upgrades
- **preupgrade/postupgrade** system functions for data safety

### 🔄 How Migrations Work
1. **preupgrade**: Saves all data to stable variables before upgrade
2. **Code replacement**: New canister code is deployed
3. **postupgrade**: Runs migration functions based on version changes
4. **Data restoration**: Working variables are populated from stable storage

## 🚨 Backup Strategy

### v1.0.0+ (Enhanced Orthogonal Persistence)
```bash
# Optional: Backup for extra safety (auto-migration handles data)
npm run migrate backup
```

### Pre-v1.0.0 (Transient State)
```bash
# MANDATORY: Backup before any changes
npm run migrate backup
```

## Understanding Canister State

### v1.0.0+ Enhanced Orthogonal Persistence System
- ✅ **Data persists automatically** on canister upgrade
- ✅ **Data persists automatically** on canister reinstall (with compatible migrations)
- 🔄 **Automatic version-based migrations**
- 📊 **State includes**: seasons, name records, user profiles, file references, metadata, version info

### Legacy Transient System (pre-v1.0.0)
- ⚠️ **All data is lost on canister reinstall**
- ✅ **Data persists on canister upgrade** (when possible)
- 📊 **State includes**: seasons, name records, user profiles, file references, metadata

## Quick Commands Reference

### 🔄 Development Workflow
```bash
# Start fresh (loses all data)
npm run deploy:fresh

# Complete reset (removes everything)
npm run reset

# Nuclear option (removes dependencies too)
npm run nuke
```

### 🛡️ Safe Upgrades (v1.0.0+)
```bash
# Check current version
npm run status

# Optional: Backup for extra safety
npm run migrate backup

# Upgrade canister (auto-preserves data with stable variables)
npm run upgrade

# Verify upgrade and check new version
npm run status

# Test functionality
npm run seasons
```

### 🛡️ Legacy Safe Upgrades (pre-v1.0.0)
```bash
# MANDATORY: Backup data before upgrading
npm run migrate backup

# Upgrade canister (preserves data if compatible)
npm run upgrade

# If upgrade fails, reinstall with data restoration
npm run reinstall
npm run migrate restore backups/latest-backup.json
```

### 📦 Migration Commands
```bash
# Create backup of current data
npm run migrate backup

# List available backups
npm run migrate list

# Restore from specific backup
npm run migrate restore backups/backup-xxx.json

# Safe upgrade workflow (includes backup + upgrade + verification)
npm run migrate safe-upgrade
```

## Step-by-Step Migration Scenarios

### Scenario 1: Regular Upgrade (v1.0.0+)

**Adding new features, bug fixes, compatible changes**

```bash
# 1. Check current state
npm run status

# 2. Optional: Create backup for extra safety
npm run migrate backup

# 3. Make your code changes
# Edit src/context-registry/main.mo

# 4. Deploy upgrade
npm run upgrade

# 5. Verify new version and functionality
npm run status
npm run seasons

# 6. Test new features
# (No data restoration needed!)
```

### Scenario 2: Version Migration from Legacy System

**Upgrading from pre-v1.0.0 to v1.0.0+**

```bash
# 1. Check what data needs preserving
npm run status
npm run seasons

# 2. Create backup (MANDATORY for legacy system)
npm run migrate backup

# 3. Deploy new stable variable system (requires reinstall)
echo "yes" | dfx deploy --mode reinstall context_registry

# 4. Reinitialize admin
dfx canister call context_registry initializeAccessControl

# 5. Restore data using migration script
npm run migrate restore backups/latest-backup.json

# 6. Verify data integrity
npm run status
npm run seasons
```

### Scenario 3: Breaking Changes (Rare)

**Structural changes requiring careful migration**

```bash
# 1. Plan the migration carefully
# - Document what's changing
# - Prepare data transformation scripts if needed

# 2. Create comprehensive backup
npm run migrate backup

# 3. Test migration on local replica first
dfx start --clean
dfx deploy
# ... test migration process

# 4. Deploy to production
echo "yes" | dfx deploy --mode reinstall context_registry

# 5. Reinitialize and restore
dfx canister call context_registry initializeAccessControl
npm run migrate restore backups/backup-xxx.json

# 6. Verify and test thoroughly
npm run status
# ... comprehensive testing
```

## Version Management

### Checking Versions
```bash
# Current canister version
npm run status

# Detailed version info
dfx canister call context_registry getCanisterVersion

# Upgrade information (v1.0.0+)
dfx canister call context_registry getUpgradeInfo
```

### Version Numbering
- **Major** (X.0.0): Breaking changes, may require special migration
- **Minor** (0.X.0): New features, backward compatible
- **Patch** (0.0.X): Bug fixes, no breaking changes

### Migration Triggers
The system automatically runs migrations when:
- Upgrading from lower to higher version
- Specific version milestones are crossed
- Custom migration logic is defined

## Data Backup and Restore

### Backup Best Practices
```bash
# Regular backups (optional with v1.1.0+)
npm run migrate backup

# Pre-upgrade backup (recommended)
npm run migrate backup

# Critical backup before breaking changes
npm run migrate backup
```

### Backup Contents
- All seasons with full metadata
- All name records and registrations
- User profiles and role assignments
- File references and metadata
- Access control configuration
- Version information

### Restore Process
```bash
# List available backups
npm run migrate list

# Restore specific backup
npm run migrate restore backups/backup-2025-09-22T11-04-48-888Z.json

# Verify restoration
npm run status
npm run seasons
```

## Migration System Internal Details

### Stable Variables
```motoko
// Data that persists across upgrades
var stableSeasons : [(Nat, Season)] = [];
var stableNameRecords : [(Text, NameRecord)] = [];
var stableUserProfiles : [(Principal, UserProfile)] = [];
var stableVersion : Version = CURRENT_VERSION;
// ... etc
```

### Migration Hooks
```motoko
system func preupgrade() {
  // Automatically save all data to stable variables
  Debug.print("[UPGRADE] Starting preupgrade...");
  stableSeasons := Iter.toArray(natMap.entries(seasons));
  // ... save all working data
}

system func postupgrade() {
  // Run version-based migrations
  Debug.print("[UPGRADE] Starting postupgrade...");
  runMigrations(stableVersion, CURRENT_VERSION);
  stableVersion := CURRENT_VERSION;
}
```

### Migration Functions
```motoko
private func runMigrations(fromVersion : Version, toVersion : Version) {
  // Conditional migration logic based on version changes
  if (compareVersions(fromVersion, { major = 1; minor = 1; patch = 0 }) < 0) {
    Debug.print("[MIGRATION] Running migration to 1.1.0");
    // Migration logic here
  };
}
```

## Troubleshooting

### Common Migration Issues

**"Missing upgrade option" Error**
```bash
# This indicates breaking changes requiring reinstall
npm run migrate backup
echo "yes" | dfx deploy --mode reinstall context_registry
dfx canister call context_registry initializeAccessControl
npm run migrate restore backups/latest-backup.json
```

**Data Not Found After Upgrade**
```bash
# Check if migration completed successfully
npm run status

# Verify version updated
dfx canister call context_registry getCanisterVersion

# Check upgrade logs
dfx canister logs context_registry
```

**Backup Restoration Fails**
```bash
# Verify backup file integrity
npm run migrate list

# Try with different backup
npm run migrate restore backups/previous-backup.json

# Manual verification
npm run status
```

**Admin Access Lost**
```bash
# Reinitialize admin (only works if no admins exist)
dfx canister call context_registry initializeAccessControl

# Or restore from backup that includes admin data
npm run migrate restore backups/latest-backup.json
```

### Emergency Recovery

**Complete System Recovery**
```bash
# 1. Stop everything
dfx stop

# 2. Clean start
dfx start --clean --background

# 3. Fresh deployment
dfx deploy

# 4. Initialize admin
dfx canister call context_registry initializeAccessControl

# 5. Restore from last known good backup
npm run migrate restore backups/last-known-good.json
```

## Best Practices

### Planning
1. **Version planning**: Plan breaking changes carefully
2. **Testing**: Always test migrations on local replica first
3. **Communication**: Notify users of maintenance windows
4. **Documentation**: Document migration procedures and changes

### Execution
1. **Backup first**: Always backup before any changes
2. **Verify state**: Check system status before and after
3. **Gradual rollout**: Test on staging before production
4. **Monitor closely**: Watch for issues after migration

### Maintenance
1. **Regular backups**: Even with stable variables, backup regularly
2. **Version tracking**: Monitor version progression
3. **Clean up**: Remove old backups periodically
4. **Test restore**: Periodically test backup restoration

## Migration Checklist

### Pre-Migration
- [ ] Check current system status
- [ ] Create fresh backup
- [ ] Test migration on local replica
- [ ] Notify stakeholders if needed
- [ ] Verify admin access

### During Migration
- [ ] Execute migration commands
- [ ] Monitor for errors
- [ ] Verify admin reinitialization
- [ ] Restore data if needed
- [ ] Check version updated correctly

### Post-Migration
- [ ] Verify all data integrity
- [ ] Test critical functionality
- [ ] Check admin access works
- [ ] Verify seasons and registrations
- [ ] Run comprehensive tests
- [ ] Update documentation if needed

The enhanced migration system makes upgrades much safer and more reliable, but following these procedures ensures smooth operations even in complex scenarios.