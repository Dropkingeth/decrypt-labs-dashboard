// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title RewardsDistributor
 * @author Decrypt Labs
 * @notice Distributes trading rewards to NFT holders
 * @dev Split: 80% NFT holder, 20% Operations
 */
contract RewardsDistributor is Ownable2Step, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ Constants ============
    uint256 public constant NFT_HOLDER_SHARE = 80; // 80%
    uint256 public constant OPERATIONS_SHARE = 20; // 20%
    uint256 public constant TOTAL_SHARES = 100;
    
    uint256 public constant MIN_CLAIM_USD = 10; // $10 minimum claim

    // ============ State Variables ============
    IERC20 public immutable cipherToken;
    IERC721 public immutable botNFT;
    address public treasury;
    address public rewardDepositor; // Backend that deposits rewards
    
    uint256 public minClaimInCipher; // $10 equivalent in $CIPHER

    // ============ Structs ============
    struct RewardBalance {
        uint256 available;      // Claimable rewards
        uint256 totalEarned;    // Lifetime earnings
        uint256 totalClaimed;   // Lifetime claimed
    }

    // ============ Mappings ============
    mapping(uint256 tokenId => RewardBalance) public rewards;

    // ============ Events ============
    event RewardsDeposited(uint256 indexed tokenId, uint256 holderAmount, uint256 opsAmount);
    event RewardsClaimed(uint256 indexed tokenId, address indexed claimer, uint256 amount);
    event BulkRewardsDeposited(uint256 totalAmount, uint256 tokenCount);
    event MinClaimUpdated(uint256 oldMin, uint256 newMin);

    // ============ Errors ============
    error NotNFTOwner();
    error InvalidAddress();
    error ZeroAmount();
    error BelowMinimumClaim();
    error NoRewardsAvailable();
    error OnlyRewardDepositor();
    error ArrayLengthMismatch();
    error TokenDoesNotExist();

    // ============ Modifiers ============
    modifier onlyRewardDepositor() {
        if (msg.sender != rewardDepositor && msg.sender != owner()) {
            revert OnlyRewardDepositor();
        }
        _;
    }

    // ============ Constructor ============
    constructor(
        address _cipherToken,
        address _botNFT,
        address _treasury,
        uint256 _minClaimInCipher,
        address _initialOwner
    ) Ownable(_initialOwner) {
        if (_cipherToken == address(0)) revert InvalidAddress();
        if (_botNFT == address(0)) revert InvalidAddress();
        if (_treasury == address(0)) revert InvalidAddress();

        cipherToken = IERC20(_cipherToken);
        botNFT = IERC721(_botNFT);
        treasury = _treasury;
        minClaimInCipher = _minClaimInCipher;
        rewardDepositor = _initialOwner;
    }

    // ============ External Functions ============

    /**
     * @notice Deposit rewards for a specific bot (called by backend)
     * @param tokenId The NFT token ID
     * @param totalAmount Total profit in $CIPHER to distribute
     */
    function depositReward(
        uint256 tokenId,
        uint256 totalAmount
    ) external onlyRewardDepositor nonReentrant {
        if (totalAmount == 0) revert ZeroAmount();
        
        // Verify token exists
        try botNFT.ownerOf(tokenId) returns (address) {}
        catch { revert TokenDoesNotExist(); }
        
        // Transfer total amount from depositor
        cipherToken.safeTransferFrom(msg.sender, address(this), totalAmount);
        
        // Calculate splits (80/20)
        uint256 holderAmount = (totalAmount * NFT_HOLDER_SHARE) / TOTAL_SHARES;
        uint256 opsAmount = totalAmount - holderAmount;
        
        // Credit NFT holder
        rewards[tokenId].available += holderAmount;
        rewards[tokenId].totalEarned += holderAmount;
        
        // Send operations share to treasury
        if (opsAmount > 0) {
            cipherToken.safeTransfer(treasury, opsAmount);
        }
        
        emit RewardsDeposited(tokenId, holderAmount, opsAmount);
    }

    /**
     * @notice Bulk deposit rewards for multiple bots
     * @param tokenIds Array of NFT token IDs
     * @param amounts Array of reward amounts
     */
    function bulkDepositRewards(
        uint256[] calldata tokenIds,
        uint256[] calldata amounts
    ) external onlyRewardDepositor nonReentrant {
        if (tokenIds.length != amounts.length) revert ArrayLengthMismatch();
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        // Transfer total amount first
        cipherToken.safeTransferFrom(msg.sender, address(this), totalAmount);
        
        uint256 totalOps = 0;
        
        // Process each reward
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (amounts[i] == 0) continue;
            
            uint256 holderAmount = (amounts[i] * NFT_HOLDER_SHARE) / TOTAL_SHARES;
            uint256 opsAmount = amounts[i] - holderAmount;
            
            rewards[tokenIds[i]].available += holderAmount;
            rewards[tokenIds[i]].totalEarned += holderAmount;
            
            totalOps += opsAmount;
            
            emit RewardsDeposited(tokenIds[i], holderAmount, opsAmount);
        }
        
        // Batch transfer to treasury
        if (totalOps > 0) {
            cipherToken.safeTransfer(treasury, totalOps);
        }
        
        emit BulkRewardsDeposited(totalAmount, tokenIds.length);
    }

    /**
     * @notice Claim available rewards for a bot
     * @param tokenId The NFT token ID
     */
    function claimRewards(uint256 tokenId) external nonReentrant whenNotPaused {
        if (botNFT.ownerOf(tokenId) != msg.sender) revert NotNFTOwner();
        
        RewardBalance storage bal = rewards[tokenId];
        
        if (bal.available == 0) revert NoRewardsAvailable();
        if (bal.available < minClaimInCipher) revert BelowMinimumClaim();
        
        uint256 amount = bal.available;
        bal.available = 0;
        bal.totalClaimed += amount;
        
        cipherToken.safeTransfer(msg.sender, amount);
        
        emit RewardsClaimed(tokenId, msg.sender, amount);
    }

    /**
     * @notice Claim rewards for multiple bots at once
     * @param tokenIds Array of NFT token IDs
     */
    function batchClaimRewards(uint256[] calldata tokenIds) external nonReentrant whenNotPaused {
        uint256 totalClaim = 0;
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            
            if (botNFT.ownerOf(tokenId) != msg.sender) continue;
            
            RewardBalance storage bal = rewards[tokenId];
            if (bal.available == 0) continue;
            
            uint256 claimAmount = bal.available; // Store before zeroing
            totalClaim += claimAmount;
            bal.totalClaimed += claimAmount;
            bal.available = 0;
            
            emit RewardsClaimed(tokenId, msg.sender, claimAmount); // Use stored value
        }
        
        if (totalClaim == 0) revert NoRewardsAvailable();
        if (totalClaim < minClaimInCipher) revert BelowMinimumClaim();
        
        cipherToken.safeTransfer(msg.sender, totalClaim);
    }

    // ============ View Functions ============

    function getRewardBalance(uint256 tokenId) external view returns (
        uint256 available,
        uint256 totalEarned,
        uint256 totalClaimed
    ) {
        RewardBalance storage bal = rewards[tokenId];
        return (bal.available, bal.totalEarned, bal.totalClaimed);
    }

    function canClaim(uint256 tokenId) external view returns (bool) {
        return rewards[tokenId].available >= minClaimInCipher;
    }

    function getClaimableAmount(uint256 tokenId) external view returns (uint256) {
        return rewards[tokenId].available;
    }

    // ============ Admin Functions ============

    function setRewardDepositor(address _depositor) external onlyOwner {
        if (_depositor == address(0)) revert InvalidAddress();
        rewardDepositor = _depositor;
    }

    function setMinClaim(uint256 newMin) external onlyOwner {
        uint256 oldMin = minClaimInCipher;
        minClaimInCipher = newMin;
        emit MinClaimUpdated(oldMin, newMin);
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
     * @notice Emergency withdraw stuck tokens (NOT user rewards)
     * @dev Cannot withdraw CIPHER token to protect user rewards
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        // Prevent withdrawing user reward funds
        if (token == address(cipherToken)) revert InvalidAddress();
        IERC20(token).safeTransfer(treasury, amount);
    }
}
