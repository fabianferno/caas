import { describe, it, expect } from "vitest";
import { encryptBlob, decryptBlob } from "./inft-uploader";
import { randomBytes } from "crypto";

describe("encryptBlob / decryptBlob", () => {
  it("round-trips plaintext correctly", () => {
    const key = randomBytes(32);
    const plaintext = JSON.stringify({ soul: "You are a helpful agent.", skills: [] });
    const encrypted = encryptBlob(plaintext, key);

    expect(encrypted.iv).toHaveLength(24);       // 12 bytes hex = 24 chars
    expect(encrypted.ciphertext).not.toBe("");
    expect(encrypted.authTag).toHaveLength(32);  // 16 bytes hex = 32 chars

    const recovered = decryptBlob(encrypted, key);
    expect(recovered).toBe(plaintext);
  });

  it("throws with a wrong key", () => {
    const key = randomBytes(32);
    const wrongKey = randomBytes(32);
    const encrypted = encryptBlob("secret", key);
    expect(() => decryptBlob(encrypted, wrongKey)).toThrow();
  });
});
