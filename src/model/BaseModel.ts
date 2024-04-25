export interface BaseRequest {
  apiKey: string;
  timestamp: string;
  key?: string;
  sig?: string;
  bizContent?: string;
  rsaType?: string;
  aesType?: string;
}

export interface BaseResponse {
  code: number;
  bizContent: string;
  key: string;
  message: string;
  timestamp: string;
  sig: string;
  rsaType?: string;
  aesType?: string;
}

export interface CoSignerCallBack {
  bizContent: string;
  key: string;
  timestamp: string;
  sig: string;
  rsaType?: string;
  aesType?: string;
}

export interface CoSignerResponse {
  code: number;
  timestamp: string;
  message: string;
  key?: string;
  sig?: string;
  bizContent?: string;
}

export interface WebHook {
  bizContent: string;
  key: string;
  timestamp: string;
  sig: string;
  rsaType?: string;
  aesType?: string;
}
