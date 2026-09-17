import localforage from "localforage";
import CryptoJS from "crypto-js";

// Configure localforage
localforage.config({
  name: "edba-app",
  storeName: "secure_data", // IndexedDB store name
});

// Your secret key (⚠️ keep private; ideally from .env)
const SECRET_KEY = "edba-secret-key-123"; // replace with your own secure string

// Encrypt value before saving
const encrypt = (value: any) => {
  const stringValue = JSON.stringify(value);
  return CryptoJS.AES.encrypt(stringValue, SECRET_KEY).toString();
};

// Decrypt value when reading
const decrypt = (cipherText: string) => {
  const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);
  try {
    return JSON.parse(decrypted);
  } catch {
    return decrypted;
  }
};

const secureStorage = {
  async setItem(key: string, value: any) {
    const encrypted = encrypt(value);
    await localforage.setItem(key, encrypted);
  },

  async getItem<T = any>(key: string): Promise<T | null> {
    const encrypted = await localforage.getItem<string>(key);
    if (!encrypted) return null;
    return decrypt(encrypted) as T;
  },

  async removeItem(key: string) {
    await localforage.removeItem(key);
  },

  async clear() {
    await localforage.clear();
  },
};

export default secureStorage;
