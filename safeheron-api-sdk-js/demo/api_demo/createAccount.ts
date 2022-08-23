import { SafeheronError } from './../../src/safeheronError';
import { SafeheronClient } from '../../src/safeheron';
import { readFileSync } from 'fs';
import path from 'path'
import rc from 'rc';

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
    throw new Error(`Missing config entry for '${key}'`);
  }
  return value;
}

const apiKey = getConfigValue('APIKEY');
const apiKeyPublicKey = readFileSync(path.resolve(getConfigValue('APIKEY_PUBLIC_KEY_PEM_FILE')), 'utf8');
const yourPrivateKey = readFileSync(path.resolve(getConfigValue('PRIVATE_KEY_PEM_FILE')), 'utf8');

const client: SafeheronClient = new SafeheronClient({
  baseUrl: getConfigValue('BASE_URL'),
  apiKey,
  rsaPrivateKey: yourPrivateKey,
  safeheronRsaPublicKey: apiKeyPublicKey,
  requestTimeout: 3000,
});

interface CreateAccountRequest {
  accountName?: string;
  hiddenOnUI?: boolean;
}

interface CreateAccountResponse {
  accountKey: string;
  pubKeys: Array<{
    signAlg: string;
    pubKey: string;
  }>;
}


const uri = '/v1/account/create';

const request: CreateAccountRequest = {
  accountName: 'first_account',
};

async function main(){
  try {
    const createAccountResponse = await client.doRequest<CreateAccountRequest, CreateAccountResponse>(uri, request);
    console.log(createAccountResponse);
  } catch (e) {
    if(e instanceof SafeheronError){
      console.log(`${e.code}:${e.message}`);
    }else {
      console.error(e)
    }
  }
}

main()

