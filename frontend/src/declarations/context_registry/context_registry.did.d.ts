import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type AddressType = { 'hub' : null } |
  { 'canister' : null } |
  { 'identity' : null };
export interface FileReference { 'hash' : string, 'path' : string }
export interface MarkdownContent { 'content' : string, 'updatedAt' : bigint }
export interface Metadata {
  'title' : string,
  'createdAt' : bigint,
  'description' : string,
  'updatedAt' : bigint,
  'image' : string,
}
export interface MigrationInfo {
  'fromVersion' : Version,
  'logs' : Array<string>,
  'timestamp' : bigint,
  'toVersion' : Version,
  'checksum' : [] | [string],
  'success' : boolean,
}
export interface NameRecord {
  'owner' : string,
  'name' : string,
  'createdAt' : bigint,
  'seasonId' : bigint,
  'updatedAt' : bigint,
  'address' : string,
  'addressType' : AddressType,
}
export interface Payment {
  'id' : bigint,
  'status' : PaymentStatus,
  'createdAt' : bigint,
  'subscriptionType' : SubscriptionType,
  'updatedAt' : bigint,
  'txHash' : [] | [string],
  'payer' : Principal,
  'amount' : bigint,
}
export type PaymentStatus = { 'pending' : null } |
  { 'completed' : null } |
  { 'refunded' : null } |
  { 'failed' : null };
export interface Season {
  'id' : bigint,
  'startTime' : bigint,
  'status' : SeasonStatus,
  'maxNameLength' : bigint,
  'minNameLength' : bigint,
  'endTime' : bigint,
  'maxNames' : bigint,
  'name' : string,
  'createdAt' : bigint,
  'updatedAt' : bigint,
  'price' : bigint,
}
export type SeasonStatus = { 'active' : null } |
  { 'cancelled' : null } |
  { 'ended' : null } |
  { 'draft' : null };
export interface Subscription {
  'startTime' : bigint,
  'endTime' : bigint,
  'createdAt' : bigint,
  'user' : Principal,
  'subscriptionType' : SubscriptionType,
  'isActive' : boolean,
  'paymentId' : bigint,
  'registeredName' : string,
}
export type SubscriptionType = { 'enterprise' : null } |
  { 'premium' : null } |
  { 'basic' : null };
export type TransferResult = { 'ok' : bigint } |
  { 'err' : string };
export interface UserProfile { 'name' : string }
export type UserRole = { 'admin' : null } |
  { 'user' : null } |
  { 'guest' : null };
export interface VerifiedPayment {
  'id' : bigint,
  'transactionHash' : [] | [string],
  'blockIndex' : bigint,
  'payer' : Principal,
  'amount' : bigint,
  'registrationId' : [] | [bigint],
  'verifiedAt' : bigint,
}
export interface Version {
  'major' : bigint,
  'minor' : bigint,
  'patch' : bigint,
}
export interface _SERVICE {
  'activateSeason' : ActorMethod<[bigint], undefined>,
  'adminAddName' : ActorMethod<[string, string, AddressType], undefined>,
  'assignCallerUserRole' : ActorMethod<[Principal, UserRole], undefined>,
  'cancelSeason' : ActorMethod<[bigint], undefined>,
  'checkBlockIndexUsed' : ActorMethod<[bigint], boolean>,
  'createSeason' : ActorMethod<
    [string, bigint, bigint, bigint, bigint, bigint, bigint],
    bigint
  >,
  'dropFileReference' : ActorMethod<[string], undefined>,
  'emergencyRollback' : ActorMethod<
    [Version],
    { 'logs' : Array<string>, 'success' : boolean }
  >,
  'endSeason' : ActorMethod<[bigint], undefined>,
  'getActiveSeason' : ActorMethod<[], Season>,
  'getActiveSeasonInfo' : ActorMethod<
    [],
    { 'season' : Season, 'availableNames' : bigint, 'price' : bigint }
  >,
  'getAdminCount' : ActorMethod<[], bigint>,
  'getAdminPrincipal' : ActorMethod<[], [] | [Principal]>,
  'getAllAdmins' : ActorMethod<[], Array<Principal>>,
  'getAllPayments' : ActorMethod<[], Array<Payment>>,
  'getCallerUserProfile' : ActorMethod<[], [] | [UserProfile]>,
  'getCallerUserRole' : ActorMethod<[], UserRole>,
  'getCanisterAddresses' : ActorMethod<
    [],
    { 'accountId' : string, 'principalId' : Principal }
  >,
  'getCanisterIcpAddress' : ActorMethod<[], string>,
  'getCanisterPrincipalId' : ActorMethod<[], Principal>,
  'getCanisterVersion' : ActorMethod<[], Version>,
  'getCurrentTime' : ActorMethod<[], bigint>,
  'getCyclesBalance' : ActorMethod<[], bigint>,
  'getFileReference' : ActorMethod<[string], FileReference>,
  'getIcpBalance' : ActorMethod<[], bigint>,
  'getMarkdown' : ActorMethod<[string], MarkdownContent>,
  'getMarkdownContent' : ActorMethod<
    [string],
    { 'ok' : MarkdownContent } |
      { 'err' : string }
  >,
  'getMetadata' : ActorMethod<
    [string],
    { 'ok' : Metadata } |
      { 'err' : string }
  >,
  'getMetadataRecord' : ActorMethod<[string], Metadata>,
  'getMigrationHistory' : ActorMethod<[], Array<MigrationInfo>>,
  'getNameRecord' : ActorMethod<
    [string],
    { 'ok' : NameRecord } |
      { 'err' : string }
  >,
  'getPayment' : ActorMethod<[bigint], [] | [Payment]>,
  'getPaymentByBlockIndex' : ActorMethod<[bigint], [] | [VerifiedPayment]>,
  'getPaymentHistory' : ActorMethod<[], Array<VerifiedPayment>>,
  'getSeason' : ActorMethod<[bigint], Season>,
  'getSubscriptionStats' : ActorMethod<
    [],
    {
      'premiumSubscriptions' : bigint,
      'enterpriseSubscriptions' : bigint,
      'totalSubscriptions' : bigint,
      'totalRevenue' : bigint,
      'basicSubscriptions' : bigint,
      'activeSubscriptions' : bigint,
    }
  >,
  'getUpgradeInfo' : ActorMethod<
    [],
    {
      'currentVersion' : Version,
      'migrationHistory' : Array<MigrationInfo>,
      'totalNameRecords' : bigint,
      'totalSeasons' : bigint,
    }
  >,
  'getUserProfile' : ActorMethod<[Principal], [] | [UserProfile]>,
  'getUserSubscription' : ActorMethod<[Principal], [] | [Subscription]>,
  'hasActiveSubscription' : ActorMethod<[Principal], boolean>,
  'hasRegisteredName' : ActorMethod<[string], boolean>,
  'initializeAccessControl' : ActorMethod<[], undefined>,
  'isCallerAdmin' : ActorMethod<[], boolean>,
  'listFileReferences' : ActorMethod<[], Array<FileReference>>,
  'listNameRecords' : ActorMethod<[], Array<NameRecord>>,
  'listSeasons' : ActorMethod<[], Array<Season>>,
  'pauseAllSubscriptions' : ActorMethod<[], undefined>,
  'performDataMigration' : ActorMethod<
    [Version, boolean],
    { 'logs' : Array<string>, 'checksum' : [] | [string], 'success' : boolean }
  >,
  'registerFileReference' : ActorMethod<[string, string], undefined>,
  'registerName' : ActorMethod<
    [string, string, AddressType, string, bigint],
    bigint
  >,
  'saveCallerUserProfile' : ActorMethod<[UserProfile], undefined>,
  'saveMarkdown' : ActorMethod<[string, string], undefined>,
  'saveMetadata' : ActorMethod<[string, string, string, string], undefined>,
  'validateSystemState' : ActorMethod<
    [],
    { 'valid' : boolean, 'issues' : Array<string> }
  >,
  'verifyAndRegisterName' : ActorMethod<
    [string, string, AddressType, bigint, bigint],
    bigint
  >,
  'verifyPayment' : ActorMethod<[string, bigint, Principal], boolean>,
  'withdrawIcp' : ActorMethod<[Principal, bigint], TransferResult>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
