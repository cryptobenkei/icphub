import { useState, useEffect } from 'react';
import { usePlugWallet } from './hooks/usePlugWallet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Copy } from 'lucide-react';
import { RegisterNameForm } from './components/RegisterNameForm';
import { MyNames } from './components/MyNames';
import { AdminPanel } from './components/AdminPanel';
import { Home } from './components/Home';
import { Toaster } from '@/components/ui/sonner';
import { useGetCallerUserProfile, useIsCallerAdmin, useHasRegisteredName, useGetUserNames, useGetCanisterVersion } from './hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function App() {
  const {
    identity,
    connect,
    disconnect,
    isConnecting,
    isConnectionSuccess,
    isConnectionError,
    connectionError,
    isPlugInstalled,
    principal
  } = usePlugWallet();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('home');

  const isAuthenticated = isConnectionSuccess && !!identity && !identity.getPrincipal().isAnonymous();
  const principalId = isAuthenticated ? principal : null;
  
  const { data: userProfile } = useGetCallerUserProfile();
  const { data: isAdmin = false } = useIsCallerAdmin();
  const { data: hasRegisteredName = false, isLoading: hasNameLoading } = useHasRegisteredName();
  const { data: userNames = [] } = useGetUserNames();
  const { data: canisterVersion } = useGetCanisterVersion();


  // Show installation prompt if Plug is not installed
  useEffect(() => {
    if (!isPlugInstalled && !isConnectionSuccess) {
      const timer = setTimeout(() => {
        toast.error('Plug Wallet not detected. Please install Plug Wallet to connect.', {
          action: {
            label: 'Install Plug',
            onClick: () => window.open('https://chrome.google.com/webstore/detail/plug/cfbfdhimifdmdehjmkdobpcjfefblkjm', '_blank')
          },
          duration: 10000
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isPlugInstalled, isConnectionSuccess]);

  // Show connection errors
  useEffect(() => {
    if (isConnectionError && connectionError) {
      toast.error(`Connection failed: ${connectionError.message}`);
    }
  }, [isConnectionError, connectionError]);

  // Get the first registered name for display in navigation
  const displayName = userNames.length > 0 ? userNames[0].name : null;

  // Format canister version for display
  const formatVersion = (version: {major: bigint, minor: bigint, patch: bigint} | undefined): string => {
    if (!version) return '';
    return `v${Number(version.major)}.${Number(version.minor)}.${Number(version.patch)}`;
  };

  const formattedVersion = canisterVersion ? formatVersion(canisterVersion) : '';

  // Detect environment
  const getEnvironment = (): 'prod' | 'local' => {
    const hostname = window.location.hostname;
    if (hostname === 'icphub.ai' || hostname.endsWith('.icphub.ai')) {
      return 'prod';
    }
    return 'local';
  };

  const environment = getEnvironment();

  // Get canister ID from config
  const getCanisterId = async (): Promise<string> => {
    try {
      const config = await import('./config').then(m => m.loadConfig());
      return config.backend_canister_id;
    } catch {
      return 'Loading...';
    }
  };

  const [canisterId, setCanisterId] = useState<string>('Loading...');

  useEffect(() => {
    getCanisterId().then(setCanisterId);
  }, []);

  const handleLogout = async () => {
    await disconnect();
    // Clear all cached data to ensure fresh data on next login
    queryClient.clear();
  };

  const copyPrincipalId = () => {
    if (principalId) {
      navigator.clipboard.writeText(principalId);
      toast.success('Principal ID copied to clipboard');
    }
  };

  const copyCanisterId = () => {
    if (canisterId && canisterId !== 'Loading...') {
      navigator.clipboard.writeText(canisterId);
      toast.success('Canister ID copied to clipboard');
    }
  };

  // Listen for tab switch events from components
  useEffect(() => {
    const handleTabSwitch = (event: CustomEvent) => {
      setActiveTab(event.detail);
    };

    window.addEventListener('switchTab', handleTabSwitch as EventListener);
    return () => window.removeEventListener('switchTab', handleTabSwitch as EventListener);
  }, []);

  // Clear cached data when identity changes to ensure fresh data from correct canister
  useEffect(() => {
    if (identity) {
      // Clear all cached data when logging in to ensure fresh data
      queryClient.invalidateQueries();
    }
  }, [principal, queryClient]);

  const renderContent = () => {
    switch (activeTab) {
      case 'register':
        return isAuthenticated ? (
          <RegisterNameForm />
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Connect your wallet to register names during active seasons
            </p>
            <Button onClick={connect} disabled={isConnecting}>
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          </div>
        );
      case 'my-name':
        return isAuthenticated ? (
          <MyNames />
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Connect your wallet to view your registered names
            </p>
            <Button onClick={connect} disabled={isConnecting}>
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          </div>
        );
      case 'admin':
        return <AdminPanel />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <Toaster />
      
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center space-x-2">
              <div className="p-1 bg-primary/10 rounded-lg">
                <img src="/face.png" alt="IcpHub" className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">
                  IcpHub{' '}
                  {formattedVersion && (
                    <span className="text-xs text-muted-foreground font-normal">{formattedVersion}</span>
                  )}{' '}
                  <Badge
                    variant={environment === 'prod' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {environment}
                  </Badge>
                </h1>
                <p className="text-xs text-muted-foreground">Talk to my Chain</p>
              </div>
            </div>
            
            
            {/* Horizontal Navigation Menu */}
            <nav className="flex items-center space-x-3 sm:space-x-4">
              <button
                onClick={() => setActiveTab('home')}
                className={`px-2 sm:px-3 py-1.5 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'home'
                    ? 'text-primary border-primary'
                    : 'text-muted-foreground hover:text-foreground border-transparent hover:border-muted-foreground/30'
                }`}
              >
                Home
              </button>
              
              {isAuthenticated && !hasNameLoading && (
                <>
                  {!hasRegisteredName ? (
                    <button
                      onClick={() => setActiveTab('register')}
                      className={`px-2 sm:px-3 py-1.5 text-sm font-medium transition-colors border-b-2 ${
                        activeTab === 'register'
                          ? 'text-primary border-primary'
                          : 'text-muted-foreground hover:text-foreground border-transparent hover:border-muted-foreground/30'
                      }`}
                    >
                      Register
                    </button>
                  ) : (
                    <button
                      onClick={() => setActiveTab('my-name')}
                      className={`px-2 sm:px-3 py-1.5 text-sm font-medium transition-colors border-b-2 ${
                        activeTab === 'my-name'
                          ? 'text-primary border-primary'
                          : 'text-muted-foreground hover:text-foreground border-transparent hover:border-muted-foreground/30'
                      }`}
                    >
                      {displayName ? `@${displayName}` : 'My Name'}
                    </button>
                  )}
                </>
              )}
              
              {isAuthenticated && isAdmin && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`px-2 sm:px-3 py-1.5 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === 'admin'
                      ? 'text-primary border-primary'
                      : 'text-muted-foreground hover:text-foreground border-transparent hover:border-muted-foreground/30'
                  }`}
                >
                  Admin
                </button>
              )}
            </nav>
            
            {/* User Actions */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {isAuthenticated ? (
                <div className="flex items-center space-x-2 sm:space-x-3">
                  {/* TODO: Fix userProfile type issue
                  {userProfile && (
                    <div className="hidden sm:flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{userProfile.name}</span>
                    </div>
                  )}
                  */}
                  <div className="flex items-center group hidden sm:inline-flex">
                    <span className="text-xs text-muted-foreground">Principal:</span>
                    <span
                      className="text-xs font-mono text-foreground cursor-pointer hover:text-primary transition-colors ml-1"
                      title={principalId}
                      onClick={copyPrincipalId}
                    >
                      {principalId.length > 15 ? `${principalId.slice(0, 8)}...${principalId.slice(-6)}` : principalId}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyPrincipalId}
                      className="h-3 w-3 p-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                    >
                      <Copy className="h-2 w-2" />
                    </Button>
                  </div>
                  <Button variant="outline" onClick={handleLogout} size="sm">
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={connect}
                  disabled={isConnecting}
                  className="bg-primary hover:bg-primary/90"
                  size="sm"
                >
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              )}
            </div>
          </div>
          
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-6xl mx-auto">
          <CardContent className="p-6">
            {renderContent()}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/30 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            © 2025. Built with <Heart className="inline h-4 w-4 text-red-500" /> using{' '}
            <a 
              href="https://caffeine.ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

