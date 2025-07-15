import {SafeheronClient} from '../safeheron';
import {SafeheronConfig} from "../config";


export interface AmlCheckerRequestRequest {

    /**
     * Blockchain network, supports:
     * Bitcoin
     * Ethereum
     * Tron
     */
    network: string;

    /**
     * Address
     */
    address: string;
}


export interface AmlCheckerRequestResponse {
    /**
     * Risk assessment request ID. AML risk assessment is processed asynchronously. Please use the Retrieve AML Risk Assessment Result interface, passing in the requestId, to query the assessment result.
     */
    requestId: string;
}

export interface AmlCheckerRetrievesRequest {
    /**
     * Risk assessment request ID, which can be created through the Create AML Risk Assessment Request interface.
     */
    requestId: string;
}

export interface AmlCheckerRetrievesResponse {
    /**
     * Risk assessment request ID
     */
    requestId: string;

    /**
     * Risk assessment request creation time, UNIX millisecond timestamp
     */
    createTime: string;

    /**
     * Blockchain network
     */
    network: string;

    /**
     * Address
     */
    address: string;

    /**
     * Whether it is a malicious address
     */
    isMaliciousAddress: boolean;

    /**
     * MistTrack risk assessment result
     */
    mistTrack: MistTrack;

}


export interface MistTrack {
    /**
     * MistTrack risk assessment status:
     * EVALUATING: In evaluation
     * SUCCESS: Evaluation completed
     */
    status: string;

    /**
     * Risk assessment completion time, risk assessment is time-sensitive, please evaluate in real-time, do not rely on historical evaluation results
     */
    evaluationTime: string;

    /**
     * Risk score of the address, range: 3 ~ 100
     */
    score: string;

    /**
     * Risk level, divided according to the risk score, specifically as follows:
     * Low: 0 ~ 30
     * Moderate: 31 ~ 70
     * High: 71 ~ 90
     * Severe: 91 ~ 100
     */
    riskLevel: string;

    /**
     * Risk description of the address
     */
    detailList: Array<string>;

    /**
     * Risk assessment details
     */
    riskDetail: Array<RiskDetail>;
}

export interface RiskDetail {
    /**
     * Risk type:
     * sanctioned_entity
     * illicit_activity
     * mixer
     * gambling
     * risk_exchange
     * bridge
     */
     riskType: string;

    /**
     * The name of the entity involved in the risk, example: garantex.io
     */
     entity: string;

    /**
     * How many hops to the risk entity, greater than or equal to 1
     */
     hopNum: string;

    /**
     * Risk exposure type:
     * direct
     * indirect
     */
     exposureType: string;

    /**
     * Transaction amount (USD)
     */
    volume: string;

    /**
     * Percentage of transaction amount
     */
    percent: string;
}

export class ToolsApi {

    private client: SafeheronClient;

    constructor(config: SafeheronConfig) {
        this.client = new SafeheronClient({
            baseUrl: config.baseUrl,
            apiKey: config.apiKey,
            rsaPrivateKey: config.rsaPrivateKey,
            safeheronRsaPublicKey: config.safeheronRsaPublicKey,
            requestTimeout: config.requestTimeout
        });
    }

    /**
     * Create AML Risk Assessment Request
     */
    async amlCheckerRequest(request: AmlCheckerRequestRequest): Promise<AmlCheckerRequestResponse> {
        return await this.client.doRequest<AmlCheckerRequestRequest, AmlCheckerRequestResponse>('/v1/tools/aml-checker/request', request);
    }

    /**
     * Retrieve AML Risk Assessment Result
     */
    async amlCheckerRetrieves(request: AmlCheckerRetrievesRequest): Promise<AmlCheckerRetrievesResponse> {
        return await this.client.doRequest<AmlCheckerRetrievesRequest, AmlCheckerRetrievesResponse>('/v1/tools/aml-checker/retrieves', request);
    }
}
