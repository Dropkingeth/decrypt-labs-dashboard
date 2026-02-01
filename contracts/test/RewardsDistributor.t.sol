// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {RewardsDistributor} from "../src/RewardsDistributor.sol";
import {BotNFT} from "../src/BotNFT.sol";
import {MockCipher} from "./mocks/MockCipher.sol";

contract RewardsDistributorTest is Test {
    RewardsDistributor public rewards;
    BotNFT public nft;
    MockCipher public cipher;
    
    address public owner = address(1);
    address public treasury = address(2);
    address public depositor = address(3);
    address public user1 = address(4);
    
    uint256 public constant MINT_PRICE = 300 * 10**18;
    uint256 public constant MIN_CLAIM = 10 * 10**18; // $10

    function setUp() public {
        vm.startPrank(owner);
        
        cipher = new MockCipher();
        nft = new BotNFT(address(cipher), treasury, MINT_PRICE, owner);
        rewards = new RewardsDistributor(
            address(cipher),
            address(nft),
            treasury,
            MIN_CLAIM,
            owner
        );
        
        rewards.setRewardDepositor(depositor);
        
        // Give users and depositor CIPHER
        cipher.transfer(user1, 10_000 * 10**18);
        cipher.transfer(depositor, 100_000 * 10**18);
        vm.stopPrank();
        
        // User1 mints NFT
        vm.startPrank(user1);
        cipher.approve(address(nft), MINT_PRICE);
        nft.mint(BotNFT.Strategy.OTE_SILVER_BULLET, "uri1");
        vm.stopPrank();
    }

    // ============ Deposit Tests ============

    function test_DepositReward() public {
        uint256 rewardAmount = 1000 * 10**18;
        
        vm.startPrank(depositor);
        cipher.approve(address(rewards), rewardAmount);
        rewards.depositReward(0, rewardAmount);
        vm.stopPrank();
        
        // 80% to holder, 20% to treasury
        uint256 holderShare = (rewardAmount * 80) / 100;
        uint256 opsShare = rewardAmount - holderShare;
        
        (uint256 available, uint256 totalEarned, ) = rewards.getRewardBalance(0);
        assertEq(available, holderShare);
        assertEq(totalEarned, holderShare);
        
        // Check treasury received ops share
        assertGt(cipher.balanceOf(treasury), opsShare);
    }

    function test_DepositReward_Split() public {
        uint256 rewardAmount = 100 * 10**18;
        
        uint256 treasuryBefore = cipher.balanceOf(treasury);
        
        vm.startPrank(depositor);
        cipher.approve(address(rewards), rewardAmount);
        rewards.depositReward(0, rewardAmount);
        vm.stopPrank();
        
        // 80% = 80 tokens to holder
        // 20% = 20 tokens to treasury
        uint256 expectedHolder = 80 * 10**18;
        uint256 expectedOps = 20 * 10**18;
        
        (uint256 available, , ) = rewards.getRewardBalance(0);
        assertEq(available, expectedHolder);
        assertEq(cipher.balanceOf(treasury) - treasuryBefore, expectedOps);
    }

    function test_DepositReward_RevertNotDepositor() public {
        vm.startPrank(user1);
        cipher.approve(address(rewards), 100 * 10**18);
        vm.expectRevert(RewardsDistributor.OnlyRewardDepositor.selector);
        rewards.depositReward(0, 100 * 10**18);
        vm.stopPrank();
    }

    function test_DepositReward_RevertZeroAmount() public {
        vm.prank(depositor);
        vm.expectRevert(RewardsDistributor.ZeroAmount.selector);
        rewards.depositReward(0, 0);
    }

    // ============ Bulk Deposit Tests ============

    function test_BulkDepositRewards() public {
        // Mint another NFT for user1
        vm.startPrank(user1);
        cipher.approve(address(nft), MINT_PRICE);
        nft.mint(BotNFT.Strategy.FVG_IFVG, "uri2");
        vm.stopPrank();
        
        uint256[] memory tokenIds = new uint256[](2);
        tokenIds[0] = 0;
        tokenIds[1] = 1;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 100 * 10**18;
        amounts[1] = 200 * 10**18;
        
        vm.startPrank(depositor);
        cipher.approve(address(rewards), 300 * 10**18);
        rewards.bulkDepositRewards(tokenIds, amounts);
        vm.stopPrank();
        
        // Token 0: 80% of 100 = 80
        // Token 1: 80% of 200 = 160
        (uint256 available0, , ) = rewards.getRewardBalance(0);
        (uint256 available1, , ) = rewards.getRewardBalance(1);
        
        assertEq(available0, 80 * 10**18);
        assertEq(available1, 160 * 10**18);
    }

    function test_BulkDepositRewards_RevertMismatch() public {
        uint256[] memory tokenIds = new uint256[](2);
        tokenIds[0] = 0;
        tokenIds[1] = 1;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100 * 10**18;
        
        vm.prank(depositor);
        vm.expectRevert(RewardsDistributor.ArrayLengthMismatch.selector);
        rewards.bulkDepositRewards(tokenIds, amounts);
    }

    // ============ Claim Tests ============

    function test_ClaimRewards() public {
        // Deposit reward
        vm.startPrank(depositor);
        cipher.approve(address(rewards), 100 * 10**18);
        rewards.depositReward(0, 100 * 10**18);
        vm.stopPrank();
        
        uint256 userBefore = cipher.balanceOf(user1);
        
        vm.prank(user1);
        rewards.claimRewards(0);
        
        uint256 expectedClaim = 80 * 10**18; // 80%
        assertEq(cipher.balanceOf(user1) - userBefore, expectedClaim);
        
        (uint256 available, , uint256 claimed) = rewards.getRewardBalance(0);
        assertEq(available, 0);
        assertEq(claimed, expectedClaim);
    }

    function test_ClaimRewards_RevertNotOwner() public {
        vm.startPrank(depositor);
        cipher.approve(address(rewards), 100 * 10**18);
        rewards.depositReward(0, 100 * 10**18);
        vm.stopPrank();
        
        vm.prank(address(99));
        vm.expectRevert(RewardsDistributor.NotNFTOwner.selector);
        rewards.claimRewards(0);
    }

    function test_ClaimRewards_RevertBelowMinimum() public {
        // Deposit small reward (below $10 minimum)
        vm.startPrank(depositor);
        cipher.approve(address(rewards), 5 * 10**18);
        rewards.depositReward(0, 5 * 10**18);
        vm.stopPrank();
        
        vm.prank(user1);
        vm.expectRevert(RewardsDistributor.BelowMinimumClaim.selector);
        rewards.claimRewards(0);
    }

    function test_ClaimRewards_RevertNoRewards() public {
        vm.prank(user1);
        vm.expectRevert(RewardsDistributor.NoRewardsAvailable.selector);
        rewards.claimRewards(0);
    }

    // ============ View Tests ============

    function test_CanClaim() public {
        assertFalse(rewards.canClaim(0));
        
        vm.startPrank(depositor);
        cipher.approve(address(rewards), 100 * 10**18);
        rewards.depositReward(0, 100 * 10**18);
        vm.stopPrank();
        
        assertTrue(rewards.canClaim(0));
    }

    function test_GetClaimableAmount() public {
        vm.startPrank(depositor);
        cipher.approve(address(rewards), 100 * 10**18);
        rewards.depositReward(0, 100 * 10**18);
        vm.stopPrank();
        
        assertEq(rewards.getClaimableAmount(0), 80 * 10**18);
    }

    // ============ Admin Tests ============

    function test_SetMinClaim() public {
        uint256 newMin = 20 * 10**18;
        
        vm.prank(owner);
        rewards.setMinClaim(newMin);
        
        assertEq(rewards.minClaimInCipher(), newMin);
    }

    function test_SetRewardDepositor() public {
        address newDepositor = address(88);
        
        vm.prank(owner);
        rewards.setRewardDepositor(newDepositor);
        
        assertEq(rewards.rewardDepositor(), newDepositor);
    }

    function test_Pause() public {
        vm.startPrank(depositor);
        cipher.approve(address(rewards), 100 * 10**18);
        rewards.depositReward(0, 100 * 10**18);
        vm.stopPrank();
        
        vm.prank(owner);
        rewards.pause();
        
        vm.prank(user1);
        vm.expectRevert();
        rewards.claimRewards(0);
    }

    // ============ Fuzz Tests ============

    function testFuzz_DepositSplit(uint256 amount) public {
        // Bound to depositor's balance (100,000 tokens)
        vm.assume(amount > 0 && amount <= 100_000 * 10**18);
        
        uint256 treasuryBefore = cipher.balanceOf(treasury);
        
        vm.startPrank(depositor);
        cipher.approve(address(rewards), amount);
        rewards.depositReward(0, amount);
        vm.stopPrank();
        
        uint256 expectedHolder = (amount * 80) / 100;
        uint256 expectedOps = amount - expectedHolder;
        
        (uint256 available, , ) = rewards.getRewardBalance(0);
        assertEq(available, expectedHolder);
        assertEq(cipher.balanceOf(treasury) - treasuryBefore, expectedOps);
    }
}
