import OrderedMap "mo:base/OrderedMap";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Debug "mo:base/Debug";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Registry "blob-storage/registry";
import AccessControl "authorization/access-control";
import Principal "mo:base/Principal";
import MigrationManager "migration/migration-manager";
import Result "mo:base/Result";
import Blob "mo:base/Blob";
import ExperimentalCycles "mo:base/ExperimentalCycles";
import Set "mo:base/HashMap";

// Enhanced Orthogonal Persistence Actor - Safe Migration Pattern
persistent actor Self {
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

  // Payment and subscription types
  public type PaymentStatus = {
    #pending;
    #completed;
    #failed;
    #refunded;
  };

  public type SubscriptionType = {
    #basic;
    #premium;
    #enterprise;
  };

  public type Payment = {
    id : Nat;
    payer : Principal;
    amount : Nat; // Amount in e8s (1 ICP = 100_000_000 e8s)
    subscriptionType : SubscriptionType;
    status : PaymentStatus;
    txHash : ?Text; // Transaction hash for verification
    createdAt : Int;
    updatedAt : Int;
  };

  public type Subscription = {
    user : Principal;
    registeredName : Text;
    subscriptionType : SubscriptionType;
    startTime : Int;
    endTime : Int;
    paymentId : Nat;
    isActive : Bool;
    createdAt : Int;
  };

  public type TransferArgs = {
    to : Principal;
    amount : Nat;
    memo : ?Blob;
  };

  public type TransferResult = Result.Result<Nat, Text>;

  // Enhanced payment record with blockchain verification (PRD requirement)
  public type VerifiedPayment = {
    id : Nat;
    payer : Principal;
    amount : Nat;
    blockIndex : Nat;
    transactionHash : ?Text;
    verifiedAt : Int;
    registrationId : ?Nat;
  };

  // ICP Ledger types for integration
  public type Account = {
    owner : Principal;
    subaccount : ?[Nat8];
  };

  public type QueryBlocksRequest = {
    start : Nat;
    length : Nat;
  };

  public type Block = {
    transaction : Transaction;
    timestamp : Int;
    parent_hash : ?[Nat8];
  };

  public type Transaction = {
    operation : Operation;
    memo : Nat64;
    icrc1_memo : ?[Nat8];
    created_at_time : ?Int;
  };

  public type Operation = {
    #Burn : { from : Account; amount : Nat; spender : ?Account };
    #Mint : { to : Account; amount : Nat };
    #Transfer : { from : Account; to : Account; amount : Nat; fee : ?Nat; spender : ?Account };
  };

  public type QueryBlocksResponse = {
    chain_length : Nat;
    certificate : ?[Nat8];
    blocks : [Block];
    first_block_index : Nat;
    archived_blocks : [ArchivedBlockRange];
  };

  public type ArchivedBlockRange = {
    start : Nat;
    length : Nat;
    callback : shared query (QueryBlocksRequest) -> async QueryBlocksResponse;
  };

  // Migration system using safe patterns
  public type Version = MigrationManager.Version;
  public type MigrationInfo = MigrationManager.MigrationInfo;

  // Current version
  transient let CURRENT_VERSION : Version = { major = 1; minor = 0; patch = 1 };

  // Migration manager for safe upgrades
  transient let migrationManager = MigrationManager.MigrationManager();

  // Enhanced Orthogonal Persistence State
  // All variables are automatically preserved across upgrades with EOP
  var seasons = natMap.empty<Season>();
  var nameRecords = textMap.empty<NameRecord>();
  var nextSeasonId : Nat = 1;
  var userProfiles = principalMap.empty<UserProfile>();
  var metadataStore = textMap.empty<Metadata>();
  var markdownStore = textMap.empty<MarkdownContent>();
  let registry = Registry.new();
  let accessControlState = AccessControl.initState();
  var currentVersion : Version = CURRENT_VERSION;
  var migrationHistory : [MigrationInfo] = [];
  var lastUpgradeChecksum : ?Text = null;

  // Payment and subscription state
  var payments = natMap.empty<Payment>();
  var subscriptions = principalMap.empty<Subscription>();
  var nextPaymentId : Nat = 1;
  var icpBalance : Nat = 0; // Track ICP balance in e8s

  // Payment verification state (PRD requirement)
  var verifiedPayments = natMap.empty<VerifiedPayment>();
  var usedBlockIndices = natMap.empty<Bool>(); // Track used block indices to prevent replay attacks
  var nextVerifiedPaymentId : Nat = 1;

  // ICP Ledger canister ID (mainnet)
  let ICP_LEDGER_CANISTER_ID : Principal = Principal.fromText("rrkah-fqaaa-aaaaa-aaaaq-cai");

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

  // Helper function to check if a principal already has any registered name
  private func principalHasRegisteredName(principalId : Principal) : Bool {
    let principalText = Principal.toText(principalId);
    for (record in textMap.vals(nameRecords)) {
      if (record.owner == principalText) {
        return true;
      };
    };
    false;
  };

  // Account ID utility functions (for ICP payment verification)

  // Convert Principal to Account ID (32-byte identifier used by ICP Ledger)
  // Simplified version: for payment verification, we check if recipient owner matches our principal
  private func getCanisterAccountOwner() : Principal {
    // For ICP transfers, the account owner is the canister principal itself
    // The account ID conversion happens in the ledger, but the owner field still shows the principal
    Principal.fromActor(Self);
  };

  // Payment verification functions (PRD requirement)

  // Check if a block index has been used to prevent replay attacks
  private func isBlockIndexUsed(blockIndex : Nat) : Bool {
    switch (natMap.get(usedBlockIndices, blockIndex)) {
      case null { false };
      case (?_) { true };
    };
  };

  // Mark a block index as used
  private func markBlockIndexUsed(blockIndex : Nat) : () {
    usedBlockIndices := natMap.put(usedBlockIndices, blockIndex, true);
  };

  // Query the ICP Ledger to verify payment at a specific block index
  private func verifyPaymentAtBlock(
    blockIndex : Nat,
    expectedPayer : Principal,
    expectedAmount : Nat,
    expectedRecipient : Principal
  ) : async Bool {
    try {
      // Query the ICP Ledger for the specific block
      let queryRequest : QueryBlocksRequest = {
        start = blockIndex;
        length = 1;
      };

      let queryResponse : QueryBlocksResponse = await (actor(Principal.toText(ICP_LEDGER_CANISTER_ID)) : actor {
        query_blocks : query (QueryBlocksRequest) -> async QueryBlocksResponse;
      }).query_blocks(queryRequest);

      // Check if we got the block
      if (queryResponse.blocks.size() == 0) {
        return false;
      };

      let block = queryResponse.blocks[0];

      // Verify the transaction is a transfer with correct details
      switch (block.transaction.operation) {
        case (#Transfer({ from; to; amount; fee; spender })) {
          // Check sender (payer)
          if (from.owner != expectedPayer) {
            return false;
          };

          // Check recipient (our canister)
          if (to.owner != expectedRecipient) {
            return false;
          };

          // Check amount (must be at least the expected amount)
          if (amount < expectedAmount) {
            return false;
          };

          return true;
        };
        case (_) {
          // Not a transfer operation
          return false;
        };
      };
    } catch (error) {
      // Ledger query failed
      return false;
    };
  };

  // Public query function to check if block index is used (PRD requirement)
  public query func checkBlockIndexUsed(blockIndex : Nat) : async Bool {
    isBlockIndexUsed(blockIndex);
  };

  // Get payment history for caller (PRD requirement)
  public query ({ caller }) func getPaymentHistory() : async [VerifiedPayment] {
    var userPayments : [VerifiedPayment] = [];
    for (payment in natMap.vals(verifiedPayments)) {
      if (payment.payer == caller) {
        userPayments := Array.append(userPayments, [payment]);
      };
    };
    userPayments;
  };

  // Get payment by block index (PRD requirement)
  public shared ({ caller }) func getPaymentByBlockIndex(blockIndex : Nat) : async ?VerifiedPayment {
    for (payment in natMap.vals(verifiedPayments)) {
      if (payment.blockIndex == blockIndex) {
        return ?payment;
      };
    };
    null;
  };

  // Main verification and registration function (PRD requirement)
  public shared ({ caller }) func verifyAndRegisterName(
    name : Text,
    address : Text,
    addressType : AddressType,
    seasonId : Nat,
    blockIndex : Nat
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can register names");
    };

    // Check if caller already has a registered name (one name per principal rule)
    if (principalHasRegisteredName(caller)) {
      Debug.trap("Principal already has a registered name. Only one name per principal is allowed");
    };

    // Check if block index has already been used
    if (isBlockIndexUsed(blockIndex)) {
      Debug.trap("PAY001: Block index already used");
    };

    let owner = Principal.toText(caller);

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

        // Check if name is already registered
        switch (textMap.get(nameRecords, name)) {
          case (?_) { Debug.trap("Name is already registered") };
          case null {};
        };

        let requiredAmount = season.price;

        // Verify payment using ICP Ledger
        // Use canister principal as account owner (account ID conversion handled by ledger)
        let canisterPrincipal = getCanisterAccountOwner();
        let paymentVerified = await verifyPaymentAtBlock(
          blockIndex,
          caller,
          requiredAmount,
          canisterPrincipal
        );

        if (not paymentVerified) {
          Debug.trap("PAY002: Payment verification failed - amount insufficient, wrong sender, or wrong recipient");
        };

        // Mark block index as used to prevent replay attacks
        markBlockIndexUsed(blockIndex);

        // Update ICP balance when payment is successfully verified
        icpBalance += requiredAmount;

        // Create verified payment record
        let verifiedPayment : VerifiedPayment = {
          id = nextVerifiedPaymentId;
          payer = caller;
          amount = requiredAmount;
          blockIndex = blockIndex;
          transactionHash = null; // Could be extracted from block if needed
          verifiedAt = now;
          registrationId = ?nextVerifiedPaymentId; // Will be the same as payment ID for simplicity
        };

        verifiedPayments := natMap.put(verifiedPayments, nextVerifiedPaymentId, verifiedPayment);
        let paymentId = nextVerifiedPaymentId;
        nextVerifiedPaymentId += 1;

        // Create name record
        let record : NameRecord = {
          name;
          address;
          addressType;
          owner;
          seasonId;
          createdAt = now;
          updatedAt = now;
        };
        nameRecords := textMap.put(nameRecords, name, record);

        // Create 1-year subscription
        let subscriptionDuration = 365 * 24 * 60 * 60 * 1_000_000_000; // 1 year in nanoseconds
        let subscription : Subscription = {
          user = caller;
          registeredName = name;
          subscriptionType = #basic;
          startTime = now;
          endTime = now + subscriptionDuration;
          paymentId = paymentId;
          isActive = true;
          createdAt = now;
        };

        subscriptions := principalMap.put(subscriptions, caller, subscription);

        paymentId;
      };
    };
  };

  // DEPRECATED: Legacy registerName function without payment verification
  // Users should now use verifyAndRegisterName with proper ICP payment verification
  public shared ({ caller }) func registerName(name : Text, address : Text, addressType : AddressType, owner : Text, seasonId : Nat) : async Nat {
    Debug.trap("DEPRECATED: This function no longer allows registration without payment verification. Please use verifyAndRegisterName with a valid block index from your ICP payment transaction.");
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

  // =============================================================================
  // PAYMENT AND SUBSCRIPTION FUNCTIONS
  // =============================================================================


  // Get subscription status for a user
  public query func getUserSubscription(user : Principal) : async ?Subscription {
    principalMap.get(subscriptions, user);
  };

  // Check if user has active subscription
  public query func hasActiveSubscription(user : Principal) : async Bool {
    switch (principalMap.get(subscriptions, user)) {
      case (null) { false };
      case (?subscription) {
        subscription.isActive and subscription.endTime > Time.now();
      };
    };
  };

  // Get payment details
  public query func getPayment(paymentId : Nat) : async ?Payment {
    natMap.get(payments, paymentId);
  };

  // Get all payments (admin only)
  public query ({ caller }) func getAllPayments() : async [Payment] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can view all payments");
    };

    let paymentEntries = natMap.entries(payments);
    let paymentArray = Iter.toArray<(Nat, Payment)>(paymentEntries);
    Array.map<(Nat, Payment), Payment>(paymentArray, func((_, payment)) = payment);
  };

  // Get canister ICP balance (admin only)
  public query ({ caller }) func getIcpBalance() : async Nat {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can view ICP balance");
    };
    icpBalance;
  };

  // Get canister cycles balance (admin only)
  public query ({ caller }) func getCyclesBalance() : async Nat {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can view cycles balance");
    };
    ExperimentalCycles.balance();
  };

  // Admin function to withdraw ICP to another principal
  public shared ({ caller }) func withdrawIcp(to : Principal, amount : Nat) : async TransferResult {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can withdraw ICP");
    };

    if (amount > icpBalance) {
      return #err("Insufficient ICP balance");
    };

    if (Principal.isAnonymous(to)) {
      return #err("Cannot transfer to anonymous principal");
    };

    // TODO: In production, integrate with ICP Ledger canister:
    // 1. Create transfer request to ICP Ledger
    // 2. Handle transfer result and update balance accordingly
    // Example: let transferResult = await ICPLedger.transfer({to, amount, fee});

    // For now, simulate the transfer by updating internal balance
    icpBalance -= amount;

    // Log the withdrawal for audit purposes
    let _withdrawalLog = "ICP withdrawal: " # Nat.toText(amount) # " e8s to " # Principal.toText(to) # " by " # Principal.toText(caller);

    // Return success with a mock transaction ID
    #ok(amount);
  };

  // Function to verify ICP payment was received (to be called after payment)
  public shared ({ caller }) func verifyPayment(txHash : Text, amount : Nat, payer : Principal) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can verify payments");
    };

    // TODO: Integrate with ICP Ledger canister to verify the transaction
    // 1. Query ICP Ledger for transaction by hash
    // 2. Verify amount and sender match
    // 3. Verify transaction was sent to this canister
    // Example: let tx = await ICPLedger.getTransaction(txHash);

    // For now, return true (placeholder)
    // In production, this would verify the actual blockchain transaction
    true;
  };

  // Get canister's ICP account address (for receiving payments)
  public query func getCanisterIcpAddress() : async Text {
    // TODO: In production, derive actual ICP account address from canister principal
    // For now, return placeholder
    "placeholder-icp-address";
  };

  // Emergency function to pause all subscriptions (admin only)
  public shared ({ caller }) func pauseAllSubscriptions() : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can pause subscriptions");
    };

    let subscriptionEntries = principalMap.entries(subscriptions);
    let subscriptionArray = Iter.toArray<(Principal, Subscription)>(subscriptionEntries);
    for ((user, subscription) in subscriptionArray.vals()) {
      let updatedSubscription = {
        subscription with isActive = false;
      };
      subscriptions := principalMap.put(subscriptions, user, updatedSubscription);
    };
  };

  // Get subscription statistics (admin only)
  public query ({ caller }) func getSubscriptionStats() : async {
    totalSubscriptions : Nat;
    activeSubscriptions : Nat;
    basicSubscriptions : Nat;
    premiumSubscriptions : Nat;
    enterpriseSubscriptions : Nat;
    totalRevenue : Nat;
  } {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can view subscription statistics");
    };

    let subscriptionEntries = principalMap.entries(subscriptions);
    let subscriptionArray = Iter.toArray<(Principal, Subscription)>(subscriptionEntries);
    var totalSubs = 0;
    var activeSubs = 0;
    var basicSubs = 0;
    var premiumSubs = 0;
    var enterpriseSubs = 0;

    for ((_, subscription) in subscriptionArray.vals()) {
      totalSubs += 1;
      if (subscription.isActive and subscription.endTime > Time.now()) {
        activeSubs += 1;
      };
      switch (subscription.subscriptionType) {
        case (#basic) { basicSubs += 1 };
        case (#premium) { premiumSubs += 1 };
        case (#enterprise) { enterpriseSubs += 1 };
      };
    };

    {
      totalSubscriptions = totalSubs;
      activeSubscriptions = activeSubs;
      basicSubscriptions = basicSubs;
      premiumSubscriptions = premiumSubs;
      enterpriseSubscriptions = enterpriseSubs;
      totalRevenue = icpBalance;
    };
  };
};

