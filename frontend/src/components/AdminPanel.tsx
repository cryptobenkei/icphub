import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Settings, AlertCircle, Play, Square, X, Users, FileText, Coins, Copy, Filter, Code, Info } from 'lucide-react';
import { useListSeasons, useCreateSeason, useActivateSeason, useEndSeason, useCancelSeason, useGetSeasonRegistrationCount, getSeasonNumber, useListNameRecords, useGetCanisterPrincipal, useGetCandidFile } from '../hooks/useQueries';
import { Season, SeasonStatus, NameRecord } from '../backend';
import { toast } from 'sonner';

// Helper functions for variant type checking
const isSeasonDraft = (status: SeasonStatus) => 'draft' in status;
const isSeasonActive = (status: SeasonStatus) => 'active' in status;
const isSeasonEnded = (status: SeasonStatus) => 'ended' in status;
const isSeasonCancelled = (status: SeasonStatus) => 'cancelled' in status;

export function AdminPanel() {
  const { data: seasons = [], isLoading: seasonsLoading } = useListSeasons();
  const { data: nameRecords = [], isLoading: namesLoading } = useListNameRecords();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  if (seasonsLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Loading admin panel...</p>
      </div>
    );
  }

  const activeSeason = seasons.find(season => isSeasonActive(season.status));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Admin Panel</h3>
          <p className="text-sm text-muted-foreground">
            Manage seasons, view analytics, and oversee the community
          </p>
          {activeSeason && (
            <div className="mt-2">
              <Badge variant="default" className="text-xs">
                Active: Season {getSeasonNumber(activeSeason.id)} - {activeSeason.name}
              </Badge>
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="names">Names</TabsTrigger>
          <TabsTrigger value="seasons">Seasons</TabsTrigger>
          <TabsTrigger value="candid">Candid</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <DashboardTab nameRecords={nameRecords} seasons={seasons} />
        </TabsContent>

        <TabsContent value="names" className="space-y-6">
          <NamesTab nameRecords={nameRecords} seasons={seasons} isLoading={namesLoading} />
        </TabsContent>

        <TabsContent value="seasons" className="space-y-6">
          <SeasonsTab 
            seasons={seasons} 
            activeSeason={activeSeason} 
            isCreateDialogOpen={isCreateDialogOpen}
            setIsCreateDialogOpen={setIsCreateDialogOpen}
          />
        </TabsContent>

        <TabsContent value="candid" className="space-y-6">
          <CandidTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardTab({ nameRecords, seasons }: { nameRecords: NameRecord[]; seasons: Season[] }) {
  const { data: canisterPrincipal = 'Loading...' } = useGetCanisterPrincipal();
  
  // Calculate analytics
  const totalNames = nameRecords.length;
  const totalUsers = new Set(nameRecords.map(record => record.owner)).size;
  
  // Calculate document counts (simplified - each name can have up to 3 documents)
  const totalDocuments = totalNames * 3; // Placeholder calculation
  
  // Document type breakdown (placeholder data)
  const metadataCount = totalNames; // Each name has metadata
  const markdownCount = Math.floor(totalNames * 0.7); // Assume 70% have markdown
  const didCount = nameRecords.filter(record => 'canister' in record.addressType).length;

  // ICP balance placeholder - this would come from backend
  const icpBalance = "0.00"; // Placeholder

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Names</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalNames}</div>
            <p className="text-xs text-muted-foreground">
              Registered across all seasons
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Unique community members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDocuments}</div>
            <p className="text-xs text-muted-foreground">
              Stored in the system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ICP Balance</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{icpBalance}</div>
            <p className="text-xs text-muted-foreground">
              Canister wallet balance
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Document Types Breakdown</CardTitle>
            <CardDescription>Distribution of document types across all names</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Metadata (JSON)</span>
              <Badge variant="outline">{metadataCount}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Markdown Content</span>
              <Badge variant="outline">{markdownCount}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">DID Files</span>
              <Badge variant="outline">{didCount}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Season Overview</CardTitle>
            <CardDescription>Current season statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Seasons</span>
              <Badge variant="outline">{seasons.length}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Active Seasons</span>
              <Badge variant="outline">{seasons.filter(s => isSeasonActive(s.status)).length}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Draft Seasons</span>
              <Badge variant="outline">{seasons.filter(s => isSeasonDraft(s.status)).length}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Canister Wallet</CardTitle>
            <CardDescription>
              Current ICP balance in the canister wallet. Admin can transfer funds elsewhere if needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{icpBalance} ICP</div>
                <p className="text-sm text-muted-foreground">Available balance</p>
              </div>
              <Button variant="outline" disabled>
                Transfer Funds
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Canister Information</CardTitle>
            <CardDescription>
              Canister principal (ID/address) for easy reference
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Canister Principal</Label>
              <div className="flex items-center space-x-2">
                <code className="flex-1 px-2 py-1 bg-muted rounded text-sm font-mono break-all">
                  {canisterPrincipal}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(canisterPrincipal)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NamesTab({ nameRecords, seasons, isLoading }: { nameRecords: NameRecord[]; seasons: Season[]; isLoading: boolean }) {
  const [filterDate, setFilterDate] = useState('');
  const [filterTime, setFilterTime] = useState('');
  const [isFilterActive, setIsFilterActive] = useState(false);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Loading names...</p>
      </div>
    );
  }

  const getSeasonName = (seasonId: bigint) => {
    const season = seasons.find(s => s.id === seasonId);
    return season ? `Season ${getSeasonNumber(season.id)} - ${season.name}` : 'Unknown Season';
  };

  // Filter names by registration timestamp
  const filteredNames = isFilterActive && filterDate && filterTime
    ? nameRecords.filter(record => {
        const filterDateTime = new Date(`${filterDate}T${filterTime}`);
        const recordDateTime = new Date(Number(record.createdAt) / 1000000);
        return recordDateTime >= filterDateTime;
      })
    : nameRecords;

  const applyFilter = () => {
    if (filterDate && filterTime) {
      setIsFilterActive(true);
      toast.success(`Filter applied: showing names registered after ${filterDate} ${filterTime}`);
    } else {
      toast.error('Please select both date and time for the filter');
    }
  };

  const clearFilter = () => {
    setIsFilterActive(false);
    setFilterDate('');
    setFilterTime('');
    toast.success('Filter cleared');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold">Registered Names</h4>
          <p className="text-sm text-muted-foreground">
            All names registered across all seasons
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {isFilterActive ? `${filteredNames.length} Filtered` : `${nameRecords.length} Total Names`}
        </Badge>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span>Filter by Registration Date</span>
          </CardTitle>
          <CardDescription>
            Show names registered after a specific date and time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end space-x-4">
            <div className="space-y-2">
              <Label htmlFor="filterDate">Date</Label>
              <Input
                id="filterDate"
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filterTime">Time</Label>
              <Input
                id="filterTime"
                type="time"
                value={filterTime}
                onChange={(e) => setFilterTime(e.target.value)}
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={applyFilter} disabled={!filterDate || !filterTime}>
                Apply Filter
              </Button>
              {isFilterActive && (
                <Button variant="outline" onClick={clearFilter}>
                  Clear Filter
                </Button>
              )}
            </div>
          </div>
          {isFilterActive && (
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                Showing {filteredNames.length} names registered after {filterDate} {filterTime}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {filteredNames.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              {isFilterActive ? 'No names match the current filter' : 'No names registered yet'}
            </p>
            {isFilterActive && (
              <Button variant="outline" onClick={clearFilter}>
                Clear Filter
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Season</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNames.map((record) => (
                  <TableRow key={record.name}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <span>{record.name}</span>
                        {'canister' in record.addressType && (
                          <Badge variant="secondary" className="text-xs">Canister</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={'canister' in record.addressType ? 'default' : 'outline'}>
                        {'canister' in record.addressType ? 'Canister' : 'Identity'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {record.owner.slice(0, 8)}...{record.owner.slice(-8)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {getSeasonName(record.seasonId)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(Number(record.createdAt) / 1000000).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(Number(record.updatedAt) / 1000000).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SeasonsTab({ 
  seasons, 
  activeSeason, 
  isCreateDialogOpen, 
  setIsCreateDialogOpen 
}: { 
  seasons: Season[]; 
  activeSeason: Season | undefined; 
  isCreateDialogOpen: boolean; 
  setIsCreateDialogOpen: (open: boolean) => void; 
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold">Season Management</h4>
          <p className="text-sm text-muted-foreground">
            Create and manage registration seasons
          </p>
          {activeSeason && (
            <div className="mt-2">
              <Badge variant="default" className="text-xs">
                Active: Season {getSeasonNumber(activeSeason.id)} - {activeSeason.name}
              </Badge>
            </div>
          )}
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Season
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <CreateSeasonForm onClose={() => setIsCreateDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {seasons.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No seasons created yet</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Season
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Seasons</CardTitle>
            <CardDescription>
              Manage registration seasons and their status. Only one season can be active at a time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Season</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Registrations</TableHead>
                  <TableHead>Name Length</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seasons.map((season) => (
                  <SeasonRow key={season.id.toString()} season={season} hasActiveSeason={!!activeSeason} />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CandidTab() {
  const { data: candidFile, isLoading, error } = useGetCandidFile();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Candid file copied to clipboard!');
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Loading Candid file...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive mb-4">Failed to load Candid file</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold">Candid Interface Definition</h4>
          <p className="text-sm text-muted-foreground">
            The canister's public interface definition for integration purposes
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => candidFile && copyToClipboard(candidFile)}
          disabled={!candidFile}
        >
          <Copy className="h-4 w-4 mr-2" />
          Copy Candid File
        </Button>
      </div>

      {/* Implementation Status Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Note:</strong> This is a generated placeholder Candid file based on the current backend interface. 
          The backend needs to be updated to include a <code>getCandidFile()</code> method that returns the actual 
          Candid interface definition with all type definitions and referenced modules.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Code className="h-4 w-4" />
            <span>Canister Interface (.did)</span>
          </CardTitle>
          <CardDescription>
            Complete Candid interface definition showing all public methods and types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] w-full">
            <pre className="text-sm font-mono bg-muted p-4 rounded-md overflow-x-auto whitespace-pre-wrap">
              {candidFile || 'No Candid file available'}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage Instructions</CardTitle>
          <CardDescription>
            How to use this Candid interface definition
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h5 className="font-medium mb-2">For Frontend Integration:</h5>
            <p className="text-sm text-muted-foreground">
              Use this interface definition to generate TypeScript bindings for your frontend application.
              The Candid file describes all available methods and their parameter types.
            </p>
          </div>
          <div>
            <h5 className="font-medium mb-2">For External Services:</h5>
            <p className="text-sm text-muted-foreground">
              External services can use this Candid definition to understand how to interact with the canister.
              All public methods, their parameters, and return types are documented here.
            </p>
          </div>
          <div>
            <h5 className="font-medium mb-2">Method Types:</h5>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <code>query</code> methods: Read-only operations that don't modify state</li>
              <li>• <code>shared</code> methods: Update operations that can modify canister state</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SeasonRow({ season, hasActiveSeason }: { season: Season; hasActiveSeason: boolean }) {
  const activateSeason = useActivateSeason();
  const endSeason = useEndSeason();
  const cancelSeason = useCancelSeason();
  const registrationCount = useGetSeasonRegistrationCount(season.id);

  const startDate = new Date(Number(season.startTime) / 1000000);
  const endDate = new Date(Number(season.endTime) / 1000000);
  const now = new Date();

  const getStatusBadge = (status: SeasonStatus) => {
    if (isSeasonDraft(status)) {
      return <Badge variant="outline">Draft</Badge>;
    } else if (isSeasonActive(status)) {
      return <Badge variant="default">Active</Badge>;
    } else if (isSeasonEnded(status)) {
      return <Badge variant="secondary">Ended</Badge>;
    } else if (isSeasonCancelled(status)) {
      return <Badge variant="destructive">Cancelled</Badge>;
    } else {
      return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const isWithinTimeWindow = now >= startDate && now <= endDate;
  const canActivate = isSeasonDraft(season.status) && !hasActiveSeason;
  const canEnd = isSeasonActive(season.status);
  const canCancel = isSeasonActive(season.status);

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div>
          <div className="font-semibold">Season {getSeasonNumber(season.id)}</div>
          <div className="text-sm text-muted-foreground">{season.name}</div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-2">
          {getStatusBadge(season.status)}
          {isSeasonActive(season.status) && !isWithinTimeWindow && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Outside time window</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {isSeasonDraft(season.status) && hasActiveSeason && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Cannot activate while another season is active</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          <div>{startDate.toLocaleDateString()}</div>
          <div className="text-muted-foreground">to {endDate.toLocaleDateString()}</div>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          {registrationCount} / {season.maxNames.toString()}
          <div className="text-muted-foreground">
            {Math.round((registrationCount / Number(season.maxNames)) * 100)}% full
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          {season.minNameLength.toString()} - {season.maxNameLength.toString()} chars
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          {(Number(season.price) / 100_000_000).toFixed(2)} ICP
        </div>
      </TableCell>
      <TableCell>
        <div className="flex space-x-2">
          {canActivate && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => activateSeason.mutate(season.id)}
                    disabled={activateSeason.isPending}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Activate
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Activate this season for name registration</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {isSeasonDraft(season.status) && hasActiveSeason && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="default"
                    size="sm"
                    disabled={true}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Activate
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>End the current active season first</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {canEnd && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => endSeason.mutate(season.id)}
                    disabled={endSeason.isPending}
                  >
                    <Square className="h-3 w-3 mr-1" />
                    End
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>End this season (registrations will stop)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {canCancel && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => cancelSeason.mutate(season.id)}
                    disabled={cancelSeason.isPending}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Cancel this season (cannot be reactivated)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function CreateSeasonForm({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    maxNames: '',
    minNameLength: '',
    maxNameLength: '',
    price: '',
  });

  const createSeason = useCreateSeason();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
    
    if (startDateTime >= endDateTime) {
      alert('Start time must be before end time');
      return;
    }

    if (Number(formData.minNameLength) > Number(formData.maxNameLength)) {
      alert('Minimum name length must be less than or equal to maximum name length');
      return;
    }

    if (Number(formData.price) <= 0) {
      alert('Price must be greater than 0');
      return;
    }

    createSeason.mutate({
      name: formData.name,
      startTime: BigInt(startDateTime.getTime() * 1000000), // Convert to nanoseconds
      endTime: BigInt(endDateTime.getTime() * 1000000),
      maxNames: BigInt(formData.maxNames),
      minNameLength: BigInt(formData.minNameLength),
      maxNameLength: BigInt(formData.maxNameLength),
      price: BigInt(formData.price),
    }, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create New Season</DialogTitle>
        <DialogDescription>
          Set up a new registration season. It will be created in draft status and can be activated later.
        </DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Season Name</Label>
          <Input
            id="name"
            placeholder="e.g., Spring 2025"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startTime">Start Time</Label>
            <Input
              id="startTime"
              type="time"
              value={formData.startTime}
              onChange={(e) => handleChange('startTime', e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={formData.endDate}
              onChange={(e) => handleChange('endDate', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endTime">End Time</Label>
            <Input
              id="endTime"
              type="time"
              value={formData.endTime}
              onChange={(e) => handleChange('endTime', e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxNames">Maximum Registrations</Label>
          <Input
            id="maxNames"
            type="number"
            min="1"
            placeholder="e.g., 1000"
            value={formData.maxNames}
            onChange={(e) => handleChange('maxNames', e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="minNameLength">Min Name Length</Label>
            <Input
              id="minNameLength"
              type="number"
              min="1"
              placeholder="e.g., 3"
              value={formData.minNameLength}
              onChange={(e) => handleChange('minNameLength', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxNameLength">Max Name Length</Label>
            <Input
              id="maxNameLength"
              type="number"
              min="1"
              placeholder="e.g., 20"
              value={formData.maxNameLength}
              onChange={(e) => handleChange('maxNameLength', e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Price (ICP)</Label>
          <Input
            id="price"
            type="number"
            min="1"
            placeholder="e.g., 10"
            value={formData.price}
            onChange={(e) => handleChange('price', e.target.value)}
            required
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createSeason.isPending}>
            {createSeason.isPending ? 'Creating...' : 'Create Season'}
          </Button>
        </div>
      </form>
    </>
  );
}

