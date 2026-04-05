import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { ethers } from "ethers";

export interface EncryptedBlob {
  iv: string;
  ciphertext: string;
  authTag: string;
}

export interface IntelligentData {
  dataDescription: string;
  dataHash: string;
}

export interface UploadResult {
  intelligentData: IntelligentData[];
  merkleRoot: string;
}

export function encryptBlob(plaintext: string, key: Buffer): EncryptedBlob {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return {
    iv: iv.toString("hex"),
    ciphertext: ciphertext.toString("hex"),
    authTag: cipher.getAuthTag().toString("hex"),
  };
}

export function decryptBlob(blob: EncryptedBlob, key: Buffer): string {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(blob.iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(blob.authTag, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(blob.ciphertext, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export async function uploadEncryptedBlobsToZeroG(
  blobs: Array<{ description: string; content: string }>,
  aesKey: Buffer,
  indexerUrl: string,
  evmRpc: string,
  deployerPrivateKey: string
): Promise<UploadResult> {
  const { Indexer, MemData } = await import("@0gfoundation/0g-ts-sdk");
  const provider = new ethers.JsonRpcProvider(evmRpc);
  const signer = new ethers.Wallet(deployerPrivateKey, provider);
  const indexer = new Indexer(indexerUrl);

  const intelligentData: IntelligentData[] = [];

  for (const blob of blobs) {
    const encrypted = encryptBlob(blob.content, aesKey);
    const blobBytes = Buffer.from(JSON.stringify(encrypted), "utf8");
    const memData = new MemData(blobBytes);
    const [result, err] = await indexer.upload(memData, evmRpc, signer);
    if (err !== null) throw new Error(`0G upload failed for ${blob.description}: ${err.message}`);
    const rootHash = (result as { txHash: string; rootHash: string }).rootHash;
    intelligentData.push({ dataDescription: blob.description, dataHash: rootHash });
  }

  const packed = intelligentData.map((d) =>
    Buffer.from(d.dataHash.replace("0x", ""), "hex")
  );
  const merkleRoot = ethers.keccak256(Buffer.concat(packed));

  return { intelligentData, merkleRoot };
}
