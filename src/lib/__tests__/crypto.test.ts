import { hashApiKey, generateApiKey } from "../crypto";

describe("crypto", () => {
  describe("generateApiKey", () => {
    it("should generate a key with correct format", () => {
      const key = generateApiKey();
      expect(key).toMatch(/^oa_[A-Za-z0-9_-]{43}$/);
    });

    it("should generate unique keys", () => {
      const keys = new Set();
      for (let i = 0; i < 100; i++) {
        keys.add(generateApiKey());
      }
      expect(keys.size).toBe(100);
    });

    it("should generate keys with sufficient length", () => {
      const key = generateApiKey();
      expect(key.length).toBeGreaterThanOrEqual(46); // "oa_" + 43 chars
    });
  });

  describe("hashApiKey", () => {
    it("should hash a key to 64 character hex string", () => {
      const key = generateApiKey();
      const hash = hashApiKey(key);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should produce consistent hashes", () => {
      const key = "oa_test_key_12345";
      const hash1 = hashApiKey(key);
      const hash2 = hashApiKey(key);
      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different keys", () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      const hash1 = hashApiKey(key1);
      const hash2 = hashApiKey(key2);
      expect(hash1).not.toBe(hash2);
    });

    it("should handle various key formats", () => {
      const keys = [
        "oa_simple",
        "oa_with-dashes-and_underscores",
        "oa_UPPERCASE_and_lowercase",
        "oa_1234567890",
      ];
      
      keys.forEach(key => {
        const hash = hashApiKey(key);
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
      });
    });
  });
});