import { ERC20_ABI } from './abi';
import { providers, utils, Contract, UnsignedTransaction, BigNumber } from 'ethers';
import { splitSignature } from '@ethersproject/bytes';
import rc from 'rc';

const defaults = {
  ACCOUNT_ADDRESS: '',
  ACCOUNT_PRIVATE_KEY: '',
  TO_ADDRESS: '',
  ERC20_CONTRACT_ADDRESS: ''
}

const mpcDemoConfigRC = rc('mpcdemo', defaults)

function getConfigValue(key: string) {
  const value = mpcDemoConfigRC[key];
  if (!value) {
    throw new Error(`Missing config entry for '${key}'`);
  }
  return value;
}


const provider = new providers.InfuraProvider('ropsten');

// Define Account
// Replace with your address and private key.
const account = {
  address: getConfigValue('ACCOUNT_ADDRESS'),
  privateKey: getConfigValue('ACCOUNT_PRIVATE_KEY'),
};

// Define To address
// Change it as you wish.
const to = getConfigValue('TO_ADDRESS');

// Define Contract address
// Change it as you wish.
const ERC20_CONTRACT_ADDRESS = getConfigValue('ERC20_CONTRACT_ADDRESS');

// Create SignerKey
const signerKey = new utils.SigningKey(`0x${account.privateKey}`);
const ERC20 = new Contract(ERC20_CONTRACT_ADDRESS, ERC20_ABI, provider);

function getLocalSigWithPrivateKey(hash: string) {
  return signerKey.signDigest(hash);
}

function getMpcSigFromSafeheron(hash: string) {
  // get sig's value from safeheron with hash(32-byte hex string without '0x' prefix).
  // request "v1/transactions/mpcsign/create" api to sign then waiting for completed.
  // at last get sig from webhook or "v1/transactions/mpcsign/one" api

  // This is an example.
  const sig = 'b3d5b45dec59******b45859c77fda00';
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

async function main(){
  // Get chainId from network
  const chainId = (await provider.getNetwork()).chainId;
  const nonce = await provider.getTransactionCount(account.address);

  // Encode ERC20 tx data
  const decimals = await ERC20.decimals();
  const amount = utils.parseUnits('1', decimals);
  const data = ERC20.interface.encodeFunctionData('transfer', [to, amount]);

  // Estimate gas
  const gasLimit = await provider.estimateGas({
    from: account.address,
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

  // sign with private key
  const signature = getLocalSigWithPrivateKey(hash);

  // Or sign with safeheron mpc
  // const signature = getMpcSigFromSafeheron(hash.substring(2))

  // serialize with signature and send transaction.
  const rawTransaction = utils.serializeTransaction(tx, signature);
  const response = await provider.sendTransaction(rawTransaction);
  console.log(`Transaction successful with hash: ${response.hash}`);
  console.log(`you can view the transaction at: https://ropsten.etherscan.io/tx/${response.hash}`);
}


async function estimate(): Promise<{ maxPriorityFeePerGas: BigNumber; maxFeePerGas: BigNumber }> {
  // Estimate maxFeePerGas, we assume maxPriorityFeePerGas's value is 2(gwei).
  // The baseFeePerGas is recommended to be 2 times the latest block's baseFeePerGas value.
  // maxFeePerGas must not less than baseFeePerGas + maxPriorityFeePerGas
  const maxPriorityFeePerGas = utils.parseUnits('2', 'gwei');
  const latestBlock = await provider.getBlock('latest');
  const suggestBaseFee = latestBlock.baseFeePerGas?.mul(2);
  const maxFeePerGas = suggestBaseFee?.add(maxPriorityFeePerGas);

  return { maxPriorityFeePerGas: maxPriorityFeePerGas, maxFeePerGas: maxFeePerGas! };
}

main();