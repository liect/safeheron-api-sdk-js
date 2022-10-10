import { SafeheronError } from '../../src/safeheronError';
import { SafeheronClient } from '../../src/safeheron';
import { v4 as uuid } from 'uuid';
import { readFileSync } from 'fs';
import path from 'path'
import rc from 'rc';

const defaults = {
  APIKEY: '',
  PRIVATE_KEY_PEM_FILE: '',
  APIKEY_PUBLIC_KEY_PEM_FILE: '',
  BASE_URL: '',
  ACCOUNT_KEY: '',
  DESTINATION_ADDRESS: '',
}
const safeheronConfigRC = rc('sendtransaction', defaults)

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
const ACCOUNT_KEY = getConfigValue('ACCOUNT_KEY');
const DESTINATION_ADDRESS = getConfigValue('DESTINATION_ADDRESS');


const client: SafeheronClient = new SafeheronClient({
  baseUrl: getConfigValue('BASE_URL'),
  apiKey,
  rsaPrivateKey: yourPrivateKey,
  safeheronRsaPublicKey: apiKeyPublicKey,
  requestTimeout: 10000,
});

interface CreateTransactionRequest {
  customerRefId: string;
  coinKey: string;
  txFeeLevel?: string;
  feeRateDto?: {
    feeRate?: string;
    gasLimit?: string;
    maxPriorityFee?: string;
    maxFee?: string
  };
  txAmount: string;
  sourceAccountKey: string;
  sourceAccountType: string;
  destinationAccountKey?: string;
  destinationAccountType: string;
  destinationAddress: string;
}

interface CreateTransactionResponse {
  txKey: string;
}

async function sendTransaction(): Promise<CreateTransactionResponse> {

  const request: CreateTransactionRequest = {
    sourceAccountKey: ACCOUNT_KEY,
    sourceAccountType: 'VAULT_ACCOUNT',
    destinationAccountType: 'ONE_TIME_ADDRESS',
    destinationAddress: DESTINATION_ADDRESS,
    coinKey: 'ETH_GOERLI',
    txAmount: '0.001',
    txFeeLevel: 'MIDDLE',
    customerRefId: uuid(),
  };

  return await client.doRequest<CreateTransactionRequest, CreateTransactionResponse>('/v2/transactions/create', request);
}


async function main() {
  try {
    const transactionResult = await sendTransaction();
    console.log(`transaction has been created, txKey: ${transactionResult.txKey}`);
  } catch (e) {
    if (e instanceof SafeheronError) {
      console.error(`failed to create transaction, error code: ${e.code}, message: ${e.message}`);
    } else {
      console.error(e)
    }

  }
}

main()

