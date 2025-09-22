import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Globe, User, Save, FileText, Code, MessageCircle, Send, Bot, Edit, X, Eye, UserPlus } from 'lucide-react';
import { 
  useGetUserNames, 
  useGetNameMetadata, 
  useSaveNameMetadata,
  useGetNameMarkdown,
  useSaveNameMarkdown,
  useGetNameDid,
  useSaveNameDid
} from '../hooks/useQueries';
import { AddressType } from '../backend';
import { toast } from 'sonner';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useActor } from '../hooks/useActor';

// Whitelist configuration
const ADMIN_WHITELIST = ['cryptobenkei'];

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export function MyNames() {
  const { data: userNames } = useGetUserNames();

  if (userNames.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">You haven't registered any names yet</p>
        <p className="text-sm text-muted-foreground">
          Go to the "Register Name" tab to register a name during an active season
        </p>
      </div>
    );
  }

  // For now, we'll manage the first registered name
  // In the future, this could be extended to handle multiple names
  const primaryName = userNames[0];

  return (
    <div className="space-y-6">
      <NameManagement record={primaryName} />
    </div>
  );
}

function NameManagement({ record }: { record: any }) {
  // Backend data queries
  const { data: metadata, isLoading: metadataLoading } = useGetNameMetadata(record.name);
  const { data: markdownData, isLoading: markdownLoading } = useGetNameMarkdown(record.name);
  const { data: didContent } = useGetNameDid(record.name);

  // Mutations
  const saveMetadataMutation = useSaveNameMetadata();
  const saveMarkdownMutation = useSaveNameMarkdown();
  const saveDidMutation = useSaveNameDid();

  // Admin registration logic
  const { identity } = useInternetIdentity();
  const { actor } = useActor();
  const [isRegisteringForAdmin, setIsRegisteringForAdmin] = useState(false);

  // Check if this name is in the admin whitelist
  const isWhitelisted = ADMIN_WHITELIST.includes(record.name);
  console.log('🔍 Whitelist check:', {
    recordName: record.name,
    whitelist: ADMIN_WHITELIST,
    isWhitelisted: isWhitelisted
  });

  // Check if user is authenticated
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();
  console.log('🔍 Authentication check:', {
    identity: identity ? 'present' : 'null',
    principal: identity?.getPrincipal().toString() || 'none',
    isAuthenticated: isAuthenticated
  });

  const handleRegisterForAdmin = async () => {
    console.log('🔵 Register for Admin button clicked');
    console.log('🔵 isAuthenticated:', isAuthenticated);
    console.log('🔵 identity:', identity);
    console.log('🔵 actor:', actor);

    if (identity) {
      const principal = identity.getPrincipal();
      console.log('🔵 Current principal:', principal.toString());
      console.log('🔵 Principal isAnonymous:', principal.isAnonymous());
    }

    if (!isAuthenticated || !actor) {
      console.log('🔴 Authentication failed - not authenticated or no actor');
      toast.error('Please authenticate first');
      return;
    }

    try {
      setIsRegisteringForAdmin(true);
      console.log('🔵 Calling initializeAccessControl...');

      // Call initializeAccessControl to register the user in the system
      const result = await actor.initializeAccessControl();
      console.log('🟢 initializeAccessControl result:', result);

      toast.success(`Successfully registered ${record.name} owner for admin eligibility. An existing admin can now promote this user.`);
      console.log('🟢 Registration successful for principal:', identity?.getPrincipal().toString());

    } catch (error) {
      console.error('🔴 Registration error:', error);
      console.log('🔴 Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      toast.error('Failed to register for admin eligibility. You may already be registered.');
    } finally {
      setIsRegisteringForAdmin(false);
      console.log('🔵 Registration process completed');
    }
  };

  // Local state for the new metadata fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [xHandle, setXHandle] = useState('');
  const [linkedIn, setLinkedIn] = useState('');
  const [url, setUrl] = useState('');
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [localMarkdownContent, setLocalMarkdownContent] = useState('');
  const [isEditingMarkdown, setIsEditingMarkdown] = useState(false);
  const [localDidContent, setLocalDidContent] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: `Hello! I'm the AI assistant for ${record.name}. I can help you with questions about the content, metadata, and capabilities associated with this name. What would you like to know?`,
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Load data from backend when available
  useEffect(() => {
    if (metadata) {
      // Parse the metadata to extract the new field structure
      // For backward compatibility, we'll try to map old fields to new ones
      try {
        // Try to parse as JSON if it's stored as JSON string
        const parsedMetadata = typeof metadata.title === 'string' && metadata.title.startsWith('{') 
          ? JSON.parse(metadata.title) 
          : {
              name: metadata.title || '',
              description: metadata.description || '',
              x: '',
              linkedin: '',
              url: metadata.image || '' // Map old image field to URL for backward compatibility
            };
        
        setName(parsedMetadata.name || '');
        setDescription(parsedMetadata.description || '');
        setXHandle(parsedMetadata.x || '');
        setLinkedIn(parsedMetadata.linkedin || '');
        setUrl(parsedMetadata.url || '');
      } catch (error) {
        // Fallback to old structure if parsing fails
        setName(metadata.title || '');
        setDescription(metadata.description || '');
        setXHandle('');
        setLinkedIn('');
        setUrl(metadata.image || '');
      }
    }
  }, [metadata]);

  useEffect(() => {
    if (markdownData) {
      setLocalMarkdownContent(markdownData.content);
    } else {
      setLocalMarkdownContent('');
    }
  }, [markdownData]);

  useEffect(() => {
    if (didContent) {
      setLocalDidContent(didContent);
    }
  }, [didContent]);

  const handleSaveMetadata = async () => {
    try {
      // Store the new metadata structure as JSON in the title field
      const newMetadata = {
        name,
        description,
        x: xHandle,
        linkedin: linkedIn,
        url
      };
      
      await saveMetadataMutation.mutateAsync({ 
        name: record.name, 
        title: JSON.stringify(newMetadata), // Store as JSON string
        description: description, // Keep description in its own field for backward compatibility
        image: url // Store URL in image field for backward compatibility
      });
      setIsEditingMetadata(false);
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleCancelMetadataEdit = () => {
    setIsEditingMetadata(false);
    // Reset metadata to original values from backend
    if (metadata) {
      try {
        const parsedMetadata = typeof metadata.title === 'string' && metadata.title.startsWith('{') 
          ? JSON.parse(metadata.title) 
          : {
              name: metadata.title || '',
              description: metadata.description || '',
              x: '',
              linkedin: '',
              url: metadata.image || ''
            };
        
        setName(parsedMetadata.name || '');
        setDescription(parsedMetadata.description || '');
        setXHandle(parsedMetadata.x || '');
        setLinkedIn(parsedMetadata.linkedin || '');
        setUrl(parsedMetadata.url || '');
      } catch (error) {
        setName(metadata.title || '');
        setDescription(metadata.description || '');
        setXHandle('');
        setLinkedIn('');
        setUrl(metadata.image || '');
      }
    } else {
      setName('');
      setDescription('');
      setXHandle('');
      setLinkedIn('');
      setUrl('');
    }
  };

  const handleSaveMarkdown = async () => {
    try {
      await saveMarkdownMutation.mutateAsync({ 
        name: record.name, 
        content: localMarkdownContent 
      });
      setIsEditingMarkdown(false);
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleCancelMarkdownEdit = () => {
    setIsEditingMarkdown(false);
    // Reset markdown to original value from backend
    if (markdownData) {
      setLocalMarkdownContent(markdownData.content);
    } else {
      setLocalMarkdownContent('');
    }
  };

  const handleSaveDid = async () => {
    try {
      await saveDidMutation.mutateAsync({ 
        name: record.name, 
        content: localDidContent 
      });
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || sendingMessage) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: currentMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setSendingMessage(true);

    // Simulate AI response delay
    setTimeout(() => {
      const aiResponse = generateAIResponse(currentMessage, record.name);
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        sender: 'ai',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiMessage]);
      setSendingMessage(false);
    }, 1000 + Math.random() * 2000); // 1-3 second delay
  };

  const generateAIResponse = (userMessage: string, nameRecord: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return `Hello! I'm the AI for ${nameRecord}. I'm here to help you understand and interact with the content and capabilities associated with this name. How can I assist you today?`;
    }
    
    if (lowerMessage.includes('metadata') || lowerMessage.includes('profile') || lowerMessage.includes('settings')) {
      return `I can help you understand the settings associated with ${nameRecord}. This includes profile information like name, description, X handle, LinkedIn profile, and website URL. You can edit this information in the settings tab. What specific settings would you like to know about?`;
    }
    
    if (lowerMessage.includes('markdown') || lowerMessage.includes('content')) {
      return `The markdown content for ${nameRecord} contains detailed documentation and information. This is where you can store rich text content, documentation, or any other information you want to associate with your name. Would you like me to help you understand how to structure your content?`;
    }
    
    if (lowerMessage.includes('did') || lowerMessage.includes('canister')) {
      if (record.addressType === AddressType.canister) {
        return `Since ${nameRecord} is a canister address, you can manage its DID (Candid interface definition) file. This helps with service discovery and integration. The DID file describes the canister's public interface and available methods.`;
      } else {
        return `${nameRecord} is registered as an identity address, so DID file management is not available. DID files are only used for canister addresses to describe their public interfaces.`;
      }
    }
    
    if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
      return `I can help you with:
• Understanding your name's settings and profile information
• Explaining how to use the markdown content editor
• Providing guidance on DID files (for canisters)
• Answering questions about your name registration
• Helping you make the most of your IcpHub membership

What would you like to explore?`;
    }
    
    if (lowerMessage.includes('season') || lowerMessage.includes('registration')) {
      return `Your name ${nameRecord} was registered during a specific season. Each season has its own parameters and pricing. Your registration gives you access to Context Protocol services and this AI interface for managing your name's content and metadata.`;
    }
    
    // Default responses
    const defaultResponses = [
      `That's an interesting question about ${nameRecord}. Based on the current content and metadata, I can help you explore different aspects of your name registration. Could you be more specific about what you'd like to know?`,
      `I'm here to help you with ${nameRecord}. You can ask me about settings management, content editing, or how to make the most of your name registration. What would you like to focus on?`,
      `As the AI for ${nameRecord}, I can assist with various aspects of your name management. Whether it's about settings, content, or general usage, I'm here to assist. What specific area interests you most?`,
      `Thanks for your question! I'm designed to help you understand and manage ${nameRecord}. Whether it's about settings, content, or general usage, I'm here to assist. What specific area would you like to explore?`
    ];
    
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Function to render markdown as HTML (simple implementation)
  const renderMarkdownAsHtml = (markdown: string) => {
    if (!markdown.trim()) {
      return <p className="text-muted-foreground italic">No content yet. Click Edit to add markdown content.</p>;
    }

    // Simple markdown to HTML conversion for basic formatting
    let html = markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-6 mb-3">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>')
      // Bold and italic
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline hover:no-underline" target="_blank" rel="noopener noreferrer">$1</a>')
      // Code blocks (simple)
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-muted p-3 rounded-md overflow-x-auto my-3"><code>$1</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
      // Line breaks
      .replace(/\n\n/g, '</p><p class="mb-3">')
      .replace(/\n/g, '<br>');

    // Wrap in paragraph tags if not already wrapped
    if (!html.startsWith('<')) {
      html = `<p class="mb-3">${html}</p>`;
    }

    return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const formatTimestamp = (timestamp: bigint) => {
    return new Date(Number(timestamp) / 1000000).toLocaleString();
  };

  const renderMetadataReadOnly = () => (
    <div className="space-y-4 relative">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Profile Settings</h4>
        <Button 
          onClick={() => setIsEditingMetadata(true)}
          variant="outline"
          size="sm"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>
      
      {metadataLoading ? (
        <div className="space-y-4">
          <div className="h-4 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded animate-pulse" />
        </div>
      ) : (
        <div className="space-y-4 pb-8">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Name</Label>
            <p className="text-sm">{name || 'Not set'}</p>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <p className="text-sm">{description || 'Not set'}</p>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">X</Label>
            <p className="text-sm">{xHandle || 'Not set'}</p>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">LinkedIn</Label>
            <p className="text-sm">{linkedIn || 'Not set'}</p>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">URL</Label>
            <p className="text-sm">{url || 'Not set'}</p>
          </div>
        </div>
      )}
      
      {metadata && (
        <div className="absolute bottom-0 right-0 text-xs text-muted-foreground">
          Last updated: {formatTimestamp(metadata.updatedAt)}
        </div>
      )}
    </div>
  );

  const renderMetadataForm = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Edit Profile Settings</h4>
        <div className="flex space-x-2">
          <Button 
            onClick={handleCancelMetadataEdit}
            variant="outline"
            size="sm"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSaveMetadata} 
            disabled={saveMetadataMutation.isPending}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMetadataMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-primary font-medium">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Display name"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description" className="text-primary font-medium">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description or bio"
            rows={3}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="x" className="text-primary font-medium">X</Label>
          <Input
            id="x"
            value={xHandle}
            onChange={(e) => setXHandle(e.target.value)}
            placeholder="@username or https://x.com/username"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="linkedin" className="text-primary font-medium">LinkedIn</Label>
          <Input
            id="linkedin"
            value={linkedIn}
            onChange={(e) => setLinkedIn(e.target.value)}
            placeholder="https://linkedin.com/in/username"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="url" className="text-primary font-medium">URL</Label>
          <Input
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
          />
        </div>
      </div>
    </div>
  );

  const renderMarkdownReadOnly = () => (
    <div className="space-y-4 relative">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center space-x-2">
          <Eye className="h-4 w-4" />
          <span>Formatted Content</span>
        </h4>
        <Button 
          onClick={() => setIsEditingMarkdown(true)}
          variant="outline"
          size="sm"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>
      
      {markdownLoading ? (
        <div className="border rounded-lg p-4 min-h-[200px] bg-background">
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-4 min-h-[200px] bg-background pb-8">
          {renderMarkdownAsHtml(localMarkdownContent)}
        </div>
      )}
      
      <div className="text-xs text-muted-foreground mb-6">
        Formatted markdown content is displayed above. Click Edit to modify the raw markdown.
      </div>
      
      {markdownData && (
        <div className="absolute bottom-0 right-0 text-xs text-muted-foreground">
          Last updated: {formatTimestamp(markdownData.updatedAt)}
        </div>
      )}
    </div>
  );

  const renderMarkdownForm = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center space-x-2">
          <FileText className="h-4 w-4" />
          <span>Edit Markdown Content</span>
        </h4>
        <div className="flex space-x-2">
          <Button 
            onClick={handleCancelMarkdownEdit}
            variant="outline"
            size="sm"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSaveMarkdown} 
            disabled={saveMarkdownMutation.isPending}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMarkdownMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="markdown">Raw Markdown Content</Label>
        <Textarea
          id="markdown"
          value={localMarkdownContent}
          onChange={(e) => setLocalMarkdownContent(e.target.value)}
          placeholder="Write your markdown content here..."
          rows={15}
          className="font-mono text-sm"
        />
      </div>
      
      <div className="text-xs text-muted-foreground">
        Supports standard Markdown syntax including headers, links, lists, code blocks, and more.
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Basic Name Information */}
      <Card className="mt-8 bg-primary text-white border-primary">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-white/10 rounded-lg">
                {record.addressType === AddressType.canister ? (
                  <Globe className="h-4 w-4 text-white" />
                ) : (
                  <User className="h-4 w-4 text-white" />
                )}
              </div>
              <div>
                <span className="font-semibold text-white">@{record.name}.icp</span>
                <div className="text-sm text-white/80 font-mono">
                  {record.address}
                </div>
                {isWhitelisted && (
                  <div className="text-xs text-white/90 mt-1">
                    ✓ Eligible for admin privileges
                  </div>
                )}
              </div>
            </div>
            {isWhitelisted && isAuthenticated && (
              <Button
                onClick={handleRegisterForAdmin}
                disabled={isRegisteringForAdmin}
                variant="outline"
                size="sm"
                className="text-xs text-gray-400 border-white/30 hover:bg-white/10 hover:text-gray-300 px-2 py-1"
              >
                <UserPlus className="h-3 w-3 mr-1" />
                {isRegisteringForAdmin ? 'Registering...' : 'Register for Admin'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Management Interface */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="markdown">Markdown Editor</TabsTrigger>
              <TabsTrigger value="did" disabled={record.addressType !== AddressType.canister}>
                DID File
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="chat" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center space-x-2">
                    <MessageCircle className="h-4 w-4" />
                    <span>Chat with {record.name} AI</span>
                  </h4>
                  <Badge variant="secondary" className="text-xs">
                    Simulation
                  </Badge>
                </div>
                
                <div className="border rounded-lg">
                  <ScrollArea className="h-96 p-4">
                    <div className="space-y-4">
                      {chatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              message.sender === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <div className="flex items-start space-x-2">
                              {message.sender === 'ai' && (
                                <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              )}
                              <div className="space-y-1">
                                <p className="text-sm">{message.content}</p>
                                <p className="text-xs opacity-70">
                                  {message.timestamp.toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {sendingMessage && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-lg p-3">
                            <div className="flex items-center space-x-2">
                              <Bot className="h-4 w-4" />
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  
                  <div className="border-t p-4">
                    <div className="flex space-x-2">
                      <Input
                        value={currentMessage}
                        onChange={(e) => setCurrentMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask me about your name, settings, content, or anything else..."
                        disabled={sendingMessage}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!currentMessage.trim() || sendingMessage}
                        size="sm"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  This is a simulated AI chat interface. The AI can help you understand your name's features, settings, and content management options.
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-4">
              {isEditingMetadata ? renderMetadataForm() : renderMetadataReadOnly()}
            </TabsContent>
            
            <TabsContent value="markdown" className="space-y-4">
              {isEditingMarkdown ? renderMarkdownForm() : renderMarkdownReadOnly()}
            </TabsContent>
            
            <TabsContent value="did" className="space-y-4">
              {record.addressType === AddressType.canister ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium flex items-center space-x-2">
                      <Code className="h-4 w-4" />
                      <span>Canister DID File</span>
                    </h4>
                    <Button 
                      onClick={handleSaveDid} 
                      disabled={saveDidMutation.isPending}
                      size="sm"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saveDidMutation.isPending ? 'Saving..' : 'Save'}
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="did">DID File Content</Label>
                    <Textarea
                      id="did"
                      value={localDidContent}
                      onChange={(e) => setLocalDidContent(e.target.value)}
                      placeholder="Paste or edit the DID file content here..."
                      rows={15}
                      className="font-mono text-sm"
                    />
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Upload or edit the Candid interface definition for this canister. This helps with service discovery and integration.
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Code className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    DID file management is only available for canister addresses
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

