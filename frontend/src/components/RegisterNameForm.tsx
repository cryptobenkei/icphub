import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Globe, User, Calendar, AlertCircle, CheckCircle, Coins } from 'lucide-react';
import { useRegisterName, useGetActiveSeason, useGetUserNames, useGetActiveSeasonInfo } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { AddressType } from '../backend';

interface FormData {
  name: string;
  address: string;
  addressType: string;
}

export function RegisterNameForm() {
  const { identity } = useInternetIdentity();
  const principalId = identity?.getPrincipal().toString() || '';

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      addressType: 'identity',
      address: principalId,
    },
  });

  const registerNameMutation = useRegisterName();
  const { activeSeason } = useGetActiveSeason();
  const { data: activeSeasonInfo } = useGetActiveSeasonInfo();
  const { data: userNames } = useGetUserNames();
  const addressType = watch('addressType');

  // Check if user already has any registered name (one name per principal globally)
  const hasRegisteredName = userNames && userNames.length > 0;

  // Update address field when principal ID changes and address type is identity
  useEffect(() => {
    if (addressType === 'identity' && principalId) {
      setValue('address', principalId);
    }
  }, [principalId, addressType, setValue]);

  const onSubmit = (data: FormData) => {
    if (!activeSeason || !activeSeasonInfo) return;

    // Convert string addressType to AddressType variant
    const addressType = data.addressType === 'canister' ? AddressType.canister : AddressType.identity;

    registerNameMutation.mutate({
      name: data.name,
      address: data.address,
      addressType,
      seasonId: activeSeason.id,
    });
  };

  if (!activeSeason || !activeSeasonInfo) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Active Season</h3>
          <p className="text-muted-foreground">
            There is currently no active registration season. Please check back later or contact an administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  const now = new Date();
  const startDate = new Date(Number(activeSeason.startTime) / 1000000);
  const endDate = new Date(Number(activeSeason.endTime) / 1000000);
  const isWithinTimeWindow = now >= startDate && now <= endDate;

  if (!isWithinTimeWindow) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Season Not Active</h3>
          <p className="text-muted-foreground mb-4">
            The current season "{activeSeason.name}" is not within its registration window.
          </p>
          <div className="text-sm text-muted-foreground">
            <p>Registration period: {startDate.toLocaleString()} - {endDate.toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hasRegisteredName) {
    const handleGoToSettings = () => {
      // Dispatch event to switch to My Names tab
      const event = new CustomEvent('switchTab', { detail: 'my-name' });
      window.dispatchEvent(event);
    };

    return (
      <Card className="mt-8">
        <CardContent className="text-center py-12 px-8">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
          <h3 className="text-2xl font-bold mb-4">You Already Have a Registered Name</h3>
          <div className="max-w-md mx-auto space-y-4">
            <p className="text-muted-foreground text-lg">
              You own the name <strong className="text-primary">@{userNames[0]?.name}.icp</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Each principal can only register one name globally. You can manage your existing name in the settings.
            </p>
            <div className="pt-4">
              <Button
                onClick={handleGoToSettings}
                size="lg"
                className="w-full sm:w-auto"
              >
                Go to Name Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Season Info */}
      <Card className="mt-8 bg-primary text-white border-primary">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white">
            <Calendar className="h-5 w-5" />
            <span>Current Season: {activeSeason.name}</span>
          </CardTitle>
          <CardDescription className="text-white/80">
            Registration is open until {endDate.toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <Label className="text-white/80">Name Length</Label>
              <div className="font-medium text-white">
                {activeSeason.minNameLength.toString()} - {activeSeason.maxNameLength.toString()} characters
              </div>
            </div>
            <div>
              <Label className="text-white/80">Available Names</Label>
              <div className="font-medium text-white">
                {activeSeasonInfo.availableNames.toString()} available / {Number(activeSeason.maxNames) - Number(activeSeasonInfo.availableNames)} used
              </div>
            </div>
            <div>
              <Label className="text-white/80">Registration Price</Label>
              <div className="font-medium flex items-center space-x-1 text-white">
                <Coins className="h-3 w-3" />
                <span>{(Number(activeSeasonInfo.price) / 100_000_000).toFixed(2)} ICP</span>
              </div>
            </div>
            <div>
              <Label className="text-white/80">Status</Label>
              <div className="font-medium text-white">Active</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>Register Your Name</span>
          </CardTitle>
          <CardDescription>
            Register a unique name during this season. You can only register one name per season.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="my-awesome-name"
                {...register('name', {
                  required: 'Name is required',
                  pattern: {
                    value: /^[a-z0-9-]+$/,
                    message: 'Only lowercase letters, numbers, and hyphens allowed',
                  },
                  minLength: {
                    value: Number(activeSeason.minNameLength),
                    message: `Name must be at least ${activeSeason.minNameLength} characters`,
                  },
                  maxLength: {
                    value: Number(activeSeason.maxNameLength),
                    message: `Name must be at most ${activeSeason.maxNameLength} characters`,
                  },
                })}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label>Address Type</Label>
              <RadioGroup
                value={addressType}
                onValueChange={(value) => {
                  setValue('addressType', value);
                  // Set address field to principal ID when switching to identity type
                  if (value === 'identity') {
                    setValue('address', principalId);
                  } else {
                    setValue('address', '');
                  }
                }}
                className="flex space-x-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="identity" id="identity" />
                  <Label htmlFor="identity" className="flex items-center space-x-2 cursor-pointer">
                    <User className="h-4 w-4" />
                    <span>Identity</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="canister" id="canister" />
                  <Label htmlFor="canister" className="flex items-center space-x-2 cursor-pointer">
                    <Globe className="h-4 w-4" />
                    <span>Canister</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">
                {addressType === 'canister' ? 'Canister ID' : 'Principal ID'}
              </Label>
              <Input
                id="address"
                placeholder={
                  addressType === 'canister'
                    ? 'rdmx6-jaaaa-aaaah-qcaiq-cai'
                    : 'principal-id-here'
                }
                {...register('address', {
                  required: 'Address is required',
                  minLength: {
                    value: 10,
                    message: 'Address must be at least 10 characters',
                  },
                })}
              />
              {errors.address && (
                <p className="text-sm text-destructive">{errors.address.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {addressType === 'canister'
                  ? 'Enter the canister ID this name should point to'
                  : 'Enter the principal ID this name should point to'}
              </p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> You can only register ONE name per principal (globally, not per season).
                Make sure your choice is final before submitting.
                Payment of {(Number(activeSeasonInfo.price) / 100_000_000).toFixed(2)} ICP will be processed automatically and includes a 1-year subscription.
              </AlertDescription>
            </Alert>

            <Button
              type="submit"
              disabled={registerNameMutation.isPending}
              className="w-full"
            >
              {registerNameMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Payment & Registration...
                </>
              ) : (
                <>
                  <Coins className="mr-2 h-4 w-4" />
                  Pay {(Number(activeSeasonInfo.price) / 100_000_000).toFixed(2)} ICP & Register Name
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

