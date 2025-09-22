# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Context Registry - A Motoko-based Internet Computer canister that manages seasonal name registrations, file references, and user access control. This system allows users to register names during active seasons and associate metadata/content with their registered names.

## Essential Commands

### Development Workflow
```bash
# Deploy the canister (requires dfx to be installed)
dfx deploy

# Start local IC replica (if needed)
dfx start --background

# Generate Candid interface
dfx generate

# Check canister status
dfx canister status --all

# Stop replica
dfx stop
```

### Testing
```bash
# Deploy and test using dfx canister call
dfx canister call main initializeAccessControl

# Example: Create a season (admin only)
dfx canister call main createSeason '("Season 1", 1234567890, 1234567999, 100, 3, 20, 1000000)'

# Example: Register a name (user only, during active season)
dfx canister call main registerName '("myname", "principal-id", variant { identity }, "owner-id", 0)'

# Get current time
dfx canister call main getCurrentTime
```

## Architecture Overview

### Core Components

1. **Main Actor** (`main.mo`):
   - Central registry managing seasons, name records, user profiles, and file references
   - Role-based access control system (admin/user/guest)
   - Season lifecycle management (draft → active → ended/cancelled)
   - Name registration with validation and ownership tracking
   - Metadata and markdown content storage
   - File reference tracking via Registry module

2. **Registry Module** (`registry.mo`):
   - File reference management with hash-based deduplication
   - Blob cleanup tracking for removed references
   - Authorization integration with external cashier service
   - Path-based file organization

3. **Access Control Module** (`access-control.mo`):
   - Three-tier role system: admin, user, guest
   - First caller becomes admin, subsequent callers become users
   - Permission-based access control for all operations
   - Anonymous caller handling (treated as guests)

### Key Data Structures

- **Season**: Time-bounded registration periods with configurable constraints
  - Status tracking (draft/active/ended/cancelled)
  - Name limits, length requirements, pricing
  - Time window enforcement
- **NameRecord**: Registered names with ownership and metadata
  - Links to seasons, addresses (canister/identity), timestamps
- **UserProfile**: Simple user information storage
- **FileReference**: Path-hash mapping for content management
- **Metadata/MarkdownContent**: Associated content for registered names

### Season Management Flow

1. **Admin creates season** in draft status with parameters (name limits, pricing, time window)
2. **Admin activates season** (only one active season allowed at a time)
3. **Users register names** during active season within time constraints
4. **Admin ends or cancels season** to close registration
5. **Content association** allows linking metadata/markdown to registered names

### Access Control Patterns

- **Initialize**: First caller becomes admin, others become users
- **Role Assignment**: Only admins can assign roles to other users
- **Permission Checks**: All operations validate caller permissions
- **Anonymous Handling**: Anonymous callers are treated as guests with limited access

### File Management Integration

- Registry module handles file path → hash mappings
- Supports blob cleanup tracking for storage optimization
- External authorization via cashier service integration
- Thread-safe operations using OrderedMap data structures

## Development Patterns

- **Role-based Security**: Always check permissions before state modifications
- **Season State Validation**: Enforce season lifecycle constraints
- **Ownership Tracking**: Maintain clear ownership chains for all records
- **Time-based Constraints**: Use IC time for consistent temporal logic
- **Error Handling**: Use Debug.trap() for validation failures with descriptive messages
- **State Persistence**: All data stored in stable variables (OrderedMaps)

## Making Changes to Deployed Canister

### 🚨 CRITICAL: Always Backup First
Before making ANY changes to a deployed canister with data:
```bash
npm run migrate backup
```

### Change Classification

**Safe Changes (use `npm run upgrade`):**
- Adding new public functions
- Adding optional fields to types (using `?Type`)
- Adding new variant cases to existing types
- Bug fixes that don't change function signatures
- Performance improvements

**Breaking Changes (require `npm run reinstall` + data migration):**
- Removing or renaming public functions
- Changing function signatures (parameters, return types)
- Adding required fields to existing types
- Removing fields from types
- Changing variant names or structure

### Standard Workflow for Changes

1. **Plan the change**: Determine if it's safe or breaking
2. **Backup data**: `npm run migrate backup`
3. **Make code changes** in `src/context-registry/`
4. **Choose deployment method**:
   - Safe: `npm run upgrade`
   - Breaking: `npm run reinstall` + manual data recreation
5. **Test thoroughly**: Verify all functions work and data is intact
6. **Update TypeScript types** in `src/index.ts` if needed
7. **Regenerate declarations**: `npm run generate`

### Example Safe Change - Adding New Function
```motoko
// Add to main.mo
public query func getSeasonCount() : async Nat {
  seasons.size();
};
```
Deploy with: `npm run upgrade`

### Example Breaking Change - Adding Required Field
```motoko
// Before
public type Season = { name : Text; };

// After (breaking)
public type Season = { name : Text; description : Text; };
```
Deploy with: `npm run reinstall` + recreate data

### Data Migration Strategies
- **Simple changes**: Use built-in backup/restore: `npm run migrate restore`
- **Complex changes**: Write custom migration scripts in `src/scripts/`
- **Production**: Consider converting to stable memory for safer upgrades

See [MIGRATION.md](./MIGRATION.md) for detailed migration workflows and examples.

## Important Notes

- Uses transient state (data lost on reinstall, preserved on upgrade)
- Uses thread-local OrderedMaps for efficient data management
- Imports use relative paths for local modules (`blob-storage/registry`, `authorization/access-control`)
- Season management prevents overlapping active periods
- Name registration includes comprehensive validation (length, uniqueness, season constraints)
- File reference system designed for content management integration
- For anything related to Internet Computer (ICP) use context7 to get documentation.