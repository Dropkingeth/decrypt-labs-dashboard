// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IBotFleet {
    function activateSlot(uint256 tokenId) external;
    function updateFuelStatus(uint256 tokenId, uint40 paidUntil) external;
    function startGracePeriod(uint256 tokenId) external;
    function isSlotActive(uint256 tokenId) external view returns (bool);
    function getSlotDetails(uint256 tokenId) external view returns (
        uint8 status,
        uint40 activatedAt,
        uint40 fuelPaidUntil,
        uint40 graceEndsAt,
        uint256 queuePosition
    );
}

/**
 * @title FuelManager
 * @author Decrypt Labs
 * @notice Handles monthly fuel payments for bot slots
 * @dev Fuel = monthly payment to keep bot active (~$150-200 in $CIPHER)
 */
contract FuelManager is Ownable2Step, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ Constants ============
    uint256 public constant FUEL_PERIOD = 30 days;
    uint256 public constant FUEL_PRICE_USD = 175; // ~$175 USD equivalent

    // ============ State Variables ============
    IERC20 public immutable cipherToken;
    IERC721 public immutable botNFT;
    IBotFleet public botFleet;
    address public treasury;
    
    uint256 public fuelPriceInCipher; // Updated based on $CIPHER price

    // ============ Structs ============
    struct FuelStatus {
        uint40 paidUntil;
        uint40 lastPayment;
        uint256 totalPaid; // Lifetime fuel paid by this NFT
    }

    // ============ Mappings ============
    mapping(uint256 tokenId => FuelStatus) public fuelStatus;

    // ============ Events ============
    event FuelPurchased(
        uint256 indexed tokenId, 
        address indexed payer, 
        uint256 amount, 
        uint256 months,
        uint40 paidUntil
    );
    event FuelPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event GracePeriodTriggered(uint256 indexed tokenId);

    // ============ Errors ============
    error NotNFTOwner();
    error InvalidMonths();
    error InvalidAddress();
    error ZeroAmount();
    error SlotNotActive();

    // ============ Constructor ============
    constructor(
        address _cipherToken,
        address _botNFT,
        address _treasury,
        uint256 _initialFuelPrice,
        address _initialOwner
    ) Ownable(_initialOwner) {
        if (_cipherToken == address(0)) revert InvalidAddress();
        if (_botNFT == address(0)) revert InvalidAddress();
        if (_treasury == address(0)) revert InvalidAddress();

        cipherToken = IERC20(_cipherToken);
        botNFT = IERC721(_botNFT);
        treasury = _treasury;
        fuelPriceInCipher = _initialFuelPrice;
    }

    // ============ External Functions ============

    /**
     * @notice Purchase fuel for a bot (1-12 months)
     * @param tokenId The NFT token ID
     * @param months Number of months to purchase (1-12)
     */
    function purchaseFuel(
        uint256 tokenId,
        uint256 months
    ) external nonReentrant whenNotPaused {
        if (months == 0 || months > 12) revert InvalidMonths();
        if (botNFT.ownerOf(tokenId) != msg.sender) revert NotNFTOwner();

        uint256 totalCost = fuelPriceInCipher * months;
        
        // Transfer $CIPHER to treasury
        cipherToken.safeTransferFrom(msg.sender, treasury, totalCost);

        FuelStatus storage fuel = fuelStatus[tokenId];
        
        // Calculate new expiry
        uint40 currentExpiry = fuel.paidUntil;
        uint40 now_ = uint40(block.timestamp);
        
        // If expired or never paid, start from now
        // If still active, extend from current expiry
        uint40 startFrom = (currentExpiry > now_) ? currentExpiry : now_;
        uint40 newExpiry = startFrom + uint40(months * FUEL_PERIOD);
        
        fuel.paidUntil = newExpiry;
        fuel.lastPayment = now_;
        fuel.totalPaid += totalCost;

        // Update BotFleet contract
        botFleet.updateFuelStatus(tokenId, newExpiry);

        // If this is first payment, activate the slot
        if (!botFleet.isSlotActive(tokenId)) {
            botFleet.activateSlot(tokenId);
        }

        emit FuelPurchased(tokenId, msg.sender, totalCost, months, newExpiry);
    }

    /**
     * @notice Check and trigger grace period for expired slots
     * @param tokenId The NFT token ID
     */
    function checkFuelExpiry(uint256 tokenId) external {
        FuelStatus storage fuel = fuelStatus[tokenId];
        
        if (!botFleet.isSlotActive(tokenId)) revert SlotNotActive();
        
        // If fuel expired, trigger grace period
        if (fuel.paidUntil > 0 && block.timestamp > fuel.paidUntil) {
            botFleet.startGracePeriod(tokenId);
            emit GracePeriodTriggered(tokenId);
        }
    }

    /**
     * @notice Batch check multiple slots for expiry
     * @param tokenIds Array of token IDs to check
     */
    function batchCheckFuelExpiry(uint256[] calldata tokenIds) external {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            try this.checkFuelExpiry(tokenIds[i]) {} catch {}
        }
    }

    // ============ View Functions ============

    function getFuelStatus(uint256 tokenId) external view returns (
        uint40 paidUntil,
        uint40 lastPayment,
        uint256 totalPaid,
        bool isExpired,
        uint256 daysRemaining
    ) {
        FuelStatus storage fuel = fuelStatus[tokenId];
        paidUntil = fuel.paidUntil;
        lastPayment = fuel.lastPayment;
        totalPaid = fuel.totalPaid;
        isExpired = block.timestamp > fuel.paidUntil;
        
        if (!isExpired && fuel.paidUntil > 0) {
            daysRemaining = (fuel.paidUntil - block.timestamp) / 1 days;
        }
    }

    function getFuelCost(uint256 months) external view returns (uint256) {
        return fuelPriceInCipher * months;
    }

    function isFuelActive(uint256 tokenId) external view returns (bool) {
        return fuelStatus[tokenId].paidUntil > block.timestamp;
    }

    function getDaysUntilExpiry(uint256 tokenId) external view returns (int256) {
        FuelStatus storage fuel = fuelStatus[tokenId];
        if (fuel.paidUntil == 0) return -1; // Never paid
        
        return (int256(uint256(fuel.paidUntil)) - int256(block.timestamp)) / 1 days;
    }

    // ============ Admin Functions ============

    function setBotFleet(address _botFleet) external onlyOwner {
        if (_botFleet == address(0)) revert InvalidAddress();
        botFleet = IBotFleet(_botFleet);
    }

    function setFuelPrice(uint256 newPrice) external onlyOwner {
        if (newPrice == 0) revert ZeroAmount();
        uint256 oldPrice = fuelPriceInCipher;
        fuelPriceInCipher = newPrice;
        emit FuelPriceUpdated(oldPrice, newPrice);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert InvalidAddress();
        treasury = newTreasury;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency withdraw of any stuck tokens
     */
    function emergencyWithdraw(address token) external onlyOwner {
        if (token == address(0)) {
            (bool success, ) = treasury.call{value: address(this).balance}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(token).safeTransfer(treasury, IERC20(token).balanceOf(address(this)));
        }
    }
}
