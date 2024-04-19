import axios, {AxiosInstance} from 'axios';
import {SafeheronConfig} from './config';
import {Converter} from './converter';
import {BaseRequest, BaseResponse} from './model/BaseModel';
import {SafeheronError} from './safeheronError';
import {readFileSync} from "fs";
import path from 'path';

export class SafeheronClient {
    private config: SafeheronConfig;
    private converter: Converter;
    private axiosInstance: AxiosInstance;

    constructor(config: SafeheronConfig) {
        // support read from file.
        if(config.rsaPrivateKey.startsWith("file:")){
            config.rsaPrivateKey = readFileSync(path.resolve(config.rsaPrivateKey.substring(5)), 'utf8');
        }

        // support read from file.
        if(config.safeheronRsaPublicKey.startsWith("file:")){
            config.safeheronRsaPublicKey = readFileSync(path.resolve(config.safeheronRsaPublicKey.substring(5)), 'utf8');
        }

        // support direct copy from safeheron web console.
        if (!config.safeheronRsaPublicKey.startsWith("-----BEGIN")){
            config.safeheronRsaPublicKey = ["-----BEGIN PUBLIC KEY-----", config.safeheronRsaPublicKey, "-----END PUBLIC KEY-----"].join("\n")
        }

        this.config = config;
        this.converter = new Converter(config);
        this.axiosInstance = axios.create({
            baseURL: this.config.baseUrl,
            timeout: this.config.requestTimeout,
        });
    }

    /**
     * Execute http request
     * @param path
     * @param data
     * @param timeout
     * @returns
     */
    async doRequest<R, P>(path: string, data: R, timeout?: number): Promise<P> {
        // convert request data
        const params = this.converter.convertRequest(data) as BaseRequest;

        // Send post
        const axiosResponse = await this.axiosInstance.post(`${this.config.baseUrl}${path}`, params, {timeout});
        const responseData = axiosResponse.data as BaseResponse;

        try {
            // Convert response data
            if (responseData.code === 200) {
                return JSON.parse(this.converter.convertResponse(responseData)) as P;
            } else {
                throw new SafeheronError(responseData.code, responseData.message);
            }
        } catch (error) {
            throw error;
        }
    }
}
