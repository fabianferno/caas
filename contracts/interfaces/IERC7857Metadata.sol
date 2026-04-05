// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

struct IntelligentData {
    string dataDescription;
    bytes32 dataHash;
}

interface IERC7857Metadata {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function intelligentDataOf(uint256 _tokenId) external view returns (IntelligentData[] memory);
}
