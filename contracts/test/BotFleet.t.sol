// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {BotFleet} from "../src/BotFleet.sol";
import {BotNFT} from "../src/BotNFT.sol";
import {MockCipher} from "./mocks/MockCipher.sol";

contract BotFleetTest is Test {
    BotFleet public fleet;
    BotNFT public nft;
    MockCipher public cipher;
    
    address public owner = address(1);
    address public treasury = address(2);
    address public fuelManager = address(3);
    address public user1 = address(4);
    address public user2 = address(5);
    
    uint256 public constant MINT_PRICE = 300 * 10**18;

    function setUp() public {
        vm.startPrank(owner);
        
        cipher = new MockCipher();
        nft = new BotNFT(address(cipher), treasury, MINT_PRICE, owner);
        fleet = new BotFleet(address(nft), owner);
        fleet.setFuelManager(fuelManager);
        
        // Give users CIPHER and mint NFTs
        cipher.transfer(user1, 10_000 * 10**18);
        cipher.transfer(user2, 10_000 * 10**18);
        vm.stopPrank();
        
        // User1 mints NFT
        vm.startPrank(user1);
        cipher.approve(address(nft), MINT_PRICE);
        nft.mint(BotNFT.Strategy.OTE_SILVER_BULLET, "uri1");
        vm.stopPrank();
        
        // User2 mints NFT
        vm.startPrank(user2);
        cipher.approve(address(nft), MINT_PRICE);
        nft.mint(BotNFT.Strategy.FVG_IFVG, "uri2");
        vm.stopPrank();
    }

    // ============ Activation Tests ============

    function test_ActivateSlot() public {
        vm.prank(fuelManager);
        fleet.activateSlot(0);
        
        assertEq(uint8(fleet.getSlotStatus(0)), uint8(BotFleet.SlotStatus.ACTIVE));
        assertEq(fleet.activeSlotCount(), 1);
    }

    function test_ActivateSlot_RevertNotFuelManager() public {
        vm.prank(user1);
        vm.expectRevert(BotFleet.OnlyFuelManager.selector);
        fleet.activateSlot(0);
    }

    function test_ActivateSlot_RevertAlreadyActive() public {
        vm.prank(fuelManager);
        fleet.activateSlot(0);
        
        vm.prank(fuelManager);
        vm.expectRevert(BotFleet.SlotAlreadyActive.selector);
        fleet.activateSlot(0);
    }

    function test_ActivateSlot_MaxSlots() public {
        // Already minted 2 in setup, mint 18 more
        for (uint256 i = 2; i < 20; i++) {
            address minter = address(uint160(100 + i));
            vm.startPrank(owner);
            cipher.transfer(minter, MINT_PRICE);
            vm.stopPrank();
            
            vm.startPrank(minter);
            cipher.approve(address(nft), MINT_PRICE);
            nft.mint(BotNFT.Strategy.OTE_SILVER_BULLET, "uri");
            vm.stopPrank();
        }
        
        // Activate all 20 slots
        for (uint256 i = 0; i < 20; i++) {
            vm.prank(fuelManager);
            fleet.activateSlot(i);
        }
        
        assertEq(fleet.activeSlotCount(), 20);
    }

    // ============ Deactivation Tests ============

    function test_DeactivateSlot() public {
        vm.prank(fuelManager);
        fleet.activateSlot(0);
        
        vm.prank(user1);
        fleet.deactivateSlot(0);
        
        assertEq(uint8(fleet.getSlotStatus(0)), uint8(BotFleet.SlotStatus.INACTIVE));
        assertEq(fleet.activeSlotCount(), 0);
    }

    function test_DeactivateSlot_RevertNotOwner() public {
        vm.prank(fuelManager);
        fleet.activateSlot(0);
        
        vm.prank(user2);
        vm.expectRevert(BotFleet.NotNFTOwner.selector);
        fleet.deactivateSlot(0);
    }

    // ============ Grace Period Tests ============

    function test_StartGracePeriod() public {
        vm.prank(fuelManager);
        fleet.activateSlot(0);
        
        vm.prank(fuelManager);
        fleet.startGracePeriod(0);
        
        assertTrue(fleet.isInGracePeriod(0));
    }

    function test_BreakSlot_AfterGrace() public {
        vm.prank(fuelManager);
        fleet.activateSlot(0);
        
        vm.prank(fuelManager);
        fleet.startGracePeriod(0);
        
        // Warp past grace period
        vm.warp(block.timestamp + 8 days);
        
        fleet.breakSlot(0);
        
        assertEq(uint8(fleet.getSlotStatus(0)), uint8(BotFleet.SlotStatus.BROKEN));
        assertEq(fleet.activeSlotCount(), 0);
    }

    function test_BreakSlot_RevertGraceNotExpired() public {
        vm.prank(fuelManager);
        fleet.activateSlot(0);
        
        vm.prank(fuelManager);
        fleet.startGracePeriod(0);
        
        // Try to break before grace expires
        vm.warp(block.timestamp + 5 days);
        
        vm.expectRevert(BotFleet.GracePeriodNotExpired.selector);
        fleet.breakSlot(0);
    }

    // ============ Queue Tests ============

    function test_JoinQueue() public {
        // Use tokenId 1 (user2's NFT) to avoid tokenId 0 edge case
        vm.prank(user2);
        fleet.joinQueue(1);
        
        assertEq(uint8(fleet.getSlotStatus(1)), uint8(BotFleet.SlotStatus.WAITING));
        assertEq(fleet.getQueueLength(), 1);
    }

    function test_JoinQueue_RevertAlreadyActive() public {
        vm.prank(fuelManager);
        fleet.activateSlot(0);
        
        vm.prank(user1);
        vm.expectRevert(BotFleet.SlotAlreadyActive.selector);
        fleet.joinQueue(0);
    }

    function test_LeaveQueue() public {
        vm.prank(user1);
        fleet.joinQueue(0);
        
        vm.prank(user1);
        fleet.leaveQueue(0);
        
        assertEq(uint8(fleet.getSlotStatus(0)), uint8(BotFleet.SlotStatus.INACTIVE));
        assertEq(fleet.getQueueLength(), 0);
    }

    function test_QueuePosition() public {
        // Mint a third NFT to test with non-zero tokenIds
        vm.startPrank(owner);
        cipher.transfer(user1, MINT_PRICE);
        vm.stopPrank();
        
        vm.startPrank(user1);
        cipher.approve(address(nft), MINT_PRICE);
        nft.mint(BotNFT.Strategy.OTE_REFINED_HIGH_RISK, "uri3");
        vm.stopPrank();
        
        // Join queue with tokenId 1 and 2 (avoiding 0)
        vm.prank(user2);
        fleet.joinQueue(1);
        
        vm.prank(user1);
        fleet.joinQueue(2);
        
        assertEq(fleet.getQueuePosition(1), 1);
        assertEq(fleet.getQueuePosition(2), 2);
    }

    // ============ View Tests ============

    function test_GetSlotDetails() public {
        vm.prank(fuelManager);
        fleet.activateSlot(0);
        
        (
            BotFleet.SlotStatus status,
            uint40 activatedAt,
            uint40 fuelPaidUntil,
            uint40 graceEndsAt,
            uint256 queuePosition
        ) = fleet.getSlotDetails(0);
        
        assertEq(uint8(status), uint8(BotFleet.SlotStatus.ACTIVE));
        assertGt(activatedAt, 0);
        assertEq(fuelPaidUntil, 0);
        assertEq(graceEndsAt, 0);
        assertEq(queuePosition, 0);
    }

    function test_GetFleetStats() public {
        vm.prank(fuelManager);
        fleet.activateSlot(0);
        
        (uint256 active, uint256 broken, uint256 waiting, uint256 available) = fleet.getFleetStats();
        
        assertEq(active, 1);
        assertEq(broken, 0);
        assertEq(waiting, 0);
        assertEq(available, 19);
    }

    // ============ Admin Tests ============

    function test_SetFuelManager() public {
        address newManager = address(99);
        
        vm.prank(owner);
        fleet.setFuelManager(newManager);
        
        assertEq(fleet.fuelManager(), newManager);
    }

    function test_Pause() public {
        vm.prank(owner);
        fleet.pause();
        
        vm.prank(fuelManager);
        vm.expectRevert();
        fleet.activateSlot(0);
    }
}
