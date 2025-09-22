# ICPHub

A domain name registry system built on the Internet Computer (ICP) blockchain platform.

## Overview

ICPHub provides a decentralized domain registration system with seasonal registration periods, role-based access control, and a React-based frontend for user interaction.

## Architecture

### Backend (Registry Canister)
- **Language**: Motoko
- **Features**:
  - Seasonal domain name registration
  - Role-based access control (Admin/User/Guest)
  - Stable storage with data persistence across upgrades
  - File registry with hash-based management

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Authentication**: Internet Identity (ICP)
- **State Management**: TanStack Query

## Quick Start

### Prerequisites
- Node.js (v16+)
- DFX (Internet Computer SDK)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd icphub
```

2. Install dependencies:
```bash
# Frontend
cd frontend
npm install

# Backend
cd ../registry
npm install
```

### Development

#### Start Backend
```bash
cd registry
dfx start --background
dfx deploy
npm run status  # Check canister status
```

#### Start Frontend
```bash
cd frontend
npm run dev  # Starts on http://localhost:5173
```

## Key Commands

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - TypeScript checking

### Backend
- `npm run deploy` - Deploy canister
- `npm run upgrade` - Upgrade canister (preserves data)
- `npm run status` - Check canister status
- `npm run seasons` - List all seasons

## Initial Setup

1. Deploy the backend canister
2. Initialize access control (first caller becomes admin):
```bash
dfx canister call context_registry initializeAccessControl
```
3. Start the frontend and connect with Internet Identity

## Project Structure

```
icphub/
├── frontend/          # React TypeScript application
│   ├── src/
│   ├── public/
│   └── package.json
├── registry/          # Motoko backend canister
│   ├── src/
│   └── package.json
└── CLAUDE.md         # AI assistant documentation
```

## License

[License information here]

## Contributing

[Contributing guidelines here]