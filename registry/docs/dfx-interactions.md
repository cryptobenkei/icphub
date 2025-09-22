# DFX Command Reference

This guide covers all direct `dfx` commands for interacting with the Context Registry canister.

## Prerequisites

Ensure DFX is running and you have admin access:
```bash
dfx start --background
dfx canister call context_registry initializeAccessControl
```

## Admin Management

### Initialize Admin (First Time Setup)
```bash
# The first caller becomes admin
dfx canister call context_registry initializeAccessControl
```

### Check Admin Status
```bash
# Check if you are admin
dfx canister call context_registry isCallerAdmin

# Get admin count
dfx canister call context_registry getAdminCount

# List all admins
dfx canister call context_registry getAllAdmins

# Get first admin principal
dfx canister call context_registry getAdminPrincipal
```

### Add Additional Admins
```bash
# Get principal of user to promote
dfx identity use alice
dfx identity get-principal
# Output: xkbqi-xgbqt-cgevp-yjlnu-x3p4s-to65n-dr2wh-ennkl-ziimm-isxfk-uae

# Switch back to admin identity
dfx identity use default

# Assign admin role
dfx canister call context_registry assignCallerUserRole \
  '(principal "xkbqi-xgbqt-cgevp-yjlnu-x3p4s-to65n-dr2wh-ennkl-ziimm-isxfk-uae", variant { admin })'
```

## Season Management

### Create Seasons
```bash
# Create a new season
dfx canister call context_registry createSeason \
  '("Season Name", startTimeNanoseconds, endTimeNanoseconds, maxNames, minNameLength, maxNameLength, priceTokens)'

# Example: Create "Spring 2025" season
dfx canister call context_registry createSeason \
  '("Spring 2025", 1740816000000000000, 1748707200000000000, 100, 3, 20, 1000000)'
```

**Time Conversion Helper:**
- Use online tools to convert dates to nanoseconds
- Or use JavaScript: `new Date("2025-03-01T09:00:00Z").getTime() * 1000000`

### Season Lifecycle
```bash
# Activate a season (only one can be active at a time)
dfx canister call context_registry activateSeason '(1)'

# End an active season
dfx canister call context_registry endSeason '(1)'

# Cancel an active season
dfx canister call context_registry cancelSeason '(1)'
```

### Query Seasons
```bash
# List all seasons
dfx canister call context_registry listSeasons

# Get specific season
dfx canister call context_registry getSeason '(1)'

# Get currently active season
dfx canister call context_registry getActiveSeason

# Get active season info with availability
dfx canister call context_registry getActiveSeasonInfo
```

## Name Registration

### Register Names (User Permission Required)
```bash
# Register a name during active season
dfx canister call context_registry registerName \
  '("myname", "principal-or-canister-id", variant { identity }, "owner-principal", 1)'

# Address types: variant { identity } or variant { canister }
```

### Query Name Records
```bash
# Get specific name record
dfx canister call context_registry getNameRecord '("myname")'

# List all name records
dfx canister call context_registry listNameRecords

# Check if owner has registered name
dfx canister call context_registry hasRegisteredName '("owner-principal")'
```

## User Profile Management

### Manage Profiles
```bash
# Save your user profile
dfx canister call context_registry saveCallerUserProfile '(record { name = "Alice" })'

# Get your profile
dfx canister call context_registry getCallerUserProfile

# Get another user's profile
dfx canister call context_registry getUserProfile '(principal "user-principal")'
```

## File Reference Management

### Register File References (User Permission Required)
```bash
# Register a file reference
dfx canister call context_registry registerFileReference '("/path/to/file", "file-hash")'

# Remove a file reference
dfx canister call context_registry dropFileReference '("/path/to/file")'
```

### Query File References
```bash
# Get specific file reference
dfx canister call context_registry getFileReference '("/path/to/file")'

# List all file references
dfx canister call context_registry listFileReferences
```

## Metadata and Content

### Save Metadata and Content
```bash
# Save metadata for a name
dfx canister call context_registry saveMetadata \
  '("myname", "Title", "Description", "image-url")'

# Save markdown content for a name
dfx canister call context_registry saveMarkdown \
  '("myname", "# My Content\nThis is markdown content")'
```

### Query Metadata and Content
```bash
# Get metadata for a name
dfx canister call context_registry getMetadata '("myname")'

# Get markdown content for a name
dfx canister call context_registry getMarkdown '("myname")'
```

## System Information

### Canister Info
```bash
# Get current time (IC time in nanoseconds)
dfx canister call context_registry getCurrentTime

# Get canister version
dfx canister call context_registry getCanisterVersion

# Get upgrade information (v1.0.0+)
dfx canister call context_registry getUpgradeInfo

# Get canister principal
dfx canister call context_registry getCanisterPrincipal
```

### User Role Management
```bash
# Get your current role
dfx canister call context_registry getCallerUserRole

# Assign role to user (admin only)
dfx canister call context_registry assignCallerUserRole \
  '(principal "user-principal", variant { user })'

# Available roles: variant { admin }, variant { user }, variant { guest }
```

## Common Patterns

### Complete Season Setup
```bash
# 1. Create season
SEASON_ID=$(dfx canister call context_registry createSeason \
  '("My Season", 1740816000000000000, 1748707200000000000, 100, 3, 20, 1000000)' | grep -o '[0-9]*')

# 2. Activate season
dfx canister call context_registry activateSeason "(${SEASON_ID})"

# 3. Verify activation
dfx canister call context_registry getActiveSeason
```

### User Registration Flow
```bash
# 1. User saves profile
dfx canister call context_registry saveCallerUserProfile '(record { name = "Alice" })'

# 2. User registers name in active season
dfx canister call context_registry registerName \
  '("alice", "alice-principal-id", variant { identity }, "alice-principal-id", 1)'

# 3. User adds metadata
dfx canister call context_registry saveMetadata \
  '("alice", "Alice Profile", "My personal profile", "https://example.com/alice.jpg")'
```

## Error Handling

### Common Errors and Solutions

**"Unauthorized: Only admins can..."**
- Ensure you're using an admin identity
- Check: `dfx canister call context_registry isCallerAdmin`

**"Season not found"**
- Verify season ID exists: `dfx canister call context_registry listSeasons`

**"Season is not active"**
- Check season status and activate if needed
- Only one season can be active at a time

**"Name already registered"**
- Names must be unique across all seasons
- Check existing names: `dfx canister call context_registry listNameRecords`

**"User is not registered"**
- Initialize access control first: `dfx canister call context_registry initializeAccessControl`
- User needs to be assigned a role by an admin

## Tips

1. **Use shell variables** for long principals and repeated values
2. **Check permissions first** before attempting admin operations
3. **Verify season state** before registration attempts
4. **Use `jq` for JSON formatting**: `dfx canister call ... | jq`
5. **Test on local replica** before mainnet deployment