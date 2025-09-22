# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React TypeScript frontend application for a domain name registry with document attachments, built on the Internet Computer (ICP) platform. The application integrates with Internet Identity for authentication and uses ICP canisters for backend services.

## Technology Stack

- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **State Management**: TanStack Query (React Query) for server state
- **Authentication**: Internet Identity (ICP)
- **UI Components**: Custom components built with Radix UI primitives
- **Build Tool**: Vite (inferred from main.tsx structure)
- **Blockchain Platform**: Internet Computer (ICP)

## Architecture

### Core Structure
```
src/
├── App.tsx                    # Main application with tab navigation
├── main.tsx                   # Application entry point with providers
├── config.ts                  # Configuration management and actor creation
├── index.css                  # Global styles and CSS variables
├── components/                # React components
│   ├── AdminPanel.ts         # Admin functionality
│   ├── Home.tsx              # Home/landing page
│   ├── MyNames.tsx           # User's registered names
│   ├── NameSearch.tsx        # Domain name search
│   └── RegisterNameForm.tsx  # Name registration form
├── hooks/                    # Custom React hooks
│   ├── useActor.tsx          # ICP actor management
│   ├── useInternetIdentity.tsx # Internet Identity integration
│   └── useQueries.tsx        # TanStack Query hooks for API calls
└── blob-storage/             # File storage functionality
    ├── FileStorage.ts        # File management utilities
    └── StorageClient.ts      # Storage service client
```

### Key Architectural Patterns

1. **Provider Pattern**: App wrapped with QueryClientProvider and InternetIdentityProvider
2. **Custom Hooks**: Business logic encapsulated in custom hooks (useQueries.tsx)
3. **Actor Pattern**: ICP canister interactions through actor pattern (useActor.tsx)
4. **Configuration Management**: Environment-based config loading with fallbacks (config.ts)
5. **Tab-based Navigation**: Custom event-driven tab switching system

### Authentication & State Management

- **Internet Identity**: Primary authentication method for ICP
- **TanStack Query**: Handles server state, caching, and data fetching
- **Query Invalidation**: Proper cache management on authentication state changes

### Configuration System

The app uses a dynamic configuration system:
- Loads from `./env.json` at runtime
- Falls back to defaults if config unavailable
- Supports different backend hosts and canister IDs
- Caches configuration for performance

## Development Notes

### Important Files to Understand

1. **src/config.ts**: Contains configuration loading, actor creation, and error handling utilities
2. **src/hooks/useQueries.tsx**: All backend API calls and query definitions
3. **src/hooks/useInternetIdentity.tsx**: Authentication state and identity management
4. **src/App.tsx**: Main application logic and navigation

### ICP Integration

- Backend interactions through generated declarations (imported from 'declarations/backend')
- Canister ID and host configuration managed dynamically
- Error handling with custom message extraction for ICP agent errors

### Styling System

- Uses Tailwind CSS with extensive custom design tokens
- OKLCH color space for modern color definitions
- CSS custom properties for theming (light/dark mode support)
- Radix UI for accessible component primitives

### File Storage

The application includes blob storage functionality for document attachments:
- Custom storage client with multipart upload support
- File management utilities for handling attachments
- Integration with external storage gateway

## Common Development Patterns

1. **Query Hooks**: Use existing patterns in useQueries.tsx for new API calls
2. **Component Structure**: Follow existing component patterns with proper TypeScript typing
3. **Authentication**: Always check authentication state before making backend calls
4. **Error Handling**: Use the error processing utilities in config.ts
5. **Navigation**: Use the custom event system for tab switching between components