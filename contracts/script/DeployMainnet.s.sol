// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/BotNFT.sol";

contract DeployMainnet is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy BotNFT with ETH mint
        // Constructor: treasury, mintPriceETH, initialOwner
        BotNFT botNFT = new BotNFT(
            deployer,                    // treasury = deployer wallet
            0.1 ether,                   // 0.1 ETH mint price
            deployer                     // owner = deployer
        );

        console.log("BotNFT deployed at:", address(botNFT));

        vm.stopBroadcast();
    }
}
