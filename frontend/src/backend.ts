// Re-export backend declarations for easier importing
export * from './declarations/context_registry/index';

// Import and re-export types from the generated declarations
import type {
  AddressType as AddressTypeImport,
  SeasonStatus as SeasonStatusImport,
  FileReference as FileReferenceImport,
  MarkdownContent as MarkdownContentImport,
  Metadata as MetadataImport,
  NameRecord as NameRecordImport,
  Season as SeasonImport,
  UserProfile as UserProfileImport,
  UserRole as UserRoleImport,
  Version as VersionImport,
  MigrationInfo as MigrationInfoImport,
  Payment as PaymentImport,
  PaymentStatus as PaymentStatusImport,
  Subscription as SubscriptionImport,
  SubscriptionType as SubscriptionTypeImport,
  TransferResult as TransferResultImport,
  VerifiedPayment as VerifiedPaymentImport,
  _SERVICE
} from './declarations/context_registry/context_registry.did';

export type AddressType = AddressTypeImport;
export type SeasonStatus = SeasonStatusImport;
export type FileReference = FileReferenceImport;
export type MarkdownContent = MarkdownContentImport;
export type Metadata = MetadataImport;
export type NameRecord = NameRecordImport;
export type Season = SeasonImport;
export type UserProfile = UserProfileImport;
export type UserRole = UserRoleImport;
export type Version = VersionImport;
export type MigrationInfo = MigrationInfoImport;
export type Payment = PaymentImport;
export type PaymentStatus = PaymentStatusImport;
export type Subscription = SubscriptionImport;
export type SubscriptionType = SubscriptionTypeImport;
export type TransferResult = TransferResultImport;
export type VerifiedPayment = VerifiedPaymentImport;
export type backendInterface = _SERVICE;

// AddressType value constants for runtime use
export const AddressType = {
  canister: { canister: null } as AddressType,
  identity: { identity: null } as AddressType
};

// SeasonStatus value constants for runtime use
export const SeasonStatus = {
  draft: { draft: null } as SeasonStatus,
  active: { active: null } as SeasonStatus,
  ended: { ended: null } as SeasonStatus,
  cancelled: { cancelled: null } as SeasonStatus
};

// PaymentStatus value constants for runtime use
export const PaymentStatus = {
  pending: { pending: null } as PaymentStatus,
  completed: { completed: null } as PaymentStatus,
  failed: { failed: null } as PaymentStatus,
  refunded: { refunded: null } as PaymentStatus
};

// SubscriptionType value constants for runtime use
export const SubscriptionType = {
  basic: { basic: null } as SubscriptionType,
  premium: { premium: null } as SubscriptionType,
  enterprise: { enterprise: null } as SubscriptionType
};

// Helper function to convert AddressType string to variant format
export function toAddressTypeVariant(type: string): AddressType {
  if (type === 'canister') {
    return AddressType.canister;
  } else if (type === 'identity') {
    return AddressType.identity;
  }
  throw new Error(`Invalid AddressType: ${type}`);
}