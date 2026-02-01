// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockCipher
 * @notice Mock ERC20 token for testing (simulates $CIPHER from Virtuals)
 */
contract MockCipher is ERC20 {
    constructor() ERC20("Cipher Token", "CIPHER") {
        // Mint 1 billion tokens (like Virtuals does)
        _mint(msg.sender, 1_000_000_000 * 10**18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
