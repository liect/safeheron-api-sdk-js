export interface BaseRequest {
  apiKey: string;
  timestamp: string;
  key?: string;
  sig?: string;
  bizContent?: string;
}

export interface BaseResponse {
  code: number;
  bizContent: string;
  key: string;
  message: string;
  timestamp: string;
  sig: string;
}
