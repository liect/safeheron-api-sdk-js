import {SafeheronError} from './../../src/safeheronError';
import rc from 'rc';
import {CoSignerConverter} from "../../src/safeheron/coSignerConverter";
import {readFileSync} from "fs";
import path from "path";

const defaults = {
    BIZ_PRIV_KEY_PEM_FILE: '',
    API_PUB_KEY_PEM_FILE: ''
}

const safeheronCosignerConfigRC = rc('cosigner', defaults)

function getConfigValue(key: string) {
    const value = safeheronCosignerConfigRC[key];
    if (!value) {
        throw new Error(`missing config entry for '${key}'`);
    }
    return value;
}

const approvalCallbackServicePrivateKey = readFileSync(path.resolve(getConfigValue('APPROVAL_CALLBACK_SERVICE_PRIVATE_KEY_PEM_FILE')), 'utf8');
const coSignerPubKey = readFileSync(path.resolve(getConfigValue('CO_SIGNER_PUB_KEY_PEM_FILE')), 'utf8');


async function main() {
    try {
        const converter: CoSignerConverter = new CoSignerConverter({
            approvalCallbackServicePrivateKey: approvalCallbackServicePrivateKey,
            coSignerPubKey: coSignerPubKey,
        });

        //Visit the following link to view the request data specification：https://docs.safeheron.com/api/en.html#API%20Co-Signer%20Request%20Data
        const coSignerCallBack = converter.requestV3convert({
            bizContent: 'AES-encrypted data of request parameters',
            version: 'Interface request parameter protocol version, currently fixed at "v3". Version number changes mean changes to the request data, and developers need to parse the request parameters according to the version',
            timestamp: 'Callback timestamp',
            sig: 'Signature data after signing request parameters by your API RSA private key'
        })
        console.log(`Decrypt coSignerBizContent: ${coSignerCallBack}`);

        //Visit the following link to view the response data specification.：https://docs.safeheron.com/api/en.html#Approval%20Callback%20Service%20Response%20Data
        const coSignerResponse=  converter.responseV3convert({
            action: "<Replace with APPROVE or REJECT>",
            //coSignerCallBack.approvalId
            approvalId: '<Replace with the approvalId data from the request>'
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

