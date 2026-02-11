// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/BotNFT.sol";

contract MintReserved is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        BotNFT nft = BotNFT(payable(0x743EBDfcED2dBA082E282689c35D5c0E173C7728));

        console.log("Minting 4 reserved bots to:", deployer);
        console.log("Current supply:", nft.totalSupply());

        vm.startBroadcast(deployerPrivateKey);

        // Token #0: Technical Tina (FVG+IFVG) — Cipher Bot #13 Code Screamer
        nft.ownerMint(
            deployer,
            BotNFT.Strategy.FVG_IFVG,
            "ipfs://QmZq54KvNQTBxDJnLURPu9J9z9puYAqjv5zuU3oLfkjahH",
            "Technical Tina"
        );
        console.log("Minted #0: Technical Tina (FVG+IFVG)");

        // Token #1: Diamond Hands Danny (OTE Silver Bullet) — Cipher Bot #01 Neon Stalker
        nft.ownerMint(
            deployer,
            BotNFT.Strategy.OTE_SILVER_BULLET,
            "ipfs://Qman9ZkeTKHKg4em9jUwTRYPRJtuSiXFW8BKCwvLzfKi5f",
            "Diamond Hands Danny"
        );
        console.log("Minted #1: Diamond Hands Danny (OTE Silver Bullet)");

        // Token #2: Algo Annie (OTE Refined) — Cipher Bot #05 Rekt Reaper
        nft.ownerMint(
            deployer,
            BotNFT.Strategy.OTE_REFINED_LOW_RISK,
            "ipfs://QmNsLMETF8zdG1TSyfHnh9nB62MdJD7GJmaTdq6AFGmPUM",
            "Algo Annie"
        );
        console.log("Minted #2: Algo Annie (OTE Refined Low Risk)");

        // Token #3: Moon Mission Mike (OTE Silver Bullet 300K) — Cipher Bot #08 Signal Sage
        nft.ownerMint(
            deployer,
            BotNFT.Strategy.OTE_SILVER_BULLET,
            "ipfs://QmX7oSj41b4SwrVrwhULHWtvvfEdK5UwnxAJ8r2qbN1w4b",
            "Moon Mission Mike"
        );
        console.log("Minted #3: Moon Mission Mike (OTE Silver Bullet)");

        vm.stopBroadcast();

        console.log("Total supply after mint:", nft.totalSupply());
        console.log("Remaining:", nft.remainingSupply());
    }
}
