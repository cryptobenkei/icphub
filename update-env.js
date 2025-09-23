#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Updates frontend env.json with canister IDs from registry .env file
 * Usage: node update-env.js [--production-canister-id <id>]
 */

const REGISTRY_ENV_PATH = path.join(__dirname, 'registry', '.env');
const FRONTEND_ENV_PATH = path.join(__dirname, 'frontend', 'public', 'env.json');

function parseEnvFile(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Environment file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const env = {};

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key && valueParts.length > 0) {
                env[key] = valueParts.join('=').replace(/^['"]|['"]$/g, '');
            }
        }
    }

    return env;
}

function updateEnvJson() {
    try {
        // Parse command line arguments
        const args = process.argv.slice(2);
        let productionCanisterId = null;

        for (let i = 0; i < args.length; i++) {
            if (args[i] === '--production-canister-id' && i + 1 < args.length) {
                productionCanisterId = args[i + 1];
                break;
            }
        }

        // Read local canister ID from registry .env
        const registryEnv = parseEnvFile(REGISTRY_ENV_PATH);
        const localCanisterId = registryEnv.CANISTER_ID_CONTEXT_REGISTRY;

        if (!localCanisterId) {
            throw new Error('CANISTER_ID_CONTEXT_REGISTRY not found in registry .env file');
        }

        // Read current env.json
        let envConfig;
        if (fs.existsSync(FRONTEND_ENV_PATH)) {
            const envContent = fs.readFileSync(FRONTEND_ENV_PATH, 'utf8');
            envConfig = JSON.parse(envContent);
        } else {
            // Create default structure if file doesn't exist
            envConfig = {
                local: {
                    backend_host: "http://127.0.0.1:4943",
                    backend_canister_id: "",
                    project_id: "icp-hub-registry-local"
                },
                production: {
                    backend_host: "https://ic0.app",
                    backend_canister_id: "",
                    project_id: "icp-hub-registry-production"
                }
            };
        }

        // Update local canister ID
        envConfig.local.backend_canister_id = localCanisterId;

        // Update production canister ID if provided
        if (productionCanisterId) {
            envConfig.production.backend_canister_id = productionCanisterId;
            console.log(`✅ Updated production canister ID: ${productionCanisterId}`);
        }

        // Write updated env.json
        fs.writeFileSync(FRONTEND_ENV_PATH, JSON.stringify(envConfig, null, 2));

        // Copy .env file to frontend for Vite/build tools
        const frontendEnvPath = path.join(__dirname, 'frontend', '.env');
        try {
            fs.copyFileSync(REGISTRY_ENV_PATH, frontendEnvPath);
            console.log(`✅ Copied .env to frontend directory`);
        } catch (envCopyError) {
            console.warn(`⚠️  Warning: Could not copy .env to frontend: ${envCopyError.message}`);
        }

        console.log(`✅ Updated local canister ID: ${localCanisterId}`);
        console.log(`📝 Frontend env.json updated successfully`);

        // Show current configuration
        console.log('\n📋 Current configuration:');
        console.log(`   Local: ${envConfig.local.backend_canister_id}`);
        console.log(`   Production: ${envConfig.production.backend_canister_id}`);

    } catch (error) {
        console.error('❌ Error updating env.json:', error.message);
        process.exit(1);
    }
}

// Show help if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Usage: node update-env.js [options]

Updates frontend env.json with canister IDs from registry deployment.

Options:
  --production-canister-id <id>  Set the production canister ID
  --help, -h                     Show this help message

Examples:
  node update-env.js                                           # Update local canister ID only
  node update-env.js --production-canister-id rdmx6-jaaaa-... # Update both local and production
`);
    process.exit(0);
}

updateEnvJson();