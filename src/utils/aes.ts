import crypto from 'crypto';

export class AES {
  algorithm: string = 'aes-256-cbc';

  encrypt(srcData: string): { keyAndIv: Buffer; cipherText: string } {
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    let encrypted = cipher.update(srcData);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return { keyAndIv: Buffer.concat([key, iv]), cipherText: encrypted.toString('base64') };
  }

  decrypt(cipherText: string, keyAndIv: Buffer): string {
    const key = keyAndIv.subarray(0, 32);
    const iv = keyAndIv.subarray(32);
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    let decrypted = decipher.update(Buffer.from(cipherText, 'base64'));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }
}
