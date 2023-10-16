import {SafeheronError} from './../../src/safeheronError';
import rc from 'rc';
import {CoSignerConverter} from "../../src/safeheron/coSignerConverter";

const defaults = {
    BIZ_PRIV_KEY: '',
    API_PUB_KEY: ''
}

const safeheronCosignerConfigRC = rc('cosigner', defaults)

function getConfigValue(key: string) {
    const value = safeheronCosignerConfigRC[key];
    if (!value) {
        throw new Error(`missing config entry for '${key}'`);
    }
    return value;
}

const bizPrivKey = getConfigValue('BIZ_PRIV_KEY');
const apiPubKey = getConfigValue('API_PUB_KEY');


async function main() {
    try {
        const converter: CoSignerConverter = new CoSignerConverter({
            bizPrivKey: bizPrivKey,
            apiPubKey: apiPubKey,
        });

        const coSignerCallBack = converter.convertCoSignerCallBack({
            bizContent: 'AES-encrypted data of request parameters',
            key: 'Encrypted data of random AES key by callback RSA public key',
            timestamp: 'Callback timestamp',
            sig: 'Signature data after signing request parameters by your API RSA private key'
        })
        console.log(`Decrypt coSignerBizContent: ${coSignerCallBack}`);

        const coSignerResponse=  converter.convertCoSignerResponse({
            approve: true,
            txKey: 'TxKey that needs to be approved'
        })

        //The customer returns encryptResponse after processing the business logic.
    } catch (e) {
        if (e instanceof SafeheronError) {
            console.error(`failed, error code:${e.code}, message:${e.message}`);
        } else {
            console.error(e)
        }
    }
}

main()

