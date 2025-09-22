# Context Registry

A Motoko-based Internet Computer canister for managing seasonal name registrations, file references, and user access control with automatic data migration.

## 🚀 Quick Start

```bash
# Install and deploy
npm install
dfx start --background
dfx deploy

# Initialize admin (first caller becomes admin)
dfx canister call context_registry initializeAccessControl

# Check status
npm run status
```

## ✨ Features

- **🎯 Seasonal Registration**: Time-bounded name registration periods with configurable limits
- **👑 Role-Based Access**: Admin, user, and guest roles with granular permissions
- **📁 File Management**: Hash-based file reference tracking with cleanup capabilities
- **🎨 Rich Metadata**: Associate metadata and markdown content with registered names
- **🔄 Auto-Migration**: Stable variable system preserves data across upgrades (v1.1.0+)
- **📊 Version Tracking**: Semantic versioning with automatic migration execution

## 🎮 Quick Reference

| Task | Command | Notes |
|------|---------|-------|
| **Check Status** | `npm run status` | Shows canister ID, version, admin, seasons |
| **List Seasons** | `npm run seasons` | All seasons with details |
| **Create Season** | See [CLI Admin Guide](docs/cli-admin-guide.md) | Use human-readable dates! |
| **Upgrade Code** | `npm run upgrade` | Auto-preserves data (v1.1.0+) |

## 📚 Documentation

### For Administrators
- **[CLI Admin Guide](docs/cli-admin-guide.md)** - Complete admin workflow using CLI tools
- **[DFX Command Reference](docs/dfx-interactions.md)** - All direct dfx commands
- **[Admin Management](docs/ADMIN-GUIDE.md)** - Multi-admin setup and user roles

### For Developers
- **[Canister Architecture](docs/canister-architecture.md)** - Internal design and data structures
- **[Migration Guide](docs/migration-guide.md)** - Upgrade procedures and data migration

### Quick Examples

**Create and activate a season:**
```bash
# Generate dfx command with human-readable dates
npm run icphub seasons add "Spring 2025" "01/03/2025 09:00" "31/05/2025 18:00" 100 3 20 1000000

# Execute the generated command (admin required)
dfx canister call context_registry createSeason '(generated-parameters...)'

# Activate the season
dfx canister call context_registry activateSeason '(1)'

# Verify activation
npm run seasons
```

**Check system status:**
```bash
npm run status
```

**Register a name (during active season):**
```bash
dfx canister call context_registry registerName \
  '("myname", "principal-id", variant { identity }, "owner-id", 1)'
```

## 🏗️ Architecture

- **Main Actor** (`src/context-registry/main.mo`): Core registry functionality with stable variables
- **Registry Module** (`src/context-registry/blob-storage/registry.mo`): File reference management
- **Access Control** (`src/context-registry/authorization/access-control.mo`): Role-based permissions
- **TypeScript CLI** (`bin/icphub.ts`): User-friendly management interface

## 🔄 Migration System (v1.1.0+)

The enhanced migration system automatically preserves data across upgrades:

- **Stable Variables**: All data persists automatically during upgrades
- **Version Tracking**: Semantic versioning with migration execution
- **No Manual Backup Required**: For most upgrades (backup still recommended)
- **Graceful Upgrades**: `preupgrade`/`postupgrade` hooks handle data safely

See the [Migration Guide](docs/migration-guide.md) for complete details.

## 🛠️ Development

```bash
# Build TypeScript
npm run build

# Generate Candid declarations
dfx generate

# Clean up
npm run clean

# Fresh development environment
npm run deploy:fresh
```

## 📋 Requirements

- [DFX SDK](https://internetcomputer.org/docs/current/developer-docs/setup/install/) 0.29.0+
- Node.js 18+
- Internet Computer local replica

## 🚨 Important Notes

- **CLI Permissions**: The TypeScript CLI runs anonymously. Use `dfx` commands for admin operations.
- **Admin Setup**: The first caller to `initializeAccessControl` becomes admin.
- **Season Management**: Only one season can be active at a time.
- **Data Persistence**: v1.1.0+ automatically preserves data during upgrades.

## 📄 License

See the project license for details.

---

**Quick Links:**
- 📖 [Complete CLI Admin Guide](docs/cli-admin-guide.md)
- 🔧 [DFX Command Reference](docs/dfx-interactions.md)
- 🏗️ [Architecture Documentation](docs/canister-architecture.md)
- 🔄 [Migration Procedures](docs/migration-guide.md)
- 👑 [Multi-Admin Setup](docs/ADMIN-GUIDE.md)