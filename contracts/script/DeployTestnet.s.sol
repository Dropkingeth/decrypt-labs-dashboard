// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {BotNFT} from "../src/BotNFT.sol";
import {BotFleet} from "../src/BotFleet.sol";
import {FuelManager} from "../src/FuelManager.sol";
import {RewardsDistributor} from "../src/RewardsDistributor.sol";
import {TierGate} from "../src/TierGate.sol";
import {MockCipher} from "../test/mocks/MockCipher.sol";

/**
 * @title DeployTestnet
 * @notice Testnet deployment with mock CIPHER token
 * @dev Run with: forge script script/DeployTestnet.s.sol --rpc-url base-sepolia --broadcast
 * 
 * This deploys a mock CIPHER token for testing purposes.
 * For mainnet, use Deploy.s.sol with the real Virtuals-deployed CIPHER token.
 */
contract DeployTestnetScript is Script {
    // Contracts
    MockCipher public mockCipher;
    BotNFT public botNFT;
    BotFleet public botFleet;
    FuelManager public fuelManager;
    RewardsDistributor public rewardsDistributor;
    TierGate public tierGate;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address treasury = vm.envOr("TREASURY", deployer);
        
        // Prices (using smaller amounts for testnet)
        uint256 mintPrice = 300 * 10**18;      // 300 tokens
        uint256 fuelPrice = 175 * 10**18;      // 175 tokens/month
        uint256 minClaim = 10 * 10**18;        // 10 tokens min claim
        
        // Tier thresholds
        uint256 bronzeThreshold = 100_000 * 10**18;
        uint256 goldThreshold = 500_000 * 10**18;
        uint256 diamondThreshold = 1_300_000 * 10**18;

        console.log("=== Decrypt Labs TESTNET Deployment ===");
        console.log("Deployer:", deployer);
        console.log("Treasury:", treasury);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Mock CIPHER Token
        console.log("1. Deploying MockCipher token...");
        mockCipher = new MockCipher();
        console.log("   MockCipher deployed at:", address(mockCipher));
        console.log("   Total supply: 1,000,000,000 CIPHER");

        // 2. Deploy BotNFT
        console.log("\n2. Deploying BotNFT...");
        botNFT = new BotNFT(
            address(mockCipher),
            treasury,
            mintPrice,
            deployer
        );
        console.log("   BotNFT deployed at:", address(botNFT));

        // 3. Deploy BotFleet
        console.log("\n3. Deploying BotFleet...");
        botFleet = new BotFleet(
            address(botNFT),
            deployer
        );
        console.log("   BotFleet deployed at:", address(botFleet));

        // 4. Deploy FuelManager
        console.log("\n4. Deploying FuelManager...");
        fuelManager = new FuelManager(
            address(mockCipher),
            address(botNFT),
            treasury,
            fuelPrice,
            deployer
        );
        console.log("   FuelManager deployed at:", address(fuelManager));

        // 5. Deploy RewardsDistributor
        console.log("\n5. Deploying RewardsDistributor...");
        rewardsDistributor = new RewardsDistributor(
            address(mockCipher),
            address(botNFT),
            treasury,
            minClaim,
            deployer
        );
        console.log("   RewardsDistributor deployed at:", address(rewardsDistributor));

        // 6. Deploy TierGate
        console.log("\n6. Deploying TierGate...");
        tierGate = new TierGate(
            address(mockCipher),
            bronzeThreshold,
            goldThreshold,
            diamondThreshold,
            deployer
        );
        console.log("   TierGate deployed at:", address(tierGate));

        // 7. Configure cross-references
        console.log("\n7. Configuring contracts...");
        botFleet.setFuelManager(address(fuelManager));
        fuelManager.setBotFleet(address(botFleet));
        console.log("   BotFleet <-> FuelManager linked");

        vm.stopBroadcast();

        // Print summary
        console.log("\n========================================");
        console.log("=== TESTNET Deployment Complete ===");
        console.log("========================================");
        console.log("");
        console.log("MockCipher:        ", address(mockCipher));
        console.log("BotNFT:            ", address(botNFT));
        console.log("BotFleet:          ", address(botFleet));
        console.log("FuelManager:       ", address(fuelManager));
        console.log("RewardsDistributor:", address(rewardsDistributor));
        console.log("TierGate:          ", address(tierGate));
        console.log("");
        console.log("=== Test Instructions ===");
        console.log("1. MockCipher has 1B tokens minted to deployer");
        console.log("2. Transfer tokens to test wallets");
        console.log("3. Approve BotNFT to spend CIPHER for minting");
        console.log("4. Call botNFT.mint() with strategy and URI");
        console.log("");
        console.log("Mint price:", mintPrice / 10**18, "CIPHER");
        console.log("Fuel price:", fuelPrice / 10**18, "CIPHER/month");
    }
}
