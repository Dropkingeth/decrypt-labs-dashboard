// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {BotNFT} from "../src/BotNFT.sol";
import {MockCipher} from "./mocks/MockCipher.sol";

contract BotNFTTest is Test {
    BotNFT public nft;
    MockCipher public cipher;
    
    address public owner = address(1);
    address public treasury = address(2);
    address public user1 = address(3);
    address public user2 = address(4);
    
    uint256 public constant MINT_PRICE = 300 * 10**18; // $300 worth of CIPHER
    
    event BotMinted(uint256 indexed tokenId, address indexed owner, BotNFT.Strategy strategy);
    event StrategyChanged(uint256 indexed tokenId, BotNFT.Strategy oldStrategy, BotNFT.Strategy newStrategy);

    function setUp() public {
        vm.startPrank(owner);
        
        cipher = new MockCipher();
        nft = new BotNFT(
            address(cipher),
            treasury,
            MINT_PRICE,
            owner
        );
        
        // Give users some CIPHER
        cipher.transfer(user1, 10_000 * 10**18);
        cipher.transfer(user2, 10_000 * 10**18);
        
        vm.stopPrank();
    }

    // ============ Minting Tests ============

    function test_Mint_Success() public {
        vm.startPrank(user1);
        cipher.approve(address(nft), MINT_PRICE);
        
        vm.expectEmit(true, true, false, true);
        emit BotMinted(0, user1, BotNFT.Strategy.OTE_SILVER_BULLET);
        
        uint256 tokenId = nft.mint(BotNFT.Strategy.OTE_SILVER_BULLET, "ipfs://metadata1");
        vm.stopPrank();
        
        assertEq(tokenId, 0);
        assertEq(nft.ownerOf(0), user1);
        assertEq(nft.totalSupply(), 1);
        assertEq(nft.remainingSupply(), 19);
        assertEq(uint8(nft.getStrategy(0)), uint8(BotNFT.Strategy.OTE_SILVER_BULLET));
    }

    function test_Mint_AllStrategies() public {
        vm.startPrank(user1);
        cipher.approve(address(nft), MINT_PRICE * 4);
        
        nft.mint(BotNFT.Strategy.OTE_SILVER_BULLET, "uri1");
        nft.mint(BotNFT.Strategy.FVG_IFVG, "uri2");
        nft.mint(BotNFT.Strategy.OTE_REFINED_HIGH_RISK, "uri3");
        nft.mint(BotNFT.Strategy.OTE_REFINED_LOW_RISK, "uri4");
        vm.stopPrank();
        
        assertEq(uint8(nft.getStrategy(0)), 0); // OTE_SILVER_BULLET
        assertEq(uint8(nft.getStrategy(1)), 1); // FVG_IFVG
        assertEq(uint8(nft.getStrategy(2)), 2); // OTE_REFINED_HIGH_RISK
        assertEq(uint8(nft.getStrategy(3)), 3); // OTE_REFINED_LOW_RISK
    }

    function test_Mint_TransfersCipherToTreasury() public {
        uint256 treasuryBefore = cipher.balanceOf(treasury);
        
        vm.startPrank(user1);
        cipher.approve(address(nft), MINT_PRICE);
        nft.mint(BotNFT.Strategy.OTE_SILVER_BULLET, "uri");
        vm.stopPrank();
        
        assertEq(cipher.balanceOf(treasury), treasuryBefore + MINT_PRICE);
    }

    function test_Mint_MaxSupply() public {
        // Mint all 20
        for (uint256 i = 0; i < 20; i++) {
            address minter = address(uint160(100 + i));
            vm.startPrank(owner);
            cipher.transfer(minter, MINT_PRICE);
            vm.stopPrank();
            
            vm.startPrank(minter);
            cipher.approve(address(nft), MINT_PRICE);
            nft.mint(BotNFT.Strategy.OTE_SILVER_BULLET, "uri");
            vm.stopPrank();
        }
        
        assertEq(nft.totalSupply(), 20);
        assertEq(nft.remainingSupply(), 0);
        
        // 21st mint should fail
        vm.startPrank(user1);
        cipher.approve(address(nft), MINT_PRICE);
        vm.expectRevert(BotNFT.MaxSupplyReached.selector);
        nft.mint(BotNFT.Strategy.OTE_SILVER_BULLET, "uri");
        vm.stopPrank();
    }

    function test_Mint_RevertOnPause() public {
        vm.prank(owner);
        nft.pause();
        
        vm.startPrank(user1);
        cipher.approve(address(nft), MINT_PRICE);
        vm.expectRevert();
        nft.mint(BotNFT.Strategy.OTE_SILVER_BULLET, "uri");
        vm.stopPrank();
    }

    // ============ Strategy Change Tests ============

    function test_ChangeStrategy_Success() public {
        // Mint first
        vm.startPrank(user1);
        cipher.approve(address(nft), MINT_PRICE);
        uint256 tokenId = nft.mint(BotNFT.Strategy.OTE_SILVER_BULLET, "uri");
        vm.stopPrank();
        
        // Warp 30 days
        vm.warp(block.timestamp + 30 days);
        
        vm.startPrank(user1);
        vm.expectEmit(true, false, false, true);
        emit StrategyChanged(tokenId, BotNFT.Strategy.OTE_SILVER_BULLET, BotNFT.Strategy.FVG_IFVG);
        
        nft.changeStrategy(tokenId, BotNFT.Strategy.FVG_IFVG);
        vm.stopPrank();
        
        assertEq(uint8(nft.getStrategy(tokenId)), uint8(BotNFT.Strategy.FVG_IFVG));
    }

    function test_ChangeStrategy_RevertBeforeCooldown() public {
        vm.startPrank(user1);
        cipher.approve(address(nft), MINT_PRICE);
        uint256 tokenId = nft.mint(BotNFT.Strategy.OTE_SILVER_BULLET, "uri");
        
        // Try to change immediately
        vm.expectRevert(BotNFT.StrategyChangeCooldown.selector);
        nft.changeStrategy(tokenId, BotNFT.Strategy.FVG_IFVG);
        
        // Try after 29 days
        vm.warp(block.timestamp + 29 days);
        vm.expectRevert(BotNFT.StrategyChangeCooldown.selector);
        nft.changeStrategy(tokenId, BotNFT.Strategy.FVG_IFVG);
        vm.stopPrank();
    }

    function test_ChangeStrategy_RevertNotOwner() public {
        vm.startPrank(user1);
        cipher.approve(address(nft), MINT_PRICE);
        uint256 tokenId = nft.mint(BotNFT.Strategy.OTE_SILVER_BULLET, "uri");
        vm.stopPrank();
        
        vm.warp(block.timestamp + 30 days);
        
        vm.prank(user2);
        vm.expectRevert(BotNFT.NotTokenOwner.selector);
        nft.changeStrategy(tokenId, BotNFT.Strategy.FVG_IFVG);
    }

    // ============ View Function Tests ============

    function test_GetStrategyName() public view {
        assertEq(nft.getStrategyName(BotNFT.Strategy.OTE_SILVER_BULLET), "OTE Silver Bullet");
        assertEq(nft.getStrategyName(BotNFT.Strategy.FVG_IFVG), "FVG+IFVG");
        assertEq(nft.getStrategyName(BotNFT.Strategy.OTE_REFINED_HIGH_RISK), "OTE Refined (High Risk)");
        assertEq(nft.getStrategyName(BotNFT.Strategy.OTE_REFINED_LOW_RISK), "OTE Refined (Low Risk)");
    }

    function test_CanChangeStrategy() public {
        vm.startPrank(user1);
        cipher.approve(address(nft), MINT_PRICE);
        uint256 tokenId = nft.mint(BotNFT.Strategy.OTE_SILVER_BULLET, "uri");
        vm.stopPrank();
        
        assertEq(nft.canChangeStrategy(tokenId), false);
        
        vm.warp(block.timestamp + 30 days);
        assertEq(nft.canChangeStrategy(tokenId), true);
    }

    // ============ Admin Tests ============

    function test_SetMintPrice() public {
        uint256 newPrice = 500 * 10**18;
        
        vm.prank(owner);
        nft.setMintPrice(newPrice);
        
        assertEq(nft.mintPriceInCipher(), newPrice);
    }

    function test_SetMintPrice_RevertNotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        nft.setMintPrice(500 * 10**18);
    }

    function test_SetTreasury() public {
        address newTreasury = address(99);
        
        vm.prank(owner);
        nft.setTreasury(newTreasury);
        
        assertEq(nft.treasury(), newTreasury);
    }

    function test_EmergencyWithdraw() public {
        // Send some tokens to contract accidentally
        vm.prank(owner);
        cipher.transfer(address(nft), 1000 * 10**18);
        
        uint256 treasuryBefore = cipher.balanceOf(treasury);
        
        vm.prank(owner);
        nft.emergencyWithdraw(address(cipher));
        
        assertEq(cipher.balanceOf(treasury), treasuryBefore + 1000 * 10**18);
        assertEq(cipher.balanceOf(address(nft)), 0);
    }

    // ============ Fuzz Tests ============

    function testFuzz_Mint_ValidStrategy(uint8 strategyId) public {
        vm.assume(strategyId <= 3);
        
        vm.startPrank(user1);
        cipher.approve(address(nft), MINT_PRICE);
        nft.mint(BotNFT.Strategy(strategyId), "uri");
        vm.stopPrank();
        
        assertEq(uint8(nft.getStrategy(0)), strategyId);
    }
}
