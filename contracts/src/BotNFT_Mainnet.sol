// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721, ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title BotNFT (Mainnet)
 * @author Decrypt Labs
 * @notice ERC-721 NFT representing ownership of a Cipher City trading bot slot
 * @dev Limited to 20 active slots. 4 reserved for existing bots. ETH mint price.
 *      Owner controls minting schedule (one bot per month, gradual rollout).
 */
contract BotNFT is ERC721URIStorage, Ownable2Step, ReentrancyGuard, Pausable {

    // ============ Constants ============
    uint256 public constant MAX_SUPPLY = 36;        // Total NFT collection size
    uint256 public constant RESERVED = 4;            // Reserved for existing live bots
    uint256 public constant MAX_ACTIVE = 20;         // Max active bot slots in Cipher City

    // ============ State Variables ============
    address public treasury;
    uint256 public mintPriceETH;                     // Mint price in ETH (wei)
    uint256 private _nextTokenId;
    bool public publicMintEnabled;                   // Owner controls when minting opens

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
        string botName;          // e.g. "Technical Tina"
    }

    // ============ Mappings ============
    mapping(uint256 tokenId => BotMetadata) public botMetadata;

    // ============ Events ============
    event BotMinted(uint256 indexed tokenId, address indexed owner, Strategy strategy, string botName);
    event StrategyChanged(uint256 indexed tokenId, Strategy oldStrategy, Strategy newStrategy);
    event MintPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event PublicMintToggled(bool enabled);

    // ============ Errors ============
    error MaxSupplyReached();
    error InvalidStrategy();
    error StrategyChangeCooldown();
    error InsufficientPayment();
    error InvalidAddress();
    error NotTokenOwner();
    error PublicMintNotEnabled();
    error TransferFailed();

    // ============ Constructor ============
    constructor(
        address _treasury,
        uint256 _mintPriceETH,
        address _initialOwner
    ) ERC721("Decrypt Labs Cipher Bot", "CIPHER") Ownable(_initialOwner) {
        if (_treasury == address(0)) revert InvalidAddress();
        
        treasury = _treasury;
        mintPriceETH = _mintPriceETH;
        publicMintEnabled = false; // Minting disabled by default
    }

    // ============ Public Mint ============

    /**
     * @notice Mint a new Bot NFT (public — when enabled)
     * @param strategy The trading strategy to assign (0-3)
     * @param uri Metadata URI for the NFT (IPFS)
     * @param botName Name of the bot character
     */
    function mint(
        Strategy strategy,
        string calldata uri,
        string calldata botName
    ) external payable nonReentrant whenNotPaused returns (uint256 tokenId) {
        if (!publicMintEnabled) revert PublicMintNotEnabled();
        if (_nextTokenId >= MAX_SUPPLY) revert MaxSupplyReached();
        if (uint8(strategy) > 3) revert InvalidStrategy();
        if (msg.value < mintPriceETH) revert InsufficientPayment();

        // Forward ETH to treasury
        (bool success, ) = treasury.call{value: msg.value}("");
        if (!success) revert TransferFailed();

        // Mint NFT
        tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);

        // Set metadata
        botMetadata[tokenId] = BotMetadata({
            strategy: strategy,
            mintedAt: uint40(block.timestamp),
            lastStrategyChange: uint40(block.timestamp),
            botName: botName
        });

        emit BotMinted(tokenId, msg.sender, strategy, botName);
    }

    // ============ Owner Mint (Reserved + Controlled Rollout) ============

    /**
     * @notice Owner-only mint for reserved bots and controlled rollout
     * @dev Used to mint the 4 reserved bots and future controlled releases
     */
    function ownerMint(
        address to,
        Strategy strategy,
        string calldata uri,
        string calldata botName
    ) external onlyOwner nonReentrant returns (uint256 tokenId) {
        if (_nextTokenId >= MAX_SUPPLY) revert MaxSupplyReached();

        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        botMetadata[tokenId] = BotMetadata({
            strategy: strategy,
            mintedAt: uint40(block.timestamp),
            lastStrategyChange: uint40(block.timestamp),
            botName: botName
        });

        emit BotMinted(tokenId, to, strategy, botName);
    }

    // ============ Strategy Management ============

    /**
     * @notice Change bot strategy (once per 30 days)
     */
    function changeStrategy(
        uint256 tokenId,
        Strategy newStrategy
    ) external nonReentrant {
        if (ownerOf(tokenId) != msg.sender) revert NotTokenOwner();
        if (uint8(newStrategy) > 3) revert InvalidStrategy();
        
        BotMetadata storage meta = botMetadata[tokenId];
        
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

    function getBot(uint256 tokenId) external view returns (
        Strategy strategy,
        string memory botName,
        uint40 mintedAt,
        address owner
    ) {
        owner = ownerOf(tokenId);
        BotMetadata memory meta = botMetadata[tokenId];
        return (meta.strategy, meta.botName, meta.mintedAt, owner);
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

    // ============ Admin Functions ============

    function setMintPrice(uint256 newPrice) external onlyOwner {
        uint256 oldPrice = mintPriceETH;
        mintPriceETH = newPrice;
        emit MintPriceUpdated(oldPrice, newPrice);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert InvalidAddress();
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    function togglePublicMint(bool enabled) external onlyOwner {
        publicMintEnabled = enabled;
        emit PublicMintToggled(enabled);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency withdraw stuck funds
     */
    function emergencyWithdraw() external onlyOwner {
        (bool success, ) = treasury.call{value: address(this).balance}("");
        if (!success) revert TransferFailed();
    }

    receive() external payable {}
}
