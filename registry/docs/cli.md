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
npm run seasons add "Spring 2025" "01/03/2025 09:00" "31/05/2025 18:00" 100 3 20 200000000
# Generates dfx command for season creation (2.0 ICP per name)

# Migration and backup
npm run migrate              # Full migration with all checks
npm run migrate backup       # Create backups only
npm run migrate restore file # Restore data from backup file
npm run migrate list         # List available backup files
npm run migrate verify       # Verify current deployment

# Help
npm run icphub --help   # Full help and examples
```

## Season Creation

The `seasons add` command helps you create new registration seasons with comprehensive validation and parameter checking.

### Syntax
```bash
npm run seasons add <name> <start> <end> <maxNames> <minLen> <maxLen> <price>
```

### Season Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| **name** | Text | Human-readable season name | `"Spring 2025"` |
| **start** | DateTime | Season start date and time | `"01/03/2025 09:00"` |
| **end** | DateTime | Season end date and time | `"31/05/2025 18:00"` |
| **maxNames** | Number | Maximum names that can be registered | `100` |
| **minLen** | Number | Minimum allowed name length (characters) | `3` |
| **maxLen** | Number | Maximum allowed name length (characters) | `20` |
| **price** | Number | Registration price in tokens | `1000000` |

### Season Lifecycle

**Seasons follow a strict lifecycle:**

1. **Draft** → Created but not accepting registrations
2. **Active** → Open for name registrations (only one active season allowed)
3. **Ended** → Registration period completed
4. **Cancelled** → Season terminated before completion

### Field Details

**Name**: Descriptive identifier for the season
- Used in UI displays and admin management
- Should be descriptive and unique
- Examples: "Spring 2025", "Genesis Launch", "Q1 Registration"

**Time Window**: Registration period boundaries
- Uses IC time (nanoseconds since Unix epoch)
- Names can only be registered during active period
- End time must be after start time
- CLI validates time ranges and calculates duration

**Name Limits**: Controls registration capacity and name format
- **maxNames**: Total registration slots available
- **minNameLength**: Prevents very short names (recommended: 3+)
- **maxNameLength**: Prevents very long names (recommended: 20-50)
- System enforces these limits during registration

**Price**: Registration cost per name
- Expressed in e8s (smallest ICP token units: 1 ICP = 100,000,000 e8s)
- Currently informational (payment integration pending)
- **Common ICP Price Examples**:
  - `200000000` = 2.0 ICP tokens (recommended for premium names)
  - `100000000` = 1.0 ICP token (standard pricing)
  - `50000000` = 0.5 ICP tokens (budget pricing)
  - `10000000` = 0.1 ICP tokens (promotional pricing)
  - `1000000` = 0.01 ICP tokens (test pricing)

### Complete Example

```bash
# Create a 3-month season with 100 slots for names 3-20 characters at 2.0 ICP per name
npm run seasons add "Spring 2025" "01/03/2025 09:00" "31/05/2025 18:00" 100 3 20 200000000

# Output shows the generated dfx command:
dfx canister call context_registry createSeason \
  '("Spring 2025", 1709280000000000000, 1717156800000000000, 100, 3, 20, 200000000)'

# Then activate it:
dfx canister call context_registry activateSeason '(1)'
```

### Validation

The CLI performs comprehensive validation:
- **Date validation**: Ensures proper format and chronological order
- **Duration calculation**: Shows season length in days
- **Parameter checks**: Validates numeric ranges
- **Admin verification**: Confirms you have admin privileges
- **Time zone handling**: Uses local time with UTC conversion

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