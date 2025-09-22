import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Brain, Search, FileText, Database, MessageSquare, Zap, Users, Globe, ArrowRight } from 'lucide-react';
import { useGetActiveSeasonInfo, useHasRegisteredName, getSeasonNumber } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';

export function Home() {
  const { identity, login, isLoggingIn } = useInternetIdentity();
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();
  
  const { data: seasonInfo, isLoading: seasonLoading } = useGetActiveSeasonInfo();
  const { data: hasRegisteredName = false, isLoading: nameCheckLoading } = useHasRegisteredName();

  const handleGetYourName = () => {
    if (!isAuthenticated) {
      login();
      return;
    }
    // Switch to register tab
    const event = new CustomEvent('switchTab', { detail: 'register' });
    window.dispatchEvent(event);
  };

  const handleRegisterName = () => {
    if (!isAuthenticated) {
      login();
      return;
    }
    // This will be handled by parent component tab switching
    const event = new CustomEvent('switchTab', { detail: 'register' });
    window.dispatchEvent(event);
  };

  const handleViewDashboard = () => {
    // This will be handled by parent component tab switching
    const event = new CustomEvent('switchTab', { detail: 'my-name' });
    window.dispatchEvent(event);
  };

  // Show prominent "Get your name" button for authenticated users without a registered name
  const showGetYourNameButton = isAuthenticated && !nameCheckLoading && !hasRegisteredName;

  return (
    <div className="space-y-8">
      {/* Prominent "Get your name" button for users without a registered name */}
      {showGetYourNameButton && (
        <div className="text-center">
          <Card className="border-primary bg-gradient-to-r from-primary/5 to-accent/5">
            <CardContent className="py-6">
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-primary">Ready to join the community?</h3>
                <p className="text-muted-foreground">
                  Register your unique name and get instant access to Context Protocol
                </p>
                <Button 
                  onClick={handleGetYourName}
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-lg px-8 py-3"
                >
                  Get your name
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Hero Section */}
      <div className="text-center space-y-6 pt-8">
        <div className="max-w-3xl mx-auto space-y-4">
          <h2 className="text-4xl font-bold mb-4 mt-12">
            Welcome to IcpHubs
          </h2>
          <p className="text-xl text-muted-foreground mb-6">
            The AI Community for Internet Computer Protocol
          </p>
          <p className="text-lg text-muted-foreground">
            Join our AI-powered community by registering a unique name. Get instant access to Context Protocol 
            and unlock the power of AI-driven querying for all your documents, data, and canisters.
          </p>
        </div>
      </div>

      {/* Current Season Info */}
      {seasonLoading ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground">Loading season information...</p>
            </div>
          </CardContent>
        </Card>
      ) : seasonInfo ? (
        <Card className="border-primary/20">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <Zap className="h-5 w-5 text-primary" />
              <span>Current Registration Season</span>
            </CardTitle>
            <CardDescription>
              Season {getSeasonNumber(seasonInfo.season.id)} - {seasonInfo.season.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div className="space-y-2">
                <div className="text-2xl font-bold text-primary">
                  {seasonInfo.availableNames.toString()}
                </div>
                <p className="text-sm text-muted-foreground">Names Available</p>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-accent">
                  {seasonInfo.price.toString()} ICP
                </div>
                <p className="text-sm text-muted-foreground">Price per Name</p>
              </div>
              <div className="space-y-2">
                <Badge variant="default" className="text-sm px-3 py-1">
                  Season {getSeasonNumber(seasonInfo.season.id)}
                </Badge>
                <p className="text-sm text-muted-foreground">Active Season</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-muted">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No active registration season at the moment.</p>
          </CardContent>
        </Card>
      )}

      {/* Benefits Section */}
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-center">Membership Benefits</h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-accent/20 hover:border-accent/40 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-accent" />
                <span>Context Protocol Access</span>
              </CardTitle>
              <CardDescription>
                Get a full one-year subscription to Context Protocol with your name registration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>AI-powered chat interface</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Database className="h-4 w-4" />
                  <span>Query your registered data</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Globe className="h-4 w-4" />
                  <span>Canister interaction via AI</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary" />
                <span>Document Management</span>
              </CardTitle>
              <CardDescription>
                Register and manage all your documents, data, and canisters under your name
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Document storage & retrieval</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Database className="h-4 w-4" />
                  <span>Data organization</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Search className="h-4 w-4" />
                  <span>Instant search & access</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      {/* Action Section */}
      <div className="text-center space-y-6">
        {isAuthenticated ? (
          nameCheckLoading ? (
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Checking your registration status...</p>
            </div>
          ) : hasRegisteredName ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2 text-green-600">
                <Users className="h-5 w-5" />
                <span className="font-medium">You're already a member!</span>
              </div>
              <p className="text-muted-foreground mb-6">
                Access your dashboard to manage your documents and data
              </p>
              <Button 
                onClick={handleViewDashboard}
                size="lg"
                className="bg-primary hover:bg-primary/90"
              >
                <img src="/assets/generated/dashboard-icon.png" alt="" className="h-4 w-4 mr-2" />
                View Dashboard
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Ready to Join?</h3>
              <p className="text-muted-foreground mb-6">
                Register a name to become a member of the community
              </p>
              <Button 
                onClick={handleRegisterName}
                size="lg"
                className="bg-primary hover:bg-primary/90"
              >
                <Users className="h-4 w-4 mr-2" />
                Register Name
              </Button>
            </div>
          )
        ) : (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Get Started</h3>
            <p className="text-muted-foreground mb-6">
              Connect your wallet to register a name and join the community
            </p>
            <Button 
              onClick={login}
              disabled={isLoggingIn}
              size="lg"
              className="bg-primary hover:bg-primary/90"
            >
              <Users className="h-4 w-4 mr-2" />
              {isLoggingIn ? 'Connecting...' : 'Connect & Register'}
            </Button>
          </div>
        )}
      </div>

      {/* Community Stats */}
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5">
        <CardHeader className="text-center">
          <CardTitle>Join the Growing Community</CardTitle>
          <CardDescription>
            Be part of the future of AI-powered development on the Internet Computer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-primary">AI</div>
              <p className="text-xs text-muted-foreground">Powered</p>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-accent">ICP</div>
              <p className="text-xs text-muted-foreground">Native</p>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-primary">1 Year</div>
              <p className="text-xs text-muted-foreground">Subscription</p>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-accent">∞</div>
              <p className="text-xs text-muted-foreground">Possibilities</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

