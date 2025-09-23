import {
    type ReactNode,
    type PropsWithChildren,
    createContext,
    createElement,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState
} from 'react';
import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import type { HttpAgent } from '@dfinity/agent';

export type Status = 'initializing' | 'idle' | 'connecting' | 'success' | 'error';

export interface PlugWalletContext {
    /** The identity is available after successfully connecting to Plug Wallet. */
    identity?: Identity;

    /** The principal ID from Plug Wallet */
    principal?: string;

    /** The account ID from Plug Wallet */
    accountId?: string;

    /** The agent for making canister calls */
    agent?: HttpAgent;

    /** Connect to Plug Wallet to authenticate the user. */
    connect: () => Promise<void>;

    /** Disconnect from Plug Wallet and clear the identity. */
    disconnect: () => Promise<void>;

    /** The status of the connection process. */
    connectionStatus: Status;

    /** `connectionStatus === "initializing"` */
    isInitializing: boolean;

    /** `connectionStatus === "idle"` */
    isConnectionIdle: boolean;

    /** `connectionStatus === "connecting"` */
    isConnecting: boolean;

    /** `connectionStatus === "success"` */
    isConnectionSuccess: boolean;

    /** `connectionStatus === "error"` */
    isConnectionError: boolean;

    /** Error from connection attempts */
    connectionError?: Error;

    /** Check if Plug Wallet is installed */
    isPlugInstalled: boolean;
}

// Plug Wallet interface declarations
declare global {
    interface Window {
        ic?: {
            plug?: {
                requestConnect: (params?: {
                    whitelist?: string[];
                    host?: string;
                    onConnectionUpdate?: () => void;
                    timeout?: number;
                }) => Promise<string>;

                isConnected: () => Promise<boolean>;

                createAgent: (params: { whitelist: string[]; host: string }) => Promise<void>;
                createActor: (params: {
                    canisterId: string;
                    interfaceFactory: any;
                }) => Promise<any>;

                principalId?: string;
                accountId?: string;
                agent?: HttpAgent;

                requestBalance: () => Promise<any[]>;
                requestTransfer: (params: any) => Promise<any>;
                batchTransactions: (transactions: any[]) => Promise<any>;

                disconnect: () => Promise<void>;
            };
        };
    }
}

const DEFAULT_HOST = 'https://mainnet.dfinity.network';

type ProviderValue = PlugWalletContext;
const PlugWalletReactContext = createContext<ProviderValue | undefined>(undefined);

/**
 * Helper function to assert provider is present.
 */
function assertProviderPresent(context: ProviderValue | undefined): asserts context is ProviderValue {
    if (!context) {
        throw new Error('PlugWalletProvider is not present. Wrap your component tree with it.');
    }
}

/**
 * Hook to access the Plug Wallet context with connection status and functions.
 */
export const usePlugWallet = (): PlugWalletContext => {
    const context = useContext(PlugWalletReactContext);
    assertProviderPresent(context);
    return context;
};

/**
 * The PlugWalletProvider component makes Plug Wallet authentication available
 * throughout the app. It handles connection state and provides methods to
 * connect/disconnect from Plug Wallet.
 */
export function PlugWalletProvider({
    children,
    whitelist = [],
    host = DEFAULT_HOST
}: PropsWithChildren<{
    /** The child components that the PlugWalletProvider will wrap. */
    children: ReactNode;

    /** List of canister IDs to whitelist for Plug Wallet access */
    whitelist?: string[];

    /** The IC host to connect to */
    host?: string;
}>) {
    const [identity, setIdentity] = useState<Identity | undefined>(undefined);
    const [principal, setPrincipal] = useState<string | undefined>(undefined);
    const [accountId, setAccountId] = useState<string | undefined>(undefined);
    const [agent, setAgent] = useState<HttpAgent | undefined>(undefined);
    const [connectionStatus, setStatus] = useState<Status>('initializing');
    const [connectionError, setError] = useState<Error | undefined>(undefined);
    const [isPlugInstalled, setIsPlugInstalled] = useState(false);

    const setErrorMessage = useCallback((message: string) => {
        setStatus('error');
        setError(new Error(message));
    }, []);

    const clearState = useCallback(() => {
        setIdentity(undefined);
        setPrincipal(undefined);
        setAccountId(undefined);
        setAgent(undefined);
        setError(undefined);
    }, []);

    const connect = useCallback(async () => {
        if (!window.ic?.plug) {
            setErrorMessage('Plug Wallet not installed. Please install it from the Chrome Web Store.');
            return;
        }

        setStatus('connecting');
        setError(undefined);

        try {
            // Request connection to Plug Wallet
            const publicKey = await window.ic.plug.requestConnect({
                whitelist,
                host,
                timeout: 50000
            });

            if (!publicKey) {
                setErrorMessage('Connection was rejected by user.');
                return;
            }

            // Create agent if not already created
            if (!window.ic.plug.agent) {
                await window.ic.plug.createAgent({ whitelist, host });
            }

            if (!window.ic.plug.agent) {
                setErrorMessage('Failed to create Plug agent.');
                return;
            }

            // Get principal and account info
            const plugPrincipal = await window.ic.plug.agent.getPrincipal();
            const principalString = plugPrincipal.toString();
            const accountIdString = window.ic.plug.accountId;

            // Create identity object compatible with existing code
            const plugIdentity: Identity = {
                getPrincipal: () => plugPrincipal,
                transformRequest: (request) => Promise.resolve(request)
            };

            setIdentity(plugIdentity);
            setPrincipal(principalString);
            setAccountId(accountIdString);
            setAgent(window.ic.plug.agent);
            setStatus('success');

        } catch (error) {
            console.error('Plug connection error:', error);
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Failed to connect to Plug Wallet'
            );
        }
    }, [whitelist, host, setErrorMessage]);

    const disconnect = useCallback(async () => {
        try {
            if (window.ic?.plug?.disconnect) {
                await window.ic.plug.disconnect();
            }
        } catch (error) {
            console.error('Error disconnecting from Plug:', error);
        } finally {
            clearState();
            setStatus('idle');
        }
    }, [clearState]);

    // Check if Plug is installed and auto-reconnect if already connected
    useEffect(() => {
        let cancelled = false;

        const checkPlugStatus = async () => {
            try {
                setStatus('initializing');

                // Check if Plug is installed
                const plugInstalled = !!window.ic?.plug;
                setIsPlugInstalled(plugInstalled);

                if (!plugInstalled) {
                    setStatus('idle');
                    return;
                }

                // Check if already connected
                const isConnected = await window.ic.plug.isConnected();

                if (cancelled) return;

                if (isConnected && window.ic.plug.agent) {
                    // Auto-restore connection
                    const plugPrincipal = await window.ic.plug.agent.getPrincipal();
                    const principalString = plugPrincipal.toString();
                    const accountIdString = window.ic.plug.accountId;

                    const plugIdentity: Identity = {
                        getPrincipal: () => plugPrincipal,
                        transformRequest: (request) => Promise.resolve(request)
                    };

                    setIdentity(plugIdentity);
                    setPrincipal(principalString);
                    setAccountId(accountIdString);
                    setAgent(window.ic.plug.agent);
                    setStatus('success');
                } else {
                    setStatus('idle');
                }
            } catch (error) {
                console.error('Error checking Plug status:', error);
                if (!cancelled) {
                    setStatus('idle');
                }
            }
        };

        checkPlugStatus();

        return () => {
            cancelled = true;
        };
    }, []);

    const value = useMemo<ProviderValue>(
        () => ({
            identity,
            principal,
            accountId,
            agent,
            connect,
            disconnect,
            connectionStatus,
            isInitializing: connectionStatus === 'initializing',
            isConnectionIdle: connectionStatus === 'idle',
            isConnecting: connectionStatus === 'connecting',
            isConnectionSuccess: connectionStatus === 'success',
            isConnectionError: connectionStatus === 'error',
            connectionError,
            isPlugInstalled
        }),
        [
            identity,
            principal,
            accountId,
            agent,
            connect,
            disconnect,
            connectionStatus,
            connectionError,
            isPlugInstalled
        ]
    );

    return createElement(PlugWalletReactContext.Provider, { value, children });
}