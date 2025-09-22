import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Search, Globe, User, Calendar } from 'lucide-react';
import { useGetNameRecord, useGetSeason, getSeasonNumber } from '../hooks/useQueries';
import { AddressType } from '../backend';

export function NameSearch() {
  const [searchName, setSearchName] = useState('');
  const [queriedName, setQueriedName] = useState('');
  
  const { data: nameRecord, isLoading, error } = useGetNameRecord(queriedName);
  const { data: season } = useGetSeason(nameRecord?.seasonId || null);

  const handleSearch = () => {
    if (searchName.trim()) {
      setQueriedName(searchName.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Search Names</span>
          </CardTitle>
          <CardDescription>
            Look up any registered name to view its details and registration information
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="flex space-x-2">
            <Input
              placeholder="Enter name to search..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <Button onClick={handleSearch} disabled={!searchName.trim() || isLoading}>
              {isLoading ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {queriedName && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results for "{queriedName}"</CardTitle>
          </CardHeader>
          
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Searching...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Name not found or not registered</p>
              </div>
            ) : nameRecord ? (
              <NameRecordDisplay record={nameRecord} season={season} />
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function NameRecordDisplay({ record, season }: { record: any; season?: any }) {
  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Name</Label>
          <div className="font-mono text-sm bg-muted p-2 rounded">{record.name}</div>
        </div>
        
        <div className="space-y-2">
          <Label>Address Type</Label>
          <Badge variant={record.addressType === AddressType.canister ? 'default' : 'secondary'}>
            {record.addressType === AddressType.canister ? (
              <>
                <Globe className="h-3 w-3 mr-1" />
                Canister
              </>
            ) : (
              <>
                <User className="h-3 w-3 mr-1" />
                Identity
              </>
            )}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <Label>Address</Label>
          <div className="font-mono text-sm bg-muted p-2 rounded break-all">{record.address}</div>
        </div>
        
        <div className="space-y-2">
          <Label>Owner</Label>
          <div className="font-mono text-sm bg-muted p-2 rounded break-all">{record.owner}</div>
        </div>
      </div>

      <Separator />

      {/* Season Info */}
      {season && (
        <>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Season Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Season</Label>
                <div className="text-sm">
                  <div className="font-medium">Season {getSeasonNumber(season.id)}</div>
                  <div className="text-muted-foreground">{season.name}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Season Status</Label>
                <Badge variant={season.status === 'active' ? 'default' : 'secondary'}>
                  {season.status}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <Label>Season Duration</Label>
                <div className="text-sm">
                  {new Date(Number(season.startTime) / 1000000).toLocaleDateString()} - {' '}
                  {new Date(Number(season.endTime) / 1000000).toLocaleDateString()}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Name Length Requirements</Label>
                <div className="text-sm">
                  {season.minNameLength.toString()} - {season.maxNameLength.toString()} characters
                </div>
              </div>
            </div>
          </div>
          
          <Separator />
        </>
      )}

      {/* Timestamps */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span>Registered</span>
          </Label>
          <div className="text-sm text-muted-foreground">
            {new Date(Number(record.createdAt) / 1000000).toLocaleString()}
          </div>
        </div>
        
        <div className="space-y-2">
          <Label className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span>Last Updated</span>
          </Label>
          <div className="text-sm text-muted-foreground">
            {new Date(Number(record.updatedAt) / 1000000).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-sm font-medium ${className}`}>{children}</div>;
}

