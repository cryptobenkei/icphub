import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import { useGetPaymentHistory } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';

export function PaymentHistory() {
  const { identity } = useInternetIdentity();
  const { data: paymentHistory, isLoading, error } = useGetPaymentHistory();

  if (!identity) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
          <p className="text-muted-foreground">
            Please log in to view your payment history.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading payment history...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert className="border-destructive bg-destructive/10">
        <AlertDescription className="text-destructive">
          Failed to load payment history: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!paymentHistory || paymentHistory.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Payment History</h3>
          <p className="text-muted-foreground">
            You haven't made any verified payments yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1_000_000);
    return date.toLocaleString();
  };

  const formatAmount = (amount: bigint) => {
    return (Number(amount) / 100_000_000).toFixed(8);
  };

  const getICPExplorerUrl = (blockIndex: bigint) => {
    return `https://dashboard.internetcomputer.org/bitcoin/transaction/${blockIndex}`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Payment History</span>
          </CardTitle>
          <CardDescription>
            Your verified ICP payments for name registrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paymentHistory.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium">
                      Payment #{payment.id.toString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(payment.verifiedAt)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Block Index: {payment.blockIndex.toString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {formatAmount(payment.amount)} ICP
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      Verified
                    </Badge>
                    {payment.registrationId && (
                      <Badge variant="outline" className="text-xs">
                        Registration #{payment.registrationId.toString()}
                      </Badge>
                    )}
                  </div>
                  <a
                    href={getICPExplorerUrl(payment.blockIndex)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 mt-1"
                  >
                    View on Explorer
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}