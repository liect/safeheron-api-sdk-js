import crypto from 'crypto';

export class RSA {
  ECB_OAEP: string = "ECB_OAEP"

  privateKey: string;
  publicKey: string;

  constructor(publicKey: string, privateKey: string) {
    this.publicKey = publicKey;
    this.privateKey = privateKey;
  }

  encrypt(data: string | Buffer): string {
    const res = crypto.publicEncrypt(
      {
        key: this.publicKey,
        padding: crypto.constants.RSA_PKCS1_PADDING,
      },
      Buffer.from(data),
    );

    // Base64 encode
    return res.toString('base64');
  }

  encryptOAEP(data: string | Buffer): string {
    const res = crypto.publicEncrypt(
        {
          key: this.publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash:'sha256'
        },
        Buffer.from(data),
    );

    // Base64 encode
    return res.toString('base64');
  }
  decrypt(data: string) {
    const plainBuffer = crypto.privateDecrypt(
      {
        key: this.privateKey,
        padding: crypto.constants.RSA_PKCS1_PADDING,
      },
      Buffer.from(data, 'base64'),
    );

    return plainBuffer;
  }

  decryptOAEP(data: string) {
    const plainBuffer = crypto.privateDecrypt(
        {
          key: this.privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash:'sha256'
        },
        Buffer.from(data, 'base64'),
    );

    return plainBuffer;
  }

  sign(data: string): string {
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(data);
    return signer.sign(this.privateKey, 'base64');
  }

  signPSS(data: string): string {
      const signer = crypto.createSign('RSA-SHA256');
      signer.update(data);
      return signer.sign({
          key: this.privateKey,
          padding: crypto.constants.RSA_PKCS1_PSS_PADDING, // crypto.constants.RSA_PKCS1_PSS_PADDING
          saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
      },'base64');
  }

  verify(data: string, signature: string): boolean {
    // Sign data with your RSA private key
    const validator = crypto.createVerify('RSA-SHA256');
    validator.update(data);

    // Encode to base64 format
    return validator.verify(this.publicKey, signature, 'base64');
  }

  verifyPSS(data: string, signature: string): boolean {
      // Sign data with your RSA private key
      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(data);
      return verify.verify({ key: this.publicKey, padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST }, Buffer.from(signature, 'base64'));
  }
}
