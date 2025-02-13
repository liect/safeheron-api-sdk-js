import {SafeheronClient} from '../../src/safeheron';
import {concat, splitSignature} from '@ethersproject/bytes';
import {readFileSync} from 'fs';
import {v4 as uuid} from 'uuid';
import path from 'path'
import rc from 'rc';
import {
    CreateMPCSignTransactionRequest,
    MPCSignApi,
    OneMPCSignTransactionsRequest
} from "../../src/safeheron/mpcSignApi";

import { keccak256, toUtf8Bytes } from 'ethers/lib/utils';

const defaults = {
    APIKEY: '',
    PRIVATE_KEY_PEM_FILE: '',
    APIKEY_PUBLIC_KEY_PEM_FILE: '',
    BASE_URL: '',
    ACCOUNT_KEY: '',
    ACCOUNT_TOKEN_ADDRESS: '',
}

const mpcDemoConfigRC = rc('mpcdemo', defaults)

function getConfigValue(key: string) {
    const value = mpcDemoConfigRC[key];
    if (!value) {
        throw new Error(`missing config entry for '${key}'`);
    }
    return value;
}

const apiKey = getConfigValue('APIKEY');
const apiKeyPublicKey = readFileSync(path.resolve(getConfigValue('APIKEY_PUBLIC_KEY_PEM_FILE')), 'utf8');
const yourPrivateKey = readFileSync(path.resolve(getConfigValue('PRIVATE_KEY_PEM_FILE')), 'utf8');
const accountKey = getConfigValue('ACCOUNT_KEY');

const mpcSignApi: MPCSignApi = new MPCSignApi({
    baseUrl: getConfigValue('BASE_URL'),
    apiKey,
    rsaPrivateKey: yourPrivateKey,
    safeheronRsaPublicKey: apiKeyPublicKey,
    requestTimeout: 20000
});

function delay(num: number) {
    console.log(`wait ${num}ms.`);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(1);
        }, num)
    })
};

async function requestMpcSign(mpcSignApi: MPCSignApi, hash: string, accountKey: string): Promise<string> {

    const request: CreateMPCSignTransactionRequest = {
        customerRefId: uuid(),
        sourceAccountKey: accountKey,
        signAlg: 'Secp256k1',
        dataList: [{
            // 32-byte hex string without '0x' prefix
            data: hash.substring(2)
        }]
    };

    const txResult = await mpcSignApi.createMPCSignTransactions(request)
    return txResult.txKey;
}

async function retrieveSig(mpcSignApi: MPCSignApi, txKey: string): Promise<string> {
    // wait and get sig from "v1/transactions/mpcsign/one" api
    const retrieveRequest: OneMPCSignTransactionsRequest = {
        txKey
    };

    for (let i = 0; i < 100; i++) {
        const retrieveResponse = await mpcSignApi.oneMPCSignTransactions(retrieveRequest)
        console.log(`mpc sign transaction status: ${retrieveResponse.transactionStatus}, sub status: ${retrieveResponse.transactionSubStatus}`);
        if (retrieveResponse.transactionStatus === 'FAILED' || retrieveResponse.transactionStatus === 'REJECTED') {
            throw new Error(`mpc sign transaction was FAILED or REJECTED`);
        }

        if (retrieveResponse.transactionStatus === 'COMPLETED' && retrieveResponse.transactionSubStatus === 'CONFIRMED') {
            return retrieveResponse.dataList[0].sig;
        }

        await delay(5000);
    }

    throw new Error("can't get sig.");
}

// hash encode
async function ethSignMessage(){
    const message = "here is message to be signed"
    const messagePrefix = "\x19Ethereum Signed Message:\n";
    const messageByte = toUtf8Bytes(message)
    const messageHash = keccak256(concat([
        toUtf8Bytes(messagePrefix),
        toUtf8Bytes(String(messageByte.length)),
        messageByte
    ]));
    
    // Sign with safeheron mpc
    const mpcSignTxKey = await requestMpcSign(mpcSignApi, messageHash, accountKey);
    console.log(`[ethereum]mpc sign task created, txKey: ${mpcSignTxKey}`);
    // Get sig
    const mpcSig = await retrieveSig(mpcSignApi, mpcSignTxKey);
    console.log(`[ethereum]got mpc sign result, signature: 0x${mpcSig}`);
}

async function tronSignMessage(){
    const message = "here is message to be signed"
    const messagePrefix = '\x19TRON Signed Message:\n';
    const messageByte = toUtf8Bytes(message)
    const messageHash = keccak256(concat([
        toUtf8Bytes(messagePrefix),
        toUtf8Bytes(String(messageByte.length)),
        messageByte
    ]));
    // Sign with safeheron mpc
    const mpcSignTxKey = await requestMpcSign(mpcSignApi, messageHash, accountKey);
    console.log(`[tron]mpc sign task created, txKey: ${mpcSignTxKey}`);
    // Get sig
    const mpcSig = await retrieveSig(mpcSignApi, mpcSignTxKey);
    console.log(`[tron]got mpc sign result, signature: 0x${mpcSig}`);
}

ethSignMessage();
tronSignMessage();