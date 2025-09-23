import { usePlugWallet } from './usePlugWallet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { type backendInterface } from '../backend';
import { createActorWithConfig } from '../config';
import { idlFactory } from '../declarations/context_registry/context_registry.did.js';

// initializeAccessControl is already part of the backend interface

const ACTOR_QUERY_KEY = 'actor';
export function useActor() {
    const { identity, agent, isConnectionSuccess, principal } = usePlugWallet();
    const queryClient = useQueryClient();

    const actorQuery = useQuery<backendInterface>({
        queryKey: [ACTOR_QUERY_KEY, principal],
        queryFn: async () => {
            const isAuthenticated = isConnectionSuccess && !!identity && !!agent;

            if (!isAuthenticated) {
                // Return anonymous actor if not authenticated
                return await createActorWithConfig();
            }

            // Use Plug Wallet to create actor directly
            const config = await import('../config').then(m => m.loadConfig());

            try {
                const actor = await window.ic!.plug!.createActor({
                    canisterId: config.backend_canister_id,
                    interfaceFactory: idlFactory
                });

                // Check if initializeAccessControl exists and call it
                if (
                    'initializeAccessControl' in actor &&
                    typeof actor.initializeAccessControl === 'function'
                ) {
                    await actor.initializeAccessControl();
                }
                return actor;
            } catch (error) {
                console.error('Failed to create Plug actor, falling back to standard actor:', error);

                // Fallback to standard actor creation with Plug identity
                const actorOptions = {
                    agentOptions: {
                        identity
                    }
                };

                const actor = await createActorWithConfig(actorOptions);
                if (
                    'initializeAccessControl' in actor &&
                    typeof actor.initializeAccessControl === 'function'
                ) {
                    await actor.initializeAccessControl();
                }
                return actor;
            }
        },
        // Only refetch when identity changes
        staleTime: Infinity,
        enabled: true
    });

    // When the actor changes, invalidate dependent queries
    useEffect(() => {
        if (actorQuery.data) {
            queryClient.invalidateQueries({
                predicate: (query) => {
                    return !query.queryKey.includes(ACTOR_QUERY_KEY);
                }
            });
            queryClient.refetchQueries({
                predicate: (query) => {
                    return !query.queryKey.includes(ACTOR_QUERY_KEY);
                }
            });
        }
    }, [actorQuery.data, queryClient]);

    return {
        actor: actorQuery.data || null,
        isFetching: actorQuery.isFetching
    };
}

