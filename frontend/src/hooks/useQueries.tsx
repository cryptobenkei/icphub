import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import { NameRecord, AddressType, Season, UserProfile, Metadata, MarkdownContent, VerifiedPayment, toAddressTypeVariant } from '../backend';
import { toast } from 'sonner';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { loadConfig } from '../config';
import { IDL } from '@dfinity/candid';

// Utility function to convert backend season ID to user-friendly season number
export function getSeasonNumber(seasonId: bigint): number {
  return Number(seasonId);
}

// ICP Ledger Integration Types and Functions
type ICPAccount = {
  owner: Principal;
  subaccount?: Uint8Array;
};

type TransferArgs = {
  to: ICPAccount;
  amount: bigint;
  fee?: bigint;
  memo?: Uint8Array;
  from_subaccount?: Uint8Array;
  created_at_time?: bigint;
};

type TransferResult = {
  Ok?: bigint;
  Err?: any;
};

// ICP Ledger Canister Interface
const icpLedgerInterface = () => {
  const Account = IDL.Record({
    owner: IDL.Principal,
    subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
  });

  const TransferArg = IDL.Record({
    to: Account,
    fee: IDL.Opt(IDL.Nat),
    memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
    created_at_time: IDL.Opt(IDL.Nat64),
    amount: IDL.Nat,
  });

  const TransferError = IDL.Variant({
    BadFee: IDL.Record({ expected_fee: IDL.Nat }),
    BadBurn: IDL.Record({ min_burn_amount: IDL.Nat }),
    InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
    TooOld: IDL.Null,
    CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
    TemporarilyUnavailable: IDL.Null,
    Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
    GenericError: IDL.Record({
      error_code: IDL.Nat,
      message: IDL.Text,
    }),
  });

  return IDL.Service({
    icrc1_transfer: IDL.Func([TransferArg], [IDL.Variant({ Ok: IDL.Nat, Err: TransferError })], []),
    icrc1_balance_of: IDL.Func([Account], [IDL.Nat], ['query']),
  });
};

// Create ICP Ledger Actor
const createIcpLedgerActor = async (identity: any) => {
  const config = await loadConfig();
  const icpLedgerCanisterId = 'rrkah-fqaaa-aaaaa-aaaaq-cai'; // ICP Ledger canister ID

  const agent = new HttpAgent({
    host: config.backend_host || 'https://ic0.app',
    identity,
  });

  // Only fetch root key in development
  if (process.env.NODE_ENV === 'development') {
    await agent.fetchRootKey();
  }

  return Actor.createActor(icpLedgerInterface, {
    agent,
    canisterId: icpLedgerCanisterId,
  });
};

// User Profile Queries
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      const result = await actor.getCallerUserProfile();
      return result.length > 0 ? result[0] : null;
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      toast.success('Profile saved successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to save profile: ${error.message}`);
    },
  });
}

// Admin Queries - Updated to use the existing isCallerAdmin method
export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<boolean>({
    queryKey: ['isCallerAdmin', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) return false;
      try {
        return await actor.isCallerAdmin();
      } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
      }
    },
    enabled: !!actor && !isFetching && !!identity,
    retry: false,
  });
}

// Get canister principal for admin dashboard
export function useGetCanisterPrincipal() {
  const { actor, isFetching } = useActor();

  return useQuery<string>({
    queryKey: ['canisterPrincipal'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      const principal = await actor.getCanisterPrincipal();
      return principal.toString();
    },
    enabled: !!actor && !isFetching,
    retry: false,
  });
}

// Get Candid file for admin interface - placeholder implementation
export function useGetCandidFile() {
  const { actor, isFetching } = useActor();

  return useQuery<string>({
    queryKey: ['candidFile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      
      // Generate a placeholder Candid file based on the known interface
      // This is a temporary solution until the backend implements getCandidFile()
      const candidContent = `// Candid Interface Definition for IcpHub Name Registry
// This is a generated placeholder - actual implementation needed in backend

type AddressType = variant {
  canister;
  identity;
};

type SeasonStatus = variant {
  draft;
  active;
  ended;
  cancelled;
};

type Season = record {
  id : nat;
  name : text;
  startTime : int;
  endTime : int;
  maxNames : nat;
  minNameLength : nat;
  maxNameLength : nat;
  price : nat;
  status : SeasonStatus;
  createdAt : int;
  updatedAt : int;
};

type NameRecord = record {
  name : text;
  address : text;
  addressType : AddressType;
  owner : text;
  seasonId : nat;
  createdAt : int;
  updatedAt : int;
};

type UserProfile = record {
  name : text;
};

type Metadata = record {
  title : text;
  description : text;
  image : text;
  createdAt : int;
  updatedAt : int;
};

type MarkdownContent = record {
  content : text;
  updatedAt : int;
};

type VerifiedPayment = record {
  id : nat;
  payer : principal;
  amount : nat;
  blockIndex : nat;
  transactionHash : opt text;
  verifiedAt : int;
  registrationId : opt nat;
};

service : {
  // User Profile Management
  getCallerUserProfile : () -> (opt UserProfile) query;
  getUserProfile : (principal) -> (opt UserProfile) query;
  saveCallerUserProfile : (UserProfile) -> ();

  // Access Control
  initializeAccessControl : () -> ();
  getCallerUserRole : () -> (variant { admin; user; guest }) query;
  assignCallerUserRole : (principal, variant { admin; user; guest }) -> ();
  isCallerAdmin : () -> (bool) query;

  // Season Management
  createSeason : (text, int, int, nat, nat, nat, nat) -> (nat);
  activateSeason : (nat) -> ();
  endSeason : (nat) -> ();
  cancelSeason : (nat) -> ();
  getSeason : (nat) -> (Season) query;
  listSeasons : () -> (vec Season) query;
  getActiveSeason : () -> (Season) query;
  getActiveSeasonInfo : () -> (record { season : Season; availableNames : nat; price : nat }) query;

  // Name Registration (DEPRECATED - use verifyAndRegisterName)
  registerName : (text, text, AddressType, text, nat) -> (nat);

  // Payment Verification and Registration
  verifyAndRegisterName : (text, text, AddressType, nat, nat) -> (nat);
  checkBlockIndexUsed : (nat) -> (bool) query;
  getPaymentHistory : () -> (vec VerifiedPayment) query;
  getPaymentByBlockIndex : (nat) -> (opt VerifiedPayment);

  getNameRecord : (text) -> (NameRecord) query;
  listNameRecords : () -> (vec NameRecord) query;
  hasRegisteredName : (text) -> (bool) query;

  // Content Management
  saveMetadata : (text, text, text, text) -> ();
  getMetadata : (text) -> (Metadata) query;
  saveMarkdown : (text, text) -> ();
  getMarkdown : (text) -> (MarkdownContent) query;

  // File Storage
  registerFileReference : (text, text) -> ();
  dropFileReference : (text) -> ();
  getFileReference : (text) -> (record { path : text; hash : text }) query;
  listFileReferences : () -> (vec record { path : text; hash : text }) query;

  // Utility
  getCurrentTime : () -> (int) query;
  getCanisterPrincipal : () -> (principal) query;
}`;

      return candidContent;
    },
    enabled: !!actor && !isFetching,
    retry: false,
  });
}

// Season Queries
export function useListSeasons() {
  const { actor, isFetching } = useActor();

  return useQuery<Season[]>({
    queryKey: ['seasons'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listSeasons();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetSeason(seasonId: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Season>({
    queryKey: ['season', seasonId?.toString()],
    queryFn: async () => {
      if (!actor || seasonId === null) throw new Error('Actor not available or season ID null');
      return actor.getSeason(seasonId);
    },
    enabled: !!actor && !isFetching && seasonId !== null,
    retry: false,
  });
}

export function useGetActiveSeasonInfo() {
  const { actor, isFetching } = useActor();

  return useQuery<{
    season: Season;
    availableNames: bigint;
    price: bigint;
  }>({
    queryKey: ['activeSeasonInfo'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getActiveSeasonInfo();
    },
    enabled: !!actor && !isFetching,
    retry: false,
  });
}

export function useCreateSeason() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      startTime,
      endTime,
      maxNames,
      minNameLength,
      maxNameLength,
      price,
    }: {
      name: string;
      startTime: bigint;
      endTime: bigint;
      maxNames: bigint;
      minNameLength: bigint;
      maxNameLength: bigint;
      price: bigint;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createSeason(name, startTime, endTime, maxNames, minNameLength, maxNameLength, price);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['activeSeasonInfo'] });
      toast.success('Season created successfully! It is now in draft status and ready to be activated.');
    },
    onError: (error) => {
      toast.error(`Failed to create season: ${error.message}`);
    },
  });
}

export function useActivateSeason() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (seasonId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.activateSeason(seasonId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['activeSeasonInfo'] });
      toast.success('Season activated successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to activate season: ${error.message}`);
    },
  });
}

export function useEndSeason() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (seasonId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.endSeason(seasonId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['activeSeasonInfo'] });
      toast.success('Season ended successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to end season: ${error.message}`);
    },
  });
}

export function useCancelSeason() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (seasonId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.cancelSeason(seasonId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['activeSeasonInfo'] });
      toast.success('Season cancelled successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to cancel season: ${error.message}`);
    },
  });
}

// Name Registration Queries
export function useGetNameRecord(name: string) {
  const { actor, isFetching } = useActor();

  return useQuery<NameRecord>({
    queryKey: ['nameRecord', name],
    queryFn: async () => {
      if (!actor || !name.trim()) throw new Error('Actor not available or name empty');
      const result = await actor.getNameRecord(name);
      if ('ok' in result) {
        return result.ok;
      } else {
        throw new Error(result.err);
      }
    },
    enabled: !!actor && !isFetching && !!name.trim(),
    retry: false,
  });
}

export function useListNameRecords() {
  const { actor, isFetching } = useActor();

  return useQuery<NameRecord[]>({
    queryKey: ['nameRecords'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listNameRecords();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useHasRegisteredName() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<boolean>({
    queryKey: ['hasRegisteredName', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) return false;
      const owner = identity.getPrincipal().toString();
      return actor.hasRegisteredName(owner);
    },
    enabled: !!actor && !isFetching && !!identity,
    retry: false,
  });
}

export function useRegisterName() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      address,
      addressType,
      seasonId
    }: {
      name: string;
      address: string;
      addressType: AddressType;
      seasonId: bigint;
    }) => {
      if (!actor || !identity) throw new Error('Not authenticated');

      const owner = identity.getPrincipal().toString();

      // AddressType is already in variant format

      // Call registerName with payment integration
      // Note: In a real implementation, you would need to attach ICP cycles to this call
      // For now, we're calling the function directly and the backend will validate payment
      const paymentId = await actor.registerName(name, address, addressType, owner, seasonId);

      return paymentId;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['nameRecord', variables.name] });
      queryClient.invalidateQueries({ queryKey: ['nameRecords'] });
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['activeSeasonInfo'] });
      queryClient.invalidateQueries({ queryKey: ['hasRegisteredName'] });
      queryClient.invalidateQueries({ queryKey: ['userNames'] });
      queryClient.invalidateQueries({ queryKey: ['userSubscription'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Name registered successfully! Payment processed.');
      
      // Dispatch custom event to trigger navigation to the settings page
      window.dispatchEvent(new CustomEvent('switchTab', { detail: 'my-name' }));
    },
    onError: (error) => {
      toast.error(`Registration failed: ${error.message}`);
    },
  });
}

// Payment Verification and Registration Hook (PRD Implementation)
export function usePaymentVerificationAndRegister() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      address,
      addressType,
      seasonId,
      amount,
      canisterPrincipal
    }: {
      name: string;
      address: string;
      addressType: AddressType;
      seasonId: bigint;
      amount: bigint;
      canisterPrincipal: string;
    }) => {
      if (!actor || !identity) throw new Error('Not authenticated');

      // Step 1: Execute ICP Payment
      const icpLedger = await createIcpLedgerActor(identity);

      const transferArgs = {
        to: {
          owner: Principal.fromText(canisterPrincipal),
          subaccount: [],
        },
        amount: amount,
        fee: [10000n], // Standard ICP fee (0.0001 ICP)
        memo: [],
        from_subaccount: [],
        created_at_time: [],
      };

      const transferResult: any = await icpLedger.icrc1_transfer(transferArgs);

      if ('Err' in transferResult) {
        throw new Error(`Payment failed: ${JSON.stringify(transferResult.Err)}`);
      }

      const blockIndex = transferResult.Ok;

      // Step 2: Wait a moment for the transaction to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Call verifyAndRegisterName with the block index
      const paymentId = await actor.verifyAndRegisterName(
        name,
        address,
        addressType,
        seasonId,
        blockIndex
      );

      return { paymentId, blockIndex };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['nameRecord', variables.name] });
      queryClient.invalidateQueries({ queryKey: ['nameRecords'] });
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['activeSeasonInfo'] });
      queryClient.invalidateQueries({ queryKey: ['hasRegisteredName'] });
      queryClient.invalidateQueries({ queryKey: ['userNames'] });
      queryClient.invalidateQueries({ queryKey: ['userSubscription'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['paymentHistory'] });

      toast.success(`Name registered successfully! Payment verified at block ${result.blockIndex}.`);

      // Dispatch custom event to trigger navigation to the settings page
      window.dispatchEvent(new CustomEvent('switchTab', { detail: 'my-name' }));
    },
    onError: (error) => {
      toast.error(`Registration failed: ${error.message}`);
    },
  });
}

// Payment History Query
export function useGetPaymentHistory() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<VerifiedPayment[]>({
    queryKey: ['paymentHistory', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) throw new Error('Not authenticated');
      return actor.getPaymentHistory();
    },
    enabled: !!actor && !isFetching && !!identity,
    retry: false,
  });
}

// Check Block Index Usage Query
export function useCheckBlockIndexUsed(blockIndex?: number) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['blockIndexUsed', blockIndex],
    queryFn: async () => {
      if (!actor || blockIndex === undefined) throw new Error('Actor not available or block index undefined');
      return actor.checkBlockIndexUsed(BigInt(blockIndex));
    },
    enabled: !!actor && !isFetching && blockIndex !== undefined,
    retry: false,
  });
}



// Name Metadata Management Queries
export function useGetNameMetadata(name: string) {
  const { actor, isFetching } = useActor();

  return useQuery<Metadata | null>({
    queryKey: ['nameMetadata', name],
    queryFn: async () => {
      if (!actor || !name.trim()) throw new Error('Actor not available or name empty');
      try {
        const result = await actor.getMetadata(name);
        if ('ok' in result) {
          return result.ok;
        } else {
          // If metadata not found, return null instead of throwing
          if (result.err.includes('Metadata not found')) {
            return null;
          }
          throw new Error(result.err);
        }
      } catch (error: any) {
        // If metadata not found, return null instead of throwing
        if (error.message?.includes('Metadata not found')) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!actor && !isFetching && !!name.trim(),
    retry: false,
  });
}

export function useSaveNameMetadata() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      name, 
      title, 
      description, 
      image 
    }: { 
      name: string; 
      title: string; 
      description: string; 
      image: string; 
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveMetadata(name, title, description, image);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['nameMetadata', variables.name] });
      queryClient.invalidateQueries({ queryKey: ['nameRecord', variables.name] });
      toast.success('Metadata saved successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to save metadata: ${error.message}`);
    },
  });
}

// Markdown content management using dedicated backend methods
export function useGetNameMarkdown(name: string) {
  const { actor, isFetching } = useActor();

  return useQuery<MarkdownContent | null>({
    queryKey: ['nameMarkdown', name],
    queryFn: async () => {
      if (!actor || !name.trim()) throw new Error('Actor not available or name empty');
      try {
        const result = await actor.getMarkdownContent(name);
        if ('ok' in result) {
          return result.ok;
        } else {
          // If markdown not found, return null instead of throwing
          if (result.err.includes('Markdown not found')) {
            return null;
          }
          throw new Error(result.err);
        }
      } catch (error: any) {
        // If markdown not found, return null
        if (error.message?.includes('Markdown not found')) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!actor && !isFetching && !!name.trim(),
    retry: false,
  });
}

export function useSaveNameMarkdown() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, content }: { name: string; content: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveMarkdown(name, content);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['nameMarkdown', variables.name] });
      queryClient.invalidateQueries({ queryKey: ['nameRecord', variables.name] });
      toast.success('Markdown content saved successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to save markdown: ${error.message}`);
    },
  });
}

// DID file management - placeholder implementation until backend is updated
export function useGetNameDid(name: string) {
  const { actor, isFetching } = useActor();

  return useQuery<string | null>({
    queryKey: ['nameDid', name],
    queryFn: async () => {
      if (!actor || !name.trim()) throw new Error('Actor not available or name empty');
      
      // Placeholder implementation - return null until backend implements DID storage
      // TODO: Replace with actual backend method when implemented
      // return actor.getNameDid(name);
      
      // For now, return a placeholder DID content for canisters
      const nameRecordResult = await actor.getNameRecord(name);
      if ('err' in nameRecordResult) {
        throw new Error(nameRecordResult.err);
      }
      const nameRecord = nameRecordResult.ok;
      if ('canister' in nameRecord.addressType) {
        return `// Placeholder DID file for ${name}
// This is a temporary placeholder until backend DID storage is implemented

service : {
  // Add your canister's public methods here
  greet : (text) -> (text) query;
}`;
      }
      
      return null;
    },
    enabled: !!actor && !isFetching && !!name.trim(),
    retry: false,
  });
}

export function useSaveNameDid() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, content }: { name: string; content: string }) => {
      if (!actor) throw new Error('Actor not available');
      
      // Placeholder implementation - simulate saving
      // TODO: Replace with actual backend method when implemented
      // return actor.saveNameDid(name, content);
      
      // Temporary simulation - remove when backend is implemented
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Saving DID for name:', name, 'content:', content);
      
      // Show a warning that this is not yet implemented
      toast.warning('DID file saving is not yet implemented in the backend. This is a placeholder.');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['nameDid', variables.name] });
      queryClient.invalidateQueries({ queryKey: ['nameRecord', variables.name] });
      // Note: Success toast is shown in the mutation function as a warning
    },
    onError: (error) => {
      toast.error(`Failed to save DID: ${error.message}`);
    },
  });
}

// Helper function to get active season
export function useGetActiveSeason() {
  const { data: seasons = [] } = useListSeasons();

  // Find the active season using variant type checking
  const activeSeason = seasons.find(season => 'active' in season.status);

  const now = BigInt(Date.now() * 1000000); // Convert to nanoseconds

  // Check if the active season is within its time window
  const isSeasonActive = activeSeason &&
    now >= activeSeason.startTime &&
    now <= activeSeason.endTime;

  return {
    activeSeason: isSeasonActive ? activeSeason : null,
    seasons,
  };
}

// Helper function to get user's registered names
export function useGetUserNames() {
  const { identity } = useInternetIdentity();
  const { data: allNames = [] } = useListNameRecords();
  
  if (!identity) return { data: [], isLoading: false };
  
  const userPrincipal = identity.getPrincipal().toString();
  const userNames = allNames.filter(record => record.owner === userPrincipal);
  
  return {
    data: userNames,
    isLoading: false,
  };
}

// Helper function to get registration count for a season
export function useGetSeasonRegistrationCount(seasonId: bigint | null) {
  const { data: allNames = [] } = useListNameRecords();
  
  if (seasonId === null) return 0;
  
  return allNames.filter(record => record.seasonId === seasonId).length;
}

