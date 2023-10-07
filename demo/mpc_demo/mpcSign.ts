import {SafeheronClient} from '../../src/safeheron';
import {ERC20_ABI} from './abi';
import {providers, utils, Contract, UnsignedTransaction, BigNumber} from 'ethers';
import {splitSignature} from '@ethersproject/bytes';
import {readFileSync} from 'fs';
import {v4 as uuid} from 'uuid';
import path from 'path'
import rc from 'rc';
import {
    CreateMPCSignTransactionRequest,
    MCPSignApi,
    OneMPCSignTransactionsRequest
} from "../../src/safeheron/mpcSignApi";

const defaults = {
    APIKEY: '',
    PRIVATE_KEY_PEM_FILE: '',
    APIKEY_PUBLIC_KEY_PEM_FILE: '',
    BASE_URL: '',
    ACCOUNT_KEY: '',
    ACCOUNT_TOKEN_ADDRESS: '',
    TO_ADDRESS: '',
    ERC20_CONTRACT_ADDRESS: ''
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
const accountTokenAddress = getConfigValue('ACCOUNT_TOKEN_ADDRESS');

const provider = new providers.InfuraProvider('goerli');

// Define Contract address
const ERC20_CONTRACT_ADDRESS = getConfigValue('ERC20_CONTRACT_ADDRESS');
const ERC20 = new Contract(ERC20_CONTRACT_ADDRESS, ERC20_ABI, provider);

function delay(num: number) {
    console.log(`wait ${num}ms.`);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(1);
        }, num)
    })
};

async function requestMpcSign(mpcSignApi: MCPSignApi, hash: string, accountKey: string): Promise<string> {

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

async function retrieveSig(mpcSignApi: MCPSignApi, txKey: string): Promise<string> {
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

function convertSig(mpcSig: string) {
    // b97515d80a5ad691f5e020fca1940aa44b4ef90d801c9b98cce3195c0b925ade
    const r = mpcSig.substring(0, 64);
    const s = mpcSig.substring(64, 128);
    const v = mpcSig.substring(128);
    const signature = {
        r: '0x' + r,
        s: '0x' + s,
        recoveryParam: parseInt(v, 16),
    };

    return splitSignature(signature);
}

async function main() {
    // Get chainId from network
    const chainId = (await provider.getNetwork()).chainId;
    const nonce = await provider.getTransactionCount(accountTokenAddress);

    // Encode ERC20 tx data
    const decimals = await ERC20.decimals();
    const amount = utils.parseUnits('1', decimals);
    const data = ERC20.interface.encodeFunctionData('transfer', [getConfigValue('TO_ADDRESS'), amount]);

    // Estimate gas
    const gasLimit = await provider.estimateGas({
        from: accountTokenAddress,
        to: ERC20_CONTRACT_ADDRESS,
        value: 0,
        data: data,
    });
    const feeEstimate = await estimate();

    // Create tx object
    const tx: UnsignedTransaction = {
        to: ERC20_CONTRACT_ADDRESS,
        value: 0,
        data,
        nonce,
        chainId,
        type: 2,
        maxPriorityFeePerGas: feeEstimate.maxPriorityFeePerGas,
        maxFeePerGas: feeEstimate.maxFeePerGas,
        gasLimit: gasLimit,
    };

    // serialize tx and compute the hash value
    const serialize = utils.serializeTransaction(tx);
    const hash = utils.keccak256(serialize);


    const mpcSignApi: MCPSignApi = new MCPSignApi({
        baseUrl: getConfigValue('BASE_URL'),
        apiKey,
        rsaPrivateKey: yourPrivateKey,
        safeheronRsaPublicKey: apiKeyPublicKey,
        requestTimeout: 10000
    });

    // Sign with safeheron mpc
    const mpcSignTxKey = await requestMpcSign(mpcSignApi, hash, getConfigValue('ACCOUNT_KEY'));
    console.log(`transaction created, txKey: ${mpcSignTxKey}`);
    // Get sig
    const mpcSig = await retrieveSig(mpcSignApi, mpcSignTxKey);
    console.log(`got mpc sign result, sig: ${mpcSig}`);

    // Convert mpc sig
    const signature = convertSig(mpcSig);

    // serialize with signature and send transaction.
    const rawTransaction = utils.serializeTransaction(tx, signature);
    const response = await provider.sendTransaction(rawTransaction);
    console.log(`Transaction successful with hash: ${response.hash}`);
    console.log(`you can view the transaction at: https://goerli.etherscan.io/tx/${response.hash}`);
}


async function estimate(): Promise<{ maxPriorityFeePerGas: BigNumber; maxFeePerGas: BigNumber }> {
    // Estimate maxFeePerGas, we assume maxPriorityFeePerGas's value is 2(gwei).
    // The baseFeePerGas is recommended to be 2 times the latest block's baseFeePerGas value.
    // maxFeePerGas must not less than baseFeePerGas + maxPriorityFeePerGas
    const maxPriorityFeePerGas = utils.parseUnits('2', 'gwei');
    const latestBlock = await provider.getBlock('latest');
    const suggestBaseFee = latestBlock.baseFeePerGas?.mul(2);
    const maxFeePerGas = suggestBaseFee?.add(maxPriorityFeePerGas);

    return {maxPriorityFeePerGas: maxPriorityFeePerGas, maxFeePerGas: maxFeePerGas!};
}

main();