import { SafeheronConfig } from './config';
import { RSA } from './utils/rsa';
import { AES } from './utils/aes';
import { BaseRequest, BaseResponse } from './model/BaseModel';

export class Converter {
  config: SafeheronConfig;
  rsa: RSA;
  aes: AES;

  constructor(config: SafeheronConfig) {
    this.config = config;
    this.aes = new AES();
    this.rsa = new RSA(config.safeheronRsaPublicKey, config.rsaPrivateKey);
  }

  convertRequest(data: object): BaseRequest {
    // Use AES to encrypt request data
    const encryptResult = this.aes.encrypt(JSON.stringify(data || {}));

    // Use Safeheron RSA public key to encrypt request's aesKey and aesIv
    const encryptKeyAndIv = this.rsa.encrypt(encryptResult.keyAndIv);

    // Create params object
    const req: BaseRequest = {
      apiKey: this.config.apiKey,
      timestamp: String(new Date().getTime()),
      key: encryptKeyAndIv,
      bizContent: encryptResult.cipherText,
    };

    // Sign the request data with your RSA private key
    const signSrc = `apiKey=${req.apiKey}&bizContent=${req.bizContent}&key=${req.key}&timestamp=${req.timestamp}`;
    req.sig = this.rsa.sign(signSrc);

    return req;
  }

  convertResponse(data: BaseResponse) {
    // Verify sign
    const content = `bizContent=${data.bizContent}&code=${data.code}&key=${data.key}&message=${data.message}&timestamp=${data.timestamp}`;
    const verifyRes = this.rsa.verify(content, data.sig);
    if (!verifyRes) {
      throw new Error('response signature verification failed');
    }

    // Use your RSA private key to decrypt response's aesKey and aesIv
    const keyAndIv = this.rsa.decrypt(data.key);

    // Use AES to decrypt bizContent
    return this.aes.decrypt(data.bizContent, keyAndIv);
  }
}
