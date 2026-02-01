# Smart Contract Research: Decrypt Labs

Research compiled for Decrypt Labs NFT + Subscription system on Base chain.

---

## 1. ERC-721 NFT with Limited Supply (20 units)

### OpenZeppelin Patterns

**Recommended Base Contracts:**
- `ERC721` - Core implementation with metadata
- `ERC721URIStorage` - Per-token metadata storage (more flexible, slightly more gas)
- `ERC721Enumerable` - On-chain token enumeration (optional, adds gas overhead)
- `Ownable2Step` - Secure ownership transfer (better than basic `Ownable`)

**For 20 NFTs, use `ERC721URIStorage`** - the gas overhead is negligible at this scale, and it allows each token to have unique metadata (strategy selection, tier info).

### Implementation Pattern

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721, ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract DecryptLabsNFT is ERC721URIStorage, Ownable2Step, ReentrancyGuard {
    uint256 public constant MAX_SUPPLY = 20;
    uint256 private _nextTokenId;
    
    // Strategy metadata per token
    mapping(uint256 => Strategy) public tokenStrategies;
    
    struct Strategy {
        uint8 strategyId;      // 0-255 strategy types
        uint8 tier;            // Access tier (1-5)
        uint40 activatedAt;    // Timestamp
        bool isActive;
    }
    
    error MaxSupplyReached();
    error InvalidTokenId();
    
    constructor(address initialOwner) 
        ERC721("Decrypt Labs Access", "DECRYPT") 
        Ownable(initialOwner) 
    {}
    
    function mint(
        address to, 
        string memory uri,
        uint8 strategyId,
        uint8 tier
    ) external onlyOwner nonReentrant returns (uint256) {
        if (_nextTokenId >= MAX_SUPPLY) revert MaxSupplyReached();
        
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        tokenStrategies[tokenId] = Strategy({
            strategyId: strategyId,
            tier: tier,
            activatedAt: uint40(block.timestamp),
            isActive: true
        });
        
        return tokenId;
    }
    
    function totalSupply() public view returns (uint256) {
        return _nextTokenId;
    }
    
    function remainingSupply() public view returns (uint256) {
        return MAX_SUPPLY - _nextTokenId;
    }
}
```

### Security Considerations

1. **Supply Cap Enforcement**
   - Use `constant` for `MAX_SUPPLY` (saves gas, immutable)
   - Check supply BEFORE incrementing counter
   - Use custom errors over require strings (gas savings)

2. **Reentrancy Protection**
   - Add `ReentrancyGuard` for mint functions
   - Use `_safeMint` (calls receiver hook) with reentrancy guard

3. **Metadata Security**
   - Store critical strategy data on-chain in struct
   - Use IPFS for images/descriptions (immutable)
   - Consider on-chain SVG for provenance (more expensive)

4. **Transfer Restrictions (Optional)**
   - Override `_update()` to add transfer cooldowns or restrictions
   - Consider soulbound options if NFT should be non-transferable

### Metadata Schema (JSON)

```json
{
  "name": "Decrypt Labs #1",
  "description": "Access pass for Decrypt Labs trading strategies",
  "image": "ipfs://...",
  "attributes": [
    { "trait_type": "Tier", "value": "Gold" },
    { "trait_type": "Strategy", "value": "OTE Silver Bullet" },
    { "trait_type": "Max Leverage", "value": "10x" },
    { "display_type": "date", "trait_type": "Activated", "value": 1703721600 }
  ]
}
```

---

## 2. Subscription/Fuel Payment System (Base Chain)

### Architecture Options

**Option A: Time-Based Subscriptions**
```solidity
mapping(uint256 tokenId => uint256 expiresAt) public subscriptions;

function subscribe(uint256 tokenId, uint256 months) external payable {
    require(msg.value >= monthlyRate * months);
    subscriptions[tokenId] = block.timestamp + (months * 30 days);
}
```

**Option B: Credit/Fuel System (Recommended)**
```solidity
// More flexible - users buy credits, deduct per trade/signal
mapping(uint256 tokenId => uint256 credits) public fuelBalance;

function addFuel(uint256 tokenId) external payable {
    uint256 creditsToAdd = msg.value / creditPrice;
    fuelBalance[tokenId] += creditsToAdd;
}

function consumeFuel(uint256 tokenId, uint256 amount) external onlyAuthorized {
    require(fuelBalance[tokenId] >= amount);
    fuelBalance[tokenId] -= amount;
}
```

**Option C: Hybrid (Time + Usage)**
```solidity
struct Subscription {
    uint40 expiresAt;      // Time-based expiry
    uint216 fuelCredits;   // Usage credits (packed in same slot)
}
```

### Payment Patterns

**1. Native ETH Payments**
- Simplest, lowest gas
- Use `receive()` and `fallback()`
- Base has very low fees (~$0.001 per tx)

**2. ERC-20 Token Payments (e.g., USDC)**
```solidity
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

using SafeERC20 for IERC20;

IERC20 public immutable paymentToken; // USDC on Base

function subscribeWithToken(uint256 tokenId, uint256 amount) external {
    paymentToken.safeTransferFrom(msg.sender, address(this), amount);
    // Update subscription...
}
```

**Base USDC Address:** `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

### Auto-Renewal Pattern (Pull-based)

```solidity
// User pre-approves spending, contract pulls when subscription expires
function autoRenew(uint256 tokenId) external {
    require(subscriptions[tokenId].expiresAt <= block.timestamp, "Not expired");
    require(autoRenewEnabled[tokenId], "Auto-renew disabled");
    
    paymentToken.safeTransferFrom(
        ownerOf(tokenId),
        address(this),
        monthlyRate
    );
    subscriptions[tokenId].expiresAt += 30 days;
}
```

### Base-Specific Optimizations

1. **Gas Costs**
   - Base L2 execution: ~0.001 gwei minimum base fee
   - L1 data posting: Variable (batched by sequencer)
   - Typical 200k gas tx: ~$0.0006 at $3000 ETH

2. **Calldata Optimization**
   - Pack parameters efficiently
   - Use `bytes4` function selectors
   - Consider `bytes` over strings where possible

3. **Block Times**
   - Base: ~2 second block times
   - Safe to use `block.timestamp` for subscriptions (L2 timestamp is reliable)

4. **No Special Opcodes Needed**
   - Base is EVM-equivalent (Bedrock)
   - Standard Solidity compiles directly

---

## 3. Insurance Pool Smart Contracts

### Pool Architecture

**Basic Insurance Pool Pattern:**
```solidity
contract InsurancePool is ReentrancyGuard, Ownable2Step {
    uint256 public totalPoolBalance;
    uint256 public totalCoverage;  // Active coverage obligations
    
    mapping(address => uint256) public deposits;      // LP deposits
    mapping(address => uint256) public coverageUnits; // Coverage purchased
    
    uint256 public constant COVERAGE_RATIO = 200;     // 200% collateralization
    uint256 public constant CLAIM_DELAY = 3 days;     // Anti-gaming
    
    struct Claim {
        address claimant;
        uint256 amount;
        uint256 requestedAt;
        bool processed;
    }
    mapping(uint256 => Claim) public claims;
    uint256 public nextClaimId;
}
```

### Deposit/Withdrawal Pattern

```solidity
function deposit() external payable nonReentrant {
    require(msg.value > 0, "Zero deposit");
    deposits[msg.sender] += msg.value;
    totalPoolBalance += msg.value;
    
    // Mint LP tokens (optional, for share tracking)
    _mintShares(msg.sender, msg.value);
}

function withdraw(uint256 amount) external nonReentrant {
    require(deposits[msg.sender] >= amount, "Insufficient balance");
    
    // Ensure pool remains solvent
    uint256 availableForWithdrawal = totalPoolBalance - (totalCoverage * 100 / COVERAGE_RATIO);
    require(amount <= availableForWithdrawal, "Would undercollateralize pool");
    
    deposits[msg.sender] -= amount;
    totalPoolBalance -= amount;
    
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
}
```

### Claims Processing

**Two-Phase Claim System:**
```solidity
// Phase 1: Submit claim (starts delay)
function submitClaim(uint256 coverageAmount) external returns (uint256 claimId) {
    require(coverageUnits[msg.sender] >= coverageAmount, "Insufficient coverage");
    
    claimId = nextClaimId++;
    claims[claimId] = Claim({
        claimant: msg.sender,
        amount: coverageAmount,
        requestedAt: block.timestamp,
        processed: false
    });
    
    emit ClaimSubmitted(claimId, msg.sender, coverageAmount);
}

// Phase 2: Execute claim (after delay, requires oracle/admin approval)
function executeClaim(uint256 claimId) external onlyAuthorized {
    Claim storage claim = claims[claimId];
    require(!claim.processed, "Already processed");
    require(block.timestamp >= claim.requestedAt + CLAIM_DELAY, "Delay not passed");
    
    claim.processed = true;
    totalCoverage -= claim.amount;
    totalPoolBalance -= claim.amount;
    
    (bool success, ) = claim.claimant.call{value: claim.amount}("");
    require(success, "Payout failed");
}
```

### Oracle Integration for Loss Verification

**Chainlink Oracle Pattern:**
```solidity
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

AggregatorV3Interface internal priceFeed;

function verifyDrawdown(uint256 tokenId, uint256 claimedLoss) external view returns (bool) {
    // Get price data from oracle
    (, int256 price, , uint256 updatedAt, ) = priceFeed.latestRoundData();
    require(block.timestamp - updatedAt < 1 hours, "Stale price");
    
    // Verify loss against on-chain trading data
    // This would integrate with your trading bot's reported P&L
    return true; // Simplified
}
```

### Security Considerations

1. **Solvency Protection**
   - Maintain minimum coverage ratio (150-200%)
   - Lock withdrawals during claims processing
   - Rate limit claims per address

2. **Flash Loan Attack Prevention**
   - Deposit lockup period before coverage is active
   - Snapshot-based share calculations
   - Use block.number not block.timestamp for critical operations

3. **Admin Controls**
   - Timelock for parameter changes
   - Multi-sig for claim approvals
   - Emergency pause functionality

4. **Economic Attacks**
   - Premium pricing based on pool utilization
   - Gradual coverage increase limits
   - Cooldown between coverage purchases

---

## 4. Token-Gated Access Tier System

### Tier Architecture

**Tier Levels:**
| Tier | Name | Requirements | Benefits |
|------|------|--------------|----------|
| 1 | Bronze | Hold 1 NFT | Basic signals |
| 2 | Silver | Hold NFT + 100 credits | Advanced signals |
| 3 | Gold | Hold NFT + active subscription | Full access |
| 4 | Platinum | Hold multiple NFTs | Priority execution |
| 5 | Diamond | Hold NFT + LP in insurance | Max benefits |

### Access Control Pattern

```solidity
contract TierGatedAccess {
    IERC721 public immutable accessNFT;
    ISubscriptionManager public immutable subscriptions;
    IInsurancePool public immutable insurancePool;
    
    enum Tier { None, Bronze, Silver, Gold, Platinum, Diamond }
    
    function getUserTier(address user) public view returns (Tier) {
        uint256 nftBalance = accessNFT.balanceOf(user);
        if (nftBalance == 0) return Tier.None;
        
        // Get first owned token to check subscription
        uint256 tokenId = getFirstOwnedToken(user);
        
        // Check insurance pool participation
        if (insurancePool.deposits(user) > 0) {
            return Tier.Diamond;
        }
        
        // Check multiple NFT holdings
        if (nftBalance >= 3) {
            return Tier.Platinum;
        }
        
        // Check subscription status
        if (subscriptions.isActive(tokenId)) {
            return Tier.Gold;
        }
        
        // Check fuel credits
        if (subscriptions.getFuelBalance(tokenId) >= 100) {
            return Tier.Silver;
        }
        
        return Tier.Bronze;
    }
    
    modifier requiresTier(Tier minTier) {
        require(getUserTier(msg.sender) >= minTier, "Insufficient tier");
        _;
    }
}
```

### Off-Chain Verification (API Pattern)

```solidity
// For gasless verification, use signature-based access
function generateAccessSignature(
    address user, 
    Tier tier, 
    uint256 expiry
) external view onlyAuthorized returns (bytes memory) {
    bytes32 hash = keccak256(abi.encodePacked(user, tier, expiry, block.chainid));
    bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    // Sign with authorized key off-chain
    return ""; // Actual signature
}

// Backend verifies signature + checks on-chain state periodically
```

### ERC-6551 Token Bound Accounts (Advanced)

For complex tier systems, consider ERC-6551:
```solidity
// Each NFT gets its own smart contract wallet
// The NFT's wallet can hold assets, interact with DeFi, etc.
// Tier determined by NFT wallet contents, not holder's main wallet
```

### Role-Based Access (OpenZeppelin)

```solidity
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract TieredAccess is AccessControl {
    bytes32 public constant BRONZE_ROLE = keccak256("BRONZE_ROLE");
    bytes32 public constant SILVER_ROLE = keccak256("SILVER_ROLE");
    bytes32 public constant GOLD_ROLE = keccak256("GOLD_ROLE");
    
    // Grant roles based on NFT ownership + subscription status
    function syncUserRole(address user) external {
        Tier tier = getUserTier(user);
        
        // Revoke all first
        _revokeRole(BRONZE_ROLE, user);
        _revokeRole(SILVER_ROLE, user);
        _revokeRole(GOLD_ROLE, user);
        
        // Grant appropriate tier
        if (tier >= Tier.Bronze) _grantRole(BRONZE_ROLE, user);
        if (tier >= Tier.Silver) _grantRole(SILVER_ROLE, user);
        if (tier >= Tier.Gold) _grantRole(GOLD_ROLE, user);
    }
}
```

---

## Base Chain Deployment Considerations

### Network Parameters
- **Chain ID:** 8453 (mainnet), 84532 (Sepolia testnet)
- **Block time:** ~2 seconds
- **Minimum base fee:** 0.001 gwei (1,000,000 wei)

### Gas Optimization Tips
1. Use `immutable` for addresses set in constructor
2. Pack structs to minimize storage slots
3. Use custom errors over `require` strings
4. Batch operations where possible
5. Consider ERC-721A for batch minting (not needed for 20 NFTs)

### Recommended Testing Flow
1. Local Hardhat/Foundry tests
2. Base Sepolia deployment
3. Verify on Basescan
4. Mainnet deployment with conservative gas limits

### Security Checklist
- [ ] Reentrancy guards on all external calls
- [ ] Access control on admin functions
- [ ] Input validation (zero address, overflow)
- [ ] Event emission for all state changes
- [ ] Pausable for emergencies
- [ ] Upgrade path consideration (proxy vs immutable)
- [ ] Audit before mainnet (at minimum, Slither static analysis)

### Useful Base Addresses
- **USDC:** `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **WETH:** `0x4200000000000000000000000000000000000006`
- **Chainlink ETH/USD:** `0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70`

---

## Recommended Contract Architecture

```
DecryptLabs/
├── core/
│   ├── DecryptLabsNFT.sol        # ERC-721 with strategy metadata
│   └── SubscriptionManager.sol    # Fuel credits + time subscriptions
├── insurance/
│   ├── InsurancePool.sol          # LP deposits + claims
│   └── ClaimsProcessor.sol        # Oracle-verified payouts
├── access/
│   ├── TierManager.sol            # Tier calculation logic
│   └── AccessController.sol       # Function gating
└── interfaces/
    ├── IDecryptLabsNFT.sol
    ├── ISubscriptionManager.sol
    └── IInsurancePool.sol
```

### Deployment Order
1. Deploy `DecryptLabsNFT`
2. Deploy `SubscriptionManager` (link to NFT)
3. Deploy `InsurancePool`
4. Deploy `TierManager` (link all contracts)
5. Deploy `AccessController` (uses TierManager)
6. Transfer ownership to multisig

---

## Next Steps

1. **Finalize Tier Benefits** - What exactly does each tier unlock?
2. **Economic Modeling** - Price NFTs, subscriptions, insurance premiums
3. **Oracle Selection** - Chainlink vs custom for loss verification
4. **Upgrade Strategy** - Proxy pattern for future improvements?
5. **Frontend Integration** - wagmi/viem hooks for contract interaction

---

*Research compiled: 2026-02-01*
*Sources: OpenZeppelin Contracts 5.x, Base Documentation, DeFi best practices*
