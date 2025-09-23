#!/usr/bin/env node

import { ContextRegistryManager } from "../src/index.js";
import dotenv from "dotenv";
import { Principal } from "@dfinity/principal";
import fs from "fs";
import path from "path";
import os from "os";

// Load environment variables silently (suppress all dotenv logs)
dotenv.config({
  override: false,
  debug: false,
  // @ts-ignore - suppress dotenv v17+ tips
  quiet: true
});

// Configuration file path
const CONFIG_DIR = path.join(os.homedir(), '.icphub');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

interface CLIConfig {
  environment: 'local' | 'production';
}

function loadConfig(): CLIConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    // Ignore errors, will use default
  }
  return { environment: 'local' };
}

function saveConfig(config: CLIConfig): void {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error) {
    console.warn(`⚠️  Could not save config: ${error}`);
  }
}

class ICPHubCLI {
  private manager: ContextRegistryManager;
  private currentEnv: 'local' | 'production' = 'local';

  constructor() {
    this.manager = new ContextRegistryManager();
  }

  async init(env?: 'local' | 'production') {
    // Set environment - priority: parameter > DFX_NETWORK=ic > config file > default
    if (env) {
      this.currentEnv = env;
    } else if (process.env.DFX_NETWORK === 'ic') {
      // Only respect DFX_NETWORK when explicitly set to 'ic' (production)
      this.currentEnv = 'production';
    } else {
      // Load from config file, fallback to local
      const config = loadConfig();
      this.currentEnv = config.environment;
    }

    // Configure based on environment
    let host: string;
    let canisterId: string | undefined;

    if (this.currentEnv === 'production') {
      host = 'https://ic0.app';
      canisterId = 'gpddv-xaaaa-aaaai-atlua-cai'; // Production canister ID
    } else {
      host = 'http://localhost:4943';
      canisterId = process.env.CANISTER_ID_CONTEXT_REGISTRY; // Local canister ID from env
    }

    await this.manager.init(canisterId, host);
  }

  async setEnvironment(env: 'local' | 'production') {
    await this.printStandardHeader(`env ${env}`);

    try {
      await this.init(env);

      const actor = this.manager.getActor();
      if (!actor) throw new Error("Failed to initialize actor");

      // Test connection and show environment info
      const currentTime = await actor.getCurrentTime();
      const version = await actor.getCanisterVersion();

      const networkIcon = env === 'production' ? '🌐' : '🏠';
      const networkName = env === 'production' ? 'Internet Computer (Production)' : 'Local Development';
      const canisterId = env === 'production' ? 'gpddv-xaaaa-aaaai-atlua-cai' : process.env.CANISTER_ID_CONTEXT_REGISTRY;

      // Save environment to config file
      saveConfig({ environment: env });

      console.log(`✅ Successfully connected to ${env} environment`);
      console.log(`${networkIcon} Network: ${networkName}`);
      console.log(`📍 Canister ID: ${canisterId}`);
      console.log(`🏷️  Version: ${version.major}.${version.minor}.${version.patch}`);
      console.log(`🕐 Current Time: ${new Date(Number(currentTime) / 1000000).toISOString()}`);
      console.log(`💾 Environment setting saved to ~/.icphub/config.json`);

    } catch (error) {
      console.error(`❌ Failed to connect to ${env} environment:`, error);
      console.error(`   Check that the ${env === 'local' ? 'local dfx replica is running' : 'internet connection is available'}`);
      throw error;
    }
  }

  getCurrentEnvironment(): 'local' | 'production' {
    return this.currentEnv;
  }

  async printStandardHeader(command: string) {
    console.log(`\x1b[1m\x1b[34mICPHub\x1b[0m \x1b[90m1.0.0\x1b[0m ${command}`);

    const envColor = this.currentEnv === 'production' ? '\x1b[34m' : '\x1b[33m'; // Blue for production, Yellow for local
    const envName = this.currentEnv === 'production' ? 'Production' : 'Local';
    const canisterId = this.currentEnv === 'production' ? 'gpddv-xaaaa-aaaai-atlua-cai' : process.env.CANISTER_ID_CONTEXT_REGISTRY;

    // Get current DFX principal and check if admin
    try {
      const { spawn } = await import('child_process');
      const principalProcess = spawn('dfx', ['identity', 'get-principal'], { stdio: 'pipe' });
      let dfxPrincipal = '';

      principalProcess.stdout?.on('data', (data) => {
        dfxPrincipal += data.toString();
      });

      await new Promise((resolve, reject) => {
        principalProcess.on('close', (code) => {
          if (code === 0) resolve(code);
          else reject(new Error(`Failed to get DFX principal`));
        });
      });

      dfxPrincipal = dfxPrincipal.trim();

      // Check if admin
      const actor = this.manager.getActor();
      let adminLabel = '';
      if (actor) {
        try {
          const allAdmins = await actor.getAllAdmins();
          const isDfxAdmin = allAdmins.some(admin => admin.toString() === dfxPrincipal);
          adminLabel = isDfxAdmin ? ' \x1b[37madmin\x1b[0m' : '';
        } catch {
          // If we can't check admin status, don't show label
        }
      }

      console.log(`${envColor}${envName}:\x1b[0m \x1b[90m${canisterId}\x1b[0m${adminLabel}`);
    } catch {
      // If we can't get principal, show without admin label
      console.log(`${envColor}${envName}:\x1b[0m \x1b[90m${canisterId}\x1b[0m`);
    }

    console.log("");
  }

  async status() {
    await this.printStandardHeader("status");

    const actor = this.manager.getActor();
    if (!actor) throw new Error("Actor not initialized");

    try {

      // Get current active season
      const seasons = await actor.listSeasons();
      const activeSeasons = seasons.filter(s => 'active' in s.status);

      if (activeSeasons.length > 0) {
        const activeSeason = activeSeasons[0];
        console.log(`\x1b[34m${activeSeason.name}:\x1b[0m ${activeSeason.id}`);
      } else {
        console.log(`\x1b[34mNo active season:\x1b[0m`);
      }

      // Get names and file references counts
      const nameRecords = await actor.listNameRecords();
      const fileReferences = await actor.listFileReferences();
      console.log(`\x1b[34mTotal names:\x1b[0m ${nameRecords.length}`);
      console.log(`\x1b[34mTotal Documents:\x1b[0m ${fileReferences.length}`);

      // Get treasury balances
      try {
        const icpBalance = await actor.getIcpBalance();
        const cyclesBalance = await actor.getCyclesBalance();

        // Convert ICP balance from e8s to ICP
        const icpBalanceFormatted = (Number(icpBalance) / 100_000_000).toFixed(8);

        // Convert cycles to a readable format
        const cyclesBalanceFormatted = (Number(cyclesBalance) / 1_000_000_000_000).toFixed(2);

        console.log(`\x1b[34mTreasury:\x1b[0m ${icpBalanceFormatted} ICP`);
        console.log(`\x1b[34mCycles:\x1b[0m ${cyclesBalanceFormatted}T cycles`);
      } catch (error) {
        console.log(`\x1b[34mTreasury:\x1b[0m Unable to fetch`);
        console.log(`\x1b[34mCycles:\x1b[0m Unable to fetch`);
      }

      console.log("");

    } catch (error) {
      console.error("❌ Error fetching status:", error);
    }
  }

  async listSeasons() {
    await this.printStandardHeader("seasons");

    const actor = this.manager.getActor();
    if (!actor) throw new Error("Actor not initialized");

    try {
      const seasons = await actor.listSeasons();

      if (seasons.length === 0) {
        console.log("No seasons found.");
        return;
      }

      seasons.forEach((season, index) => {
        const status = Object.keys(season.status)[0];
        const statusIcon = {
          'draft': '📝',
          'active': '🟢',
          'ended': '🔴',
          'cancelled': '❌'
        }[status] || '❓';

        const startDate = new Date(Number(season.startTime) / 1000000).toLocaleDateString();
        const endDate = new Date(Number(season.endTime) / 1000000).toLocaleDateString();

        console.log(`\n${statusIcon} Season ${season.id}: ${season.name}`);
        console.log(`   Status: ${status.toUpperCase()}`);
        console.log(`   Period: ${startDate} → ${endDate}`);
        console.log(`   Names: ${season.maxNames} max (${season.minNameLength}-${season.maxNameLength} chars)`);
        console.log(`   Price: ${(Number(season.price) / 100000000).toFixed(8)} ICP`);

        if ('active' in season.status) {
          console.log(`   🎯 CURRENTLY ACTIVE`);
        }
      });

      // Show summary
      const active = seasons.filter(s => 'active' in s.status).length;
      const draft = seasons.filter(s => 'draft' in s.status).length;
      const ended = seasons.filter(s => 'ended' in s.status).length;

      console.log(`\n📊 Summary: ${seasons.length} total (🟢 ${active} active, 📝 ${draft} draft, 🔴 ${ended} ended)`);

    } catch (error) {
      console.error("❌ Error fetching seasons:", error);
    }
  }

  parseDateTime(dateTimeStr: string): Date {
    // Support multiple formats
    // Format 1: "20/09/2025 09:00" (DD/MM/YYYY HH:MM)
    // Format 2: "2025-09-20 09:00" (YYYY-MM-DD HH:MM)
    // Format 3: "Sep 20 2025 09:00" (MMM DD YYYY HH:MM)

    let date: Date;

    // Try DD/MM/YYYY HH:MM format
    if (dateTimeStr.match(/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}$/)) {
      const [datePart, timePart] = dateTimeStr.split(' ');
      const [day, month, year] = datePart.split('/');
      const [hours, minutes] = timePart.split(':');
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
    }
    // Try YYYY-MM-DD HH:MM format
    else if (dateTimeStr.match(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/)) {
      const [datePart, timePart] = dateTimeStr.split(' ');
      const [year, month, day] = datePart.split('-');
      const [hours, minutes] = timePart.split(':');
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
    }
    // Try to parse naturally
    else {
      date = new Date(dateTimeStr);
    }

    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${dateTimeStr}. Use "DD/MM/YYYY HH:MM" format, e.g., "20/09/2025 09:00"`);
    }

    return date;
  }

  async createSeason() {
    await this.printStandardHeader("seasons add");

    const actor = this.manager.getActor();
    if (!actor) throw new Error("Actor not initialized");

    try {
      // Check admin status first
      const { spawn } = await import('child_process');
      const principalProcess = spawn('dfx', ['identity', 'get-principal'], { stdio: 'pipe' });
      let dfxPrincipal = '';

      principalProcess.stdout?.on('data', (data) => {
        dfxPrincipal += data.toString();
      });

      await new Promise((resolve, reject) => {
        principalProcess.on('close', (code) => {
          if (code === 0) resolve(code);
          else reject(new Error(`Failed to get DFX principal`));
        });
      });

      dfxPrincipal = dfxPrincipal.trim();

      const allAdmins = await actor.getAllAdmins();
      const isAdmin = allAdmins.some(admin => admin.toString() === dfxPrincipal);

      if (!isAdmin) {
        console.log("❌ Error: Only admins can create seasons");
        return;
      }

      // Interactive prompts for all parameters
      const readline = await import('readline');

      // Season name
      const rl1 = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const name = await new Promise<string>((resolve) => {
        rl1.question('Season name: ', (answer) => {
          rl1.close();
          resolve(answer.trim());
        });
      });

      if (!name) {
        console.log("❌ Error: Season name is required");
        return;
      }

      // Start date and time
      const rl2 = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const startDateTime = await new Promise<string>((resolve) => {
        rl2.question('Start date and time (DD/MM/YYYY HH:MM): ', (answer) => {
          rl2.close();
          resolve(answer.trim());
        });
      });

      // End date and time
      const rl3 = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const endDateTime = await new Promise<string>((resolve) => {
        rl3.question('End date and time (DD/MM/YYYY HH:MM): ', (answer) => {
          rl3.close();
          resolve(answer.trim());
        });
      });

      // Maximum names
      const rl4 = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const maxNamesStr = await new Promise<string>((resolve) => {
        rl4.question('Maximum names: ', (answer) => {
          rl4.close();
          resolve(answer.trim());
        });
      });

      const maxNames = parseInt(maxNamesStr);
      if (isNaN(maxNames) || maxNames <= 0) {
        console.log("❌ Error: Maximum names must be a positive number");
        return;
      }

      // Minimum name length
      const rl5 = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const minLengthStr = await new Promise<string>((resolve) => {
        rl5.question('Minimum name length: ', (answer) => {
          rl5.close();
          resolve(answer.trim());
        });
      });

      const minLength = parseInt(minLengthStr);
      if (isNaN(minLength) || minLength <= 0) {
        console.log("❌ Error: Minimum length must be a positive number");
        return;
      }

      // Maximum name length
      const rl6 = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const maxLengthStr = await new Promise<string>((resolve) => {
        rl6.question('Maximum name length: ', (answer) => {
          rl6.close();
          resolve(answer.trim());
        });
      });

      const maxLength = parseInt(maxLengthStr);
      if (isNaN(maxLength) || maxLength <= 0 || maxLength < minLength) {
        console.log("❌ Error: Maximum length must be a positive number greater than minimum length");
        return;
      }

      // Price
      const rl7 = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const priceStr = await new Promise<string>((resolve) => {
        rl7.question('Price (in ICP tokens): ', (answer) => {
          rl7.close();
          resolve(answer.trim());
        });
      });

      const priceIcp = parseFloat(priceStr);
      if (isNaN(priceIcp) || priceIcp < 0) {
        console.log("❌ Error: Price must be a non-negative number");
        return;
      }

      // Convert ICP to e8s (1 ICP = 100,000,000 e8s)
      const price = Math.floor(priceIcp * 100000000);

      // Parse and validate dates
      let startDate: Date;
      let endDate: Date;
      try {
        startDate = this.parseDateTime(startDateTime);
        endDate = this.parseDateTime(endDateTime);
      } catch (error) {
        console.log("❌ Error: Invalid date format. Use DD/MM/YYYY HH:MM");
        return;
      }

      if (startDate >= endDate) {
        console.log("❌ Error: Start date must be before end date");
        return;
      }

      // Show summary and ask for confirmation
      console.log("");
      console.log("Season summary:");
      console.log(`   Name: ${name}`);
      console.log(`   Start: ${startDateTime}`);
      console.log(`   End: ${endDateTime}`);
      console.log(`   Max Names: ${maxNames}`);
      console.log(`   Name Length: ${minLength}-${maxLength} characters`);
      console.log(`   Price: ${priceIcp} ICP`);
      console.log("");

      const envName = this.currentEnv === 'production' ? 'production' : 'local';
      console.log(`We are going to create this season.`);
      console.log(`\x1b[1m\x1b[33mTo continue write "${envName}"\x1b[0m`);

      const rl8 = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const confirmation = await new Promise<string>((resolve) => {
        rl8.question('', (answer) => {
          rl8.close();
          resolve(answer.trim().toLowerCase());
        });
      });

      if (confirmation !== envName) {
        console.log("Operation cancelled.");
        return;
      }

      // Execute dfx command directly
      const network = this.currentEnv === 'production' ? 'ic' : 'local';
      const startTimeNs = Math.floor(startDate.getTime() * 1000000);
      const endTimeNs = Math.floor(endDate.getTime() * 1000000);

      const dfxArgs = [
        'canister',
        '--network',
        network,
        'call',
        'context_registry',
        'createSeason',
        `("${name}", ${startTimeNs}, ${endTimeNs}, ${maxNames}, ${minLength}, ${maxLength}, ${price})`
      ];

      const dfxProcess = spawn('dfx', dfxArgs, { stdio: 'pipe' });

      let output = '';
      dfxProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });
      dfxProcess.stderr?.on('data', (data) => {
        output += data.toString();
      });

      await new Promise((resolve, reject) => {
        dfxProcess.on('close', (code) => {
          if (code === 0) {
            // Extract season ID from output
            const match = output.match(/\((\d+)\s*:\s*nat\)/);
            const seasonId = match ? match[1] : 'unknown';
            console.log(`✅ Season created successfully with ID: ${seasonId}`);
            resolve(code);
          } else {
            console.log(`❌ Failed to create season`);
            reject(new Error(`dfx command failed with code ${code}`));
          }
        });
      });

    } catch (error) {
      console.log("❌ Error creating season:", (error as Error).message || error);
    }
  }

  async activateSeason() {
    await this.printStandardHeader("seasons activate");

    const actor = this.manager.getActor();
    if (!actor) throw new Error("Actor not initialized");

    try {
      // Check admin status first
      const { spawn } = await import('child_process');
      const principalProcess = spawn('dfx', ['identity', 'get-principal'], { stdio: 'pipe' });
      let dfxPrincipal = '';

      principalProcess.stdout?.on('data', (data) => {
        dfxPrincipal += data.toString();
      });

      await new Promise((resolve, reject) => {
        principalProcess.on('close', (code) => {
          if (code === 0) resolve(code);
          else reject(new Error(`Failed to get DFX principal`));
        });
      });

      dfxPrincipal = dfxPrincipal.trim();

      const allAdmins = await actor.getAllAdmins();
      const isAdmin = allAdmins.some(admin => admin.toString() === dfxPrincipal);

      if (!isAdmin) {
        console.log("❌ Error: Only admins can activate seasons");
        return;
      }

      // Ask for season ID
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const seasonIdStr = await new Promise<string>((resolve) => {
        rl.question('Season ID: ', (answer) => {
          rl.close();
          resolve(answer.trim());
        });
      });

      const seasonId = parseInt(seasonIdStr);
      if (isNaN(seasonId) || seasonId <= 0) {
        console.log("❌ Error: Season ID must be a positive number");
        return;
      }

      // Get season details and validate
      let season;
      try {
        season = await actor.getSeason(BigInt(seasonId));
      } catch (error) {
        console.log(`❌ Error: Season ${seasonId} not found`);
        return;
      }

      const statusKey = Object.keys(season.status)[0];

      if (statusKey === 'active') {
        console.log(`❌ Error: Season "${season.name}" (ID: ${seasonId}) is already active`);
        return;
      }

      if (statusKey === 'ended' || statusKey === 'cancelled') {
        console.log(`❌ Error: Season "${season.name}" (ID: ${seasonId}) is ${statusKey} and cannot be activated`);
        return;
      }

      // Show season details and ask for confirmation
      console.log("");
      console.log(`Season to activate:`);
      console.log(`   ID: ${seasonId}`);
      console.log(`   Name: ${season.name}`);
      console.log(`   Current Status: ${statusKey.toUpperCase()}`);
      console.log(`   Max Names: ${season.maxNames}`);
      console.log(`   Name Length: ${season.minNameLength}-${season.maxNameLength} characters`);
      console.log(`   Price: ${(Number(season.price) / 100000000).toFixed(8)} ICP`);
      console.log("");

      const envName = this.currentEnv === 'production' ? 'production' : 'local';
      console.log(`We are going to activate season "${season.name}".`);
      console.log(`\x1b[1m\x1b[33mTo continue write "${envName}"\x1b[0m`);

      const rl2 = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const confirmation = await new Promise<string>((resolve) => {
        rl2.question('', (answer) => {
          rl2.close();
          resolve(answer.trim().toLowerCase());
        });
      });

      if (confirmation !== envName) {
        console.log("Operation cancelled.");
        return;
      }

      // Execute dfx command directly
      const network = this.currentEnv === 'production' ? 'ic' : 'local';
      const dfxArgs = [
        'canister',
        '--network',
        network,
        'call',
        'context_registry',
        'activateSeason',
        `(${seasonId})`
      ];

      const dfxProcess = spawn('dfx', dfxArgs, { stdio: 'pipe' });

      let output = '';
      dfxProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });
      dfxProcess.stderr?.on('data', (data) => {
        output += data.toString();
      });

      await new Promise((resolve, reject) => {
        dfxProcess.on('close', (code) => {
          if (code === 0) {
            console.log(`✅ Successfully activated season "${season.name}" (ID: ${seasonId})`);
            resolve(code);
          } else {
            console.log(`❌ Failed to activate season`);
            reject(new Error(`dfx command failed with code ${code}`));
          }
        });
      });

    } catch (error) {
      console.log("❌ Error activating season:", (error as Error).message || error);
    }
  }

  async endSeasonInteractive() {
    await this.printStandardHeader("seasons end");

    const actor = this.manager.getActor();
    if (!actor) throw new Error("Actor not initialized");

    try {
      // Check admin status first
      const { spawn } = await import('child_process');
      const principalProcess = spawn('dfx', ['identity', 'get-principal'], { stdio: 'pipe' });
      let dfxPrincipal = '';

      principalProcess.stdout?.on('data', (data) => {
        dfxPrincipal += data.toString();
      });

      await new Promise((resolve, reject) => {
        principalProcess.on('close', (code) => {
          if (code === 0) resolve(code);
          else reject(new Error(`Failed to get DFX principal`));
        });
      });

      dfxPrincipal = dfxPrincipal.trim();

      const allAdmins = await actor.getAllAdmins();
      const isAdmin = allAdmins.some(admin => admin.toString() === dfxPrincipal);

      if (!isAdmin) {
        console.log("❌ Error: Only admins can end seasons");
        return;
      }

      // Ask for season ID
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const seasonIdStr = await new Promise<string>((resolve) => {
        rl.question('Season ID: ', (answer) => {
          rl.close();
          resolve(answer.trim());
        });
      });

      const seasonId = parseInt(seasonIdStr);
      if (isNaN(seasonId) || seasonId <= 0) {
        console.log("❌ Error: Season ID must be a positive number");
        return;
      }

      // Get season details and validate
      let season;
      try {
        season = await actor.getSeason(BigInt(seasonId));
      } catch (error) {
        console.log(`❌ Error: Season ${seasonId} not found`);
        return;
      }

      const statusKey = Object.keys(season.status)[0];

      if (statusKey === 'ended') {
        console.log(`❌ Error: Season "${season.name}" (ID: ${seasonId}) is already ended`);
        return;
      }

      if (statusKey === 'cancelled') {
        console.log(`❌ Error: Season "${season.name}" (ID: ${seasonId}) is cancelled and cannot be ended`);
        return;
      }

      if (statusKey === 'draft') {
        console.log(`❌ Error: Season "${season.name}" (ID: ${seasonId}) is in draft status. Only active seasons can be ended`);
        return;
      }

      // Show season details and ask for confirmation
      console.log("");
      console.log(`Season to end:`);
      console.log(`   ID: ${seasonId}`);
      console.log(`   Name: ${season.name}`);
      console.log(`   Current Status: ${statusKey.toUpperCase()}`);
      console.log(`   Max Names: ${season.maxNames}`);
      console.log(`   Name Length: ${season.minNameLength}-${season.maxNameLength} characters`);
      console.log(`   Price: ${(Number(season.price) / 100000000).toFixed(8)} ICP`);
      console.log("");

      const envName = this.currentEnv === 'production' ? 'production' : 'local';
      console.log(`We are going to end season "${season.name}".`);
      console.log(`\x1b[1m\x1b[33mTo continue write "${envName}"\x1b[0m`);

      const rl2 = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const confirmation = await new Promise<string>((resolve) => {
        rl2.question('', (answer) => {
          rl2.close();
          resolve(answer.trim().toLowerCase());
        });
      });

      if (confirmation !== envName) {
        console.log("Operation cancelled.");
        return;
      }

      // Execute dfx command directly
      const network = this.currentEnv === 'production' ? 'ic' : 'local';
      const dfxArgs = [
        'canister',
        '--network',
        network,
        'call',
        'context_registry',
        'endSeason',
        `(${seasonId})`
      ];

      const dfxProcess = spawn('dfx', dfxArgs, { stdio: 'pipe' });

      let output = '';
      dfxProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });
      dfxProcess.stderr?.on('data', (data) => {
        output += data.toString();
      });

      await new Promise((resolve, reject) => {
        dfxProcess.on('close', (code) => {
          if (code === 0) {
            console.log(`✅ Successfully ended season "${season.name}" (ID: ${seasonId})`);
            resolve(code);
          } else {
            console.log(`❌ Failed to end season`);
            reject(new Error(`dfx command failed with code ${code}`));
          }
        });
      });

    } catch (error) {
      console.log("❌ Error ending season:", (error as Error).message || error);
    }
  }

  async endSeason(seasonId: number) {
    console.log(`🔴 Ending Season ${seasonId}`);
    console.log("=====================");

    const actor = this.manager.getActor();
    if (!actor) throw new Error("Actor not initialized");

    try {
      // Get season details first (read-only, works anonymously)
      const season = await actor.getSeason(BigInt(seasonId));
      console.log(`📝 Season Details:`);
      console.log(`   Name: ${season.name}`);
      console.log(`   Current Status: ${Object.keys(season.status)[0].toUpperCase()}`);

      if ('ended' in season.status) {
        console.log(`⚠️  Season ${seasonId} is already ended!`);
        return;
      }

      console.log(`\n⚠️  Note: Since the TypeScript CLI connects anonymously,`);
      console.log(`   please use this dfx command to end the season:\n`);
      console.log(`dfx canister call context_registry endSeason '(${seasonId})'`);
      console.log(``);

      // Show current seasons list for reference
      console.log(`📅 Current Seasons List:`);
      await this.listSeasons();

    } catch (error) {
      console.error("❌ Error getting season details:", error);
    }
  }

  async showWallet() {
    await this.printStandardHeader("wallet");

    try {
      // Get current identity from dfx
      const { spawn } = await import('child_process');

      // Get current identity
      const identityProcess = spawn('dfx', ['identity', 'whoami'], { stdio: 'pipe' });
      let identityOutput = '';

      identityProcess.stdout?.on('data', (data) => {
        identityOutput += data.toString();
      });

      await new Promise((resolve, reject) => {
        identityProcess.on('close', (code) => {
          if (code === 0) resolve(code);
          else reject(new Error(`Identity command failed with code ${code}`));
        });
      });

      const currentIdentity = identityOutput.trim();

      // Get principal
      const principalProcess = spawn('dfx', ['identity', 'get-principal'], { stdio: 'pipe' });
      let principalOutput = '';

      principalProcess.stdout?.on('data', (data) => {
        principalOutput += data.toString();
      });

      await new Promise((resolve, reject) => {
        principalProcess.on('close', (code) => {
          if (code === 0) resolve(code);
          else reject(new Error(`Principal command failed with code ${code}`));
        });
      });

      const currentPrincipal = principalOutput.trim();

      console.log(`👤 Current Identity: ${currentIdentity}`);
      console.log(`🆔 Principal ID: ${currentPrincipal}`);

      // Try to get ICP balance
      try {
        const balanceProcess = spawn('dfx', ['ledger', 'balance'], { stdio: 'pipe' });
        let balanceOutput = '';

        balanceProcess.stdout?.on('data', (data) => {
          balanceOutput += data.toString();
        });

        balanceProcess.stderr?.on('data', (data) => {
          // Ignore stderr for balance command as it might not be available in local env
        });

        await new Promise((resolve) => {
          balanceProcess.on('close', () => resolve(0));
        });

        if (balanceOutput.trim()) {
          console.log(`💰 ICP Balance: ${balanceOutput.trim()}`);
        } else {
          if (this.currentEnv === 'production') {
            console.log(`💰 ICP Balance: Not available (check dfx ledger setup for mainnet)`);
          } else {
            console.log(`💰 ICP Balance: Not available (local development)`);
          }
        }
      } catch {
        if (this.currentEnv === 'production') {
          console.log(`💰 ICP Balance: Not available (check dfx ledger setup for mainnet)`);
        } else {
          console.log(`💰 ICP Balance: Not available (local development)`);
        }
      }

      // Get cycles balance if available
      try {
        const cyclesProcess = spawn('dfx', ['wallet', 'balance'], { stdio: 'pipe' });
        let cyclesOutput = '';

        cyclesProcess.stdout?.on('data', (data) => {
          cyclesOutput += data.toString();
        });

        await new Promise((resolve) => {
          cyclesProcess.on('close', () => resolve(0));
        });

        if (cyclesOutput.trim()) {
          console.log(`⚡ Cycles Balance: ${cyclesOutput.trim()}`);
        } else {
          if (this.currentEnv === 'production') {
            console.log(`⚡ Cycles Balance: Not available (check dfx wallet setup for mainnet)`);
          } else {
            console.log(`⚡ Cycles Balance: Not available (local development)`);
          }
        }
      } catch {
        if (this.currentEnv === 'production') {
          console.log(`⚡ Cycles Balance: Not available (check dfx wallet setup for mainnet)`);
        } else {
          console.log(`⚡ Cycles Balance: Not available (local development)`);
        }
      }

      // Show role in canister
      const actor = this.manager.getActor();
      if (actor) {
        const allAdmins = await actor.getAllAdmins();
        const isDfxAdmin = allAdmins.some(admin => admin.toString() === currentPrincipal);
        const dfxRole = isDfxAdmin ? 'admin' : 'user';

        console.log(`\nContext Registry Role:`);
        console.log(`   Role: ${dfxRole}`);
        console.log(`   Admin Access: ${isDfxAdmin ? '✅' : '❌'}`);

        if (!isDfxAdmin && this.currentEnv === 'production') {
          console.log(`   Note: You are not an admin on the production canister`);
          console.log(`   Production admin: ${allAdmins[0]?.toString()}`);
        }
      }

    } catch (error) {
      console.error("❌ Error getting wallet information:", error);
    }
  }

  async getSeasonStatus(seasonId: number) {
    await this.printStandardHeader(`season ${seasonId}`);

    const actor = this.manager.getActor();
    if (!actor) throw new Error("Actor not initialized");

    try {
      const season = await actor.getSeason(BigInt(seasonId));
      const status = Object.keys(season.status)[0];
      const statusIcon = {
        'draft': '📝',
        'active': '🟢',
        'ended': '🔴',
        'cancelled': '❌'
      }[status] || '❓';

      const startDate = new Date(Number(season.startTime) / 1000000);
      const endDate = new Date(Number(season.endTime) / 1000000);
      const now = new Date();

      console.log(`${statusIcon} ${season.name}`);
      console.log(`   Status: ${status.toUpperCase()}`);
      console.log(`   Period: ${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString()} → ${endDate.toLocaleDateString()} ${endDate.toLocaleTimeString()}`);
      console.log(`   Max Names: ${season.maxNames}`);
      console.log(`   Name Length: ${season.minNameLength}-${season.maxNameLength} characters`);
      console.log(`   Price: ${(Number(season.price) / 100000000).toFixed(8)} ICP`);

      if ('active' in season.status) {
        const activeSeasonInfo = await actor.getActiveSeasonInfo();
        console.log(`   🎯 Available Names: ${activeSeasonInfo.availableNames}/${season.maxNames}`);
        console.log(`   📊 Registered: ${season.maxNames - activeSeasonInfo.availableNames}/${season.maxNames}`);

        if (endDate > now) {
          const timeLeft = Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
          console.log(`   ⏰ Time Remaining: ${timeLeft} days`);
        }
      }

    } catch (error: any) {
      if (error.message && error.message.includes('Season not found')) {
        console.error("❌ Season does not exist");
      } else {
        console.error("❌ Error fetching season status:", error.message || error);
      }
    }
  }

  async listAdmins() {
    await this.printStandardHeader("admins");

    const actor = this.manager.getActor();
    if (!actor) throw new Error("Actor not initialized");

    try {
      const admins = await actor.getAllAdmins();
      const adminCount = await actor.getAdminCount();

      console.log(`\x1b[34mAdmins:\x1b[0m ${adminCount}`);

      if (admins.length === 0) {
        console.log("No admins found.");
        return;
      }

      admins.forEach((admin) => {
        console.log(`\x1b[90m${admin.toString()}\x1b[0m`);
      });
      console.log("");

    } catch (error) {
      console.error("❌ Error fetching admins:", error);
    }
  }

  async addAdmin() {
    await this.printStandardHeader("admin add");

    // Prompt for Principal ID
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const principalId = await new Promise<string>((resolve) => {
      rl.question('Principal ID: ', (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });

    // Validate Principal ID format (basic validation)
    if (!principalId || principalId.length < 20 || !principalId.includes('-')) {
      console.log("❌ Error: Invalid Principal ID format");
      return;
    }

    // Show confirmation message
    const envName = this.currentEnv === 'production' ? 'production' : 'local';
    console.log(`We are going to add ${principalId} as an admin.`);
    console.log(`\x1b[1m\x1b[33mTo continue write "${envName}"\x1b[0m`);

    const rl2 = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const confirmation = await new Promise<string>((resolve) => {
      rl2.question('', (answer) => {
        rl2.close();
        resolve(answer.trim().toLowerCase());
      });
    });

    if (confirmation !== envName) {
      console.log("Operation cancelled.");
      return;
    }

    try {
      // Execute dfx command directly
      const { spawn } = await import('child_process');

      const network = this.currentEnv === 'production' ? 'ic' : 'local';
      const dfxArgs = [
        'canister',
        '--network',
        network,
        'call',
        'context_registry',
        'assignCallerUserRole',
        `(principal "${principalId}", variant { admin })`
      ];

      const dfxProcess = spawn('dfx', dfxArgs, { stdio: 'pipe' });

      let output = '';
      dfxProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });
      dfxProcess.stderr?.on('data', (data) => {
        output += data.toString();
      });

      await new Promise((resolve, reject) => {
        dfxProcess.on('close', (code) => {
          if (code === 0) {
            console.log(`✅ Successfully added ${principalId} as admin`);
            resolve(code);
          } else {
            console.log(`❌ Failed to add admin`);
            reject(new Error(`dfx command failed with code ${code}`));
          }
        });
      });

    } catch (error: any) {
      // Error already logged above
    }
  }

  async removeAdmin() {
    await this.printStandardHeader("admin remove");

    // Prompt for Principal ID
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const principalId = await new Promise<string>((resolve) => {
      rl.question('Principal ID: ', (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });

    // Validate Principal ID format (basic validation)
    if (!principalId || principalId.length < 20 || !principalId.includes('-')) {
      console.log("❌ Error: Invalid Principal ID format");
      return;
    }

    // Check if user is actually an admin
    const actor = this.manager.getActor();
    if (actor) {
      try {
        const allAdmins = await actor.getAllAdmins();
        const isTargetAdmin = allAdmins.some(admin => admin.toString() === principalId);

        if (!isTargetAdmin) {
          console.log(`❌ Error: ${principalId} is not an admin`);
          return;
        }

        // Check if this would remove the last admin
        if (allAdmins.length <= 1) {
          console.log("❌ Error: Cannot remove the last admin");
          return;
        }
      } catch {
        // Continue if we can't check admin status
      }
    }

    // Show confirmation message
    const envName = this.currentEnv === 'production' ? 'production' : 'local';
    console.log(`We are going to remove ${principalId} as an admin.`);
    console.log(`\x1b[1m\x1b[33mTo continue write "${envName}"\x1b[0m`);

    const rl2 = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const confirmation = await new Promise<string>((resolve) => {
      rl2.question('', (answer) => {
        rl2.close();
        resolve(answer.trim().toLowerCase());
      });
    });

    if (confirmation !== envName) {
      console.log("Operation cancelled.");
      return;
    }

    try {
      // Execute dfx command directly
      const { spawn } = await import('child_process');

      const network = this.currentEnv === 'production' ? 'ic' : 'local';
      const dfxArgs = [
        'canister',
        '--network',
        network,
        'call',
        'context_registry',
        'assignCallerUserRole',
        `(principal "${principalId}", variant { user })`
      ];

      const dfxProcess = spawn('dfx', dfxArgs, { stdio: 'pipe' });

      let output = '';
      dfxProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });
      dfxProcess.stderr?.on('data', (data) => {
        output += data.toString();
      });

      await new Promise((resolve, reject) => {
        dfxProcess.on('close', (code) => {
          if (code === 0) {
            console.log(`✅ Successfully removed ${principalId} as admin`);
            resolve(code);
          } else {
            console.log(`❌ Failed to remove admin`);
            reject(new Error(`dfx command failed with code ${code}`));
          }
        });
      });

    } catch (error: any) {
      // Error already logged above
    }
  }

  async getNameStatus(name: string) {
    console.log(`📝 Name Status: ${name}`);
    console.log("========================");

    const actor = this.manager.getActor();
    if (!actor) throw new Error("Actor not initialized");

    try {
      const nameRecord = await actor.getNameRecord(name);

      if ('ok' in nameRecord) {
        const record = nameRecord.ok;
        const season = await actor.getSeason(record.seasonId);

        console.log(`✅ Name: ${name}`);
        console.log(`   Status: REGISTERED`);
        console.log(`   Owner: ${record.ownerId.toString()}`);
        console.log(`   Season: ${season.name} (ID: ${record.seasonId})`);
        console.log(`   Address Type: ${Object.keys(record.addressType)[0]}`);
        console.log(`   Registration Time: ${new Date(Number(record.registrationTime) / 1000000).toLocaleString()}`);

        // Check for metadata
        try {
          const metadata = await actor.getMetadata(name);
          if ('ok' in metadata) {
            console.log(`   📋 Metadata: Available (${metadata.ok.content.length} chars)`);
          } else {
            console.log(`   📋 Metadata: Not available`);
          }
        } catch {
          console.log(`   📋 Metadata: Not available`);
        }

        // Check for markdown content
        try {
          const markdown = await actor.getMarkdownContent(name);
          if ('ok' in markdown) {
            console.log(`   📄 Markdown: Available (${markdown.ok.content.length} chars)`);
          } else {
            console.log(`   📄 Markdown: Not available`);
          }
        } catch {
          console.log(`   📄 Markdown: Not available`);
        }

      } else {
        console.log(`❌ Name: ${name}`);
        console.log(`   Status: NOT REGISTERED`);
        console.log(`   Error: ${nameRecord.err}`);
      }

    } catch (error) {
      console.error("❌ Error fetching name status:", error);
    }
  }

  async getNameMetadata(name: string) {
    console.log(`📋 Metadata for: ${name}`);
    console.log("==========================");

    const actor = this.manager.getActor();
    if (!actor) throw new Error("Actor not initialized");

    try {
      const metadata = await actor.getMetadata(name);

      if ('ok' in metadata) {
        console.log(`✅ Metadata found for ${name}:\n`);
        console.log(metadata.ok.content);
      } else {
        console.log(`❌ No metadata found for ${name}`);
        console.log(`   Error: ${metadata.err}`);
      }

    } catch (error) {
      console.error("❌ Error fetching metadata:", error);
    }
  }

  async getNameMarkdown(name: string) {
    console.log(`📄 Markdown for: ${name}`);
    console.log("=========================");

    const actor = this.manager.getActor();
    if (!actor) throw new Error("Actor not initialized");

    try {
      const markdown = await actor.getMarkdownContent(name);

      if ('ok' in markdown) {
        console.log(`✅ Markdown found for ${name}:\n`);
        console.log(markdown.ok.content);
      } else {
        console.log(`❌ No markdown found for ${name}`);
        console.log(`   Error: ${markdown.err}`);
      }

    } catch (error) {
      console.error("❌ Error fetching markdown:", error);
    }
  }

  async getNameDid(name: string) {
    console.log(`🔗 DID file for: ${name}`);
    console.log("========================");

    console.log(`⚠️  DID file functionality not yet implemented in the canister.`);
    console.log(`   This would return the Decentralized Identifier file for: ${name}`);

    // For now, just show the name status
    await this.getNameStatus(name);
  }

  async addNameToUser(name: string, userId: string) {
    console.log(`📝 Adding Name: ${name} to User: ${userId}`);
    console.log("=============================================");

    console.log(`⚠️  Note: Since the TypeScript CLI connects anonymously,`);
    console.log(`   please use this dfx command to add the name:\n`);

    // We need to determine the season ID - for now suggest using active season
    const actor = this.manager.getActor();
    if (!actor) throw new Error("Actor not initialized");

    try {
      const seasons = await actor.listSeasons();
      const activeSeasons = seasons.filter(s => 'active' in s.status);

      if (activeSeasons.length === 0) {
        console.log(`❌ No active season found. Please activate a season first.`);
        return;
      }

      const activeSeason = activeSeasons[0];

      console.log(`dfx canister call context_registry registerName \\`);
      console.log(`  '("${name}", principal "${userId}", variant { identity }, principal "${userId}", ${activeSeason.id})'`);
      console.log(``);
      console.log(`📅 Using active season: ${activeSeason.name} (ID: ${activeSeason.id})`);
      console.log(`🔑 Note: Admin access required for this operation`);

    } catch (error) {
      console.error("❌ Error preparing name registration:", error);
    }
  }

  async deployFresh() {
    await this.printStandardHeader("deploy fresh");

    const envName = this.currentEnv === 'production' ? 'production' : 'local';

    console.log("⚠️  This will DELETE ALL DATA and deploy a fresh canister.");
    console.log(`\x1b[1m\x1b[33mTo continue write "${envName}"\x1b[0m`);

    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const confirmation = await new Promise<string>((resolve) => {
      rl.question('', (answer) => {
        rl.close();
        resolve(answer.trim().toLowerCase());
      });
    });

    if (confirmation !== envName) {
      console.log("Operation cancelled.");
      return;
    }

    try {
      console.log("🧹 Cleaning and resetting...");

      // Execute the appropriate deploy command based on environment
      const { spawn } = await import('child_process');

      // For local, we need to clean and redeploy
      if (this.currentEnv === 'local') {
        // Stop dfx, clean, and restart
        const cleanProcess = spawn('npm', ['run', 'reset'], {
          stdio: 'inherit',
          cwd: process.cwd()
        });

        await new Promise((resolve, reject) => {
          cleanProcess.on('close', (code) => {
            if (code === 0) resolve(code);
            else reject(new Error(`Clean failed with code ${code}`));
          });
        });

        // Deploy fresh locally
        const deployProcess = spawn('npm', ['run', 'deploy:local'], {
          stdio: 'inherit',
          cwd: process.cwd()
        });

        await new Promise((resolve, reject) => {
          deployProcess.on('close', (code) => {
            if (code === 0) resolve(code);
            else reject(new Error(`Deploy failed with code ${code}`));
          });
        });
      } else {
        // For production, use reinstall mode
        const deployProcess = spawn('dfx', ['deploy', '--network', 'ic', '--mode', 'reinstall'], {
          stdio: 'inherit',
          cwd: process.cwd()
        });

        await new Promise((resolve, reject) => {
          deployProcess.on('close', (code) => {
            if (code === 0) resolve(code);
            else reject(new Error(`Deploy failed with code ${code}`));
          });
        });
      }

      console.log(`✅ Fresh deployment completed successfully`);
      console.log("");
      console.log("🔧 Initializing access control...");

      // Now initialize the current wallet as admin
      const network = this.currentEnv === 'production' ? 'ic' : 'local';
      const dfxArgs = [
        'canister',
        '--network',
        network,
        'call',
        'context_registry',
        'initializeAccessControl'
      ];

      const initProcess = spawn('dfx', dfxArgs, { stdio: 'inherit' });

      await new Promise((resolve, reject) => {
        initProcess.on('close', (code) => {
          if (code === 0) {
            console.log(`✅ Access control initialized - You are now admin`);
            resolve(code);
          } else {
            console.log(`⚠️  Could not initialize access control (may already be initialized)`);
            resolve(code); // Don't fail the whole process
          }
        });
      });

      console.log("");
      console.log("🎉 Fresh canister deployed and configured!");
      console.log(`   Environment: ${this.currentEnv}`);
      console.log("   Admin: Current wallet");
      console.log("");
      console.log("You can now:");
      console.log("   1. Check status: icphub status");
      console.log("   2. Create seasons: icphub seasons add");
      console.log("   3. Manage admins: icphub admins");

    } catch (error: any) {
      console.error("❌ Error during fresh deployment:", error.message || error);
    }
  }

  async showHelp() {
    await this.printStandardHeader("help");
    console.log(`🔧 Available CLIs:`);
    console.log(`  TypeScript CLI: High-level interface with formatted output`);
    console.log(`  DFX CLI: Direct canister interaction (npm run dfx <command>)`);
    console.log(``);
    console.log(`🔄 Environment Management:`);
    console.log(`  icphub env local                 Switch to local development environment`);
    console.log(`  icphub env production            Switch to production environment (IC)`);
    console.log(`  icphub env status               Show current environment`);
    console.log(``);
    console.log(`🚀 Deployment:`);
    console.log(`  icphub deploy fresh              Deploy fresh canister (DELETES ALL DATA)`);
    console.log(``);
    console.log(`📊 Status & Info:`);
    console.log(`  icphub status                    Show canister status and overview`);
    console.log(`  icphub balance                   Show canister ICP and cycles balances`);
    console.log(`  icphub wallet                    Show wallet info and balances`);
    console.log(``);
    console.log(`📅 Season Management:`);
    console.log(`  icphub seasons                   List all seasons`);
    console.log(`  icphub seasons add <name> <start> <end> <maxNames> <minLen> <maxLen> <price>`);
    console.log(`                                   Create new season with date/time`);
    console.log(`  icphub seasons activate <id>     Activate a season`);
    console.log(`  icphub seasons end               End a season (interactive)`);
    console.log(`  icphub season <id> status        Show specific season status`);
    console.log(``);
    console.log(`👑 Admin Management:`);
    console.log(`  icphub admins                    List all admins`);
    console.log(`  icphub admins add                Add new admin (interactive prompt)`);
    console.log(`  icphub admins remove             Remove admin (interactive prompt)`);
    console.log(``);
    console.log(`📝 Name Management:`);
    console.log(`  icphub name <name>               Show name status and info`);
    console.log(`  icphub name <name> metadata      Show name metadata content`);
    console.log(`  icphub name <name> markdown      Show name markdown content`);
    console.log(`  icphub name <name> did           Show name DID file`);
    console.log(`  icphub name add <name> <userId>  Add name to user (shows dfx command)`);
    console.log(``);
    console.log(`📝 Examples:`);
    console.log(`  icphub deploy fresh`);
    console.log(`  icphub env production`);
    console.log(`  icphub status`);
    console.log(`  icphub wallet`);
    console.log(`  icphub seasons`);
    console.log(`  icphub season 1 status`);
    console.log(`  icphub seasons add "Spring 2025" "01/03/2025 09:00" "31/05/2025 18:00" 100 3 20 1000000`);
    console.log(`  icphub seasons activate 1`);
    console.log(`  icphub admins`);
    console.log(`  icphub admins add`);
    console.log(`  icphub admins remove`);
    console.log(`  icphub name "testname"`);
    console.log(`  icphub name "testname" metadata`);
    console.log(`  icphub name add "newname" "rdmx6-jaaaa-aaaah-qcaiq-cai"`);
    console.log(``);
    console.log(`🔄 Environment Info:`);
    console.log(`  Local: Connects to local dfx replica (http://localhost:4943)`);
    console.log(`  Production: Connects to Internet Computer mainnet (https://ic0.app)`);
    console.log(`  Current: ${this.currentEnv} environment (saved in ~/.icphub/config.json)`);
    console.log(`  Override: Use DFX_NETWORK=ic for temporary production access`);
    console.log(``);
    console.log(`💡 For clean output: Use 'icphub <command>' directly or install globally with 'npm run install-cli'`);
    console.log(`💡 For global access: Run 'npm run install-cli' to install 'icphub' command globally`);
    console.log(``);
    console.log(`📅 Date Format: "DD/MM/YYYY HH:MM" (24-hour format)`);
    console.log(`   Alternative: "YYYY-MM-DD HH:MM"`);
    console.log(``);
    console.log(`🔑 Note: Admin access required for season and user management commands`);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    const cli = new ICPHubCLI();
    await cli.showHelp();
    return;
  }

  const command = args[0];
  const subcommand = args[1];
  const thirdArg = args[2];

  const cli = new ICPHubCLI();

  try {
    // Handle env commands first (before init)
    if (command === "env") {
      if (subcommand === "local") {
        await cli.setEnvironment('local');
        return;
      } else if (subcommand === "production") {
        await cli.setEnvironment('production');
        return;
      } else if (subcommand === "status") {
        console.log(`🔄 Current Environment: ${cli.getCurrentEnvironment()}`);
        console.log("=======================");
        const env = cli.getCurrentEnvironment();
        const networkIcon = env === 'production' ? '🌐' : '🏠';
        const networkName = env === 'production' ? 'Internet Computer (Production)' : 'Local Development';
        const canisterId = env === 'production' ? 'gpddv-xaaaa-aaaai-atlua-cai' : process.env.CANISTER_ID_CONTEXT_REGISTRY;
        const host = env === 'production' ? 'https://ic0.app' : 'http://localhost:4943';

        console.log(`${networkIcon} Environment: ${networkName}`);
        console.log(`📍 Canister ID: ${canisterId}`);
        console.log(`🌍 Host: ${host}`);
        console.log(``);
        console.log(`💡 Use 'icphub env local' or 'icphub env production' to switch`);
        return;
      } else {
        console.error('❌ Usage: icphub env <local|production|status>');
        console.error('   Example: icphub env production');
        process.exit(1);
      }
    }

    // Initialize with default environment for all other commands
    await cli.init();

    switch (command) {
      case "status":
        await cli.status();
        break;

      case "deploy":
        if (subcommand === "fresh") {
          await cli.deployFresh();
        } else {
          console.error('❌ Usage: icphub deploy fresh');
          console.error('   This will DELETE ALL DATA and deploy a fresh canister');
          process.exit(1);
        }
        break;

      case "wallet":
        await cli.showWallet();
        break;

      case "seasons":
        if (!subcommand) {
          await cli.listSeasons();
        } else if (subcommand === "add") {
          await cli.createSeason();
        } else if (subcommand === "activate") {
          await cli.activateSeason();
        } else if (subcommand === "end") {
          await cli.endSeasonInteractive();
        } else {
          console.error(`❌ Unknown seasons subcommand: ${subcommand}`);
          await cli.showHelp();
        }
        break;

      case "season":
        if (!subcommand) {
          console.error('❌ Usage: icphub season <id> <command>');
          console.error('   Example: icphub season 1 status');
          process.exit(1);
        }

        const seasonId = parseInt(subcommand);
        if (isNaN(seasonId)) {
          console.error('❌ Season ID must be a number');
          process.exit(1);
        }

        if (!thirdArg || thirdArg === "status") {
          await cli.getSeasonStatus(seasonId);
        } else if (thirdArg === "end") {
          await cli.endSeason(seasonId);
        } else {
          console.error(`❌ Unknown season command: ${thirdArg}`);
          console.error('   Available commands: status, end');
          process.exit(1);
        }
        break;

      case "admins":
        if (!subcommand) {
          await cli.listAdmins();
        } else if (subcommand === "add") {
          await cli.addAdmin();
        } else if (subcommand === "remove") {
          await cli.removeAdmin();
        } else {
          console.error(`❌ Unknown admins subcommand: ${subcommand}`);
          console.error('   Available commands: add, remove');
          await cli.showHelp();
        }
        break;

      case "name":
        if (!subcommand) {
          console.error('❌ Usage: icphub name <name> [command]');
          console.error('   Example: icphub name "testname"');
          console.error('   Example: icphub name "testname" metadata');
          process.exit(1);
        }

        if (subcommand === "add") {
          if (!thirdArg || !args[3]) {
            console.error('❌ Usage: icphub name add <name> <principal-id>');
            console.error('   Example: icphub name add "newname" "rdmx6-jaaaa-aaaah-qcaiq-cai"');
            process.exit(1);
          }
          await cli.addNameToUser(thirdArg, args[3]);
        } else if (!thirdArg) {
          // Just show name status
          await cli.getNameStatus(subcommand);
        } else if (thirdArg === "metadata") {
          await cli.getNameMetadata(subcommand);
        } else if (thirdArg === "markdown") {
          await cli.getNameMarkdown(subcommand);
        } else if (thirdArg === "did") {
          await cli.getNameDid(subcommand);
        } else {
          console.error(`❌ Unknown name command: ${thirdArg}`);
          console.error('   Available commands: metadata, markdown, did');
          console.error('   Or use: icphub name add <name> <principal-id>');
          process.exit(1);
        }
        break;

      case "balance":
        // Direct dfx calls for balance (since TypeScript CLI is anonymous)
        console.log("💰 Canister Financial Status (via dfx)");
        console.log("========================================");
        try {
          const { spawn } = await import('child_process');

          // Get ICP balance
          const icpProcess = spawn('dfx', ['canister', 'call', 'context_registry', 'getIcpBalance', '--query'], { stdio: 'pipe' });
          let icpOutput = '';
          icpProcess.stdout?.on('data', (data) => {
            icpOutput += data.toString();
          });

          await new Promise((resolve) => {
            icpProcess.on('close', () => resolve(0));
          });

          // Get cycles balance
          const cyclesProcess = spawn('dfx', ['canister', 'call', 'context_registry', 'getCyclesBalance', '--query'], { stdio: 'pipe' });
          let cyclesOutput = '';
          cyclesProcess.stdout?.on('data', (data) => {
            cyclesOutput += data.toString();
          });

          await new Promise((resolve) => {
            cyclesProcess.on('close', () => resolve(0));
          });

          // Parse and format outputs
          const icpBalance = icpOutput.match(/\((\d+(?:_\d+)*)\s*:\s*nat\)/)?.[1]?.replace(/_/g, '') || '0';
          const cyclesBalance = cyclesOutput.match(/\((\d+(?:_\d+)*)\s*:\s*nat\)/)?.[1]?.replace(/_/g, '') || '0';

          const icpFormatted = (parseInt(icpBalance) / 100_000_000).toFixed(8);
          const cyclesFormatted = (parseInt(cyclesBalance) / 1_000_000_000_000).toFixed(2);

          console.log(`💰 ICP Balance: ${icpFormatted} ICP (${icpBalance} e8s)`);
          console.log(`⚡ Cycles Balance: ${cyclesFormatted}T cycles`);
          console.log(`📊 Note: ICP balance represents payments received for name registrations`);
        } catch (error) {
          console.error("❌ Error fetching balance:", error);
        }
        break;

      case "help":
      case "--help":
      case "-h":
        await cli.showHelp();
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        await cli.showHelp();
        process.exit(1);
    }

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}