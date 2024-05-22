import {SafeheronConfig} from './config';
import {RSA} from './utils/rsa';
import {AES} from './utils/aes';
import {BaseRequest, BaseResponse} from './model/BaseModel';
import crypto from "crypto";

export class Converter {
    config: SafeheronConfig;
    rsa: RSA;
    aes: AES;

    constructor(config: SafeheronConfig) {
        this.config = config;
        this.aes = new AES();
        this.rsa = new RSA(config.safeheronRsaPublicKey, config.rsaPrivateKey);
    }

    convertRequest(data: any): BaseRequest {

        const key = crypto.randomBytes(32);
        const iv = crypto.randomBytes(16);

        // Use Safeheron RSA public key to encrypt request's aesKey and aesIv
        const encryptKeyAndIv = this.rsa.encryptOAEP(Buffer.concat([key, iv]));

        const req: BaseRequest = {
            apiKey: this.config.apiKey,
            timestamp: String(new Date().getTime()),
            key: encryptKeyAndIv,

        };

        if (data != null) {
            // Use AES to encrypt request data
            req.bizContent = this.aes.encryptGCM(JSON.stringify(data), key, iv);
        }

        // Sign the request data with your RSA private key
        let paramStr = [];
        let reqMap = new Map(Object.entries(req));
        for (const key of Array.from(reqMap.keys()).slice().sort()) {
            paramStr.push(key + "=" + reqMap.get(key))
        }
        const signSrc = paramStr.join("&");
        req.sig = this.rsa.sign(signSrc);
        req.rsaType = this.rsa.ECB_OAEP;
        req.aesType = this.aes.GCM;
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
        let keyAndIv;
        if(this.rsa.ECB_OAEP ==data.rsaType){
            keyAndIv = this.rsa.decryptOAEP(data.key);
        }else {
            keyAndIv = this.rsa.decrypt(data.key);
        }
        // Use AES to decrypt bizContent
        let responseContent;
        if(this.aes.GCM == data.aesType){
            responseContent = this.aes.decryptGCM(data.bizContent, keyAndIv);
        }else {
            responseContent =this.aes.decrypt(data.bizContent, keyAndIv);
        }
        return responseContent;
    }
}
