# DFX Admin Guide

Complete dfx command reference for administrators managing the Context Registry canister.

## Overview

This guide covers all dfx commands for administrative operations. For read-only status and monitoring, use the [CLI Reference](./cli.md).

## Quick Reference

### Admin Setup
```bash
# Initialize first admin (run once after deployment)
dfx canister call context_registry initializeAccessControl

# Check if you're admin
dfx canister call context_registry isCallerAdmin
```

## Season Management

### Create Season
```bash
# Direct season creation
dfx canister call context_registry createSeason \
  '("Season Name", startTimeNanoseconds, endTimeNanoseconds, maxNames, minLen, maxLen, price)'

# Example with timestamps
dfx canister call context_registry createSeason \
  '("Spring 2025", 1740816000000000000, 1748707200000000000, 100, 3, 20, 1000000)'
```

**Tip**: Use `npm run seasons add` to generate the exact dfx command with proper timestamp conversion.

### Activate Season
```bash
# Only one season can be active at a time
dfx canister call context_registry activateSeason '(1)'
```

### Manage Season Lifecycle
```bash
# End an active season
dfx canister call context_registry endSeason '(1)'

# Cancel an active season
dfx canister call context_registry cancelSeason '(1)'
```

## Admin Management

### Check Current Admins
```bash
# View all admin information
npm run status

# Get admin count
dfx canister call context_registry getAdminCount

# List all admin principals
dfx canister call context_registry getAllAdmins
```

### Add New Admins
```bash
# 1. Get the new admin's principal
dfx identity use new-admin-identity
dfx identity get-principal
# Save this principal

# 2. Switch back to existing admin
dfx identity use default

# 3. Assign admin role
dfx canister call context_registry assignCallerUserRole \
  '(principal "new-admin-principal-here", variant { admin })'

# 4. Verify new admin was added
npm run status
```

### User Role Management
```bash
# Assign different roles
dfx canister call context_registry assignCallerUserRole \
  '(principal "user-principal", variant { user })'

dfx canister call context_registry assignCallerUserRole \
  '(principal "guest-principal", variant { guest })'

# Available roles: admin, user, guest
```

## Development Workflow

### Daily Operations
```bash
# Morning check: Status overview
npm run status

# Check active seasons and registrations
npm run seasons

# Monitor wallet/identity
npm run wallet
```

### Season Deployment Process
```bash
# 1. Plan season parameters
# - Name and dates
# - Registration limits (max names, length limits)
# - Pricing

# 2. Create season using CLI helper
npm run icphub seasons add "Season Name" "Start Date" "End Date" maxNames minLen maxLen price

# 3. Execute generated DFX command
# (Copy-paste from CLI output)

# 4. Verify creation
npm run seasons

# 5. Activate when ready
dfx canister call context_registry activateSeason '(seasonId)'

# 6. Monitor registrations
npm run status
```

### Backup and Migration
```bash
# Create backup before major changes
npm run migrate backup

# List available backups
npm run migrate list

# For upgrades (v1.0.0+), data persists automatically
npm run upgrade

# Verify after upgrade
npm run status
```

## Monitoring and Maintenance

### Health Checks
```bash
# Complete system status
npm run status

# Check version and upgrade info
dfx canister call context_registry getCanisterVersion
dfx canister call context_registry getUpgradeInfo

# Verify admin access
dfx canister call context_registry isCallerAdmin
```

### Performance Monitoring
```bash
# Check current registrations
npm run seasons

# Monitor file references
dfx canister call context_registry listFileReferences

# Check user activity
dfx canister call context_registry listNameRecords
```

### Troubleshooting

#### CLI Shows "Admin Access: ❌"
```bash
# This is normal - CLI runs anonymously
# Verify DFX admin access instead:
dfx canister call context_registry isCallerAdmin
# Should return: (true)
```

#### Season Activation Fails
```bash
# Check season status
npm run seasons

# Verify you're admin
dfx canister call context_registry isCallerAdmin

# Ensure no other season is active
# Only one season can be active at a time
```

#### User Registration Issues
```bash
# Check season is active and within time window
npm run seasons

# Verify season parameters (name length, etc.)
dfx canister call context_registry getSeason '(seasonId)'

# Check registration count vs. limit
dfx canister call context_registry getActiveSeasonInfo
```

#### Lost Admin Access
```bash
# If admin access is lost, you may need to:
# 1. Backup data
npm run migrate backup

# 2. Reinstall canister
npm run reinstall

# 3. Reinitialize admin
dfx canister call context_registry initializeAccessControl

# 4. Restore data if needed
npm run migrate restore backups/latest-backup.json
```

## Best Practices

### Security
1. **Always verify admin status** before attempting admin operations
2. **Use separate identities** for different admin roles
3. **Regular backup** before major changes
4. **Monitor admin list** periodically

### Operations
1. **Test season parameters** carefully before activation
2. **One active season** at a time policy
3. **Document season purposes** and timelines
4. **Monitor registration activity** during active seasons

### Development
1. **Use CLI for status checks** (faster, user-friendly)
2. **Use DFX for admin operations** (required for permissions)
3. **Version tracking** with upgrade info
4. **Backup before upgrades** (optional with v1.1.0+ but recommended)

## Command Cheat Sheet

| Task | Command |
|------|---------|
| **Status Check** | `npm run status` |
| **List Seasons** | `npm run seasons` |
| **Check Wallet** | `npm run wallet` |
| **Am I Admin?** | `dfx canister call context_registry isCallerAdmin` |
| **Create Season** | `npm run icphub seasons add` (generates DFX command) |
| **Activate Season** | `dfx canister call context_registry activateSeason '(id)'` |
| **End Season** | `dfx canister call context_registry endSeason '(id)'` |
| **Add Admin** | `dfx canister call context_registry assignCallerUserRole '(principal, variant { admin })'` |
| **Backup Data** | `npm run migrate backup` |
| **Upgrade Canister** | `npm run upgrade` |

## Emergency Procedures

### Complete System Reset
```bash
# 1. Backup everything
npm run migrate backup

# 2. Fresh deployment
npm run deploy:fresh

# 3. Reinitialize admin
dfx canister call context_registry initializeAccessControl

# 4. Restore data if possible
npm run migrate restore backups/latest-backup.json
```

### Quick Admin Recovery
```bash
# If locked out but have backup
npm run migrate backup
npm run reinstall
dfx canister call context_registry initializeAccessControl
npm run migrate restore backups/latest-backup.json
```

Remember: The CLI is designed for monitoring and status checks, while DFX provides full administrative control. Use both tools complementarily for the best management experience.