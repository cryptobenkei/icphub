import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import { NameRecord, AddressType, Season, UserProfile, Metadata, MarkdownContent, toAddressTypeVariant } from '../backend';
import { toast } from 'sonner';

// Utility function to convert backend season ID to user-friendly season number
export function getSeasonNumber(seasonId: bigint): number {
  return Number(seasonId) + 1;
}

// User Profile Queries
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
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
      const candidContent = `// Candid Interface Definition for IcpHubs Name Registry
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

  // Name Registration
  registerName : (text, text, AddressType, text, nat) -> ();
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
      return actor.getNameRecord(name);
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
      seasonId,
      price
    }: { 
      name: string; 
      address: string; 
      addressType: AddressType;
      seasonId: bigint;
      price: bigint;
    }) => {
      if (!actor || !identity) throw new Error('Not authenticated');
      
      // TODO: Implement ICP payment transfer here
      // This should transfer the required ICP amount to the canister before registration
      // For now, we'll proceed with registration assuming payment is handled by the backend
      
      const owner = identity.getPrincipal().toString();
      // Convert enum to variant format for the canister
      const addressTypeVariant = toAddressTypeVariant(addressType);
      return actor.registerName(name, address, addressTypeVariant, owner, seasonId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['nameRecord', variables.name] });
      queryClient.invalidateQueries({ queryKey: ['nameRecords'] });
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['activeSeasonInfo'] });
      queryClient.invalidateQueries({ queryKey: ['hasRegisteredName'] });
      toast.success('Name registered successfully! Payment processed.');
      
      // Dispatch custom event to trigger navigation to the settings page
      window.dispatchEvent(new CustomEvent('switchTab', { detail: 'my-name' }));
    },
    onError: (error) => {
      toast.error(`Registration failed: ${error.message}`);
    },
  });
}

// Extended metadata structure to include markdown content
interface ExtendedMetadata {
  name: string;
  description: string;
  x: string;
  linkedin: string;
  url: string;
}

// Name Metadata Management Queries
export function useGetNameMetadata(name: string) {
  const { actor, isFetching } = useActor();

  return useQuery<Metadata | null>({
    queryKey: ['nameMetadata', name],
    queryFn: async () => {
      if (!actor || !name.trim()) throw new Error('Actor not available or name empty');
      try {
        return await actor.getMetadata(name);
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
        return await actor.getMarkdown(name);
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
      const nameRecord = await actor.getNameRecord(name);
      if (nameRecord.addressType === 'canister') {
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

  // Handle both variant and enum status formats
  const activeSeason = seasons.find(season => {
    if (typeof season.status === 'object' && 'active' in season.status) {
      return true;
    }
    return season.status === 'active';
  });

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

