import { useState } from 'react';
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
import { AddressType } from '../backend';

interface FormData {
  name: string;
  address: string;
  addressType: AddressType;
}

export function RegisterNameForm() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      addressType: AddressType.identity,
    },
  });
  
  const registerNameMutation = useRegisterName();
  const { activeSeason } = useGetActiveSeason();
  const { data: activeSeasonInfo } = useGetActiveSeasonInfo();
  const { data: userNames } = useGetUserNames();
  const addressType = watch('addressType');

  // Check if user already has a name in the current season
  const hasNameInCurrentSeason = activeSeason && userNames.some(
    name => name.seasonId === activeSeason.id
  );

  const onSubmit = (data: FormData) => {
    if (!activeSeason || !activeSeasonInfo) return;
    
    registerNameMutation.mutate({
      ...data,
      seasonId: activeSeason.id,
      price: activeSeasonInfo.price,
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

  if (hasNameInCurrentSeason) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Already Registered</h3>
          <p className="text-muted-foreground">
            You have already registered a name in the current season "{activeSeason.name}". 
            Each identity can only register one name per season.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Season Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Current Season: {activeSeason.name}</span>
          </CardTitle>
          <CardDescription>
            Registration is open until {endDate.toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Name Length</Label>
              <div className="font-medium">
                {activeSeason.minNameLength.toString()} - {activeSeason.maxNameLength.toString()} characters
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Available Names</Label>
              <div className="font-medium">{activeSeasonInfo.availableNames.toString()}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Registration Price</Label>
              <div className="font-medium flex items-center space-x-1">
                <Coins className="h-3 w-3" />
                <span>{activeSeasonInfo.price.toString()} ICP</span>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <Badge variant="default">Active</Badge>
            </div>
            <div>
              <Label className="text-muted-foreground">Ends</Label>
              <div className="font-medium">{endDate.toLocaleDateString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Notice */}
      <Alert>
        <Coins className="h-4 w-4" />
        <AlertDescription>
          <strong>Payment Required:</strong> Registration requires a payment of {activeSeasonInfo.price.toString()} ICP tokens. 
          The payment will be processed automatically when you submit the registration.
        </AlertDescription>
      </Alert>

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
                onValueChange={(value) => register('addressType').onChange({ target: { value } })}
                className="flex space-x-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={AddressType.identity} id="identity" />
                  <Label htmlFor="identity" className="flex items-center space-x-2 cursor-pointer">
                    <User className="h-4 w-4" />
                    <span>Identity</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={AddressType.canister} id="canister" />
                  <Label htmlFor="canister" className="flex items-center space-x-2 cursor-pointer">
                    <Globe className="h-4 w-4" />
                    <span>Canister</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">
                {addressType === AddressType.canister ? 'Canister ID' : 'Principal ID'}
              </Label>
              <Input
                id="address"
                placeholder={
                  addressType === AddressType.canister
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
                {addressType === AddressType.canister
                  ? 'Enter the canister ID this name should point to'
                  : 'Enter the principal ID this name should point to'}
              </p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You can only register one name per season. Make sure your choice is final before submitting.
                Payment of {activeSeasonInfo.price.toString()} ICP will be processed automatically.
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
                  Pay {activeSeasonInfo.price.toString()} ICP & Register Name
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

