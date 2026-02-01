// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TierGate
 * @author Decrypt Labs
 * @notice Determines user tier based on $CIPHER token holdings
 * @dev Token holders get indicator/strategy access. NFT holders get bot access (separate).
 * 
 * Tiers (3 levels):
 * - Bronze (100k tokens): Indicator only
 * - Gold (500k tokens): Indicator + 1 strategy
 * - Diamond (1.3M tokens): Indicator + All 4 strategies
 */
contract TierGate is Ownable2Step {
    
    // ============ State Variables ============
    IERC20 public immutable cipherToken;
    
    // Tier thresholds (in $CIPHER tokens, 18 decimals)
    // Default: 100k Bronze, 500k Gold, 1.3M Diamond
    uint256 public bronzeThreshold;
    uint256 public goldThreshold;
    uint256 public diamondThreshold;

    // ============ Enums ============
    enum Tier {
        NONE,       // 0: No access
        BRONZE,     // 1: Indicator only
        GOLD,       // 2: Indicator + 1 strategy
        DIAMOND     // 3: Indicator + all 4 strategies
    }

    // ============ Events ============
    event ThresholdsUpdated(
        uint256 bronze,
        uint256 gold,
        uint256 diamond
    );

    // ============ Errors ============
    error InvalidThresholds();

    // ============ Constructor ============
    constructor(
        address _cipherToken,
        uint256 _bronzeThreshold,
        uint256 _goldThreshold,
        uint256 _diamondThreshold,
        address _initialOwner
    ) Ownable(_initialOwner) {
        cipherToken = IERC20(_cipherToken);
        
        // Validate thresholds are ascending
        if (_bronzeThreshold >= _goldThreshold || _goldThreshold >= _diamondThreshold) {
            revert InvalidThresholds();
        }
        
        bronzeThreshold = _bronzeThreshold;
        goldThreshold = _goldThreshold;
        diamondThreshold = _diamondThreshold;
    }

    // ============ View Functions ============

    /**
     * @notice Get user's tier based on token balance
     * @param user The wallet address to check
     * @return tier The user's current tier
     */
    function getUserTier(address user) public view returns (Tier) {
        uint256 balance = cipherToken.balanceOf(user);
        
        if (balance >= diamondThreshold) return Tier.DIAMOND;
        if (balance >= goldThreshold) return Tier.GOLD;
        if (balance >= bronzeThreshold) return Tier.BRONZE;
        
        return Tier.NONE;
    }

    /**
     * @notice Get tier name as string
     * @param tier The tier enum value
     * @return name The tier name
     */
    function getTierName(Tier tier) public pure returns (string memory) {
        if (tier == Tier.DIAMOND) return "Diamond";
        if (tier == Tier.GOLD) return "Gold";
        if (tier == Tier.BRONZE) return "Bronze";
        return "None";
    }

    /**
     * @notice Check if user meets minimum tier requirement
     * @param user The wallet address
     * @param requiredTier Minimum tier needed
     * @return meets True if user meets or exceeds requirement
     */
    function meetsRequirement(
        address user,
        Tier requiredTier
    ) external view returns (bool) {
        return getUserTier(user) >= requiredTier;
    }

    /**
     * @notice Get user's access level details
     * @param user The wallet address
     * @return tier Current tier
     * @return hasIndicator Whether user has indicator access
     * @return strategyCount Number of strategies accessible (0, 1, or 4)
     */
    function getAccessLevel(address user) external view returns (
        Tier tier,
        bool hasIndicator,
        uint256 strategyCount
    ) {
        tier = getUserTier(user);
        
        hasIndicator = tier >= Tier.BRONZE;
        
        if (tier == Tier.DIAMOND) {
            strategyCount = 4; // All strategies
        } else if (tier == Tier.GOLD) {
            strategyCount = 1; // One strategy (user choice)
        } else {
            strategyCount = 0;
        }
    }

    /**
     * @notice Get tokens needed to reach next tier
     * @param user The wallet address
     * @return tokensNeeded Tokens required for next tier (0 if at max)
     * @return nextTier The next tier level
     */
    function getTokensToNextTier(address user) external view returns (
        uint256 tokensNeeded,
        Tier nextTier
    ) {
        uint256 balance = cipherToken.balanceOf(user);
        Tier currentTier = getUserTier(user);
        
        if (currentTier == Tier.DIAMOND) {
            return (0, Tier.DIAMOND);
        }
        
        if (currentTier == Tier.GOLD) {
            return (diamondThreshold - balance, Tier.DIAMOND);
        }
        
        if (currentTier == Tier.BRONZE) {
            return (goldThreshold - balance, Tier.GOLD);
        }
        
        return (bronzeThreshold - balance, Tier.BRONZE);
    }

    /**
     * @notice Get all threshold values
     * @return bronze Bronze threshold
     * @return gold Gold threshold
     * @return diamond Diamond threshold
     */
    function getThresholds() external view returns (
        uint256 bronze,
        uint256 gold,
        uint256 diamond
    ) {
        return (bronzeThreshold, goldThreshold, diamondThreshold);
    }

    /**
     * @notice Check which strategies a user can access
     * @param user The wallet address
     * @return canAccessIndicator Access to PriceCipher indicator
     * @return canAccessOneStrategy Access to 1 strategy (Gold+)
     * @return canAccessAllStrategies Access to all 4 strategies (Diamond)
     */
    function getStrategyAccess(address user) external view returns (
        bool canAccessIndicator,
        bool canAccessOneStrategy,
        bool canAccessAllStrategies
    ) {
        Tier tier = getUserTier(user);
        
        canAccessIndicator = tier >= Tier.BRONZE;
        canAccessOneStrategy = tier >= Tier.GOLD;
        canAccessAllStrategies = tier == Tier.DIAMOND;
    }

    // ============ Admin Functions ============

    /**
     * @notice Update tier thresholds (can adjust as market cap changes)
     * @param bronze New bronze threshold
     * @param gold New gold threshold
     * @param diamond New diamond threshold
     */
    function setThresholds(
        uint256 bronze,
        uint256 gold,
        uint256 diamond
    ) external onlyOwner {
        if (bronze >= gold || gold >= diamond) {
            revert InvalidThresholds();
        }
        
        bronzeThreshold = bronze;
        goldThreshold = gold;
        diamondThreshold = diamond;
        
        emit ThresholdsUpdated(bronze, gold, diamond);
    }
}
