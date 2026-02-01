// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {TierGate} from "../src/TierGate.sol";
import {MockCipher} from "./mocks/MockCipher.sol";

contract TierGateTest is Test {
    TierGate public tierGate;
    MockCipher public cipher;
    
    address public owner = address(1);
    address public user1 = address(3);
    address public user2 = address(4);
    address public user3 = address(5);
    address public user4 = address(6);
    
    // Thresholds (with 18 decimals)
    uint256 public constant BRONZE = 100_000 * 10**18;   // 100k tokens
    uint256 public constant GOLD = 500_000 * 10**18;     // 500k tokens
    uint256 public constant DIAMOND = 1_300_000 * 10**18; // 1.3M tokens

    function setUp() public {
        vm.startPrank(owner);
        
        cipher = new MockCipher();
        tierGate = new TierGate(
            address(cipher),
            BRONZE,
            GOLD,
            DIAMOND,
            owner
        );
        
        vm.stopPrank();
    }

    // ============ Tier Detection Tests ============

    function test_Tier_None() public {
        // User with no tokens
        assertEq(uint8(tierGate.getUserTier(user1)), uint8(TierGate.Tier.NONE));
        
        // User with less than bronze threshold
        vm.prank(owner);
        cipher.transfer(user1, 99_999 * 10**18);
        
        assertEq(uint8(tierGate.getUserTier(user1)), uint8(TierGate.Tier.NONE));
    }

    function test_Tier_Bronze() public {
        vm.prank(owner);
        cipher.transfer(user1, BRONZE);
        
        assertEq(uint8(tierGate.getUserTier(user1)), uint8(TierGate.Tier.BRONZE));
        assertEq(tierGate.getTierName(TierGate.Tier.BRONZE), "Bronze");
    }

    function test_Tier_Gold() public {
        vm.prank(owner);
        cipher.transfer(user1, GOLD);
        
        assertEq(uint8(tierGate.getUserTier(user1)), uint8(TierGate.Tier.GOLD));
        assertEq(tierGate.getTierName(TierGate.Tier.GOLD), "Gold");
    }

    function test_Tier_Diamond() public {
        vm.prank(owner);
        cipher.transfer(user1, DIAMOND);
        
        assertEq(uint8(tierGate.getUserTier(user1)), uint8(TierGate.Tier.DIAMOND));
        assertEq(tierGate.getTierName(TierGate.Tier.DIAMOND), "Diamond");
    }

    function test_Tier_ExactThresholds() public {
        vm.startPrank(owner);
        cipher.transfer(user1, BRONZE);
        cipher.transfer(user2, GOLD);
        cipher.transfer(user3, DIAMOND);
        vm.stopPrank();
        
        assertEq(uint8(tierGate.getUserTier(user1)), uint8(TierGate.Tier.BRONZE));
        assertEq(uint8(tierGate.getUserTier(user2)), uint8(TierGate.Tier.GOLD));
        assertEq(uint8(tierGate.getUserTier(user3)), uint8(TierGate.Tier.DIAMOND));
    }

    // ============ Access Level Tests ============

    function test_AccessLevel_None() public {
        (TierGate.Tier tier, bool hasIndicator, uint256 strategyCount) = 
            tierGate.getAccessLevel(user1);
        
        assertEq(uint8(tier), uint8(TierGate.Tier.NONE));
        assertEq(hasIndicator, false);
        assertEq(strategyCount, 0);
    }

    function test_AccessLevel_Bronze() public {
        vm.prank(owner);
        cipher.transfer(user1, BRONZE);
        
        (TierGate.Tier tier, bool hasIndicator, uint256 strategyCount) = 
            tierGate.getAccessLevel(user1);
        
        assertEq(uint8(tier), uint8(TierGate.Tier.BRONZE));
        assertEq(hasIndicator, true);  // Indicator access
        assertEq(strategyCount, 0);    // No strategies
    }

    function test_AccessLevel_Gold() public {
        vm.prank(owner);
        cipher.transfer(user1, GOLD);
        
        (TierGate.Tier tier, bool hasIndicator, uint256 strategyCount) = 
            tierGate.getAccessLevel(user1);
        
        assertEq(uint8(tier), uint8(TierGate.Tier.GOLD));
        assertEq(hasIndicator, true);  // Indicator access
        assertEq(strategyCount, 1);    // 1 strategy
    }

    function test_AccessLevel_Diamond() public {
        vm.prank(owner);
        cipher.transfer(user1, DIAMOND);
        
        (TierGate.Tier tier, bool hasIndicator, uint256 strategyCount) = 
            tierGate.getAccessLevel(user1);
        
        assertEq(uint8(tier), uint8(TierGate.Tier.DIAMOND));
        assertEq(hasIndicator, true);  // Indicator access
        assertEq(strategyCount, 4);    // All 4 strategies
    }

    // ============ Strategy Access Tests ============

    function test_StrategyAccess_None() public {
        (bool indicator, bool oneStrategy, bool allStrategies) = 
            tierGate.getStrategyAccess(user1);
        
        assertEq(indicator, false);
        assertEq(oneStrategy, false);
        assertEq(allStrategies, false);
    }

    function test_StrategyAccess_Bronze() public {
        vm.prank(owner);
        cipher.transfer(user1, BRONZE);
        
        (bool indicator, bool oneStrategy, bool allStrategies) = 
            tierGate.getStrategyAccess(user1);
        
        assertEq(indicator, true);
        assertEq(oneStrategy, false);
        assertEq(allStrategies, false);
    }

    function test_StrategyAccess_Gold() public {
        vm.prank(owner);
        cipher.transfer(user1, GOLD);
        
        (bool indicator, bool oneStrategy, bool allStrategies) = 
            tierGate.getStrategyAccess(user1);
        
        assertEq(indicator, true);
        assertEq(oneStrategy, true);
        assertEq(allStrategies, false);
    }

    function test_StrategyAccess_Diamond() public {
        vm.prank(owner);
        cipher.transfer(user1, DIAMOND);
        
        (bool indicator, bool oneStrategy, bool allStrategies) = 
            tierGate.getStrategyAccess(user1);
        
        assertEq(indicator, true);
        assertEq(oneStrategy, true);
        assertEq(allStrategies, true);
    }

    // ============ Tokens to Next Tier Tests ============

    function test_TokensToNextTier_FromNone() public {
        (uint256 needed, TierGate.Tier next) = tierGate.getTokensToNextTier(user1);
        
        assertEq(needed, BRONZE);
        assertEq(uint8(next), uint8(TierGate.Tier.BRONZE));
    }

    function test_TokensToNextTier_FromBronze() public {
        vm.prank(owner);
        cipher.transfer(user1, BRONZE);
        
        (uint256 needed, TierGate.Tier next) = tierGate.getTokensToNextTier(user1);
        
        assertEq(needed, GOLD - BRONZE);
        assertEq(uint8(next), uint8(TierGate.Tier.GOLD));
    }

    function test_TokensToNextTier_FromGold() public {
        vm.prank(owner);
        cipher.transfer(user1, GOLD);
        
        (uint256 needed, TierGate.Tier next) = tierGate.getTokensToNextTier(user1);
        
        assertEq(needed, DIAMOND - GOLD);
        assertEq(uint8(next), uint8(TierGate.Tier.DIAMOND));
    }

    function test_TokensToNextTier_FromDiamond() public {
        vm.prank(owner);
        cipher.transfer(user1, DIAMOND);
        
        (uint256 needed, TierGate.Tier next) = tierGate.getTokensToNextTier(user1);
        
        assertEq(needed, 0);
        assertEq(uint8(next), uint8(TierGate.Tier.DIAMOND));
    }

    // ============ Meets Requirement Tests ============

    function test_MeetsRequirement() public {
        vm.prank(owner);
        cipher.transfer(user1, GOLD);
        
        assertEq(tierGate.meetsRequirement(user1, TierGate.Tier.NONE), true);
        assertEq(tierGate.meetsRequirement(user1, TierGate.Tier.BRONZE), true);
        assertEq(tierGate.meetsRequirement(user1, TierGate.Tier.GOLD), true);
        assertEq(tierGate.meetsRequirement(user1, TierGate.Tier.DIAMOND), false);
    }

    // ============ Admin Tests ============

    function test_SetThresholds() public {
        uint256 newBronze = 50_000 * 10**18;
        uint256 newGold = 250_000 * 10**18;
        uint256 newDiamond = 1_000_000 * 10**18;
        
        vm.prank(owner);
        tierGate.setThresholds(newBronze, newGold, newDiamond);
        
        (uint256 bronze, uint256 gold, uint256 diamond) = tierGate.getThresholds();
        
        assertEq(bronze, newBronze);
        assertEq(gold, newGold);
        assertEq(diamond, newDiamond);
    }

    function test_SetThresholds_RevertInvalidOrder() public {
        vm.prank(owner);
        vm.expectRevert(TierGate.InvalidThresholds.selector);
        tierGate.setThresholds(GOLD, BRONZE, DIAMOND); // bronze > gold
        
        vm.prank(owner);
        vm.expectRevert(TierGate.InvalidThresholds.selector);
        tierGate.setThresholds(BRONZE, DIAMOND, GOLD); // gold > diamond
    }

    function test_SetThresholds_RevertNotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        tierGate.setThresholds(BRONZE, GOLD, DIAMOND);
    }

    // ============ Fuzz Tests ============

    function testFuzz_TierCorrect(uint256 balance) public {
        vm.assume(balance <= 10_000_000 * 10**18); // Cap at 10M tokens
        
        vm.prank(owner);
        cipher.transfer(user1, balance);
        
        TierGate.Tier tier = tierGate.getUserTier(user1);
        
        if (balance >= DIAMOND) {
            assertEq(uint8(tier), uint8(TierGate.Tier.DIAMOND));
        } else if (balance >= GOLD) {
            assertEq(uint8(tier), uint8(TierGate.Tier.GOLD));
        } else if (balance >= BRONZE) {
            assertEq(uint8(tier), uint8(TierGate.Tier.BRONZE));
        } else {
            assertEq(uint8(tier), uint8(TierGate.Tier.NONE));
        }
    }
}
