import { useState } from 'react';
import { Copy, Info, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { usePlugWallet } from '../hooks/usePlugWallet';
import { useGetCanisterPrincipal, useGetActiveSeasonInfo, useListNameRecords, useGetCanisterVersion, useListFileReferences } from '../hooks/useQueries';
import { loadConfig } from '../config';
import { useEffect, useState as useLocalState } from 'react';
import { AccountIdentifier } from '@dfinity/ledger-icp';
import { Principal } from '@dfinity/principal';

interface SystemInfoPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SystemInfoPopup({ isOpen, onClose }: SystemInfoPopupProps) {
  const { principal } = usePlugWallet();
  const { data: canisterPrincipal } = useGetCanisterPrincipal();
  const { data: activeSeasonInfo } = useGetActiveSeasonInfo();
  const { data: nameRecords = [] } = useListNameRecords();
  const { data: canisterVersion } = useGetCanisterVersion();
  const { data: fileReferences = [] } = useListFileReferences();
  const [canisterId, setCanisterId] = useLocalState<string>('Loading...');
  const [accountId, setAccountId] = useLocalState<string>('Loading...');

  // Load canister ID from config and calculate Account ID
  useEffect(() => {
    const getCanisterId = async () => {
      try {
        const config = await loadConfig();
        setCanisterId(config.backend_canister_id);

        // Calculate Account ID from the canister principal
        try {
          const principal = Principal.fromText(config.backend_canister_id);
          const accountIdentifier = AccountIdentifier.fromPrincipal({
            principal: principal,
            subAccount: undefined // Use default subaccount
          });
          setAccountId(accountIdentifier.toHex());
        } catch {
          setAccountId('Error calculating');
        }
      } catch {
        setCanisterId('Error loading');
        setAccountId('Error loading');
      }
    };
    getCanisterId();
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const formatVersion = (version: {major: bigint, minor: bigint, patch: bigint} | undefined): string => {
    if (!version) return 'v1.0.0'; // Fallback when backend is not available
    return `v${Number(version.major)}.${Number(version.minor)}.${Number(version.patch)}`;
  };

  // Use actual file references count for document count
  const documentCount = fileReferences.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <Card className="w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="relative pb-2">
          <CardTitle className="text-lg font-semibold pr-8">System Information</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute top-2 right-2 h-10 w-10 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Version */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Version</label>
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono">{formatVersion(canisterVersion)}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(formatVersion(canisterVersion), 'Version')}
                className="h-6 w-6 p-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>


          {/* Canister ID */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Canister ID</label>
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-mono text-foreground break-all leading-relaxed flex-1">
                {canisterId}
              </span>
              <div className="flex gap-1">
                {canisterId !== 'Loading...' && canisterId !== 'Error loading' && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`https://dashboard.internetcomputer.org/canister/${canisterId}`, '_blank')}
                      className="h-6 w-6 p-0 flex-shrink-0"
                      title="View on ICP Dashboard"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(canisterId, 'Canister ID')}
                      className="h-6 w-6 p-0 flex-shrink-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Account ID (for payments) */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Payment Account ID</label>
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-mono text-foreground break-all leading-relaxed flex-1">
                {accountId}
              </span>
              {accountId !== 'Loading...' && accountId !== 'Error loading' && accountId !== 'Error calculating' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(accountId, 'Account ID')}
                  className="h-6 w-6 p-0 flex-shrink-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              ICP payments should be sent to this account
            </p>
          </div>

          {/* Current Season */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Current Season</label>
            <div className="text-sm">
              {activeSeasonInfo ? (
                <div className="space-y-1">
                  <div>{activeSeasonInfo.season.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Available Names: {Number(activeSeasonInfo.availableNames)} / {Number(activeSeasonInfo.season.maxNames)}
                  </div>
                </div>
              ) : (
                <span className="text-muted-foreground">No active season</span>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Total Names</label>
              <div className="text-xl font-semibold">{nameRecords.length}</div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Documents</label>
              <div className="text-xl font-semibold">{documentCount}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}