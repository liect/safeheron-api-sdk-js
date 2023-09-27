import {SafeheronClient} from '../../src/safeheron';
import {readFileSync} from 'fs';
import {v4 as uuid} from 'uuid';
import path from 'path'
import rc from 'rc';
import Web3 from 'web3';
import {
    CreateWeb3EthSignTypedDataRequest,
    OneWeb3SignRequest,
    Web3Api
} from "../../src/safeheron/web3Api";


const defaults = {
    APIKEY: '',
    PRIVATE_KEY_PEM_FILE: '',
    APIKEY_PUBLIC_KEY_PEM_FILE: '',
    BASE_URL: '',
    ACCOUNT_KEY: '',
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
const ethereumRpcApi = getConfigValue('ETHEREUM_RPC_API');

const client: SafeheronClient = new SafeheronClient({
    baseUrl: getConfigValue('BASE_URL'),
    apiKey,
    rsaPrivateKey: yourPrivateKey,
    safeheronRsaPublicKey: apiKeyPublicKey,
});

async function main() {
    const web3 = new Web3(ethereumRpcApi);
    const chainId = await web3.eth.getChainId();

    const web3Api: Web3Api = new Web3Api({
        baseUrl: getConfigValue('BASE_URL'),
        apiKey,
        rsaPrivateKey: yourPrivateKey,
        safeheronRsaPublicKey: apiKeyPublicKey,
    });

    const request: CreateWeb3EthSignTypedDataRequest = {
        customerRefId: uuid(),
        accountKey: accountKey,
        message: {
            chainId: chainId,
            data: '{\"types\":{\"EIP712Domain\":[{\"name\":\"name\",\"type\":\"string\"},{\"name\":\"version\",\"type\":\"string\"},{\"name\":\"chainId\",\"type\":\"uint256\"},{\"name\":\"verifyingContract\",\"type\":\"address\"}],\"Person\":[{\"name\":\"name\",\"type\":\"string\"},{\"name\":\"wallet\",\"type\":\"address\"}],\"Mail\":[{\"name\":\"from\",\"type\":\"Person\"},{\"name\":\"to\",\"type\":\"Person\"},{\"name\":\"contents\",\"type\":\"string\"}]},\"primaryType\":\"Mail\",\"domain\":{\"name\":\"Ether Mail\",\"version\":\"1\",\"chainId\":1,\"verifyingContract\":\"0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC\"},\"message\":{\"from\":{\"name\":\"Cow\",\"wallet\":\"0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826\"},\"to\":{\"name\":\"Bob\",\"wallet\":\"0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB\"},\"contents\":\"Hello, Bob!\"}}',
            version: 'ETH_SIGNTYPEDDATA_V4'
        }
    };

    const txResult = await web3Api.createWeb3EthSignTypedData(request);

    console.log(txResult.txKey)
    const sig = await retrieveSig(web3Api, txResult.txKey);
    console.log(`got sign result, sig: ${sig}`);


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
            return retrieveResponse.message.sig.sig
        }

        await delay(5000);
    }
    throw new Error("can't get sig.");
}

main();