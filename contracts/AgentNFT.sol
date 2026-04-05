// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./interfaces/IERC7857.sol";
import "./interfaces/IERC7857Metadata.sol";

contract AgentNFT is
    Initializable,
    ERC721Upgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    IERC7857,
    IERC7857Metadata
{
    struct AgentNFTStorage {
        uint256 nextTokenId;
        mapping(uint256 => IntelligentData[]) intelligentData;
        mapping(uint256 => address[]) authorizedUsers;
        address teeOracle;
    }

    bytes32 private constant STORAGE_SLOT =
        keccak256(abi.encode(uint256(keccak256("caas.storage.AgentNFT")) - 1)) & ~bytes32(uint256(0xff));

    function _getStorage() private pure returns (AgentNFTStorage storage s) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            s.slot := slot
        }
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) public initializer {
        __ERC721_init("CaaS Agent", "CLAW");
        __Ownable_init(initialOwner);
        _getStorage().nextTokenId = 1;
    }

    function mint(IntelligentData[] calldata data, address to) public onlyOwner returns (uint256 tokenId) {
        AgentNFTStorage storage s = _getStorage();
        tokenId = s.nextTokenId++;
        _safeMint(to, tokenId);
        for (uint256 i = 0; i < data.length; i++) {
            s.intelligentData[tokenId].push(data[i]);
        }
    }

    function iTransfer(
        address to,
        uint256 tokenId,
        TransferValidityProof[] calldata
    ) external override {
        require(ownerOf(tokenId) == msg.sender, "AgentNFT: not owner");
        _transfer(msg.sender, to, tokenId);
        emit Transferred(msg.sender, to, tokenId);
        emit PublishedSealedKey(tokenId, "");
    }

    function iClone(
        address to,
        uint256 tokenId,
        TransferValidityProof[] calldata
    ) external override returns (uint256 newTokenId) {
        require(ownerOf(tokenId) == msg.sender, "AgentNFT: not owner");
        AgentNFTStorage storage s = _getStorage();
        newTokenId = s.nextTokenId++;
        _safeMint(to, newTokenId);
        IntelligentData[] storage src = s.intelligentData[tokenId];
        for (uint256 i = 0; i < src.length; i++) {
            s.intelligentData[newTokenId].push(src[i]);
        }
        emit Cloned(tokenId, newTokenId, to);
    }

    function authorizeUsage(uint256 tokenId, address user) external override {
        require(ownerOf(tokenId) == msg.sender, "AgentNFT: not owner");
        _getStorage().authorizedUsers[tokenId].push(user);
        emit Authorization(tokenId, user);
    }

    function revokeAuthorization(uint256 tokenId, address user) external override {
        require(ownerOf(tokenId) == msg.sender, "AgentNFT: not owner");
        address[] storage users = _getStorage().authorizedUsers[tokenId];
        for (uint256 i = 0; i < users.length; i++) {
            if (users[i] == user) {
                users[i] = users[users.length - 1];
                users.pop();
                break;
            }
        }
        emit AuthorizationRevoked(tokenId, user);
    }

    function delegateAccess(address assistant) external override {
        emit DelegateAccess(msg.sender, assistant);
    }

    function setTEEOracle(address oracle) external onlyOwner {
        _getStorage().teeOracle = oracle;
    }

    function name()
        public
        view
        override(ERC721Upgradeable, IERC7857Metadata)
        returns (string memory)
    {
        return super.name();
    }

    function symbol()
        public
        view
        override(ERC721Upgradeable, IERC7857Metadata)
        returns (string memory)
    {
        return super.symbol();
    }

    function intelligentDataOf(uint256 tokenId)
        external
        view
        override
        returns (IntelligentData[] memory)
    {
        return _getStorage().intelligentData[tokenId];
    }

    function ownerOf(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable, IERC7857)
        returns (address)
    {
        return super.ownerOf(tokenId);
    }

    function authorizedUsersOf(uint256 tokenId)
        external
        view
        override
        returns (address[] memory)
    {
        return _getStorage().authorizedUsers[tokenId];
    }

    function approve(address to, uint256 tokenId)
        public
        override(ERC721Upgradeable, IERC7857)
    {
        super.approve(to, tokenId);
    }

    function setApprovalForAll(address operator, bool approved)
        public
        override(ERC721Upgradeable, IERC7857)
    {
        super.setApprovalForAll(operator, approved);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
