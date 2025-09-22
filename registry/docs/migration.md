# Migration Guide

This guide explains how to safely migrate the Context Registry canister using Enhanced Orthogonal Persistence (EOP) and the comprehensive migration script.

## Overview

The Context Registry uses Enhanced Orthogonal Persistence (EOP) to enable safe canister upgrades without data loss. The migration system provides:

- **Automated verification** of migration compatibility
- **Comprehensive backup** of both filesystem and canister data
- **Rollback capabilities** for failed migrations
- **Post-migration verification** to ensure functionality

## Quick Start

### Full Migration (Recommended)

```bash
npm run migrate
```

This performs a complete migration with all verifications, backups, and rollback capabilities.

### Other Commands

```bash
# Create backups only
npm run migrate backup

# Restore data from backup
npm run migrate restore backups/data-backup-2024-01-01T12-00-00-000Z.json

# List available backups
npm run migrate list

# Verify current deployment
npm run migrate verify
```

## Migration Process

### 1. Pre-Migration Checks

The migration script performs several safety checks:

- **Git Status Check**: Warns about uncommitted changes
- **Migration Function Detection**: Ensures EOP or migration functions exist
- **Build Compatibility**: Verifies the code compiles successfully

### 2. Backup Creation

Two types of backups are created:

**Filesystem Backup** (`fs-backup-{timestamp}/`):
- Source code (`src/`)
- DFX state (`.dfx/`)
- Configuration files (`dfx.json`, `package.json`)
- Environment variables (`.env`)

**Canister Data Backup** (`data-backup-{timestamp}.json`):
- Seasons
- Name records
- File references
- User profiles (when available)
- Metadata and markdown content

### 3. Migration Execution

- Deploys canister with `--mode upgrade`
- Uses Enhanced Orthogonal Persistence for state preservation
- Automatically handles data migration

### 4. Post-Migration Verification

- Checks canister status (must be "Running")
- Tests basic functionality (`getCurrentTime` call)
- Validates that the upgrade succeeded

### 5. Rollback (If Needed)

If migration fails:
- Automatically restores filesystem from backup
- Restarts DFX replica
- Reports rollback status

## Enhanced Orthogonal Persistence (EOP)

The canister uses EOP which provides:

- **Automatic state preservation** across upgrades
- **No preupgrade/postupgrade hooks** (eliminates risk of permanent locks)
- **Type-safe migrations** when changing data structures
- **Built-in rollback** capabilities

### EOP Configuration

The system is configured in `dfx.json`:

```json
{
  "canisters": {
    "context_registry": {
      "type": "motoko",
      "main": "src/context-registry/main.mo",
      "args": ["--enhanced-orthogonal-persistence"]
    }
  }
}
```

## Migration Patterns

### Safe Changes (Use `npm run migrate`)

These changes preserve existing data:

- Adding new public functions
- Adding optional fields to types (`?Type`)
- Adding new variant cases
- Bug fixes without signature changes
- Performance improvements

### Breaking Changes (Require Special Handling)

These changes may require custom migration logic:

- Removing public functions
- Changing function signatures
- Adding required fields to existing types
- Removing fields from types
- Changing variant structure

## Backup Management

### Backup Structure

```
backups/
├── fs-backup-{timestamp}/        # Filesystem backup
│   ├── .dfx/                     # DFX state
│   ├── src/                      # Source code
│   ├── dfx.json                  # DFX configuration
│   ├── package.json              # Package configuration
│   └── .env                      # Environment variables
└── data-backup-{timestamp}.json  # Canister data backup
```

### Backup Retention

Backups are not automatically cleaned up. To manage disk space:

```bash
# List all backups
npm run migrate list

# Manually remove old backups
rm -rf backups/fs-backup-2024-01-01T12-00-00-000Z
rm backups/data-backup-2024-01-01T12-00-00-000Z.json
```

## Troubleshooting

### Build Failures

If the migration script reports build failures:

```bash
# Check compilation errors
dfx build

# Fix Motoko syntax errors
# Re-run migration
npm run migrate
```

### Migration Function Warnings

If you see "No migration function found" warnings:

1. **For EOP** (current setup): This is normal - EOP handles migration automatically
2. **For custom migrations**: Add `with migration` patterns to your Motoko code

### Rollback Failures

If automatic rollback fails:

1. **Manual filesystem restore**:
   ```bash
   dfx stop
   cp -r backups/fs-backup-{timestamp}/* ./
   dfx start --background
   ```

2. **Manual data restore**:
   ```bash
   npm run migrate restore backups/data-backup-{timestamp}.json
   ```

### Canister Not Running

If post-migration verification fails:

```bash
# Check canister status
dfx canister status context_registry

# Restart if needed
dfx stop
dfx start --background
dfx deploy --mode upgrade
```

## Best Practices

### Before Migration

1. **Commit your changes** to git
2. **Test in development** environment first
3. **Review code changes** for compatibility
4. **Ensure dfx is running** (`dfx start --background`)

### During Migration

1. **Don't interrupt** the migration process
2. **Monitor logs** for errors or warnings
3. **Keep terminal open** until completion

### After Migration

1. **Verify functionality** with test calls
2. **Check data integrity** with list commands
3. **Keep backups** until verified stable
4. **Update documentation** if needed

## Integration with Development Workflow

### Typical Development Cycle

```bash
# 1. Make code changes
vim src/context-registry/main.mo

# 2. Test locally
dfx build
dfx deploy --mode reinstall  # For development

# 3. When ready for production upgrade
npm run migrate
```

### CI/CD Integration

The migration script can be integrated into CI/CD pipelines:

```bash
# In CI/CD script
if [ "$ENVIRONMENT" = "production" ]; then
  npm run migrate
else
  dfx deploy --mode reinstall
fi
```

## Emergency Procedures

### Complete System Recovery

If everything fails and you need to start fresh:

1. **Stop all processes**:
   ```bash
   dfx stop
   ```

2. **Restore from latest backup**:
   ```bash
   cp -r backups/fs-backup-{latest}/* ./
   ```

3. **Clean restart**:
   ```bash
   dfx start --background --clean
   dfx deploy
   ```

4. **Restore data**:
   ```bash
   npm run migrate restore backups/data-backup-{latest}.json
   ```

### Data Recovery Only

If the canister is running but data is corrupted:

```bash
# Reinstall canister (clears data)
dfx deploy --mode reinstall

# Restore data from backup
npm run migrate restore backups/data-backup-{timestamp}.json
```

## Advanced Usage

### Custom Migration Scripts

For complex migrations, you can extend the base migration script:

```typescript
// src/scripts/custom-migrate.ts
import { MigrationOrchestrator } from './migrate';

class CustomMigration extends MigrationOrchestrator {
  // Override methods for custom behavior
}
```

### Manual Verification Steps

After migration, manually verify:

```bash
# Check seasons
dfx canister call context_registry listSeasons

# Check name records
dfx canister call context_registry listNameRecords

# Check file references
dfx canister call context_registry listFileReferences

# Test functionality
dfx canister call context_registry getCurrentTime
```

## Migration History

Keep track of migrations for audit purposes:

```bash
# Create migration log
echo "$(date): Migration from v1.0 to v1.1 - Added user profiles" >> docs/migration-history.md
```

This comprehensive migration system ensures safe, reliable upgrades while minimizing downtime and data loss risks.