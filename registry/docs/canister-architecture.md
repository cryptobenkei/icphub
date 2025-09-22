# Canister Architecture

This document explains how the Context Registry canister works internally, its data structures, and system design.

## Overview

The Context Registry is a Motoko-based Internet Computer canister that manages seasonal name registrations with role-based access control, file references, and metadata storage.

## Core Architecture

### Actor Declaration
```motoko
persistent actor {
  // Stable variables (persist across upgrades)
  // Transient variables (reset on reinstall)
}
```

**Key Design Decisions:**
- Uses `persistent actor` for automatic stable variable handling
- Implements stable variable migration system (v1.1.0+)
- Separates stable storage from working variables for performance

## Data Structures

### Seasons
```motoko
public type Season = {
  id : Nat;
  name : Text;
  startTime : Int;          // IC time in nanoseconds
  endTime : Int;            // IC time in nanoseconds
  maxNames : Nat;           // Maximum registrations allowed
  minNameLength : Nat;      // Minimum name length
  maxNameLength : Nat;      // Maximum name length
  price : Nat;              // Price in tokens
  status : SeasonStatus;    // Current season state
  createdAt : Int;          // Creation timestamp
  updatedAt : Int;          // Last update timestamp
};

public type SeasonStatus = {
  #draft;      // Created but not activated
  #active;     // Currently accepting registrations
  #ended;      // Manually ended
  #cancelled;  // Cancelled (different from ended)
};
```

**Season Lifecycle:**
1. **Draft** → **Active** (via `activateSeason`)
2. **Active** → **Ended** (via `endSeason`)
3. **Active** → **Cancelled** (via `cancelSeason`)

**Business Rules:**
- Only one season can be active at a time
- Only draft seasons can be activated
- Only active seasons can be ended or cancelled
- Names can only be registered during active seasons within time window

### Name Records
```motoko
public type NameRecord = {
  name : Text;              // The registered name (unique)
  address : Text;           // Associated address/principal
  addressType : AddressType; // Type of address
  owner : Text;             // Owner principal
  seasonId : Nat;           // Which season this belongs to
  createdAt : Int;          // Registration timestamp
  updatedAt : Int;          // Last update timestamp
};

public type AddressType = {
  #canister;   // Address is a canister ID
  #identity;   // Address is a user principal
};
```

**Registration Rules:**
- Names must be unique across ALL seasons
- One registration per owner per season
- Name length must match season requirements
- Registration must occur within season time window

### User Management
```motoko
public type UserProfile = {
  name : Text;              // Display name
};
```

**Access Control:**
```motoko
public type UserRole = {
  #admin;      // Full access to all functions
  #user;       // Can register names, manage files
  #guest;      // Read-only access
};
```

**Permission Matrix:**
| Function | Admin | User | Guest |
|----------|-------|------|-------|
| Create/Manage Seasons | ✅ | ❌ | ❌ |
| Register Names | ✅ | ✅ | ❌ |
| Manage Files | ✅ | ✅ | ❌ |
| Save Metadata | ✅ | ✅ | ❌ |
| Read Operations | ✅ | ✅ | ✅ |

### File References
```motoko
public type FileReference = {
  path : Text;              // File path
  hash : Text;              // Content hash
};
```

Used for tracking file uploads and enabling cleanup of orphaned blobs.

### Metadata & Content
```motoko
public type Metadata = {
  title : Text;
  description : Text;
  image : Text;             // Image URL
  createdAt : Int;
  updatedAt : Int;
};

public type MarkdownContent = {
  content : Text;           // Markdown text
  updatedAt : Int;
};
```

Associates rich metadata and content with registered names.

## Storage Layer

### Stable Variables (v1.1.0+)
```motoko
// Persistent storage (survives upgrades)
var stableSeasons : [(Nat, Season)] = [];
var stableNameRecords : [(Text, NameRecord)] = [];
var stableNextSeasonId : Nat = 1;
var stableUserProfiles : [(Principal, UserProfile)] = [];
var stableMetadataStore : [(Text, Metadata)] = [];
var stableMarkdownStore : [(Text, MarkdownContent)] = [];
var stableRegistryData : [(Text, FileReference)] = [];
var stableAccessControlData : [(Principal, UserRole)] = [];
var stableAdminPrincipal : ?Principal = null;
var stableVersion : Version = CURRENT_VERSION;
```

### Working Variables
```motoko
// High-performance working variables
transient var seasons = natMap.fromIter<Season>(stableSeasons.vals());
transient var nameRecords = textMap.fromIter<NameRecord>(stableNameRecords.vals());
transient var nextSeasonId = stableNextSeasonId;
// ... etc
```

**Why This Design?**
- **Stable variables**: Ensure data persistence across upgrades
- **Working variables**: Provide fast O(log n) access via OrderedMap
- **Separation**: Allows optimization without sacrificing persistence

## Migration System (v1.1.0+)

### Version Management
```motoko
type Version = {
  major : Nat;    // Breaking changes
  minor : Nat;    // New features
  patch : Nat;    // Bug fixes
};

let CURRENT_VERSION : Version = { major = 1; minor = 1; patch = 1 };
```

### Migration Hooks
```motoko
system func preupgrade() {
  // Save all working data to stable variables
  stableSeasons := Iter.toArray(natMap.entries(seasons));
  stableNameRecords := Iter.toArray(textMap.entries(nameRecords));
  // ... save all data
}

system func postupgrade() {
  // Run version-based migrations
  runMigrations(stableVersion, CURRENT_VERSION);
  stableVersion := CURRENT_VERSION;
}
```

**Migration Flow:**
1. **preupgrade**: Automatically saves all data to stable storage
2. **Code Replacement**: New WASM is installed
3. **postupgrade**: Runs migrations and restores working variables
4. **Migration Functions**: Handle data transformations between versions

## Module Architecture

### Main Actor (`main.mo`)
- Core business logic
- Public API endpoints
- Data validation and access control
- Migration system

### Registry Module (`blob-storage/registry.mo`)
```motoko
module {
  public type Registry = {
    var references : OrderedMap.Map<Text, FileReference>;
    var blobsToRemove : OrderedMap.Map<Text, Bool>;
    var authorizedPrincipals : [Principal];
  };

  // Functions: add, remove, get, list, cleanup
}
```

### Access Control Module (`authorization/access-control.mo`)
```motoko
module {
  public type AccessControlState = {
    var adminAssigned : Bool;
    var userRoles : OrderedMap.Map<Principal, UserRole>;
  };

  // Functions: initialize, assignRole, hasPermission, isAdmin
}
```

## Performance Characteristics

### Time Complexity
- **Season queries**: O(log n) via OrderedMap
- **Name lookups**: O(log n) via OrderedMap
- **User role checks**: O(log n) via OrderedMap
- **Season listing**: O(n) iteration
- **Name registration**: O(log n) + validation

### Space Complexity
- **Stable storage**: O(n) for all data
- **Working storage**: O(n) OrderedMap overhead
- **Memory usage**: ~2x storage (stable + working)

### Optimization Strategies
1. **Lazy loading**: Working variables populated on-demand
2. **Efficient serialization**: Minimal stable variable overhead
3. **Batched operations**: Multiple updates in single call
4. **Indexed access**: OrderedMap for fast lookups

## Security Model

### Access Control Flow
```
1. Caller → hasPermission() → getUserRole() → Check against required role
2. Role hierarchy: Admin > User > Guest
3. Anonymous callers automatically assigned Guest role
```

### Validation Layers
1. **Permission validation**: Role-based access control
2. **Business logic validation**: Season rules, time windows
3. **Data validation**: Name length, uniqueness, format
4. **State validation**: Season status, registration limits

### Principal Management
- **Admin initialization**: First caller becomes admin
- **Multi-admin support**: Admins can promote other users
- **Principal validation**: No anonymous operations for state changes
- **Role persistence**: Roles survive upgrades via stable variables

## Upgrade Strategies

### Safe Upgrades (Preserve Data)
- Adding new functions
- Adding optional fields to types
- Bug fixes without state changes
- Performance improvements

### Breaking Changes (Require Migration)
- Removing or renaming functions
- Changing function signatures
- Modifying stable variable types
- Structural data changes

### Migration Best Practices
1. **Version planning**: Increment appropriately (major.minor.patch)
2. **Backward compatibility**: Support old data formats temporarily
3. **Gradual migration**: Transform data over multiple versions if needed
4. **Validation**: Verify data integrity after migration
5. **Rollback planning**: Maintain backups for emergency rollback

## Monitoring and Debugging

### Built-in Diagnostics
```motoko
public query func getUpgradeInfo() : async {
  currentVersion : Version;
  totalSeasons : Nat;
  totalNameRecords : Nat;
}
```

### Debug Information
- Version tracking for upgrade monitoring
- Timestamps for audit trails
- Comprehensive error messages with context
- Debug prints during upgrade process

### Health Checks
- Admin count verification
- Season state consistency
- Data integrity validations
- Performance metrics (via upgrade info)

This architecture provides a robust, scalable foundation for seasonal name registration with built-in migration capabilities and enterprise-grade access control.