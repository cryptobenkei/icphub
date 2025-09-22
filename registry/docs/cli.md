# CLI Reference

Simple CLI interface for the ICP Hub Context Registry.

## Quick Commands

```bash
# Status and information
npm run status          # Show canister status, admins, seasons overview
npm run wallet          # Show wallet info, balance, admin status
npm run seasons         # List all seasons with details

# Season details
npm run season 1 status # Show specific season status

# Admin management
npm run admins          # List all admins
npm run admins add "principal-id"      # Show dfx command to add admin
npm run admins remove "principal-id"   # Show dfx command to remove admin

# Name management
npm run name "testname"           # Show name status and documents
npm run name "testname" metadata # Show metadata content
npm run name "testname" markdown # Show markdown content
npm run name "testname" did      # Show DID file
npm run name add "name" "user-id" # Show dfx command to register name

# Season creation helper
npm run seasons add "Spring 2025" "01/03/2025 09:00" "31/05/2025 18:00" 100 3 20 1000000
# Generates dfx command for season creation

# Migration and backup
npm run migrate              # Full migration with all checks
npm run migrate backup       # Create backups only
npm run migrate restore file # Restore data from backup file
npm run migrate list         # List available backup files
npm run migrate verify       # Verify current deployment

# Help
npm run icphub --help   # Full help and examples
```

## Date Formats

- `"DD/MM/YYYY HH:MM"` - e.g., "20/09/2025 09:00"
- `"YYYY-MM-DD HH:MM"` - e.g., "2025-09-20 09:00"

## Migration System

The `npm run migrate` command provides comprehensive canister upgrade capabilities:

- **Pre-migration checks**: Git status, migration functions, build compatibility
- **Automatic backups**: Both filesystem and canister data
- **Safe upgrades**: Using Enhanced Orthogonal Persistence (EOP)
- **Rollback capabilities**: Automatic restoration on failure
- **Post-migration verification**: Ensures upgrade success

For detailed migration information, see the [Migration Guide](./migration.md).

## Notes

- CLI provides **read-only** access and **command generation**
- Admin operations require dfx commands (CLI shows the exact commands to run)
- All output is kept minimal for easy scanning
- Migration commands require proper dfx setup and canister deployment
- For complete admin operations, see the [DFX Admin Guide](./dfx-admin-guide.md)