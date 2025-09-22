#!/usr/bin/env node

import { ContextRegistryManager } from "../src/index.js";
import dotenv from "dotenv";
import { Principal } from "@dfinity/principal";

// Load environment variables
dotenv.config();

class ICPHubCLI {
  private manager: ContextRegistryManager;

  constructor() {
    this.manager = new ContextRegistryManager();
  }

  async init() {
    await this.manager.init(undefined, "http://localhost:4943");
  }

  async status() {
    console.log("🏢 ICP Hub Context Registry Status");
    console.log("=====================================");

    const actor = this.manager.getActor();
    if (!actor) throw new Error("Actor not initialized");

    try {
      // Get DFX identity info
      const { spawn } = await import('child_process');

      // Get current DFX principal
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

      // Get basic info
      const canisterId = process.env.CANISTER_ID_CONTEXT_REGISTRY;
      const currentTime = await actor.getCurrentTime();
      const version = await actor.getCanisterVersion();

      // Get admin principals
      const allAdmins = await actor.getAllAdmins();
      const adminCount = await actor.getAdminCount();

      // Check if DFX principal is admin
      const isDfxAdmin = allAdmins.some(admin => admin.toString() === dfxPrincipal);
      const dfxRole = isDfxAdmin ? 'admin' : 'user';

      console.log(`📍 Canister ID: ${canisterId}`);
      console.log(`🏷️  Version: ${version.major}.${version.minor}.${version.patch}`);
      console.log(`🕐 Current Time: ${new Date(Number(currentTime) / 1000000).toISOString()}`);
      console.log(`👤 Your DFX Identity: ${dfxPrincipal.substring(0, 20)}...`);
      console.log(`🔑 Admin Access: ${isDfxAdmin ? '✅' : '❌'}`);
      console.log(`👑 Admins (${adminCount}):`);
      if (allAdmins.length > 0) {
        allAdmins.forEach((admin, index) => {
          const isYou = admin.toString() === dfxPrincipal ? ' (You)' : '';
          console.log(`   ${index + 1}. ${admin.toString()}${isYou}`);
        });
      } else {
        console.log(`   No admins set`);
      }

      // Get seasons overview
      const seasons = await actor.listSeasons();
      console.log(`\n📅 Seasons Overview:`);
      console.log(`   Total Seasons: ${seasons.length}`);

      const activeSeasons = seasons.filter(s => 'active' in s.status);
      const draftSeasons = seasons.filter(s => 'draft' in s.status);
      const endedSeasons = seasons.filter(s => 'ended' in s.status);

      console.log(`   🟢 Active: ${activeSeasons.length}`);
      console.log(`   📝 Draft: ${draftSeasons.length}`);
      console.log(`   🔴 Ended: ${endedSeasons.length}`);

      // Get names overview
      const nameRecords = await actor.listNameRecords();
      console.log(`\n📝 Name Records:`);
      console.log(`   Total Registered Names: ${nameRecords.length}`);

      // Get file references overview
      const fileReferences = await actor.listFileReferences();
      console.log(`\n📁 File References:`);
      console.log(`   Total File References: ${fileReferences.length}`);

      // Show active season details if exists
      if (activeSeasons.length > 0) {
        const activeSeason = activeSeasons[0];
        const activeSeasonInfo = await actor.getActiveSeasonInfo();

        console.log(`\n🎯 Active Season Details:`);
        console.log(`   Name: ${activeSeason.name}`);
        console.log(`   ID: ${activeSeason.id}`);
        console.log(`   Available Names: ${activeSeasonInfo.availableNames}/${activeSeason.maxNames}`);
        console.log(`   Name Length: ${activeSeason.minNameLength}-${activeSeason.maxNameLength} chars`);
        console.log(`   Price: ${Number(activeSeason.price)} tokens`);
        console.log(`   End Time: ${new Date(Number(activeSeason.endTime) / 1000000).toISOString()}`);
      }

    } catch (error) {
      console.error("❌ Error fetching status:", error);
    }
  }

  async listSeasons() {
    console.log("📅 All Seasons");
    console.log("==============");

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
        console.log(`   Price: ${Number(season.price)} tokens`);

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

  async createSeason(name: string, startDateTime: string, endDateTime: string, maxNames: number, minLength: number, maxLength: number, price: number) {
    console.log(`🆕 Creating Season: ${name}`);
    console.log("========================");

    const actor = this.manager.getActor();
    if (!actor) throw new Error("Actor not initialized");

    try {
      // Get DFX identity to check admin
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

      // Check if DFX principal is admin
      const allAdmins = await actor.getAllAdmins();
      const isDfxAdmin = allAdmins.some(admin => admin.toString() === dfxPrincipal);

      if (!isDfxAdmin) {
        console.error("❌ Error: Only admins can create seasons");
        console.error(`   Your principal: ${dfxPrincipal}`);
        console.error(`   Use dfx commands if you are an admin`);
        return;
      }

      // Parse dates
      const startDate = this.parseDateTime(startDateTime);
      const endDate = this.parseDateTime(endDateTime);

      // Validate dates
      if (startDate >= endDate) {
        console.error("❌ Error: Start date must be before end date");
        return;
      }

      const now = new Date();
      const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));

      console.log(`📝 Parameters:`);
      console.log(`   Name: ${name}`);
      console.log(`   Max Names: ${maxNames}`);
      console.log(`   Name Length: ${minLength}-${maxLength} characters`);
      console.log(`   Price: ${price} tokens`);
      console.log(`   Duration: ${durationDays} days`);
      console.log(`   Start: ${startDate.toLocaleString()} (${startDate.toISOString()})`);
      console.log(`   End: ${endDate.toLocaleString()} (${endDate.toISOString()})`);

      // Note: Using dfx command for actual creation since TypeScript agent is anonymous
      console.log(`\n⚠️  Note: Since the TypeScript CLI connects anonymously,`);
      console.log(`   please use this dfx command to create the season:\n`);

      const startNano = Math.floor(startDate.getTime() * 1000000);
      const endNano = Math.floor(endDate.getTime() * 1000000);

      console.log(`dfx canister call context_registry createSeason \\`);
      console.log(`  '("${name}", ${startNano}, ${endNano}, ${maxNames}, ${minLength}, ${maxLength}, ${price})'`);

      console.log(`\nThen activate it with:`);
      console.log(`dfx canister call context_registry activateSeason '(<season-id>)'`);

      // Show current seasons list
      console.log(`\n📅 Current Seasons:`);
      await this.listSeasons();

    } catch (error) {
      console.error("❌ Error creating season:", error);
    }
  }

  async activateSeason(seasonId: number) {
    console.log(`🟢 Activating Season ${seasonId}`);
    console.log("=========================");

    const actor = this.manager.getActor();
    if (!actor) throw new Error("Actor not initialized");

    try {
      // Get season details first (read-only, works anonymously)
      const season = await actor.getSeason(BigInt(seasonId));
      console.log(`📝 Season Details:`);
      console.log(`   Name: ${season.name}`);
      console.log(`   Max Names: ${season.maxNames}`);
      console.log(`   Current Status: ${Object.keys(season.status)[0].toUpperCase()}`);

      if ('active' in season.status) {
        console.log(`⚠️  Season ${seasonId} is already active!`);
        return;
      }

      console.log(`\n⚠️  Note: Since the TypeScript CLI connects anonymously,`);
      console.log(`   please use this dfx command to activate the season:\n`);
      console.log(`dfx canister call context_registry activateSeason '(${seasonId})'`);
      console.log(``);

      // Show current seasons list for reference
      console.log(`📅 Current Seasons List:`);
      await this.listSeasons();

    } catch (error) {
      console.error("❌ Error getting season details:", error);
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
    console.log("💰 Wallet Information");
    console.log("====================");

    try {
      // Get current identity from dfx
      const { spawn } = await import('child_process');
      const { promisify } = await import('util');
      const execFile = promisify(spawn);

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
          console.log(`💰 ICP Balance: Not available (local development)`);
        }
      } catch {
        console.log(`💰 ICP Balance: Not available (local development)`);
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
          console.log(`⚡ Cycles Balance: Not available (local development)`);
        }
      } catch {
        console.log(`⚡ Cycles Balance: Not available (local development)`);
      }

      // Show role in canister
      const actor = this.manager.getActor();
      if (actor) {
        const allAdmins = await actor.getAllAdmins();
        const isDfxAdmin = allAdmins.some(admin => admin.toString() === currentPrincipal);
        const dfxRole = isDfxAdmin ? 'admin' : 'user';

        console.log(`\n🏢 Context Registry Role:`);
        console.log(`   Role: ${dfxRole}`);
        console.log(`   Admin Access: ${isDfxAdmin ? '✅' : '❌'}`);
      }

    } catch (error) {
      console.error("❌ Error getting wallet information:", error);
    }
  }

  async getSeasonStatus(seasonId: number) {
    console.log(`📅 Season ${seasonId} Status`);
    console.log("=======================");

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
      console.log(`   Price: ${Number(season.price)} tokens`);

      if ('active' in season.status) {
        const activeSeasonInfo = await actor.getActiveSeasonInfo();
        console.log(`   🎯 Available Names: ${activeSeasonInfo.availableNames}/${season.maxNames}`);
        console.log(`   📊 Registered: ${season.maxNames - activeSeasonInfo.availableNames}/${season.maxNames}`);

        if (endDate > now) {
          const timeLeft = Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
          console.log(`   ⏰ Time Remaining: ${timeLeft} days`);
        }
      }

    } catch (error) {
      console.error("❌ Error fetching season status:", error);
    }
  }

  async listAdmins() {
    console.log("👑 Admin Users");
    console.log("==============");

    const actor = this.manager.getActor();
    if (!actor) throw new Error("Actor not initialized");

    try {
      const admins = await actor.getAllAdmins();
      const adminCount = await actor.getAdminCount();

      console.log(`Total Admins: ${adminCount}`);

      if (admins.length === 0) {
        console.log("No admins found.");
        return;
      }

      // Get current DFX principal for comparison
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

      admins.forEach((admin, index) => {
        const isYou = admin.toString() === dfxPrincipal ? ' (You)' : '';
        console.log(`${index + 1}. ${admin.toString()}${isYou}`);
      });

    } catch (error) {
      console.error("❌ Error fetching admins:", error);
    }
  }

  async addAdmin(principalId: string) {
    console.log(`👑 Adding Admin: ${principalId}`);
    console.log("============================");

    console.log(`⚠️  Note: Since the TypeScript CLI connects anonymously,`);
    console.log(`   please use this dfx command to add the admin:\n`);
    console.log(`dfx canister call context_registry assignCallerUserRole '(principal "${principalId}", variant { admin })'`);
    console.log(``);
    console.log(`Current admins list:`);
    await this.listAdmins();
  }

  async removeAdmin(principalId: string) {
    console.log(`👑 Removing Admin: ${principalId}`);
    console.log("===============================");

    console.log(`⚠️  Note: Since the TypeScript CLI connects anonymously,`);
    console.log(`   please use this dfx command to remove the admin:\n`);
    console.log(`dfx canister call context_registry assignCallerUserRole '(principal "${principalId}", variant { user })'`);
    console.log(``);
    console.log(`⚠️  Warning: Cannot remove if only one admin left!`);
    console.log(``);
    console.log(`Current admins list:`);
    await this.listAdmins();
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

  async showHelp() {
    console.log(`🏢 ICP Hub Context Registry CLI`);
    console.log(`==============================`);
    console.log(``);
    console.log(`📊 Status & Info:`);
    console.log(`  icphub status                    Show canister status and overview`);
    console.log(`  icphub wallet                    Show wallet info and balances`);
    console.log(``);
    console.log(`📅 Season Management:`);
    console.log(`  icphub seasons                   List all seasons`);
    console.log(`  icphub seasons add <name> <start> <end> <maxNames> <minLen> <maxLen> <price>`);
    console.log(`                                   Create new season with date/time`);
    console.log(`  icphub seasons activate <id>     Activate a season`);
    console.log(`  icphub seasons end <id>          End a season`);
    console.log(`  icphub season <id> status        Show specific season status`);
    console.log(``);
    console.log(`👑 Admin Management:`);
    console.log(`  icphub admins                    List all admins`);
    console.log(`  icphub admins add <principal>    Add new admin (shows dfx command)`);
    console.log(`  icphub admins remove <principal> Remove admin (shows dfx command)`);
    console.log(``);
    console.log(`📝 Name Management:`);
    console.log(`  icphub name <name>               Show name status and info`);
    console.log(`  icphub name <name> metadata      Show name metadata content`);
    console.log(`  icphub name <name> markdown      Show name markdown content`);
    console.log(`  icphub name <name> did           Show name DID file`);
    console.log(`  icphub name add <name> <userId>  Add name to user (shows dfx command)`);
    console.log(``);
    console.log(`📝 Examples:`);
    console.log(`  icphub status`);
    console.log(`  icphub wallet`);
    console.log(`  icphub seasons`);
    console.log(`  icphub season 1 status`);
    console.log(`  icphub seasons add "Spring 2025" "01/03/2025 09:00" "31/05/2025 18:00" 100 3 20 1000000`);
    console.log(`  icphub seasons activate 1`);
    console.log(`  icphub admins`);
    console.log(`  icphub admins add "rdmx6-jaaaa-aaaah-qcaiq-cai"`);
    console.log(`  icphub name "testname"`);
    console.log(`  icphub name "testname" metadata`);
    console.log(`  icphub name add "newname" "rdmx6-jaaaa-aaaah-qcaiq-cai"`);
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
    await cli.init();

    switch (command) {
      case "status":
        await cli.status();
        break;

      case "wallet":
        await cli.showWallet();
        break;

      case "seasons":
        if (!subcommand) {
          await cli.listSeasons();
        } else if (subcommand === "add") {
          if (args.length < 9) {
            console.error('❌ Usage: icphub seasons add <name> <start> <end> <maxNames> <minLen> <maxLen> <price>');
            console.error('   Example: icphub seasons add "Spring 2025" "01/03/2025 09:00" "31/05/2025 18:00" 100 3 20 1000000');
            console.error('');
            console.error('   Date formats supported:');
            console.error('     - DD/MM/YYYY HH:MM  (e.g., "20/09/2025 09:00")');
            console.error('     - YYYY-MM-DD HH:MM  (e.g., "2025-09-20 09:00")');
            process.exit(1);
          }

          const [, , name, startDate, endDate, maxNames, minLen, maxLen, price] = args;
          await cli.createSeason(
            name,
            startDate,
            endDate,
            parseInt(maxNames),
            parseInt(minLen),
            parseInt(maxLen),
            parseInt(price)
          );
        } else if (subcommand === "activate") {
          if (!args[2]) {
            console.error('❌ Usage: icphub seasons activate <seasonId>');
            process.exit(1);
          }
          await cli.activateSeason(parseInt(args[2]));
        } else if (subcommand === "end") {
          if (!args[2]) {
            console.error('❌ Usage: icphub seasons end <seasonId>');
            process.exit(1);
          }
          await cli.endSeason(parseInt(args[2]));
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

        if (thirdArg === "status") {
          await cli.getSeasonStatus(seasonId);
        } else if (thirdArg === "activate") {
          await cli.activateSeason(seasonId);
        } else if (thirdArg === "end") {
          await cli.endSeason(seasonId);
        } else {
          console.error(`❌ Unknown season command: ${thirdArg}`);
          console.error('   Available commands: status, activate, end');
          process.exit(1);
        }
        break;

      case "admins":
        if (!subcommand) {
          await cli.listAdmins();
        } else if (subcommand === "add") {
          if (!thirdArg) {
            console.error('❌ Usage: icphub admins add <principal-id>');
            console.error('   Example: icphub admins add "rdmx6-jaaaa-aaaah-qcaiq-cai"');
            process.exit(1);
          }
          await cli.addAdmin(thirdArg);
        } else if (subcommand === "remove") {
          if (!thirdArg) {
            console.error('❌ Usage: icphub admins remove <principal-id>');
            console.error('   Example: icphub admins remove "rdmx6-jaaaa-aaaah-qcaiq-cai"');
            process.exit(1);
          }
          await cli.removeAdmin(thirdArg);
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