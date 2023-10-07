import axios, {AxiosInstance} from 'axios';
import {SafeheronConfig} from './config';
import {Converter} from './converter';
import {BaseRequest, BaseResponse} from './model/BaseModel';
import {SafeheronError} from './safeheronError';

export class SafeheronClient {
    private config: SafeheronConfig;
    private converter: Converter;
    private axiosInstance: AxiosInstance;

    constructor(config: SafeheronConfig) {
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
