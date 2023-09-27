import {SafeheronClient} from '../../src/safeheron';
import {splitSignature} from '@ethersproject/bytes';
import {readFileSync} from 'fs';
import {v4 as uuid} from 'uuid';
import path from 'path'
import rc from 'rc';
import Web3 from 'web3';
import {
    CreateWeb3EthSignRequest,
    OneWeb3SignRequest,
    Web3Api
} from "../../src/safeheron/web3Api";
import {UnsignedTransaction, utils} from "ethers";


const defaults = {
    APIKEY: '',
    PRIVATE_KEY_PEM_FILE: '',
    APIKEY_PUBLIC_KEY_PEM_FILE: '',
    BASE_URL: '',
    ACCOUNT_KEY: '',
    ACCOUNT_TOKEN_ADDRESS: '',
    TO_ADDRESS: '',
    ERC_20_CONTRACT_ADDRESS: '',
    ETHEREUM_RPC_API: ''
}

const safeheronConfigRC = rc('safeheron', defaults)

function getConfigValue(key: string) {
    const value = safeheronConfigRC[key];
    if (!value) {
        throw new Error(`missing config entry for '${key}'`);
    }
    return value;
}

const apiKey = getConfigValue('APIKEY');
const apiKeyPublicKey = readFileSync(path.resolve(getConfigValue('APIKEY_PUBLIC_KEY_PEM_FILE')), 'utf8');
const yourPrivateKey = readFileSync(path.resolve(getConfigValue('PRIVATE_KEY_PEM_FILE')), 'utf8');
const accountKey = getConfigValue('ACCOUNT_KEY');
const accountTokenAddress = getConfigValue('ACCOUNT_TOKEN_ADDRESS');
const erc20ContractAddress = getConfigValue('ERC_20_CONTRACT_ADDRESS');
const toAddress = getConfigValue('TO_ADDRESS');
const ethereumRpcApi = getConfigValue('ETHEREUM_RPC_API');

const client: SafeheronClient = new SafeheronClient({
    baseUrl: getConfigValue('BASE_URL'),
    apiKey,
    rsaPrivateKey: yourPrivateKey,
    safeheronRsaPublicKey: apiKeyPublicKey,
});

async function main() {
    const web3 = new Web3(ethereumRpcApi);

    // @ts-ignore
    const decimals = web3.utils.sha3('decimals()').substring(0, 10);
    const result = await web3.eth.call({
        to: erc20ContractAddress,
        data: decimals
    });
    const decimalsValue = web3.utils.hexToNumber(result);
    const tokens = 1 * Math.pow(10, decimalsValue);
    // @ts-ignore
    const transfer = web3.utils.sha3('transfer(address,uint256)').substring(0, 10);
    const to = toAddress.substring(2).padStart(64, '0');
    const value = web3.utils.toHex(tokens).substring(2).padStart(64, '0');
    const data = transfer + to + value;

    const chainId = await web3.eth.getChainId();
    const nonce = Number(await web3.eth.getTransactionCount(accountTokenAddress));

    const gasLimit = await web3.eth.estimateGas({
        from: accountTokenAddress,
        to: erc20ContractAddress,
        value: 0,
        data: data,
    })

    const feeEstimate = await estimate(web3);

    // Create tx object
    const tx: UnsignedTransaction = {
        to: erc20ContractAddress,
        value: 0,
        data,
        nonce: nonce,
        chainId: chainId,
        type: 2,
        maxPriorityFeePerGas: feeEstimate.maxPriorityFeePerGas,
        maxFeePerGas: feeEstimate.maxFeePerGas,
        gasLimit: gasLimit,
    };

    const serialize = utils.serializeTransaction(tx);
    const hash = utils.keccak256(serialize);

    const web3Api: Web3Api = new Web3Api({
        baseUrl: getConfigValue('BASE_URL'),
        apiKey,
        rsaPrivateKey: yourPrivateKey,
        safeheronRsaPublicKey: apiKeyPublicKey,
    });

    const request: CreateWeb3EthSignRequest = {
        customerRefId: uuid(),
        accountKey: accountKey,
        messageHash: {
            chainId: chainId,
            hash: [hash],
        }
    };

    const txResult = await web3Api.createWeb3EthSign(request);

    console.log(txResult.txKey)
    const sig = await retrieveSig(web3Api, txResult.txKey);
    console.log(`got sign result, sig: ${sig}`);

    // Convert sig
    const signature = convertSig(sig);

    // serialize with signature and send transaction.
    const rawTransaction = utils.serializeTransaction(tx, signature);
    const response = await web3.eth.sendSignedTransaction(rawTransaction);
    console.log(`Transaction successful with hash: ${response.transactionHash}`);
    console.log(`you can view the transaction at: https://goerli.etherscan.io/tx/${response.transactionHash}`);
}


async function estimate(web3: Web3): Promise<{ maxPriorityFeePerGas: number; maxFeePerGas: number }> {
    // Estimate maxFeePerGas, we assume maxPriorityFeePerGas's value is 2(gwei).
    // The baseFeePerGas is recommended to be 2 times the latest block's baseFeePerGas value.
    // maxFeePerGas must not less than baseFeePerGas + maxPriorityFeePerGas
    const maxPriorityFeePerGas = Number(web3.utils.toWei('2', 'gwei'));
    const latestBlock = await web3.eth.getBlock('latest');
    // @ts-ignore
    const suggestBaseFee = latestBlock.baseFeePerGas * 2;
    const maxFeePerGas = suggestBaseFee + maxPriorityFeePerGas;

    return {maxPriorityFeePerGas: maxPriorityFeePerGas, maxFeePerGas: maxFeePerGas!};
}


function delay(num: number) {
    console.log(`wait ${num}ms.`);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(1);
        }, num)
    })
};


async function retrieveSig(web3Api: Web3Api, txKey: string): Promise<string> {
    const retrieveRequest: OneWeb3SignRequest = {
        txKey: txKey
    };

    for (let i = 0; i < 100; i++) {

        const retrieveResponse = await web3Api.oneWeb3Sign(retrieveRequest)

        console.log(`sign transaction status: ${retrieveResponse.transactionStatus}, sub status: ${retrieveResponse.transactionSubStatus}`);
        if (retrieveResponse.transactionStatus === 'FAILED' || retrieveResponse.transactionStatus === 'REJECTED') {
            throw new Error(`sign transaction was FAILED or REJECTED`);
        }

        if (retrieveResponse.transactionStatus === 'SIGN_COMPLETED') {
            return retrieveResponse.messageHash.sigList[0].sig
        }

        await delay(5000);
    }

    throw new Error("can't get sig.");
}

function convertSig(sig: string) {
    // b97515d80a5ad691f5e020fca1940aa44b4ef90d801c9b98cce3195c0b925ade
    const r = sig.substring(0, 64);
    const s = sig.substring(64, 128);
    const v = sig.substring(128);
    const signature = {
        r: '0x' + r,
        s: '0x' + s,
        recoveryParam: parseInt(v, 16),
    };

    return splitSignature(signature);
}

main();