// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IERC7857DataVerifier.sol";

interface IERC7857 {
    function iTransfer(
        address _to,
        uint256 _tokenId,
        TransferValidityProof[] calldata _proofs
    ) external;

    function iClone(
        address _to,
        uint256 _tokenId,
        TransferValidityProof[] calldata _proofs
    ) external returns (uint256);

    function authorizeUsage(uint256 _tokenId, address _user) external;
    function revokeAuthorization(uint256 _tokenId, address _user) external;
    function delegateAccess(address _assistant) external;

    function ownerOf(uint256 _tokenId) external view returns (address);
    function authorizedUsersOf(uint256 _tokenId) external view returns (address[] memory);
    function approve(address _to, uint256 _tokenId) external;
    function setApprovalForAll(address _operator, bool _approved) external;

    event Transferred(address indexed from, address indexed to, uint256 indexed tokenId);
    event Cloned(uint256 indexed originalTokenId, uint256 indexed newTokenId, address indexed to);
    event Authorization(uint256 indexed tokenId, address indexed user);
    event AuthorizationRevoked(uint256 indexed tokenId, address indexed user);
    event PublishedSealedKey(uint256 indexed tokenId, bytes sealedKey);
    event DelegateAccess(address indexed owner, address indexed assistant);
}
