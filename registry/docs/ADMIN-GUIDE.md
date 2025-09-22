# Admin Management Guide

This guide explains how to manage administrators in the Context Registry canister.

## Current Admin System

### Can you have multiple admins?
**YES!** The system supports multiple administrators. While only the first caller becomes admin during initialization, existing admins can promote other users to admin status.

### How many admins can you have?
Unlimited - any admin can create additional admins as needed.

## Viewing Admin Information

### Check who are the admins
```bash
# Using the CLI (shows all admins)
npm run status

# Using dfx commands
dfx canister call context_registry getAllAdmins
dfx canister call context_registry getAdminCount
```

### Check if you are an admin
```bash
# Check your role
dfx canister call context_registry isCallerAdmin

# Or use the CLI
npm run status  # Shows "Admin Access: ✅" if you're admin
```

## Managing Admins

### First Admin (During Initial Setup)
The first person to call `initializeAccessControl` becomes the admin:
```bash
# First caller becomes admin
dfx canister call context_registry initializeAccessControl
```

### Adding Additional Admins

**Method 1: Using dfx (as current admin)**
```bash
# Get the principal ID of the user you want to make admin
dfx identity use <other-identity>
dfx identity get-principal
# Output example: xkbqi-xgbqt-cgevp-yjlnu-x3p4s-to65n-dr2wh-ennkl-ziimm-isxfk-uae

# Switch back to admin identity
dfx identity use <admin-identity>

# Assign admin role to the new principal
dfx canister call context_registry assignCallerUserRole \
  '(principal "xkbqi-xgbqt-cgevp-yjlnu-x3p4s-to65n-dr2wh-ennkl-ziimm-isxfk-uae", variant { admin })'
```

**Method 2: Step-by-step process**
```bash
# 1. Find out who you want to make admin (get their principal)
dfx identity use alice
dfx identity get-principal
# Save this principal ID

# 2. Switch to an admin account
dfx identity use default  # or your admin identity

# 3. Make Alice an admin
dfx canister call context_registry assignCallerUserRole \
  '(principal "alice-principal-here", variant { admin })'

# 4. Verify the new admin was added
npm run status
# Should show 2 admins now
```

## Removing Admin Access

To remove admin access, assign a different role:
```bash
# Demote an admin to regular user
dfx canister call context_registry assignCallerUserRole \
  '(principal "principal-to-demote", variant { user })'

# Or make them a guest (minimal access)
dfx canister call context_registry assignCallerUserRole \
  '(principal "principal-to-demote", variant { guest })'
```

## Example: Complete Multi-Admin Setup

```bash
# 1. Deploy and initialize first admin
dfx deploy
dfx canister call context_registry initializeAccessControl

# 2. Check current admin status
npm run status
# Shows: Admins (1): [your principal]

# 3. Create a new identity for second admin
dfx identity new admin2
dfx identity use admin2
dfx identity get-principal
# Example output: rdmpb-w4aaq-cdevt-yklop-u5q6t-so76o-et3xh-fool2-zjklm-jtyfk-pae

# 4. Switch back to first admin
dfx identity use default

# 5. Make admin2 an admin
dfx canister call context_registry assignCallerUserRole \
  '(principal "rdmpb-w4aaq-cdevt-yklop-u5q6t-so76o-et3xh-fool2-zjklm-jtyfk-pae", variant { admin })'

# 6. Verify both admins exist
npm run status
# Shows: Admins (2): [list of both principals]

# 7. Test admin2's access
dfx identity use admin2
dfx canister call context_registry isCallerAdmin
# Output: (true)
```

## Best Practices

1. **Always have at least 2 admins** - Prevents lockout if one admin loses access
2. **Document admin principals** - Keep a secure record of who has admin access
3. **Use meaningful identity names** - Makes it easier to manage multiple admins
4. **Regular audits** - Periodically check who has admin access using `npm run status`
5. **Backup before changes** - Always backup before modifying admin roles

## Security Considerations

- **Trust is critical** - Only give admin access to trusted parties
- **Admins can**:
  - Create/modify/delete seasons
  - Assign roles to any user
  - Access all administrative functions
  - Add or remove other admins
- **Admins cannot**:
  - Remove the last admin (would lock the canister)
  - Modify code without deployment
  - Access private keys of other users

## Troubleshooting

### Lost all admins
If somehow all admins are lost, you'll need to:
1. Backup data: `npm run migrate backup`
2. Reinstall canister: `npm run reinstall`
3. Reinitialize: `dfx canister call context_registry initializeAccessControl`
4. Restore data: `npm run migrate restore backups/latest.json`

### Can't add new admin
- Verify you're using an admin identity: `dfx canister call context_registry isCallerAdmin`
- Check the principal format is correct
- Ensure the principal isn't anonymous

### Want to see admin history
Currently, the system doesn't track admin history. Only current admins are visible.
Consider implementing an audit log if this is needed.