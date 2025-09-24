import OrderedMap "mo:base/OrderedMap";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Debug "mo:base/Debug";
import Error "mo:base/Error";
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
import Nat8 "mo:base/Nat8";

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
    #hub;
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
  
  // Payment verification state (PRD requirement)
  var verifiedPayments = natMap.empty<VerifiedPayment>();
  var usedBlockIndices = natMap.empty<Bool>(); // Track used block indices to prevent replay attacks
  var nextVerifiedPaymentId : Nat = 1;

  // ICP Ledger canister ID - configurable
  private var icpLedgerCanisterId : ?Principal = null;

  // ICP Ledger account ID for this canister - configurable
  private var icpLedgerAccountId : ?Text = null;

  // Track if access control has been initialized
  private var isAccessControlInitialized : Bool = false;

  public shared ({ caller }) func initializeAccessControl(canisterId : Principal, accountIdHex : Text) : async () {
    if (isAccessControlInitialized) {
      Debug.trap("Access control has already been initialized and cannot be called again");
    };
    AccessControl.initialize(accessControlState, caller);
    icpLedgerCanisterId := ?canisterId;
    icpLedgerAccountId := ?accountIdHex;
    isAccessControlInitialized := true;
  };

  // Helper function to get configured ledger canister ID
  private func getConfiguredLedgerCanisterId() : Principal {
    switch (icpLedgerCanisterId) {
      case (?canisterId) { canisterId };
      case null { 
        Debug.trap("ICP Ledger canister ID not configured. Call initializeAccessControl first.");
      };
    };
  };

  private func getConfiguredAccountId() : Text {
    switch (icpLedgerAccountId) {
      case (?accountId) { accountId };
      case null { 
        Debug.trap("ICP Ledger account ID not configured. Call initializeAccessControl first.");
      };
    };
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

  // Admin-only function to create names without payment restrictions
  public shared ({ caller }) func adminAddName(
    name : Text,
    address : Text,
    addressType : AddressType
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can add names without payment");
    };

    // Check if name is already registered
    switch (textMap.get(nameRecords, name)) {
      case (?_) { Debug.trap("Name is already registered") };
      case null {};
    };

    // Get current active season (admin can add to any active season)
    var currentSeason : ?Season = null;
    for (season in natMap.vals(seasons)) {
      if (season.status == #active) {
        currentSeason := ?season;
      };
    };

    let seasonId = switch (currentSeason) {
      case null { Debug.trap("No active season found") };
      case (?season) { season.id };
    };

    let now = Time.now();
    let owner = Principal.toText(caller); // Admin is the owner

    // Create name record (no length restrictions for admin)
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

  // For ICP payment verification, we need to handle that Plug wallet converts
  // principal to account ID for the actual transfer, but we verify against the principal
  private func getCanisterPrincipalPrivate() : Principal {
    Principal.fromActor(Self);
  };

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
    expectedAmount : Nat,
    expectedRecipient : Principal
  ) : async Bool {
    try {
      // Query the ICP Ledger for the specific block
      let queryRequest : QueryBlocksRequest = {
        start = blockIndex;
        length = 1;
      };

      let ledgerCanisterId = switch (icpLedgerCanisterId) {
        case null { Debug.trap("ICP Ledger canister ID not configured") };
        case (?id) { id };
      };

      let queryResponse : QueryBlocksResponse = await (actor(Principal.toText(ledgerCanisterId)) : actor {
        query_blocks : query (QueryBlocksRequest) -> async QueryBlocksResponse;
      }).query_blocks(queryRequest);

      // Check if we got the block
      if (queryResponse.blocks.size() == 0) {
        return false;
      };

      let block = queryResponse.blocks[0];

      // Verify the transaction is a transfer with correct details
      switch (block.transaction.operation) {
        case (#Transfer({ from = _; to; amount; fee = _; spender = _ })) {
          // Note: We don't verify the sender (from.owner) because when using wallets like Plug,
          // the actual sender principal may differ from the user's Internet Identity principal.
          // The important security check is that payment was made to the correct recipient.

          // Check recipient (our canister) - compare account owners (principals)
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
    } catch (_error) {
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
  public shared ({ caller = _ }) func getPaymentByBlockIndex(blockIndex : Nat) : async ?VerifiedPayment {
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
        // Use canister principal for payment verification
        let canisterPrincipal = getCanisterPrincipalPrivate();
        let paymentVerified = await verifyPaymentAtBlock(
          blockIndex,
          requiredAmount,
          canisterPrincipal
        );

        if (not paymentVerified) {
          Debug.trap("PAY002: Payment verification failed - amount insufficient, wrong sender, or wrong recipient");
        };

        // Mark block index as used to prevent replay attacks
        markBlockIndexUsed(blockIndex);

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
  public shared ({ caller = _ }) func registerName(_name : Text, _address : Text, _addressType : AddressType, _owner : Text, _seasonId : Nat) : async Nat {
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

  // Get canister cycles balance (admin only)
  public query ({ caller }) func getCyclesBalance() : async Nat {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can view cycles balance");
    };
    ExperimentalCycles.balance();
  };

  // Query actual ICP Ledger balance for this canister
  public func queryLedgerBalance() : async Nat {

    let ledgerCanisterId = getConfiguredLedgerCanisterId();
    try {
      let ledger = actor(Principal.toText(ledgerCanisterId)) : actor {
        icrc1_balance_of : (Account) -> async Nat;
      };

      let canisterAccount : Account = {
        owner = Principal.fromActor(Self);
        subaccount = null : ?[Nat8];
      };
      
      // CRÍTICO: Usar Account structure, no solo Principal
      Debug.print("Querying balance for account - Owner: " # Principal.toText(canisterAccount.owner) # ", Subaccount: " # debug_show(canisterAccount.subaccount));
      let balance = await ledger.icrc1_balance_of(canisterAccount);
      Debug.print("Balance retrieved: " # Nat.toText(balance) # " e8s");
      balance;
    } catch (error) {
      Debug.print("Failed to query ledger balance from " # Principal.toText(ledgerCanisterId) # ": " # Error.message(error));
      0;
    };
  };

  // Admin function to withdraw ICP to another principal
  public shared ({ caller }) func withdrawIcp(to : Principal, amount : Nat) : async TransferResult {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can withdraw ICP");
    };

    // Query actual ledger balance with error handling
    let actualBalance = await queryLedgerBalance();

    // If ledger query failed (returned 0), check if we have internal balance tracking
    // Note: internal balance tracking would need to be implemented if needed
    if (actualBalance == 0) {
      return #err("Insufficient ICP balance. Ledger balance: 0 e8s. Please ensure the canister has ICP and the ledger canister ID is configured correctly.");
    };

    if (amount > actualBalance) {
      return #err("Insufficient ICP balance. Available: " # Nat.toText(actualBalance) # " e8s");
    };

    if (Principal.isAnonymous(to)) {
      return #err("Cannot transfer to anonymous principal");
    };

    let fee : Nat = 10000; // Standard ICP transfer fee in e8s
    if (amount <= fee) {
      return #err("Amount must be greater than transaction fee (10,000 e8s)");
    };

    try {
      let ledgerCanisterId = switch (icpLedgerCanisterId) {
        case null { return #err("ICP Ledger canister ID not configured") };
        case (?id) { id };
      };

      let transferArg = {
        from_subaccount = null : ?[Nat8];
        to = { owner = to; subaccount = null };
        amount = amount;
        fee = ?fee;
        memo = null : ?[Nat8];
        created_at_time = null : ?Nat64;
      };

      let ledger = actor(Principal.toText(ledgerCanisterId)) : actor {
        icrc1_transfer : ({ from_subaccount : ?[Nat8]; to : { owner : Principal; subaccount : ?[Nat8] }; amount : Nat; fee : ?Nat; memo : ?[Nat8]; created_at_time : ?Nat64 }) -> async { #Ok : Nat; #Err : { #BadFee : { expected_fee : Nat }; #BadBurn : { min_burn_amount : Nat }; #InsufficientFunds : { balance : Nat }; #TooOld; #CreatedInFuture : { ledger_time : Nat64 }; #Duplicate : { duplicate_of : Nat }; #TemporarilyUnavailable; #GenericError : { error_code : Nat; message : Text } } };
      };

      let transferResult = await ledger.icrc1_transfer(transferArg);

      switch (transferResult) {
        case (#Ok(blockIndex)) {
          Debug.print("ICP withdrawal successful: " # Nat.toText(amount) # " e8s to " # Principal.toText(to) # " by " # Principal.toText(caller) # " (block: " # Nat.toText(blockIndex) # ")");

          #ok(blockIndex);
        };
        case (#Err(error)) {
          let errorMsg = switch (error) {
            case (#BadFee({ expected_fee })) { "Bad fee: expected " # Nat.toText(expected_fee) # " e8s" };
            case (#InsufficientFunds({ balance })) { "Insufficient funds: ledger balance " # Nat.toText(balance) # " e8s" };
            case (#TooOld) { "Transaction too old" };
            case (#CreatedInFuture(_)) { "Transaction created in future" };
            case (#Duplicate(_)) { "Duplicate transaction" };
            case (#TemporarilyUnavailable) { "Ledger temporarily unavailable" };
            case (#GenericError({ message; error_code = _ })) { "Ledger error: " # message };
            case (_) { "Unknown transfer error" };
          };
          #err(errorMsg);
        };
      };
    } catch (_error) {
      Debug.print("Exception during ICP transfer: " # "transfer communication error");
      #err("Failed to communicate with ICP Ledger canister");
    };
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
    };
  };


};

