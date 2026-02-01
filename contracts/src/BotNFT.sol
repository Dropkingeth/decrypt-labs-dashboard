// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721, ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title BotNFT
 * @author Decrypt Labs
 * @notice ERC-721 NFT representing ownership of a trading bot slot
 * @dev Limited to 20 NFTs total. Each NFT allows holder to select 1 of 4 strategies.
 */
contract BotNFT is ERC721URIStorage, Ownable2Step, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ Constants ============
    uint256 public constant MAX_SUPPLY = 20;
    uint256 public constant MINT_PRICE_USD = 300; // $300 USD equivalent in $CIPHER

    // ============ State Variables ============
    IERC20 public immutable cipherToken;
    address public treasury;
    uint256 public mintPriceInCipher; // Set by oracle or admin based on $CIPHER price
    uint256 private _nextTokenId;

    // ============ Enums ============
    enum Strategy {
        OTE_SILVER_BULLET,      // 0: Medium risk - trades all valid OTE setups
        FVG_IFVG,               // 1: Medium risk - Fair Value Gap + Inverse FVG
        OTE_REFINED_HIGH_RISK,  // 2: High risk - selective days, larger size
        OTE_REFINED_LOW_RISK    // 3: Low risk - selective days, conservative
    }

    // ============ Structs ============
    struct BotMetadata {
        Strategy strategy;
        uint40 mintedAt;
        uint40 lastStrategyChange;
        bool strategyLocked; // Can only change once per month
    }

    // ============ Mappings ============
    mapping(uint256 tokenId => BotMetadata) public botMetadata;

    // ============ Events ============
    event BotMinted(uint256 indexed tokenId, address indexed owner, Strategy strategy);
    event StrategyChanged(uint256 indexed tokenId, Strategy oldStrategy, Strategy newStrategy);
    event MintPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event TreasuryUpdated(address oldTreasury, address newTreasury);

    // ============ Errors ============
    error MaxSupplyReached();
    error InvalidStrategy();
    error StrategyChangeCooldown();
    error InsufficientPayment();
    error InvalidAddress();
    error NotTokenOwner();

    // ============ Constructor ============
    constructor(
        address _cipherToken,
        address _treasury,
        uint256 _initialMintPrice,
        address _initialOwner
    ) ERC721("Decrypt Labs Bot", "DLBOT") Ownable(_initialOwner) {
        if (_cipherToken == address(0)) revert InvalidAddress();
        if (_treasury == address(0)) revert InvalidAddress();
        
        cipherToken = IERC20(_cipherToken);
        treasury = _treasury;
        mintPriceInCipher = _initialMintPrice;
    }

    // ============ External Functions ============

    /**
     * @notice Mint a new Bot NFT
     * @param strategy The trading strategy to assign (0-3)
     * @param uri Metadata URI for the NFT
     */
    function mint(
        Strategy strategy,
        string calldata uri
    ) external nonReentrant whenNotPaused returns (uint256 tokenId) {
        if (_nextTokenId >= MAX_SUPPLY) revert MaxSupplyReached();
        if (uint8(strategy) > 3) revert InvalidStrategy();

        // Transfer $CIPHER payment to treasury
        cipherToken.safeTransferFrom(msg.sender, treasury, mintPriceInCipher);

        // Mint NFT
        tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);

        // Set metadata
        botMetadata[tokenId] = BotMetadata({
            strategy: strategy,
            mintedAt: uint40(block.timestamp),
            lastStrategyChange: uint40(block.timestamp),
            strategyLocked: false
        });

        emit BotMinted(tokenId, msg.sender, strategy);
    }

    /**
     * @notice Change bot strategy (once per 30 days)
     * @param tokenId The NFT token ID
     * @param newStrategy The new strategy to assign
     */
    function changeStrategy(
        uint256 tokenId,
        Strategy newStrategy
    ) external nonReentrant {
        if (ownerOf(tokenId) != msg.sender) revert NotTokenOwner();
        if (uint8(newStrategy) > 3) revert InvalidStrategy();
        
        BotMetadata storage meta = botMetadata[tokenId];
        
        // 30-day cooldown on strategy changes
        if (block.timestamp < meta.lastStrategyChange + 30 days) {
            revert StrategyChangeCooldown();
        }

        Strategy oldStrategy = meta.strategy;
        meta.strategy = newStrategy;
        meta.lastStrategyChange = uint40(block.timestamp);

        emit StrategyChanged(tokenId, oldStrategy, newStrategy);
    }

    // ============ View Functions ============

    function totalSupply() public view returns (uint256) {
        return _nextTokenId;
    }

    function remainingSupply() public view returns (uint256) {
        return MAX_SUPPLY - _nextTokenId;
    }

    function getStrategy(uint256 tokenId) external view returns (Strategy) {
        _requireOwned(tokenId);
        return botMetadata[tokenId].strategy;
    }

    function getStrategyName(Strategy strategy) public pure returns (string memory) {
        if (strategy == Strategy.OTE_SILVER_BULLET) return "OTE Silver Bullet";
        if (strategy == Strategy.FVG_IFVG) return "FVG+IFVG";
        if (strategy == Strategy.OTE_REFINED_HIGH_RISK) return "OTE Refined (High Risk)";
        if (strategy == Strategy.OTE_REFINED_LOW_RISK) return "OTE Refined (Low Risk)";
        return "Unknown";
    }

    function canChangeStrategy(uint256 tokenId) external view returns (bool) {
        _requireOwned(tokenId);
        return block.timestamp >= botMetadata[tokenId].lastStrategyChange + 30 days;
    }

    function nextStrategyChangeTime(uint256 tokenId) external view returns (uint256) {
        _requireOwned(tokenId);
        return botMetadata[tokenId].lastStrategyChange + 30 days;
    }

    // ============ Admin Functions ============

    function setMintPrice(uint256 newPrice) external onlyOwner {
        uint256 oldPrice = mintPriceInCipher;
        mintPriceInCipher = newPrice;
        emit MintPriceUpdated(oldPrice, newPrice);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert InvalidAddress();
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency withdraw of any stuck tokens
     * @param token The token to withdraw (address(0) for ETH)
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
