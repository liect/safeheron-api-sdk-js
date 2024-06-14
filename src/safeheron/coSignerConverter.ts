import {SafeheronCoSignerConfig} from '../config';
import {RSA} from '../utils/rsa';
import {AES} from '../utils/aes';
import {CoSignerCallBack, CoSignerResponse, CoSignerResponseWithNewCryptoType} from '../model/BaseModel';
import crypto from "crypto";

export class CoSignerConverter {
    config: SafeheronCoSignerConfig;
    rsa: RSA;
    aes: AES;

    constructor(config: SafeheronCoSignerConfig) {
        this.config = config;
        this.aes = new AES();
        this.rsa = new RSA(config.apiPubKey, config.bizPrivKey);
    }

    // It has been Deprecated,Please use convertCoSignerResponseWithNewCryptoType
    convertCoSignerResponse(data: any): CoSignerResponse {

        const key = crypto.randomBytes(32);
        const iv = crypto.randomBytes(16);

        // Use Safeheron RSA public key to encrypt request's aesKey and aesIv
        const encryptKeyAndIv = this.rsa.encrypt(Buffer.concat([key, iv]));

        const req: CoSignerResponse = {
            message: 'SUCCESS',
            code: 200,
            timestamp: String(new Date().getTime()),
            key: encryptKeyAndIv,
        };

        if (data != null) {
            // Use AES to encrypt request data
            req.bizContent = this.aes.encrypt(JSON.stringify(data), key, iv);
        }

        // Sign the request data with your RSA private key
        let paramStr = [];
        let reqMap = new Map(Object.entries(req));
        for (const key of Array.from(reqMap.keys()).slice().sort()) {
            paramStr.push(key + "=" + reqMap.get(key))
        }
        const signSrc = paramStr.join("&");
        req.sig = this.rsa.sign(signSrc);
        return req;
    }

    convertCoSignerResponseWithNewCryptoType(data: any): CoSignerResponseWithNewCryptoType {

        const key = crypto.randomBytes(32);
        const iv = crypto.randomBytes(16);

        // Use Safeheron RSA public key to encrypt request's aesKey and aesIv
        const encryptKeyAndIv = this.rsa.encryptOAEP(Buffer.concat([key, iv]));

        const req: CoSignerResponseWithNewCryptoType = {
            message: 'SUCCESS',
            code: 200,
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

    convertCoSignerCallBack(data: CoSignerCallBack) {
        // Verify sign
        const content = `bizContent=${data.bizContent}&key=${data.key}&timestamp=${data.timestamp}`;
        const verifyRes = this.rsa.verify(content, data.sig);
        if (!verifyRes) {
            throw new Error('CoSignerCallBack signature verification failed');
        }

        // Use your RSA private key to decrypt response's aesKey and aesIv
        let keyAndIv;
        if(this.rsa.ECB_OAEP ==data.rsaType){
            keyAndIv = this.rsa.decryptOAEP(data.key);
        }else {
            keyAndIv = this.rsa.decrypt(data.key);
        }

        // Use AES to decrypt bizContent
        let callBackContent;
        if(this.aes.GCM == data.aesType){
            callBackContent = this.aes.decryptGCM(data.bizContent, keyAndIv);
        }else {
            callBackContent =this.aes.decrypt(data.bizContent, keyAndIv);
        }
        return callBackContent;
    }
}
