export interface SafeheronConfig {
  baseUrl: string;
  apiKey: string;
  rsaPrivateKey: string;
  safeheronRsaPublicKey: string;
  requestTimeout: number;
}


export interface SafeheronCoSignerConfig {
  approvalCallbackServicePrivateKey: string;
  coSignerPubKey: string;
}

export interface SafeheronWebHookConfig {
  webHookRsaPrivateKey: string;
  safeheronWebHookRsaPublicKey: string;
}
