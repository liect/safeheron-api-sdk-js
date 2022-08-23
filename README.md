# Javascript & Typescript SDK for Safeheron API

![GitHub last commit](https://img.shields.io/github/last-commit/Safeheron/safeheron-api-sdk-js)
![GitHub top language](https://img.shields.io/github/languages/top/Safeheron/safeheron-api-sdk-js?color=green)

# API Documentation
- [Official documentation](https://docs.safeheron.com/api/index.html)

# Installation

```bash
npm install @safeheron/api-sdk --save
```
or
```bash
yarn add @safeheron/api-sdk
```

# Usage

> Take `/v1/account/create` as an example to explain, the complete code can be found in `demo/api_demo/` directory

* Define request parameter data object
  ```ts
    interface CreateAccountRequest {
        accountName?: string;
        hiddenOnUI?: boolean;
    }
  ```

* Define response data object
  ```ts
    interface CreateAccountResponse {
        accountKey: string;
        pubKeys: Array<{
            signAlg: string;
            pubKey: string;
        }>;
    };
  ```
* Construct `SafeheronClient`
  ```ts
    const client: SafeheronClient = new SafeheronClient({
        baseUrl: 'https://api.safeheron.vip',
        apiKey: 'd1ad6******a572e7',
        rsaPrivateKey: privateKey,
        safeheronRsaPublicKey: publicKey,
        requestTimeout: 3000,
    });
  ```
* Call api with `client`
  ```ts
    const uri = '/v1/account/create';

    const request: CreateAccountRequest = {
        accountName: "first_account"
    }

    const createAccountResponse = await client.doRequest<CreateAccountRequest, CreateAccountResponse>(uri, request);
    // Your code to process response
    ...
  ```

# Test
## api test
* Before run the test code, modify `demo/api_demo/.safeheronrc.dist` according to the comments
  ```ini
  # your api key
  APIKEY=
  # path to your private key file, pem encoded
  PRIVATE_KEY_PEM_FILE=
  # path to safeheron api public key file, pem encoded
  APIKEY_PUBLIC_KEY_PEM_FILE= 
  # Safheron api url
  BASE_URL=https://api.safeheron.vip
  ```
* Run the test
  ```bash
  $ cd demo/api_demo
  $ cp .safeheronrc.dist .safeheronrc
  $ ts-node ./createAccount.ts
  ```

## mpc test
> This part of the test code is just to illustrate the differences between sign with the private key and Safeheron MPC.

* Before run the test code, modify `demo/mpc_demo/.mpcdemo.dist` according to the comments
  ```ini
  # Your address
  ACCOUNT_ADDRESS=
  # Your private key
  ACCOUNT_PRIVATE_KEY=
  # Target address
  TO_ADDRESS=
  # Contract address
  ERC20_CONTRACT_ADDRESS=
  ```

* Run `sendEther.ts` or `sendErc20.ts`
  ```bash
  $ cd demo/mpc_demo
  $ cp .mpcdemo.dist .mpcdemorc
  $ ts-node ./sendEther.ts
  ```




