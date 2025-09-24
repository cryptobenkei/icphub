# Product Requirements Document: Fix ICP Withdrawal Function

## 1. Executive Summary

### Problem Statement
The `withdrawIcp()` function in the ICP Names Registry canister is failing with "Insufficient ICP balance. Actual balance: 0 e8s" error despite the canister having ICP tokens. The function calls `queryLedgerBalance()` which is not implemented, causing it to return 0 and block all withdrawal attempts.

### Solution Overview
Implement the missing `queryLedgerBalance()` function with proper ICP Ledger integration and add robust error handling and debugging capabilities for balance queries.

### Success Criteria
- ✅ Withdrawal function successfully queries actual ICP Ledger balance
- ✅ Admin can withdraw ICP when canister has sufficient funds
- ✅ Proper error handling for ledger communication failures
- ✅ Balance debugging tools for troubleshooting

## 2. Current Issue Analysis

### 2.1 Root Cause
```motoko
// This line in withdrawIcp() fails because function doesn't exist
let actualBalance = await queryLedgerBalance();
```

**Missing Components:**
1. `queryLedgerBalance()` function is not implemented
2. `ICP_LEDGER_CANISTER_ID` constant may be missing
3. No fallback mechanism for ledger query failures
4. No debugging tools to verify canister balance state

### 2.2 Error Flow
```
withdrawIcp() called
    ↓
queryLedgerBalance() called (UNDEFINED FUNCTION)
    ↓
Returns 0 (default/error value)
    ↓
amount > 0 check fails
    ↓
"Insufficient ICP balance. Actual balance: 0 e8s"
```

## 3. Technical Requirements

### 3.1 Core Function Implementation

#### 3.1.1 Implement queryLedgerBalance() Function
```motoko
private func queryLedgerBalance() : async Nat {
    try {
        let ledger = actor(Principal.toText(ICP_LEDGER_CANISTER_ID)) : actor {
            icrc1_balance_of : ({ owner : Principal; subaccount : ?[Nat8] }) -> async Nat;
        };
        
        let canisterAccount = {
            owner = Principal.fromActor(this);
            subaccount = null : ?[Nat8];
        };
        
        await ledger.icrc1_balance_of(canisterAccount);
    } catch (error) {
        Debug.print("Failed to query ledger balance: " # debug_show(error));
        0; // Return 0 on error - caller should handle this case
    };
};
```

#### 3.1.2 Add Required Constants
```motoko
// Add at the top of main.mo file
private let ICP_LEDGER_CANISTER_ID = Principal.fromText("rrkah-fqaaa-aaaaa-aaaaq-cai");
```

#### 3.1.3 Enhanced withdrawIcp() Function
```motoko
public shared ({ caller }) func withdrawIcp(to : Principal, amount : Nat) : async TransferResult {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
        Debug.trap("Unauthorized: Only admins can withdraw ICP");
    };

    // Query actual ledger balance with error handling
    let actualBalance = await queryLedgerBalance();
    
    // If ledger query failed (returned 0), fall back to internal balance with warning
    let balanceToUse = if (actualBalance == 0 and icpBalance > 0) {
        Debug.print("Warning: Ledger query returned 0, using internal balance as fallback");
        icpBalance;
    } else {
        actualBalance;
    };

    if (amount > balanceToUse) {
        return #err("Insufficient ICP balance. Available: " # Nat.toText(balanceToUse) # " e8s (ledger: " # Nat.toText(actualBalance) # " e8s, internal: " # Nat.toText(icpBalance) # " e8s)");
    };

    if (Principal.isAnonymous(to)) {
        return #err("Cannot transfer to anonymous principal");
    };

    let fee : Nat = 10000; // Standard ICP transfer fee in e8s
    if (amount <= fee) {
        return #err("Amount must be greater than transaction fee (10,000 e8s)");
    };

    try {
        let transferArg = {
            from_subaccount = null : ?[Nat8];
            to = { owner = to; subaccount = null };
            amount = amount;
            fee = ?fee;
            memo = null : ?[Nat8];
            created_at_time = null : ?Nat64;
        };

        let ledger = actor(Principal.toText(ICP_LEDGER_CANISTER_ID)) : actor {
            icrc1_transfer : ({ from_subaccount : ?[Nat8]; to : { owner : Principal; subaccount : ?[Nat8] }; amount : Nat; fee : ?Nat; memo : ?[Nat8]; created_at_time : ?Nat64 }) -> async { #Ok : Nat; #Err : { #BadFee : { expected_fee : Nat }; #BadBurn : { min_burn_amount : Nat }; #InsufficientFunds : { balance : Nat }; #TooOld; #CreatedInFuture : { ledger_time : Nat64 }; #Duplicate : { duplicate_of : Nat }; #TemporarilyUnavailable; #GenericError : { error_code : Nat; message : Text } } };
        };

        let transferResult = await ledger.icrc1_transfer(transferArg);

        switch (transferResult) {
            case (#Ok(blockIndex)) {
                // Sync internal balance with actual ledger balance after successful transfer
                let newBalance = await queryLedgerBalance();
                icpBalance := newBalance;
                
                Debug.print("ICP withdrawal successful: " # Nat.toText(amount) # " e8s to " # Principal.toText(to) # " by " # Principal.toText(caller) # " (block: " # Nat.toText(blockIndex) # ")");
                
                #ok(blockIndex);
            };
            case (#Err(error)) {
                let errorMsg = switch (error) {
                    case (#BadFee({ expected_fee })) { "Bad fee: expected " # Nat.toText(expected_fee) # " e8s" };
                    case (#InsufficientFunds({ balance })) { "Insufficient funds: ledger balance " # Nat.toText(balance) # " e8s" };
                    case (#TooOld) { "Transaction too old" };
                    case (#CreatedInFuture(_)) { "Transaction created in future" };
                    case (#Duplicate(_)) { "Duplicate transaction" };
                    case (#TemporarilyUnavailable) { "Ledger temporarily unavailable" };
                    case (#GenericError({ message; error_code = _ })) { "Ledger error: " # message };
                    case (_) { "Unknown transfer error" };
                };
                #err(errorMsg);
            };
        };
    } catch (error) {
        Debug.print("Exception during ICP transfer: " # debug_show(error));
        #err("Failed to communicate with ICP Ledger canister");
    };
};
```

### 3.2 Debugging and Monitoring Functions

#### 3.2.1 Balance Debugging Function
```motoko
public shared ({ caller }) func debugBalances() : async {
    canisterPrincipal: Principal;
    internalBalance: Nat;
    ledgerBalance: Nat;
    balanceMatch: Bool;
    lastSyncTime: ?Int;
} {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
        Debug.trap("Unauthorized: Only admins can view balance debug info");
    };

    let ledgerBalance = await queryLedgerBalance();
    let canisterPrincipal = Principal.fromActor(this);

    {
        canisterPrincipal;
        internalBalance = icpBalance;
        ledgerBalance;
        balanceMatch = icpBalance == ledgerBalance;
        lastSyncTime = null; // Can be enhanced later
    };
};
```

#### 3.2.2 Balance Synchronization Function
```motoko
public shared ({ caller }) func syncInternalBalance() : async {
    oldBalance: Nat;
    newBalance: Nat;
    syncSuccessful: Bool;
} {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
        Debug.trap("Unauthorized: Only admins can sync balance");
    };

    let oldBalance = icpBalance;
    let newBalance = await queryLedgerBalance();
    
    if (newBalance > 0) {
        icpBalance := newBalance;
        Debug.print("Balance synced: " # Nat.toText(oldBalance) # " → " # Nat.toText(newBalance) # " e8s");
        {
            oldBalance;
            newBalance;
            syncSuccessful = true;
        };
    } else {
        Debug.print("Balance sync failed: ledger returned 0");
        {
            oldBalance;
            newBalance = 0;
            syncSuccessful = false;
        };
    };
};
```

#### 3.2.3 Canister Account Information
```motoko
public query func getCanisterAccountInfo() : async {
    principal: Principal;
    accountId: Text;
    icrc1Account: {owner: Principal; subaccount: ?[Nat8]};
} {
    let canisterPrincipal = Principal.fromActor(this);
    let icrc1Account = {
        owner = canisterPrincipal;
        subaccount = null : ?[Nat8];
    };
    
    {
        principal = canisterPrincipal;
        accountId = Principal.toText(canisterPrincipal); // Simplified - in production, convert to account identifier
        icrc1Account;
    };
};
```

### 3.3 Error Handling Improvements

#### 3.3.1 Ledger Communication Retry Logic
```motoko
private func queryLedgerBalanceWithRetry(maxRetries: Nat) : async Nat {
    var attempts = 0;
    var lastError = "";
    
    while (attempts < maxRetries) {
        try {
            let balance = await queryLedgerBalance();
            if (balance > 0 or attempts == maxRetries - 1) {
                return balance;
            };
        } catch (error) {
            lastError := debug_show(error);
            Debug.print("Ledger query attempt " # Nat.toText(attempts + 1) # " failed: " # lastError);
        };
        attempts += 1;
    };
    
    Debug.print("All ledger query attempts failed. Last error: " # lastError);
    0;
};
```

## 4. Implementation Steps

### Phase 1: Core Fix (Immediate - 1 hour)
1. **Add missing constant**
   ```motoko
   private let ICP_LEDGER_CANISTER_ID = Principal.fromText("rrkah-fqaaa-aaaaa-aaaaq-cai");
   ```

2. **Implement queryLedgerBalance() function**
   - Add the function with proper error handling
   - Include try-catch for network failures

3. **Test basic withdrawal**
   - Verify function no longer returns 0 balance error
   - Test successful withdrawal with sufficient funds

### Phase 2: Enhanced Error Handling (1-2 hours)
4. **Improve withdrawIcp() error messages**
   - Show both ledger and internal balances
   - Add fallback logic for ledger query failures

5. **Add retry logic for ledger queries**
   - Implement retry mechanism for transient failures
   - Add timeout handling

### Phase 3: Debugging Tools (1 hour)
6. **Add debugging functions**
   - `debugBalances()` for troubleshooting
   - `syncInternalBalance()` for manual sync
   - `getCanisterAccountInfo()` for account details

7. **Add logging and monitoring**
   - Log successful withdrawals
   - Log ledger query failures
   - Add balance sync warnings

### Phase 4: Testing and Validation (1 hour)
8. **Test all scenarios**
   - Successful withdrawal
   - Insufficient funds
   - Ledger communication failure
   - Invalid recipient principal

9. **Validate balance accuracy**
   - Compare internal vs ledger balances
   - Test balance sync functionality
   - Verify withdrawal updates balances correctly

## 5. Testing Requirements

### 5.1 Unit Tests
```motoko
// Test queryLedgerBalance()
// - Returns correct balance when ledger available
// - Returns 0 when ledger unavailable
// - Handles network errors gracefully

// Test withdrawIcp()
// - Succeeds with sufficient balance
// - Fails with insufficient balance
// - Handles invalid recipients
// - Updates internal balance after successful transfer
```

### 5.2 Integration Tests
- Test with actual ICP Ledger canister on testnet
- Verify balance queries return accurate amounts
- Test withdrawal with real ICP transfers
- Validate error handling with network issues

### 5.3 Manual Testing Scenarios
1. **Happy Path**: Admin withdraws ICP with sufficient balance
2. **Insufficient Balance**: Withdrawal attempt exceeds available balance
3. **Network Failure**: Ledger canister temporarily unavailable
4. **Balance Sync**: Internal and ledger balances are out of sync

## 6. Deployment Plan

### Pre-deployment Checklist
- [ ] `ICP_LEDGER_CANISTER_ID` constant added
- [ ] `queryLedgerBalance()` function implemented
- [ ] Enhanced error handling in `withdrawIcp()`
- [ ] Debugging functions added
- [ ] All tests passing

### Deployment Steps
1. **Deploy to local testnet**
   - Test with local replica
   - Verify basic functionality

2. **Deploy to IC testnet**
   - Test with real ICP Ledger integration
   - Validate balance queries and withdrawals

3. **Deploy to mainnet**
   - Monitor initial withdrawals closely
   - Verify balance accuracy

### Post-deployment Validation
- [ ] Balance query returns non-zero value
- [ ] Test withdrawal with small amount
- [ ] Verify balance updates correctly
- [ ] Check debug functions work properly

## 7. Success Metrics

### Functional Success
- ✅ `withdrawIcp()` no longer fails with "balance: 0 e8s" error
- ✅ Function correctly queries actual ICP Ledger balance
- ✅ Withdrawals succeed when canister has sufficient ICP
- ✅ Internal balance stays synchronized with ledger balance

### Performance Success
- ✅ Balance queries complete within 5 seconds
- ✅ Withdrawal operations complete within 10 seconds
- ✅ Error handling doesn't cause timeouts
- ✅ Retry logic works for transient failures

### Reliability Success
- ✅ Function handles ledger communication failures gracefully
- ✅ Appropriate error messages for all failure modes
- ✅ No false positive "insufficient balance" errors
- ✅ Balance discrepancies can be debugged and resolved

## 8. Risk Mitigation

### Technical Risks
- **Ledger Unavailability**: Implement fallback to internal balance with warnings
- **Network Timeouts**: Add retry logic with exponential backoff
- **Balance Desync**: Provide manual sync function and monitoring

### Security Risks
- **Admin-only Access**: Maintain strict admin-only access to withdrawal functions
- **Principal Validation**: Continue validating recipient principals
- **Amount Validation**: Keep fee and minimum amount checks

### Operational Risks
- **Balance Confusion**: Provide clear debug information showing all balance sources
- **Failed Withdrawals**: Ensure failed withdrawals don't corrupt internal state
- **Monitoring Gaps**: Add comprehensive logging for troubleshooting

---

## Quick Fix Summary

**Immediate action needed:**

1. Add this constant:
   ```motoko
   private let ICP_LEDGER_CANISTER_ID = Principal.fromText("rrkah-fqaaa-aaaaa-aaaaq-cai");
   ```

2. Add this function:
   ```motoko
   private func queryLedgerBalance() : async Nat {
       // Implementation from section 3.1.1
   }
   ```

3. Deploy and test withdrawal

This will resolve the immediate "balance: 0 e8s" error and restore withdrawal functionality.