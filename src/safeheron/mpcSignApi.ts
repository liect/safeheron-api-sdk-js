import {SafeheronClient} from '../safeheron';
import {SafeheronConfig} from "../config";
import {LimitSearch, TxKeyResult} from "./transactionApi";

export interface CreateMPCSignTransactionRequest {
    /**
     * Merchant unique business ID (100 characters max)
     */
    customerRefId: string;

    /**
     * Merchant extended field (defined by merchant) shown to merchant (255 characters max)
     */
    customerExt1?: string;

    /**
     * Merchant extended field (defined by merchant) shown to merchant (255 characters max)
     */
    customerExt2?: string;

    /**
     * Source account key
     */
    sourceAccountKey: string;

    /**
     * Signature algorithm
     */
    signAlg: string;

    /**
     * List of transaction data to be signed
     */
    dataList: Array<{
        /**
         * Transaction note (180 characters max)
         */
        note?: string;

        /**
         * Transaction data to be signed (view description below for details)
         */
        data: string;
    }>;


}

export interface OneMPCSignTransactionsRequest {
    /**
     * Transaction key
     */
    txKey?: string;

    /**
     * Merchant unique business ID (100 characters max)
     */
    customerRefId?: string;
}

export interface MPCSignTransactionsResponse {
    /**
     * Transaction key
     */
    txKey: string;

    /**
     * Transaction status
     */
    transactionStatus: string;

    /**
     * Transaction substatus
     */
    transactionSubStatus: string;

    /**
     * Transaction creation time, UNIX timestamp (ms)
     */
    createTime: number;

    /**
     * Source account key
     */
    sourceAccountKey: string;

    /**
     * Final approver key
     */
    auditUserKey: string;

    /**
     * Creator key
     */
    createdByUserKey: string;

    /**
     * Merchant unique business ID
     */
    customerRefId: string;

    /**
     * Merchant extended field
     */
    customerExt1: string;

    /**
     * Merchant extended field
     */
    customerExt2: string;

    /**
     * Signature algorithm
     */
    signAlg: string;

    /**
     * Final approver username
     */
    auditUserName: string;

    /**
     * Creator username
     */
    createdByUserName: string;

    /**
     * List of transaction data to be signed
     */
    dataList: Array<{
        /**
         * Transaction note (180 characters max)
         */
        note: string;

        /**
         * Transaction data to be signed (view description below for details)
         */
        data: string;

        /**
         * Transaction signature (The value of sig consists of 32 bytes r + 32 bytes s + 1 byte v)
         */
        sig: string;

    }>;


}

export interface ListMPCSignTransactionsRequest extends LimitSearch {
    /**
     * Start time for creating a transaction, UNIX timestamp (ms) (If no value is provided, the default value is createTimeMax minus 24 hours)
     */
    createTimeMin?: number;

    /**
     * End time for creating a transaction, UNIX timestamp (ms) (If no value is provided, the default value is the current UTC time)
     */
    createTimeMax?: number;
}


export class MCPSignApi {

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
     * Create an MPC Sign Transaction
     * Merchant can initiate MPC Sign via this interface. The merchant must first serialize the transaction data and generate a hash before using this interface to submit the hash and create a transaction. The resulting signature can be retrieved via the MPC Sign transaction interface or webhook. The merchant can proceed with the necessary follow-up processes to obtain the signature according to their specific needs.
     */
    async createMPCSignTransactions(request: CreateMPCSignTransactionRequest): Promise<TxKeyResult> {
        return await this.client.doRequest<CreateMPCSignTransactionRequest, TxKeyResult>('/v1/transactions/mpcsign/create', request);
    }

    /**
     * Retrieve a Single MPC Sign Transaction
     * To query a specific MPC Sign transaction, either customerRefId or txKey must be provided. If both parameters are provided, the query will be based on the txKey parameter.
     */
    async oneMPCSignTransactions(request: OneMPCSignTransactionsRequest): Promise<MPCSignTransactionsResponse> {
        return await this.client.doRequest<OneMPCSignTransactionsRequest, MPCSignTransactionsResponse>('/v1/transactions/mpcsign/one', request);
    }

    /**
     * MPC Sign Transaction List
     * Filter MPC Sign transaction history by various conditions.
     */
    async listMPCSignTransactions(request: ListMPCSignTransactionsRequest): Promise<Array<MPCSignTransactionsResponse>> {
        return await this.client.doRequest<ListMPCSignTransactionsRequest, Array<MPCSignTransactionsResponse>>('/v1/transactions/mpcsign/list', request);
    }
}
