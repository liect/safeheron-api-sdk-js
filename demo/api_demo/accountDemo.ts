import {SafeheronError} from './../../src/safeheronError';
import {readFileSync} from 'fs';
import path from 'path'
import rc from 'rc';
import {AccountApi, CreateAccountRequest} from "../../src/safeheron/accountApi";

const defaults = {
    APIKEY: '',
    PRIVATE_KEY_PEM_FILE: '',
    APIKEY_PUBLIC_KEY_PEM_FILE: '',
    BASE_URL: ''
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


async function main() {
    try {
        const accountApi: AccountApi = new AccountApi({
            baseUrl: getConfigValue('BASE_URL'),
            apiKey,
            rsaPrivateKey: yourPrivateKey,
            safeheronRsaPublicKey: apiKeyPublicKey,
        });

        const request: CreateAccountRequest = {
            accountName: 'first-wallet-account',
            hiddenOnUI: true,
        };

        const accountResult = await accountApi.createAccount(request);
        console.log(`Account key: ${accountResult.accountKey}`);
    } catch (e) {
        if (e instanceof SafeheronError) {
            console.error(`failed, error code:${e.code}, message:${e.message}`);
        } else {
            console.error(e)
        }
    }
}


main()

