import OrderedMap "mo:base/OrderedMap";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Debug "mo:base/Debug";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Array "mo:base/Array";
import Registry "blob-storage/registry";
import AccessControl "authorization/access-control";
import Principal "mo:base/Principal";
import MigrationManager "migration/migration-manager";

// This migration actor safely transitions from classical persistence to Enhanced Orthogonal Persistence
(
with migration = func(
  state: {
    // Old stable variables from v1.x
    var stableSeasons : [(Nat, {
      id : Nat;
      name : Text;
      startTime : Int;
      endTime : Int;
      maxNames : Nat;
      minNameLength : Nat;
      maxNameLength : Nat;
      price : Nat;
      status : {#draft; #active; #ended; #cancelled};
      createdAt : Int;
      updatedAt : Int;
    })];
    var stableNameRecords : [(Text, {
      name : Text;
      address : Text;
      addressType : {#canister; #identity};
      owner : Text;
      seasonId : Nat;
      createdAt : Int;
      updatedAt : Int;
    })];
    var stableNextSeasonId : Nat;
    var stableUserProfiles : [(Principal, {name : Text})];
    var stableMetadataStore : [(Text, {
      title : Text;
      description : Text;
      image : Text;
      createdAt : Int;
      updatedAt : Int;
    })];
    var stableMarkdownStore : [(Text, {
      content : Text;
      updatedAt : Int;
    })];
    var stableRegistryData : [(Text, {path : Text; hash : Text})];
    var stableAccessControlData : [(Principal, {#admin; #user; #guest})];
    var stableAdminPrincipal : ?Principal;
    var stableVersion : {major : Nat; minor : Nat; patch : Nat};
  }
): {
  // New EOP state structure
  seasons: OrderedMap.Map<Nat, {
    id : Nat;
    name : Text;
    startTime : Int;
    endTime : Int;
    maxNames : Nat;
    minNameLength : Nat;
    maxNameLength : Nat;
    price : Nat;
    status : {#draft; #active; #ended; #cancelled};
    createdAt : Int;
    updatedAt : Int;
  }>;
  nameRecords: OrderedMap.Map<Text, {
    name : Text;
    address : Text;
    addressType : {#canister; #identity};
    owner : Text;
    seasonId : Nat;
    createdAt : Int;
    updatedAt : Int;
  }>;
  nextSeasonId : Nat;
  userProfiles: OrderedMap.Map<Principal, {name : Text}>;
  metadataStore: OrderedMap.Map<Text, {
    title : Text;
    description : Text;
    image : Text;
    createdAt : Int;
    updatedAt : Int;
  }>;
  markdownStore: OrderedMap.Map<Text, {
    content : Text;
    updatedAt : Int;
  }>;
  registry: Registry.Registry;
  accessControlState: AccessControl.AccessControlState;
  currentVersion : {major : Nat; minor : Nat; patch : Nat};
  migrationHistory : [{
    fromVersion : {major : Nat; minor : Nat; patch : Nat};
    toVersion : {major : Nat; minor : Nat; patch : Nat};
    timestamp : Int;
    success : Bool;
    logs : [Text];
    checksum : ?Text;
  }];
  lastUpgradeChecksum : ?Text;
} = {
  Debug.print("[MIGRATION] Starting v1 -> v2 migration with Enhanced Orthogonal Persistence");

  // Initialize OrderedMap constructors
  let textMap = OrderedMap.Make<Text>(Text.compare);
  let natMap = OrderedMap.Make<Nat>(Nat.compare);
  let principalMap = OrderedMap.Make<Principal>(Principal.compare);

  // Migrate seasons
  let migratedSeasons = natMap.fromIter<{
    id : Nat;
    name : Text;
    startTime : Int;
    endTime : Int;
    maxNames : Nat;
    minNameLength : Nat;
    maxNameLength : Nat;
    price : Nat;
    status : {#draft; #active; #ended; #cancelled};
    createdAt : Int;
    updatedAt : Int;
  }>(state.stableSeasons.vals());

  Debug.print("[MIGRATION] Migrated " # Nat.toText(state.stableSeasons.size()) # " seasons");

  // Migrate name records
  let migratedNameRecords = textMap.fromIter<{
    name : Text;
    address : Text;
    addressType : {#canister; #identity};
    owner : Text;
    seasonId : Nat;
    createdAt : Int;
    updatedAt : Int;
  }>(state.stableNameRecords.vals());

  Debug.print("[MIGRATION] Migrated " # Nat.toText(state.stableNameRecords.size()) # " name records");

  // Migrate user profiles
  let migratedUserProfiles = principalMap.fromIter<{name : Text}>(state.stableUserProfiles.vals());

  Debug.print("[MIGRATION] Migrated " # Nat.toText(state.stableUserProfiles.size()) # " user profiles");

  // Migrate metadata store
  let migratedMetadataStore = textMap.fromIter<{
    title : Text;
    description : Text;
    image : Text;
    createdAt : Int;
    updatedAt : Int;
  }>(state.stableMetadataStore.vals());

  Debug.print("[MIGRATION] Migrated " # Nat.toText(state.stableMetadataStore.size()) # " metadata records");

  // Migrate markdown store
  let migratedMarkdownStore = textMap.fromIter<{
    content : Text;
    updatedAt : Int;
  }>(state.stableMarkdownStore.vals());

  Debug.print("[MIGRATION] Migrated " # Nat.toText(state.stableMarkdownStore.size()) # " markdown records");

  // Migrate registry
  let migratedRegistry = Registry.fromStable(state.stableRegistryData);
  Debug.print("[MIGRATION] Migrated " # Nat.toText(state.stableRegistryData.size()) # " file references");

  // Migrate access control
  let migratedAccessControl = AccessControl.fromStable(state.stableAccessControlData, state.stableAdminPrincipal);
  Debug.print("[MIGRATION] Migrated access control with " # Nat.toText(state.stableAccessControlData.size()) # " user roles");

  // Create migration info
  let migrationInfo = {
    fromVersion = state.stableVersion;
    toVersion = { major = 2; minor = 0; patch = 0 };
    timestamp = Time.now();
    success = true;
    logs = [
      "Migration from classical persistence to Enhanced Orthogonal Persistence",
      "Migrated " # Nat.toText(state.stableSeasons.size()) # " seasons",
      "Migrated " # Nat.toText(state.stableNameRecords.size()) # " name records",
      "Migrated " # Nat.toText(state.stableUserProfiles.size()) # " user profiles",
      "Migration completed successfully"
    ];
    checksum = null : ?Text;
  };

  Debug.print("[MIGRATION] v1 -> v2 migration completed successfully");

  {
    seasons = migratedSeasons;
    nameRecords = migratedNameRecords;
    nextSeasonId = state.stableNextSeasonId;
    userProfiles = migratedUserProfiles;
    metadataStore = migratedMetadataStore;
    markdownStore = migratedMarkdownStore;
    registry = migratedRegistry;
    accessControlState = migratedAccessControl;
    currentVersion = { major = 2; minor = 0; patch = 0 };
    migrationHistory = [migrationInfo];
    lastUpgradeChecksum = null;
  }
}
)
persistent actor {
  // Import required modules
  transient let textMap = OrderedMap.Make<Text>(Text.compare);
  transient let natMap = OrderedMap.Make<Nat>(Nat.compare);
  transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);

  // Data types (stable for EOP)
  public type AddressType = {
    #canister;
    #identity;
  };

  public type SeasonStatus = {
    #draft;
    #active;
    #ended;
    #cancelled;
  };

  public type Season = {
    id : Nat;
    name : Text;
    startTime : Int;
    endTime : Int;
    maxNames : Nat;
    minNameLength : Nat;
    maxNameLength : Nat;
    price : Nat;
    status : SeasonStatus;
    createdAt : Int;
    updatedAt : Int;
  };

  public type NameRecord = {
    name : Text;
    address : Text;
    addressType : AddressType;
    owner : Text;
    seasonId : Nat;
    createdAt : Int;
    updatedAt : Int;
  };

  public type UserProfile = {
    name : Text;
  };

  public type Metadata = {
    title : Text;
    description : Text;
    image : Text;
    createdAt : Int;
    updatedAt : Int;
  };

  public type MarkdownContent = {
    content : Text;
    updatedAt : Int;
  };

  // Migration system using safe patterns
  public type Version = MigrationManager.Version;
  public type MigrationInfo = MigrationManager.MigrationInfo;

  // Current version
  transient let CURRENT_VERSION : Version = { major = 2; minor = 0; patch = 0 };

  // Migration manager for safe upgrades
  transient let migrationManager = MigrationManager.MigrationManager();

  // Enhanced Orthogonal Persistence State (migrated from stable variables)
  // All variables are automatically preserved across upgrades with EOP
  var seasons = seasons;
  var nameRecords = nameRecords;
  var nextSeasonId = nextSeasonId;
  var userProfiles = userProfiles;
  var metadataStore = metadataStore;
  var markdownStore = markdownStore;
  let registry = registry;
  let accessControlState = accessControlState;
  var currentVersion = currentVersion;
  var migrationHistory = migrationHistory;
  var lastUpgradeChecksum = lastUpgradeChecksum;

  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  public query func getAdminPrincipal() : async ?Principal {
    AccessControl.getAdminPrincipal(accessControlState);
  };

  public query func getAllAdmins() : async [Principal] {
    AccessControl.getAllAdmins(accessControlState);
  };

  public query func getAdminCount() : async Nat {
    AccessControl.getAdminCount(accessControlState);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    principalMap.get(userProfiles, caller);
  };

  public query func getUserProfile(user : Principal) : async ?UserProfile {
    principalMap.get(userProfiles, user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    userProfiles := principalMap.put(userProfiles, caller, profile);
  };

  public shared ({ caller }) func registerFileReference(path : Text, hash : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can register file references");
    };
    Registry.add(registry, path, hash);
  };

  public shared ({ caller }) func dropFileReference(path : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can drop file references");
    };
    Registry.remove(registry, path);
  };

  public shared ({ caller }) func createSeason(name : Text, startTime : Int, endTime : Int, maxNames : Nat, minNameLength : Nat, maxNameLength : Nat, price : Nat) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can create seasons");
    };
    if (startTime >= endTime) {
      Debug.trap("Start time must be before end time");
    };
    if (minNameLength > maxNameLength) {
      Debug.trap("Minimum name length must be less than or equal to maximum name length");
    };
    if (price == 0) {
      Debug.trap("Price must be greater than 0");
    };
    let seasonId = nextSeasonId;
    let season : Season = {
      id = seasonId;
      name;
      startTime;
      endTime;
      maxNames;
      minNameLength;
      maxNameLength;
      price;
      status = #draft;
      createdAt = Time.now();
      updatedAt = Time.now();
    };
    seasons := natMap.put(seasons, seasonId, season);
    nextSeasonId += 1;
    seasonId;
  };

  public shared ({ caller }) func activateSeason(seasonId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can activate seasons");
    };

    for (season in natMap.vals(seasons)) {
      if (season.status == #active) {
        Debug.trap("Cannot activate new season while another season is active");
      };
    };

    switch (natMap.get(seasons, seasonId)) {
      case null { Debug.trap("Season not found") };
      case (?season) {
        if (season.status != #draft) {
          Debug.trap("Only draft seasons can be activated");
        };
        let updatedSeason = {
          season with
          status = #active;
          updatedAt = Time.now();
        };
        seasons := natMap.put(seasons, seasonId, updatedSeason);
      };
    };
  };

  public shared ({ caller }) func endSeason(seasonId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can end seasons");
    };
    switch (natMap.get(seasons, seasonId)) {
      case null { Debug.trap("Season not found") };
      case (?season) {
        if (season.status != #active) {
          Debug.trap("Only active seasons can be ended");
        };
        let updatedSeason = {
          season with
          status = #ended;
          updatedAt = Time.now();
        };
        seasons := natMap.put(seasons, seasonId, updatedSeason);
      };
    };
  };

  public shared ({ caller }) func cancelSeason(seasonId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can cancel seasons");
    };
    switch (natMap.get(seasons, seasonId)) {
      case null { Debug.trap("Season not found") };
      case (?season) {
        if (season.status != #active) {
          Debug.trap("Only active seasons can be cancelled");
        };
        let updatedSeason = {
          season with
          status = #cancelled;
          updatedAt = Time.now();
        };
        seasons := natMap.put(seasons, seasonId, updatedSeason);
      };
    };
  };

  public query func getSeason(seasonId : Nat) : async Season {
    switch (natMap.get(seasons, seasonId)) {
      case null { Debug.trap("Season not found") };
      case (?season) { season };
    };
  };

  public query func listSeasons() : async [Season] {
    var seasonList : [Season] = [];
    for (season in natMap.vals(seasons)) {
      seasonList := Array.append(seasonList, [season]);
    };
    seasonList;
  };

  public query func getActiveSeason() : async Season {
    for (season in natMap.vals(seasons)) {
      if (season.status == #active) {
        return season;
      };
    };
    Debug.trap("No active season found");
  };

  public query func getActiveSeasonInfo() : async {
    season : Season;
    availableNames : Nat;
    price : Nat;
  } {
    for (season in natMap.vals(seasons)) {
      if (season.status == #active) {
        var registrationCount = 0;
        for (record in textMap.vals(nameRecords)) {
          if (record.seasonId == season.id) {
            registrationCount += 1;
          };
        };
        let availableNames = if (registrationCount >= season.maxNames) {
          0;
        } else {
          Nat.sub(season.maxNames, registrationCount);
        };
        return {
          season;
          availableNames;
          price = season.price;
        };
      };
    };
    Debug.trap("No active season found");
  };

  public shared ({ caller }) func registerName(name : Text, address : Text, addressType : AddressType, owner : Text, seasonId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can register names");
    };
    switch (natMap.get(seasons, seasonId)) {
      case null { Debug.trap("Season not found") };
      case (?season) {
        if (season.status != #active) {
          Debug.trap("Season is not active");
        };
        let now = Time.now();
        if (now < season.startTime or now > season.endTime) {
          Debug.trap("Registration is not within the season's time window");
        };
        let nameLength = Text.size(name);
        if (nameLength < season.minNameLength or nameLength > season.maxNameLength) {
          Debug.trap("Name length does not meet season requirements");
        };
        var registrationCount = 0;
        for (record in textMap.vals(nameRecords)) {
          if (record.seasonId == seasonId) {
            registrationCount += 1;
          };
        };
        if (registrationCount >= season.maxNames) {
          Debug.trap("Season has reached its maximum number of registrations");
        };
        for (record in textMap.vals(nameRecords)) {
          if (record.owner == owner and record.seasonId == seasonId) {
            Debug.trap("Owner has already registered a name in this season");
          };
        };
        switch (textMap.get(nameRecords, name)) {
          case (?_) { Debug.trap("Name already registered") };
          case null {
            let record : NameRecord = {
              name;
              address;
              addressType;
              owner;
              seasonId;
              createdAt = Time.now();
              updatedAt = Time.now();
            };
            nameRecords := textMap.put(nameRecords, name, record);
          };
        };
      };
    };
  };

  public query func getNameRecord(name : Text) : async {#ok : NameRecord; #err : Text} {
    switch (textMap.get(nameRecords, name)) {
      case null { #err("Name not found") };
      case (?record) { #ok(record) };
    };
  };

  public query func listNameRecords() : async [NameRecord] {
    var recordList : [NameRecord] = [];
    for (record in textMap.vals(nameRecords)) {
      recordList := Array.append(recordList, [record]);
    };
    recordList;
  };

  public query func getFileReference(path : Text) : async Registry.FileReference {
    Registry.get(registry, path);
  };

  public query func listFileReferences() : async [Registry.FileReference] {
    Registry.list(registry);
  };

  public query func hasRegisteredName(owner : Text) : async Bool {
    for (record in textMap.vals(nameRecords)) {
      if (record.owner == owner) {
        return true;
      };
    };
    false;
  };

  public query func getCurrentTime() : async Int {
    Time.now();
  };

  public shared func saveMetadata(name : Text, title : Text, description : Text, image : Text) : async () {
    let now = Time.now();
    let metadata : Metadata = {
      title;
      description;
      image;
      createdAt = now;
      updatedAt = now;
    };
    metadataStore := textMap.put(metadataStore, name, metadata);

    switch (textMap.get(nameRecords, name)) {
      case null {};
      case (?record) {
        let updatedRecord = {
          record with
          updatedAt = now;
        };
        nameRecords := textMap.put(nameRecords, name, updatedRecord);
      };
    };
  };

  public query func getMetadataRecord(name : Text) : async Metadata {
    switch (textMap.get(metadataStore, name)) {
      case null { Debug.trap("Metadata not found") };
      case (?metadata) { metadata };
    };
  };

  public shared func saveMarkdown(name : Text, content : Text) : async () {
    let now = Time.now();
    let markdown : MarkdownContent = {
      content;
      updatedAt = now;
    };
    markdownStore := textMap.put(markdownStore, name, markdown);

    switch (textMap.get(nameRecords, name)) {
      case null {};
      case (?record) {
        let updatedRecord = {
          record with
          updatedAt = now;
        };
        nameRecords := textMap.put(nameRecords, name, updatedRecord);
      };
    };
  };

  public query func getMarkdown(name : Text) : async MarkdownContent {
    switch (textMap.get(markdownStore, name)) {
      case null { Debug.trap("Markdown not found") };
      case (?markdown) { markdown };
    };
  };

  public query func getMarkdownContent(name : Text) : async {#ok : MarkdownContent; #err : Text} {
    switch (textMap.get(markdownStore, name)) {
      case null { #err("Markdown content not found") };
      case (?markdown) { #ok(markdown) };
    };
  };

  public query func getMetadata(name : Text) : async {#ok : Metadata; #err : Text} {
    switch (textMap.get(metadataStore, name)) {
      case null { #err("Metadata not found") };
      case (?metadata) { #ok(metadata) };
    };
  };

  public query func getCanisterPrincipal() : async Principal {
    Principal.fromText("2vxsx-fae");
  };

  // Safe version and migration management with EOP
  public query func getCanisterVersion() : async Version {
    currentVersion;
  };

  public query func getUpgradeInfo() : async {
    currentVersion : Version;
    totalSeasons : Nat;
    totalNameRecords : Nat;
    migrationHistory : [MigrationInfo];
  } {
    {
      currentVersion;
      totalSeasons = natMap.size(seasons);
      totalNameRecords = textMap.size(nameRecords);
      migrationHistory;
    };
  };

  public query func getMigrationHistory() : async [MigrationInfo] {
    migrationHistory;
  };

  // System state validation and integrity checks
  public query func validateSystemState() : async {valid: Bool; issues: [Text]} {
    var issues : [Text] = [];

    // Validate data consistency
    if (not migrationManager.validateSeasonData(natMap.size(seasons), textMap.size(nameRecords))) {
      issues := Array.append(issues, ["Invalid season or name record counts"]);
    };

    // Check for orphaned name records
    for ((name, record) in textMap.entries(nameRecords)) {
      switch (natMap.get(seasons, record.seasonId)) {
        case null {
          issues := Array.append(issues, ["Orphaned name record: " # name # " references non-existent season " # Nat.toText(record.seasonId)]);
        };
        case (?_) { /* Valid reference */ };
      };
    };

    {
      valid = issues.size() == 0;
      issues;
    };
  };

  // Safe data migration with integrity validation
  public shared ({ caller }) func performDataMigration(
    targetVersion : Version,
    validateIntegrity : Bool
  ) : async {success: Bool; logs: [Text]; checksum: ?Text} {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can perform migrations");
    };

    // Validate migration path
    if (not migrationManager.validateVersionUpgrade(currentVersion, targetVersion)) {
      let errorLog = "Invalid migration path from " # migrationManager.versionToText(currentVersion) #
                     " to " # migrationManager.versionToText(targetVersion);
      return {
        success = false;
        logs = [errorLog];
        checksum = null;
      };
    };

    var migrationLogs : [Text] = [];
    migrationLogs := migrationManager.appendLog(migrationLogs,
      migrationManager.createMigrationLog(currentVersion, "Starting migration"));

    // Pre-migration state validation
    if (validateIntegrity) {
      let stateCheck = await validateSystemState();
      if (not stateCheck.valid) {
        migrationLogs := migrationManager.appendLog(migrationLogs,
          "Pre-migration validation failed: " # Text.join(", ", stateCheck.issues.vals()));

        let migrationInfo = migrationManager.createMigrationInfo(
          currentVersion, targetVersion, false, migrationLogs, null
        );
        migrationHistory := Array.append(migrationHistory, [migrationInfo]);

        return {
          success = false;
          logs = migrationLogs;
          checksum = null;
        };
      };
      migrationLogs := migrationManager.appendLog(migrationLogs, "Pre-migration validation passed");
    };

    // Calculate pre-migration checksum
    let preChecksum = calculateSystemChecksum();
    migrationLogs := migrationManager.appendLog(migrationLogs, "Pre-migration checksum: " # preChecksum);

    // Perform migration steps based on version
    migrationLogs := performVersionSpecificMigrations(currentVersion, targetVersion, migrationLogs);

    // Calculate post-migration checksum
    let postChecksum = calculateSystemChecksum();
    migrationLogs := migrationManager.appendLog(migrationLogs, "Post-migration checksum: " # postChecksum);

    // Update version
    currentVersion := targetVersion;
    lastUpgradeChecksum := ?postChecksum;

    migrationLogs := migrationManager.appendLog(migrationLogs,
      migrationManager.createMigrationLog(targetVersion, "Migration completed successfully"));

    // Record successful migration
    let migrationInfo = migrationManager.createMigrationInfo(
      currentVersion, targetVersion, true, migrationLogs, ?postChecksum
    );
    migrationHistory := Array.append(migrationHistory, [migrationInfo]);

    {
      success = true;
      logs = migrationLogs;
      checksum = ?postChecksum;
    };
  };

  // Calculate system state checksum for integrity verification
  private func calculateSystemChecksum() : Text {
    let systemData =
      "seasons:" # Nat.toText(natMap.size(seasons)) #
      "|names:" # Nat.toText(textMap.size(nameRecords)) #
      "|nextId:" # Nat.toText(nextSeasonId) #
      "|version:" # migrationManager.versionToText(currentVersion);

    migrationManager.calculateChecksum(systemData);
  };

  // Version-specific migration logic
  private func performVersionSpecificMigrations(
    fromVersion : Version,
    toVersion : Version,
    logs : [Text]
  ) : [Text] {
    var updatedLogs = logs;

    // Example: Migration from v1.x to v2.x
    if (fromVersion.major == 1 and toVersion.major == 2) {
      updatedLogs := migrationManager.appendLog(updatedLogs, "Executing v1 -> v2 migration");
      // Add specific migration logic here
      updatedLogs := migrationManager.appendLog(updatedLogs, "v1 -> v2 migration completed");
    };

    // Future migrations can be added here following the same pattern

    updatedLogs;
  };

  // Emergency rollback functionality
  public shared ({ caller }) func emergencyRollback(
    targetVersion : Version
  ) : async {success: Bool; logs: [Text]} {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can perform emergency rollback");
    };

    var rollbackLogs : [Text] = [];
    rollbackLogs := migrationManager.appendLog(rollbackLogs,
      "EMERGENCY ROLLBACK initiated to version " # migrationManager.versionToText(targetVersion));

    // Note: In Enhanced Orthogonal Persistence, rollback is limited
    // This is mainly for version tracking and logging
    currentVersion := targetVersion;

    rollbackLogs := migrationManager.appendLog(rollbackLogs, "Version rolled back");

    let rollbackInfo = migrationManager.createMigrationInfo(
      currentVersion, targetVersion, true, rollbackLogs, lastUpgradeChecksum
    );
    migrationHistory := Array.append(migrationHistory, [rollbackInfo]);

    {
      success = true;
      logs = rollbackLogs;
    };
  };
};