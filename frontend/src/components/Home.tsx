import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Database, Zap, Shield } from 'lucide-react';
import { useGetActiveSeasonInfo, useHasRegisteredName, getSeasonNumber } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';

export function Home() {
  const { identity, login } = useInternetIdentity();
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

      {/* Hero Section */}
      <div className="text-center space-y-6 pt-8">
        <div className="max-w-3xl mx-auto space-y-4">
          <img src="/logo.png" alt="IcpHub" className="h-32 w-32 mx-auto mb-8" />
          <h2 className="text-4xl font-bold mb-6">
            The Knowledge-Powered Community
          </h2>
          <p className="text-xl text-muted-foreground mb-6">
            Register your unique name, upload your knowledge, and connect with verified members through AI-powered conversations.
          </p>
          <div className="grid md:grid-cols-4 gap-4 text-center mb-8">
            <div className="space-y-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-sm font-semibold text-primary">1</span>
              </div>
              <h3 className="font-semibold">Register Your Name</h3>
              <p className="text-sm text-muted-foreground">Secure your unique identity and get verified in the community</p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-sm font-semibold text-primary">2</span>
              </div>
              <h3 className="font-semibold">Share Knowledge</h3>
              <p className="text-sm text-muted-foreground">Upload your documents, data, and expertise to your personal namespace</p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-sm font-semibold text-primary">3</span>
              </div>
              <h3 className="font-semibold">AI-Powered Chats</h3>
              <p className="text-sm text-muted-foreground">Talk to individual members or the entire community using their collective knowledge</p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-sm font-semibold text-primary">4</span>
              </div>
              <h3 className="font-semibold">Canister Integration</h3>
              <p className="text-sm text-muted-foreground">Interact with any canister using DID files through our AI chat interface</p>
            </div>
          </div>
          <div className="flex justify-center">
            <button
              onClick={handleRegisterName}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Register Your Name
            </button>
          </div>
        </div>
      </div>

      {/* Current Season Info */}
      <div className="max-w-lg mx-auto">
        {seasonLoading ? (
          <Card className="shadow-sm">
            <CardContent className="py-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading season info...</p>
              </div>
            </CardContent>
          </Card>
        ) : seasonInfo ? (
          <Card className="border-primary/20 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="text-center pb-4">
              <CardTitle className="flex items-center justify-center space-x-2 text-lg">
                <Zap className="h-4 w-4 text-primary" />
                <span>Season {getSeasonNumber(seasonInfo.season.id)} • {seasonInfo.season.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex justify-center items-center space-x-8">
                <div className="text-center">
                  <div className="text-xl font-bold text-primary mb-1">
                    {seasonInfo.availableNames.toString()}/{seasonInfo.season.maxNames.toString()}
                  </div>
                  <p className="text-xs text-muted-foreground">Available/Total</p>
                </div>
                <div className="w-px h-8 bg-border"></div>
                <div className="text-center">
                  <div className="text-xl font-bold text-secondary mb-1">
                    {(Number(seasonInfo.price) / 100_000_000).toFixed(2)} ICP
                  </div>
                  <p className="text-xs text-muted-foreground">Subscription Price</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-muted shadow-sm">
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground">No active registration season at the moment.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Context Protocol Section */}
      <div className="max-w-3xl mx-auto space-y-6">
        <Card className="border-primary/20 hover:border-primary/30 transition-colors bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-primary" />
              <span>Powered by Context Protocol</span>
            </CardTitle>
            <CardDescription>
              IcpHub leverages Context Protocol to provide advanced AI capabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              When you register a name, you automatically receive a basic subscription to Context Protocol.
              Each name gets its own named and verified MCP (Model Context Protocol) server, enabling seamless
              AI interactions with your data and the broader ICP ecosystem.
            </p>
            <div className="flex items-center space-x-2 text-sm text-primary">
              <span className="w-2 h-2 bg-primary rounded-full"></span>
              <span>Basic Context Protocol subscription included</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-primary mt-2">
              <span className="w-2 h-2 bg-primary rounded-full"></span>
              <span>Named and verified MCP server for each registration</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-secondary/20 hover:border-secondary/30 transition-colors bg-secondary/5">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-secondary" />
              <span>Governance & Verification</span>
            </CardTitle>
            <CardDescription>
              Building trust through community governance and reputation systems
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              We're developing a governance system that will add reputation scoring and name verification.
              Community members will be able to build trust through verified contributions, creating a
              reliable network of authenticated knowledge providers.
            </p>
            <div className="flex items-center space-x-2 text-sm text-secondary">
              <span className="w-2 h-2 bg-secondary rounded-full"></span>
              <span>Reputation-based verification system (coming soon)</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-secondary mt-2">
              <span className="w-2 h-2 bg-secondary rounded-full"></span>
              <span>Community-driven governance for trust building</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-accent/20 hover:border-accent/30 transition-colors bg-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-accent" />
              <span>Canister Integration</span>
            </CardTitle>
            <CardDescription>
              Direct interaction with ICP canisters through AI-powered chat
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Names can be assigned to canisters with uploaded DID files. Through Context Protocol's
              MCP servers, you can interact with any canister via natural language chat, making
              complex blockchain interactions as simple as having a conversation.
            </p>
            <div className="flex items-center space-x-2 text-sm text-accent">
              <span className="w-2 h-2 bg-accent rounded-full"></span>
              <span>Assign names to canisters with DID file upload</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-accent mt-2">
              <span className="w-2 h-2 bg-accent rounded-full"></span>
              <span>Chat-based canister interaction via Context Protocol</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

