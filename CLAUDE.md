# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ICPHub - A domain name registry system built on the Internet Computer (ICP) blockchain platform consisting of:
1. **Backend (registry/)**: Motoko-based canister for managing seasonal name registrations with role-based access control
2. **Frontend (frontend/)**: React TypeScript application with Internet Identity authentication

## Essential Commands

### Frontend Development
```bash
cd frontend
npm install          # Install dependencies
npm run dev          # Start development server (Vite)
npm run build        # TypeScript check + production build
npm run lint         # ESLint check
npm run typecheck    # TypeScript type checking only
```

### Backend Development
```bash
cd registry
npm install          # Install dependencies
dfx start --background  # Start local ICP replica
dfx deploy           # Deploy canister
npm run upgrade      # Upgrade canister (preserves data)
npm run status       # Check canister status
npm run seasons      # List all seasons
```

### Testing Backend
```bash
# Initialize (first caller becomes admin)
dfx canister call context_registry initializeAccessControl

# Check current status
npm run status
```

## Architecture Overview

### Backend (Motoko Canister)
- **Main Actor**: Core registry with seasonal name registration
- **Access Control**: Admin/user/guest role-based permissions
- **File Registry**: Hash-based file reference management
- **Stable Storage**: Data persists across upgrades (v1.1.0+)
- **Season Management**: Time-bounded registration periods

### Frontend (React TypeScript)
- **Framework**: React 18 with TypeScript, built with Vite
- **Styling**: Tailwind CSS with custom design system
- **State**: TanStack Query for server state management
- **Auth**: Internet Identity (ICP) integration
- **Navigation**: Custom tab-based event system

### Key Integration Points
- Frontend uses generated declarations from backend canister
- Authentication via Internet Identity provider
- Dynamic configuration loading from env.json
- Actor pattern for canister interactions

## Development Workflows

### Adding Frontend Features
1. Check existing patterns in `frontend/src/hooks/useQueries.tsx`
2. Follow component structure in `frontend/src/components/`
3. Use TanStack Query for API calls
4. Verify authentication state before backend calls

### Modifying Backend Canister
1. **Always backup first**: `cd registry && npm run migrate backup`
2. Make changes in `registry/src/context-registry/`
3. For safe changes: `npm run upgrade`
4. For breaking changes: `npm run reinstall` (data loss!)
5. Regenerate types: `npm run generate`

### Common Tasks
- **Create Season**: Use `npm run icphub seasons add` with human-readable dates
- **Check Diagnostics**: `npm run status` in registry directory
- **Frontend Config**: Modify `frontend/public/env.json` for canister IDs
- **Run Tests**: Check package.json scripts for test commands

## Important Patterns

### Frontend
- Use existing query hooks patterns from useQueries.tsx
- Check auth state via useInternetIdentity hook
- Handle ICP errors with utilities in config.ts
- Follow Tailwind + OKLCH color system for styling

### Backend
- Role-based security checks before state modifications
- Season lifecycle constraints (draft → active → ended)
- Use Debug.trap() for validation failures
- Time-based logic uses IC time functions
- All data in stable OrderedMaps

## Critical Notes

- **Admin Setup**: First caller to initializeAccessControl becomes admin
- **Data Persistence**: Backend uses enhanced orthogonal persistence
- **Season Constraints**: Only one active season allowed at a time
- **Frontend Auth**: Always verify Internet Identity before backend calls
- **Breaking Changes**: Require reinstall and data migration