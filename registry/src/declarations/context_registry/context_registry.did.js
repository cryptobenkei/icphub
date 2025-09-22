export const idlFactory = ({ IDL }) => {
  const UserRole = IDL.Variant({
    'admin' : IDL.Null,
    'user' : IDL.Null,
    'guest' : IDL.Null,
  });
  const Version = IDL.Record({
    'major' : IDL.Nat,
    'minor' : IDL.Nat,
    'patch' : IDL.Nat,
  });
  const SeasonStatus = IDL.Variant({
    'active' : IDL.Null,
    'cancelled' : IDL.Null,
    'ended' : IDL.Null,
    'draft' : IDL.Null,
  });
  const Season = IDL.Record({
    'id' : IDL.Nat,
    'startTime' : IDL.Int,
    'status' : SeasonStatus,
    'maxNameLength' : IDL.Nat,
    'minNameLength' : IDL.Nat,
    'endTime' : IDL.Int,
    'maxNames' : IDL.Nat,
    'name' : IDL.Text,
    'createdAt' : IDL.Int,
    'updatedAt' : IDL.Int,
    'price' : IDL.Nat,
  });
  const PaymentStatus = IDL.Variant({
    'pending' : IDL.Null,
    'completed' : IDL.Null,
    'refunded' : IDL.Null,
    'failed' : IDL.Null,
  });
  const SubscriptionType = IDL.Variant({
    'enterprise' : IDL.Null,
    'premium' : IDL.Null,
    'basic' : IDL.Null,
  });
  const Payment = IDL.Record({
    'id' : IDL.Nat,
    'status' : PaymentStatus,
    'createdAt' : IDL.Int,
    'subscriptionType' : SubscriptionType,
    'updatedAt' : IDL.Int,
    'txHash' : IDL.Opt(IDL.Text),
    'payer' : IDL.Principal,
    'amount' : IDL.Nat,
  });
  const UserProfile = IDL.Record({ 'name' : IDL.Text });
  const FileReference = IDL.Record({ 'hash' : IDL.Text, 'path' : IDL.Text });
  const MarkdownContent = IDL.Record({
    'content' : IDL.Text,
    'updatedAt' : IDL.Int,
  });
  const Metadata = IDL.Record({
    'title' : IDL.Text,
    'createdAt' : IDL.Int,
    'description' : IDL.Text,
    'updatedAt' : IDL.Int,
    'image' : IDL.Text,
  });
  const MigrationInfo = IDL.Record({
    'fromVersion' : Version,
    'logs' : IDL.Vec(IDL.Text),
    'timestamp' : IDL.Int,
    'toVersion' : Version,
    'checksum' : IDL.Opt(IDL.Text),
    'success' : IDL.Bool,
  });
  const AddressType = IDL.Variant({
    'canister' : IDL.Null,
    'identity' : IDL.Null,
  });
  const NameRecord = IDL.Record({
    'owner' : IDL.Text,
    'name' : IDL.Text,
    'createdAt' : IDL.Int,
    'seasonId' : IDL.Nat,
    'updatedAt' : IDL.Int,
    'address' : IDL.Text,
    'addressType' : AddressType,
  });
  const Subscription = IDL.Record({
    'startTime' : IDL.Int,
    'endTime' : IDL.Int,
    'createdAt' : IDL.Int,
    'user' : IDL.Principal,
    'subscriptionType' : SubscriptionType,
    'isActive' : IDL.Bool,
    'paymentId' : IDL.Nat,
    'registeredName' : IDL.Text,
  });
  const TransferResult = IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text });
  return IDL.Service({
    'activateSeason' : IDL.Func([IDL.Nat], [], []),
    'assignCallerUserRole' : IDL.Func([IDL.Principal, UserRole], [], []),
    'cancelSeason' : IDL.Func([IDL.Nat], [], []),
    'createSeason' : IDL.Func(
        [IDL.Text, IDL.Int, IDL.Int, IDL.Nat, IDL.Nat, IDL.Nat, IDL.Nat],
        [IDL.Nat],
        [],
      ),
    'dropFileReference' : IDL.Func([IDL.Text], [], []),
    'emergencyRollback' : IDL.Func(
        [Version],
        [IDL.Record({ 'logs' : IDL.Vec(IDL.Text), 'success' : IDL.Bool })],
        [],
      ),
    'endSeason' : IDL.Func([IDL.Nat], [], []),
    'getActiveSeason' : IDL.Func([], [Season], ['query']),
    'getActiveSeasonInfo' : IDL.Func(
        [],
        [
          IDL.Record({
            'season' : Season,
            'availableNames' : IDL.Nat,
            'price' : IDL.Nat,
          }),
        ],
        ['query'],
      ),
    'getAdminCount' : IDL.Func([], [IDL.Nat], ['query']),
    'getAdminPrincipal' : IDL.Func([], [IDL.Opt(IDL.Principal)], ['query']),
    'getAllAdmins' : IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
    'getAllPayments' : IDL.Func([], [IDL.Vec(Payment)], ['query']),
    'getCallerUserProfile' : IDL.Func([], [IDL.Opt(UserProfile)], ['query']),
    'getCallerUserRole' : IDL.Func([], [UserRole], ['query']),
    'getCanisterIcpAddress' : IDL.Func([], [IDL.Text], ['query']),
    'getCanisterPrincipal' : IDL.Func([], [IDL.Principal], ['query']),
    'getCanisterVersion' : IDL.Func([], [Version], ['query']),
    'getCurrentTime' : IDL.Func([], [IDL.Int], ['query']),
    'getFileReference' : IDL.Func([IDL.Text], [FileReference], ['query']),
    'getIcpBalance' : IDL.Func([], [IDL.Nat], ['query']),
    'getMarkdown' : IDL.Func([IDL.Text], [MarkdownContent], ['query']),
    'getMarkdownContent' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'ok' : MarkdownContent, 'err' : IDL.Text })],
        ['query'],
      ),
    'getMetadata' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'ok' : Metadata, 'err' : IDL.Text })],
        ['query'],
      ),
    'getMetadataRecord' : IDL.Func([IDL.Text], [Metadata], ['query']),
    'getMigrationHistory' : IDL.Func([], [IDL.Vec(MigrationInfo)], ['query']),
    'getNameRecord' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'ok' : NameRecord, 'err' : IDL.Text })],
        ['query'],
      ),
    'getPayment' : IDL.Func([IDL.Nat], [IDL.Opt(Payment)], ['query']),
    'getSeason' : IDL.Func([IDL.Nat], [Season], ['query']),
    'getSubscriptionStats' : IDL.Func(
        [],
        [
          IDL.Record({
            'premiumSubscriptions' : IDL.Nat,
            'enterpriseSubscriptions' : IDL.Nat,
            'totalSubscriptions' : IDL.Nat,
            'totalRevenue' : IDL.Nat,
            'basicSubscriptions' : IDL.Nat,
            'activeSubscriptions' : IDL.Nat,
          }),
        ],
        ['query'],
      ),
    'getUpgradeInfo' : IDL.Func(
        [],
        [
          IDL.Record({
            'currentVersion' : Version,
            'migrationHistory' : IDL.Vec(MigrationInfo),
            'totalNameRecords' : IDL.Nat,
            'totalSeasons' : IDL.Nat,
          }),
        ],
        ['query'],
      ),
    'getUserProfile' : IDL.Func(
        [IDL.Principal],
        [IDL.Opt(UserProfile)],
        ['query'],
      ),
    'getUserSubscription' : IDL.Func(
        [IDL.Principal],
        [IDL.Opt(Subscription)],
        ['query'],
      ),
    'hasActiveSubscription' : IDL.Func([IDL.Principal], [IDL.Bool], ['query']),
    'hasRegisteredName' : IDL.Func([IDL.Text], [IDL.Bool], ['query']),
    'initializeAccessControl' : IDL.Func([], [], []),
    'isCallerAdmin' : IDL.Func([], [IDL.Bool], ['query']),
    'listFileReferences' : IDL.Func([], [IDL.Vec(FileReference)], ['query']),
    'listNameRecords' : IDL.Func([], [IDL.Vec(NameRecord)], ['query']),
    'listSeasons' : IDL.Func([], [IDL.Vec(Season)], ['query']),
    'pauseAllSubscriptions' : IDL.Func([], [], []),
    'performDataMigration' : IDL.Func(
        [Version, IDL.Bool],
        [
          IDL.Record({
            'logs' : IDL.Vec(IDL.Text),
            'checksum' : IDL.Opt(IDL.Text),
            'success' : IDL.Bool,
          }),
        ],
        [],
      ),
    'registerFileReference' : IDL.Func([IDL.Text, IDL.Text], [], []),
    'registerName' : IDL.Func(
        [IDL.Text, IDL.Text, AddressType, IDL.Text, IDL.Nat],
        [IDL.Nat],
        [],
      ),
    'saveCallerUserProfile' : IDL.Func([UserProfile], [], []),
    'saveMarkdown' : IDL.Func([IDL.Text, IDL.Text], [], []),
    'saveMetadata' : IDL.Func([IDL.Text, IDL.Text, IDL.Text, IDL.Text], [], []),
    'validateSystemState' : IDL.Func(
        [],
        [IDL.Record({ 'valid' : IDL.Bool, 'issues' : IDL.Vec(IDL.Text) })],
        ['query'],
      ),
    'verifyPayment' : IDL.Func(
        [IDL.Text, IDL.Nat, IDL.Principal],
        [IDL.Bool],
        [],
      ),
    'withdrawIcp' : IDL.Func([IDL.Principal, IDL.Nat], [TransferResult], []),
  });
};
export const init = ({ IDL }) => { return []; };
