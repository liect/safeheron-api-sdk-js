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
    throw new Error(`missing config entry for '${key}'`);
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
  requestTimeout: 10000,
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

// Create a new wallet account.
async function createAccount(accountName: string): Promise<CreateAccountResponse> {

  const request: CreateAccountRequest = {
    accountName,
  };

  return await client.doRequest<CreateAccountRequest, CreateAccountResponse>('/v1/account/create', request);
}

interface AddCoinRequest {
  coinKey: string;
  accountKey: string;
}

interface AddCoinResponse {
  [index: number]: {
    address: string;
    addressType: string;
    amlLock: string;
  }
}

// Add Coins to a Wallet Account
async function addCoin(coinKey: string, accountKey: string): Promise<AddCoinResponse> {

  const request: AddCoinRequest = {
    coinKey,
    accountKey,
  };

  return await client.doRequest<AddCoinRequest, AddCoinResponse>('/v1/account/coin/create', request);
}

async function main() {
  try {
    const accountResult = await createAccount('first-wallet-account');
    console.log(`Account key: ${accountResult.accountKey}`);

    const coinResult = await addCoin("ETH_GOERLI", accountResult.accountKey);
    console.log(`Token[ETH_GOERLI] address: ${coinResult[0].address}`);
  } catch (e) {
    if (e instanceof SafeheronError) {
      console.error(`failed, error code:${e.code}, message:${e.message}`);
    } else {
      console.error(e)
    }
  }
}


main()

