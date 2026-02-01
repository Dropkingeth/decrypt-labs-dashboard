// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {BotNFT} from "../src/BotNFT.sol";
import {BotFleet} from "../src/BotFleet.sol";
import {FuelManager} from "../src/FuelManager.sol";
import {RewardsDistributor} from "../src/RewardsDistributor.sol";
import {TierGate} from "../src/TierGate.sol";

/**
 * @title Deploy
 * @notice Deployment script for Decrypt Labs contracts on Base Sepolia
 * @dev Run with: forge script script/Deploy.s.sol --rpc-url base-sepolia --broadcast
 */
contract DeployScript is Script {
    // Deployment addresses (set after deployment)
    BotNFT public botNFT;
    BotFleet public botFleet;
    FuelManager public fuelManager;
    RewardsDistributor public rewardsDistributor;
    TierGate public tierGate;

    function run() external {
        // Get deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Configuration - UPDATE THESE FOR YOUR DEPLOYMENT
        address cipherToken = vm.envOr("CIPHER_TOKEN", address(0));
        address treasury = vm.envOr("TREASURY", deployer);
        
        // Prices (in wei, assuming 18 decimals)
        // $300 NFT mint, $175 monthly fuel, $10 min claim
        // These are placeholders - adjust based on actual $CIPHER price
        uint256 mintPrice = 300 * 10**18;      // 300 $CIPHER
        uint256 fuelPrice = 175 * 10**18;      // 175 $CIPHER/month
        uint256 minClaim = 10 * 10**18;        // $10 minimum claim
        
        // Tier thresholds
        uint256 bronzeThreshold = 100_000 * 10**18;    // 100k tokens
        uint256 goldThreshold = 500_000 * 10**18;      // 500k tokens
        uint256 diamondThreshold = 1_300_000 * 10**18; // 1.3M tokens

        console.log("=== Decrypt Labs Deployment ===");
        console.log("Deployer:", deployer);
        console.log("CIPHER Token:", cipherToken);
        console.log("Treasury:", treasury);
        
        // Check if CIPHER token is set
        require(cipherToken != address(0), "CIPHER_TOKEN env var not set");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy BotNFT
        console.log("\n1. Deploying BotNFT...");
        botNFT = new BotNFT(
            cipherToken,
            treasury,
            mintPrice,
            deployer
        );
        console.log("   BotNFT deployed at:", address(botNFT));

        // 2. Deploy BotFleet
        console.log("\n2. Deploying BotFleet...");
        botFleet = new BotFleet(
            address(botNFT),
            deployer
        );
        console.log("   BotFleet deployed at:", address(botFleet));

        // 3. Deploy FuelManager
        console.log("\n3. Deploying FuelManager...");
        fuelManager = new FuelManager(
            cipherToken,
            address(botNFT),
            treasury,
            fuelPrice,
            deployer
        );
        console.log("   FuelManager deployed at:", address(fuelManager));

        // 4. Deploy RewardsDistributor
        console.log("\n4. Deploying RewardsDistributor...");
        rewardsDistributor = new RewardsDistributor(
            cipherToken,
            address(botNFT),
            treasury,
            minClaim,
            deployer
        );
        console.log("   RewardsDistributor deployed at:", address(rewardsDistributor));

        // 5. Deploy TierGate
        console.log("\n5. Deploying TierGate...");
        tierGate = new TierGate(
            cipherToken,
            bronzeThreshold,
            goldThreshold,
            diamondThreshold,
            deployer
        );
        console.log("   TierGate deployed at:", address(tierGate));

        // 6. Configure cross-references
        console.log("\n6. Configuring contracts...");
        botFleet.setFuelManager(address(fuelManager));
        fuelManager.setBotFleet(address(botFleet));
        console.log("   BotFleet <-> FuelManager linked");

        vm.stopBroadcast();

        // Print summary
        console.log("\n=== Deployment Complete ===");
        console.log("BotNFT:            ", address(botNFT));
        console.log("BotFleet:          ", address(botFleet));
        console.log("FuelManager:       ", address(fuelManager));
        console.log("RewardsDistributor:", address(rewardsDistributor));
        console.log("TierGate:          ", address(tierGate));
        console.log("\nNext steps:");
        console.log("1. Verify contracts on Basescan");
        console.log("2. Update frontend with contract addresses");
        console.log("3. Test minting flow");
    }
}
