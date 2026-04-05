// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

enum OracleType { TEE, ZKP }

struct AccessProof {
    bytes32 oldDataHash;
    bytes32 newDataHash;
    bytes nonce;
    bytes encryptedPubKey;
    bytes proof;
}

struct OwnershipProof {
    OracleType oracleType;
    bytes32 oldDataHash;
    bytes32 newDataHash;
    bytes sealedKey;
    bytes encryptedPubKey;
    bytes nonce;
    bytes proof;
}

struct TransferValidityProof {
    AccessProof accessProof;
    OwnershipProof ownershipProof;
}

struct TransferValidityProofOutput {
    bool valid;
    bytes32 newDataHash;
}

interface IERC7857DataVerifier {
    function verifyTransferValidity(
        TransferValidityProof[] calldata _proofs
    ) external returns (TransferValidityProofOutput[] memory);
}
