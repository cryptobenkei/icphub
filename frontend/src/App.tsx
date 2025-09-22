import { useState, useEffect } from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Heart, Copy } from 'lucide-react';
import { RegisterNameForm } from './components/RegisterNameForm';
import { MyNames } from './components/MyNames';
import { AdminPanel } from './components/AdminPanel';
import { Home } from './components/Home';
import { Toaster } from '@/components/ui/sonner';
import { useGetCallerUserProfile, useIsCallerAdmin, useHasRegisteredName, useGetUserNames } from './hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function App() {
  const { identity, login, clear, isLoggingIn } = useInternetIdentity();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('home');

  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();
  const principalId = isAuthenticated ? identity.getPrincipal().toString() : null;
  
  const { data: userProfile } = useGetCallerUserProfile();
  const { data: isAdmin = false } = useIsCallerAdmin();
  const { data: hasRegisteredName = false, isLoading: hasNameLoading } = useHasRegisteredName();
  const { data: userNames = [] } = useGetUserNames();

  // Get the first registered name for display in navigation
  const displayName = userNames.length > 0 ? userNames[0].name : null;

  const handleLogout = async () => {
    await clear();
    // Clear all cached data to ensure fresh data on next login
    queryClient.clear();
  };

  const copyPrincipalId = () => {
    if (principalId) {
      navigator.clipboard.writeText(principalId);
      toast.success('Principal ID copied to clipboard');
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
  }, [identity?.getPrincipal().toString(), queryClient]);

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
            <Button onClick={login} disabled={isLoggingIn}>
              {isLoggingIn ? 'Connecting...' : 'Connect Wallet'}
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
            <Button onClick={login} disabled={isLoggingIn}>
              {isLoggingIn ? 'Connecting...' : 'Connect Wallet'}
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
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <img src="/logo.png" alt="IcpHub" className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">IcpHub</h1>
                <p className="text-sm text-muted-foreground">AI Community for ICP</p>
              </div>
            </div>
            
            {/* Principal ID Display */}
            {isAuthenticated && principalId && (
              <div className="hidden lg:flex items-center space-x-2 bg-muted/50 rounded-lg px-3 py-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-mono text-muted-foreground">
                  {principalId.length > 20 ? `${principalId.slice(0, 10)}...${principalId.slice(-10)}` : principalId}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyPrincipalId}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            {/* Horizontal Navigation Menu */}
            <nav className="flex items-center space-x-4 sm:space-x-6">
              <button
                onClick={() => setActiveTab('home')}
                className={`px-2 sm:px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
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
                      className={`px-2 sm:px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
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
                      className={`px-2 sm:px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
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
                  className={`px-2 sm:px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
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
            <div className="flex items-center space-x-2 sm:space-x-4">
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
                  <Badge variant="outline" className="bg-primary/5 hidden sm:inline-flex">
                    Connected
                  </Badge>
                  <Button variant="outline" onClick={handleLogout} size="sm">
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={login} 
                  disabled={isLoggingIn}
                  className="bg-primary hover:bg-primary/90"
                  size="sm"
                >
                  {isLoggingIn ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              )}
            </div>
          </div>
          
          {/* Mobile Principal ID Display */}
          {isAuthenticated && principalId && (
            <div className="lg:hidden mt-3 flex items-center justify-center space-x-2 bg-muted/50 rounded-lg px-3 py-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-mono text-muted-foreground">
                {principalId.length > 30 ? `${principalId.slice(0, 15)}...${principalId.slice(-15)}` : principalId}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyPrincipalId}
                className="h-6 w-6 p-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
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

