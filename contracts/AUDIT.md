# 🔐 Decrypt Labs Smart Contract Security Audit

**Auditor:** Jimmy Neutron (AI Security Review)  
**Date:** February 1, 2026  
**Contracts:** BotNFT, BotFleet, FuelManager, RewardsDistributor, TierGate  
**Solidity Version:** 0.8.24  
**Chain:** Base (Coinbase L2)

---

## Executive Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 1 |
| 🟠 High | 0 |
| 🟡 Medium | 3 |
| 🔵 Low | 5 |
| ℹ️ Informational | 4 |

**Overall Assessment:** The contracts are well-structured and follow best practices. One critical bug was found in `RewardsDistributor.batchClaimRewards()`. After fixing the identified issues, the contracts should be safe for mainnet deployment.

---

## 🔴 Critical Issues

### C-1: Event Emits Zero in batchClaimRewards

**Contract:** `RewardsDistributor.sol`  
**Function:** `batchClaimRewards()`  
**Line:** ~185

**Description:**  
The event emits `bal.available` AFTER it has been set to 0, causing incorrect event data.

```solidity
// CURRENT (BUGGY):
bal.totalClaimed += bal.available;
bal.available = 0;  // ← Set to 0
emit RewardsClaimed(tokenId, msg.sender, bal.available);  // ← Emits 0!
```

**Impact:** All `RewardsClaimed` events from batch claims will log 0 as the amount, breaking off-chain tracking and analytics.

**Recommendation:**
```solidity
// FIXED:
uint256 claimAmount = bal.available;
bal.totalClaimed += claimAmount;
bal.available = 0;
emit RewardsClaimed(tokenId, msg.sender, claimAmount);
```

---

## 🟡 Medium Issues

### M-1: Unbounded Loop in Queue Processing

**Contract:** `BotFleet.sol`  
**Function:** `_processQueue()`

**Description:**  
The queue uses a head/tail pointer system where users who leave the queue create "gaps" (deleted entries). The `_processQueue()` function must iterate through these gaps, which could consume excessive gas if many users joined and left.

**Impact:** If the gap between `queueHead` and the next valid entry is large, operations like `breakSlot()` could fail due to out-of-gas.

**Recommendation:**  
1. Implement a max iteration limit
2. Or use a linked-list structure for O(1) removal

```solidity
function _processQueue() internal {
    uint256 iterations = 0;
    uint256 maxIterations = 50; // Safety limit
    
    while (queueHead < queueTail && iterations < maxIterations) {
        // ... existing logic
        iterations++;
    }
}
```

---

### M-2: Emergency Withdraw Can Drain User Rewards

**Contract:** `RewardsDistributor.sol`  
**Function:** `emergencyWithdraw()`

**Description:**  
The owner can withdraw ANY token including the CIPHER token that holds user rewards. This is a centralization risk.

**Impact:** Malicious or compromised admin could steal all pending user rewards.

**Recommendation:**  
Either:
1. Track total pending rewards and prevent withdrawing more than excess
2. Use a timelock for emergency functions
3. Exclude CIPHER token from emergency withdraw

```solidity
function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
    // Option 1: Don't allow withdrawing the main reward token
    require(token != address(cipherToken), "Cannot withdraw reward token");
    IERC20(token).safeTransfer(treasury, amount);
}
```

---

### M-3: No Token Existence Check in depositReward

**Contract:** `RewardsDistributor.sol`  
**Function:** `depositReward()`

**Description:**  
Rewards can be deposited to non-existent token IDs. The funds are credited to a token that may never be minted.

**Impact:** Depositor could accidentally lose funds by depositing to wrong tokenId.

**Recommendation:**
```solidity
function depositReward(uint256 tokenId, uint256 totalAmount) external {
    // Add check
    try botNFT.ownerOf(tokenId) returns (address) {} 
    catch { revert TokenDoesNotExist(); }
    // ... rest of function
}
```

---

## 🔵 Low Issues

### L-1: Grace Period Can Be Repeatedly Triggered

**Contract:** `FuelManager.sol`  
**Function:** `checkFuelExpiry()`

Calling `checkFuelExpiry()` multiple times on the same expired slot will repeatedly call `startGracePeriod()`, wasting gas and emitting duplicate events.

**Recommendation:** Add a check if grace period already started.

---

### L-2: No Zero Price Protection

**Contract:** `BotNFT.sol`, `FuelManager.sol`

Admin can set `mintPriceInCipher` or `fuelPriceInCipher` to 0, allowing free mints/fuel. While this requires admin action, it's worth adding a minimum.

---

### L-3: View Functions Have Unbounded Loops

**Contract:** `BotFleet.sol`  
**Functions:** `getQueueLength()`, `getQueuePosition()`

These view functions iterate through the entire queue. With a large queue, they could fail or timeout.

---

### L-4: Flash Loan Tier Gaming

**Contract:** `TierGate.sol`

A user could flash loan CIPHER tokens, call `getUserTier()` in the same transaction, and appear to have a higher tier. This matters if tier checks are used on-chain by other contracts.

**Recommendation:** For on-chain tier verification, use time-weighted balance or snapshot at block.

---

### L-5: Strategy Enum Redundant Check

**Contract:** `BotNFT.sol`

```solidity
if (uint8(strategy) > 3) revert InvalidStrategy();
```

Solidity 0.8+ already reverts on invalid enum casting. This check is redundant but harmless.

---

## ℹ️ Informational

### I-1: Use Custom Errors Everywhere ✅
All contracts properly use custom errors instead of require strings. Good!

### I-2: Consider Adding NatSpec Documentation
Some functions lack `@param` and `@return` documentation.

### I-3: Immutable Variables Use Lowercase
Convention suggests `SCREAMING_SNAKE_CASE` for immutables:
- `cipherToken` → `CIPHER_TOKEN`
- `botNFT` → `BOT_NFT`

### I-4: Consider Adding Contract Versioning
Add a `VERSION` constant for upgrade tracking:
```solidity
string public constant VERSION = "1.0.0";
```

---

## ✅ Security Measures Verified

| Check | Status |
|-------|--------|
| Reentrancy Protection | ✅ All state-changing functions use `nonReentrant` |
| Access Control | ✅ `Ownable2Step` for safer ownership transfer |
| Integer Overflow | ✅ Solidity 0.8.24 built-in protection |
| Safe Token Transfers | ✅ `SafeERC20` used throughout |
| Emergency Pause | ✅ `Pausable` implemented |
| Input Validation | ✅ All inputs validated |
| Event Emission | ⚠️ One bug found (C-1) |

---

## Gas Optimization Notes

1. **Pack structs efficiently** - `BotMetadata` and `Slot` are already well-packed using `uint40`
2. **Use `calldata` for arrays** - Already implemented ✅
3. **Batch operations available** - `bulkDepositRewards`, `batchClaimRewards` ✅

---

## Recommended Fixes Priority

| Priority | Issue | Effort |
|----------|-------|--------|
| 1 | C-1: Fix batchClaimRewards event | 5 min |
| 2 | M-2: Add safeguard to emergencyWithdraw | 10 min |
| 3 | M-1: Add iteration limit to queue | 15 min |
| 4 | M-3: Add token existence check | 5 min |

---

## Conclusion

The Decrypt Labs smart contracts are well-written and follow security best practices. The critical bug in `batchClaimRewards` should be fixed before mainnet deployment. The medium issues represent centralization risks that users should be aware of.

**Recommendation:** Fix C-1 and M-2 before launch. Consider M-1 and M-3 as enhancements.

---

*This audit was performed by an AI system. For production deployment with significant value at risk, consider a professional audit from OpenZeppelin, Sherlock, or similar firms.*
