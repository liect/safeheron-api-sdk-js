import { SafeheronWebHookConfig} from '../config';
import {RSA} from '../utils/rsa';
import {AES} from '../utils/aes';
import {WebHook} from '../model/BaseModel';
import {readFileSync} from "fs";
import path from "path";

export class WebHookConverter {
    config: SafeheronWebHookConfig;
    rsa: RSA;
    aes: AES;

    constructor(config: SafeheronWebHookConfig) {
        // support read from file.
        if(config.webHookRsaPrivateKey.startsWith("file:")){
            config.webHookRsaPrivateKey = readFileSync(path.resolve(config.webHookRsaPrivateKey.substring(5)), 'utf8');
        }

        // Support base64 format private key.
        if (!config.webHookRsaPrivateKey.startsWith("-----BEGIN")){
            config.webHookRsaPrivateKey = ["-----BEGIN PRIVATE KEY-----", config.webHookRsaPrivateKey, "-----END PRIVATE KEY-----"].join("\n")
        }

        // support read from file.
        if(config.safeheronWebHookRsaPublicKey.startsWith("file:")){
            config.safeheronWebHookRsaPublicKey = readFileSync(path.resolve(config.safeheronWebHookRsaPublicKey.substring(5)), 'utf8');
        }

        // support direct copy from safeheron web console.
        if (!config.safeheronWebHookRsaPublicKey.startsWith("-----BEGIN")){
            config.safeheronWebHookRsaPublicKey = ["-----BEGIN PUBLIC KEY-----", config.safeheronWebHookRsaPublicKey, "-----END PUBLIC KEY-----"].join("\n")
        }

        this.config = config;
        this.aes = new AES();
        this.rsa = new RSA(config.safeheronWebHookRsaPublicKey, config.webHookRsaPrivateKey);
    }

    convertWebHook(data: WebHook) {
        // Verify sign
        const content = `bizContent=${data.bizContent}&key=${data.key}&timestamp=${data.timestamp}`;
        const verifyRes = this.rsa.verify(content, data.sig);
        if (!verifyRes) {
            throw new Error('webhook signature verification failed');
        }

        // Use your RSA private key to decrypt response's aesKey and aesIv
        let keyAndIv;
        if(this.rsa.ECB_OAEP ==data.rsaType){
            keyAndIv = this.rsa.decryptOAEP(data.key);
        }else {
            keyAndIv = this.rsa.decrypt(data.key);
        }
        // Use AES to decrypt bizContent
        let webHookContent;
        if(this.aes.GCM == data.aesType){
            webHookContent = this.aes.decryptGCM(data.bizContent, keyAndIv);
        }else {
            webHookContent =this.aes.decrypt(data.bizContent, keyAndIv);
        }
        return webHookContent;
    }
}
