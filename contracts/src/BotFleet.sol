// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title BotFleet
 * @author Decrypt Labs
 * @notice Manages bot slot statuses: Active, Broken, Waiting
 * @dev Only 20 slots can be active at any time. Tracks fuel payments and queue.
 */
contract BotFleet is Ownable2Step, ReentrancyGuard, Pausable {
    
    // ============ Constants ============
    uint256 public constant MAX_ACTIVE_SLOTS = 20;
    uint256 public constant GRACE_PERIOD = 7 days;

    // ============ State Variables ============
    IERC721 public immutable botNFT;
    address public fuelManager; // Address of FuelManager contract
    
    uint256 public activeSlotCount;
    uint256 public queueHead; // First in queue
    uint256 public queueTail; // Last in queue

    // ============ Enums ============
    enum SlotStatus {
        INACTIVE,   // 0: Never activated or deactivated
        ACTIVE,     // 1: Paid and trading
        BROKEN,     // 2: Missed payment, slot released
        WAITING     // 3: In queue for next opening
    }

    // ============ Structs ============
    struct Slot {
        SlotStatus status;
        uint40 activatedAt;
        uint40 fuelPaidUntil;
        uint40 graceEndsAt;
        uint256 queuePosition; // Position in waiting queue (0 if not in queue)
    }

    // ============ Mappings ============
    mapping(uint256 tokenId => Slot) public slots;
    mapping(uint256 position => uint256 tokenId) public waitingQueue;

    // ============ Events ============
    event SlotActivated(uint256 indexed tokenId, address indexed owner);
    event SlotBroken(uint256 indexed tokenId, address indexed owner);
    event SlotDeactivated(uint256 indexed tokenId, address indexed owner);
    event JoinedQueue(uint256 indexed tokenId, uint256 position);
    event LeftQueue(uint256 indexed tokenId);
    event FuelPaid(uint256 indexed tokenId, uint40 paidUntil);
    event GracePeriodStarted(uint256 indexed tokenId, uint40 endsAt);

    // ============ Errors ============
    error NotNFTOwner();
    error SlotAlreadyActive();
    error SlotNotActive();
    error SlotNotBroken();
    error NoSlotsAvailable();
    error NotInQueue();
    error NotYourTurn();
    error GracePeriodNotExpired();
    error AlreadyInQueue();
    error OnlyFuelManager();
    error InvalidAddress();

    // ============ Modifiers ============
    modifier onlyFuelManager() {
        if (msg.sender != fuelManager) revert OnlyFuelManager();
        _;
    }

    modifier onlyNFTOwner(uint256 tokenId) {
        if (botNFT.ownerOf(tokenId) != msg.sender) revert NotNFTOwner();
        _;
    }

    // ============ Constructor ============
    constructor(
        address _botNFT,
        address _initialOwner
    ) Ownable(_initialOwner) {
        if (_botNFT == address(0)) revert InvalidAddress();
        botNFT = IERC721(_botNFT);
    }

    // ============ External Functions ============

    /**
     * @notice Activate a bot slot (called after first fuel payment)
     * @param tokenId The NFT token ID
     */
    function activateSlot(uint256 tokenId) external onlyFuelManager whenNotPaused {
        Slot storage slot = slots[tokenId];
        
        if (slot.status == SlotStatus.ACTIVE) revert SlotAlreadyActive();
        if (activeSlotCount >= MAX_ACTIVE_SLOTS) revert NoSlotsAvailable();

        slot.status = SlotStatus.ACTIVE;
        slot.activatedAt = uint40(block.timestamp);
        slot.graceEndsAt = 0;
        
        activeSlotCount++;

        emit SlotActivated(tokenId, botNFT.ownerOf(tokenId));
    }

    /**
     * @notice Update fuel payment status
     * @param tokenId The NFT token ID
     * @param paidUntil Timestamp until which fuel is paid
     */
    function updateFuelStatus(
        uint256 tokenId, 
        uint40 paidUntil
    ) external onlyFuelManager {
        Slot storage slot = slots[tokenId];
        slot.fuelPaidUntil = paidUntil;
        slot.graceEndsAt = 0; // Clear grace period if paid
        
        emit FuelPaid(tokenId, paidUntil);
    }

    /**
     * @notice Start grace period for a slot
     * @param tokenId The NFT token ID
     */
    function startGracePeriod(uint256 tokenId) external onlyFuelManager {
        Slot storage slot = slots[tokenId];
        if (slot.status != SlotStatus.ACTIVE) revert SlotNotActive();
        
        slot.graceEndsAt = uint40(block.timestamp + GRACE_PERIOD);
        
        emit GracePeriodStarted(tokenId, slot.graceEndsAt);
    }

    /**
     * @notice Break a slot after grace period expires (anyone can call)
     * @param tokenId The NFT token ID
     */
    function breakSlot(uint256 tokenId) external whenNotPaused {
        Slot storage slot = slots[tokenId];
        
        if (slot.status != SlotStatus.ACTIVE) revert SlotNotActive();
        if (slot.graceEndsAt == 0 || block.timestamp < slot.graceEndsAt) {
            revert GracePeriodNotExpired();
        }

        slot.status = SlotStatus.BROKEN;
        slot.graceEndsAt = 0;
        activeSlotCount--;

        emit SlotBroken(tokenId, botNFT.ownerOf(tokenId));

        // Process queue if anyone is waiting
        _processQueue();
    }

    /**
     * @notice Join the waiting queue for reactivation
     * @param tokenId The NFT token ID
     */
    function joinQueue(uint256 tokenId) external onlyNFTOwner(tokenId) whenNotPaused {
        Slot storage slot = slots[tokenId];
        
        if (slot.status == SlotStatus.ACTIVE) revert SlotAlreadyActive();
        if (slot.status == SlotStatus.WAITING) revert AlreadyInQueue();

        slot.status = SlotStatus.WAITING;
        slot.queuePosition = queueTail;
        waitingQueue[queueTail] = tokenId;
        queueTail++;

        emit JoinedQueue(tokenId, slot.queuePosition);
    }

    /**
     * @notice Leave the waiting queue
     * @param tokenId The NFT token ID
     */
    function leaveQueue(uint256 tokenId) external onlyNFTOwner(tokenId) {
        Slot storage slot = slots[tokenId];
        
        if (slot.status != SlotStatus.WAITING) revert NotInQueue();

        slot.status = SlotStatus.INACTIVE;
        delete waitingQueue[slot.queuePosition];
        slot.queuePosition = 0;

        emit LeftQueue(tokenId);
    }

    /**
     * @notice Voluntarily deactivate a slot
     * @param tokenId The NFT token ID
     */
    function deactivateSlot(uint256 tokenId) external onlyNFTOwner(tokenId) {
        Slot storage slot = slots[tokenId];
        
        if (slot.status != SlotStatus.ACTIVE) revert SlotNotActive();

        slot.status = SlotStatus.INACTIVE;
        slot.graceEndsAt = 0;
        activeSlotCount--;

        emit SlotDeactivated(tokenId, msg.sender);

        // Process queue if anyone is waiting
        _processQueue();
    }

    // ============ Internal Functions ============

    /**
     * @dev Process the waiting queue when a slot opens
     * @dev Limited iterations to prevent gas exhaustion from sparse queue
     */
    function _processQueue() internal {
        uint256 iterations = 0;
        uint256 maxIterations = 50; // Safety limit for gas
        
        // Find next valid queue entry
        while (queueHead < queueTail && iterations < maxIterations) {
            uint256 nextTokenId = waitingQueue[queueHead];
            iterations++;
            
            // Skip empty entries (from users who left queue)
            if (nextTokenId == 0) {
                queueHead++;
                continue;
            }

            Slot storage nextSlot = slots[nextTokenId];
            
            // If they're still waiting, they get the slot
            if (nextSlot.status == SlotStatus.WAITING) {
                nextSlot.status = SlotStatus.INACTIVE; // Ready to activate on payment
                nextSlot.queuePosition = 0;
                delete waitingQueue[queueHead];
                queueHead++;
                
                // Emit event so frontend knows to prompt for payment
                emit LeftQueue(nextTokenId);
                break;
            }
            
            queueHead++;
        }
    }

    // ============ View Functions ============

    function getSlotStatus(uint256 tokenId) external view returns (SlotStatus) {
        return slots[tokenId].status;
    }

    function getSlotDetails(uint256 tokenId) external view returns (
        SlotStatus status,
        uint40 activatedAt,
        uint40 fuelPaidUntil,
        uint40 graceEndsAt,
        uint256 queuePosition
    ) {
        Slot storage slot = slots[tokenId];
        return (
            slot.status,
            slot.activatedAt,
            slot.fuelPaidUntil,
            slot.graceEndsAt,
            slot.queuePosition
        );
    }

    function isSlotActive(uint256 tokenId) external view returns (bool) {
        return slots[tokenId].status == SlotStatus.ACTIVE;
    }

    function isInGracePeriod(uint256 tokenId) external view returns (bool) {
        Slot storage slot = slots[tokenId];
        return slot.graceEndsAt > 0 && block.timestamp < slot.graceEndsAt;
    }

    function getQueueLength() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = queueHead; i < queueTail; i++) {
            if (waitingQueue[i] != 0 && slots[waitingQueue[i]].status == SlotStatus.WAITING) {
                count++;
            }
        }
        return count;
    }

    function getQueuePosition(uint256 tokenId) external view returns (uint256) {
        Slot storage slot = slots[tokenId];
        if (slot.status != SlotStatus.WAITING) return 0;
        
        uint256 position = 1;
        for (uint256 i = queueHead; i < slot.queuePosition; i++) {
            if (waitingQueue[i] != 0 && slots[waitingQueue[i]].status == SlotStatus.WAITING) {
                position++;
            }
        }
        return position;
    }

    function getFleetStats() external view returns (
        uint256 active,
        uint256 broken,
        uint256 waiting,
        uint256 available
    ) {
        active = activeSlotCount;
        waiting = this.getQueueLength();
        available = MAX_ACTIVE_SLOTS - activeSlotCount;
        
        // Count broken slots (would need to iterate, simplified here)
        // In production, maintain a counter
        broken = 0;
    }

    // ============ Admin Functions ============

    function setFuelManager(address _fuelManager) external onlyOwner {
        if (_fuelManager == address(0)) revert InvalidAddress();
        fuelManager = _fuelManager;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
