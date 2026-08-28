// SCM Prospect Intelligence Platform - Shared Enterprise Apollo Client
// Enterprise HTTP Client with Auth, Exponential Backoff Retry, Rate Limiting, Timeout & Telemetry

export interface ApolloClientConfig {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  dailyLimit?: number;
}

export interface ApolloResponse<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  statusText: string;
  error?: string;
  latencyMs: number;
}

export interface ApolloClientTelemetry {
  apiKeyLoaded: boolean;
  apiKeySource: string;
  apiKeyLength: number;
  requestsCountToday: number;
  dailyLimit: number;
  lastEndpointCalled: string | null;
  lastResponseStatus: number | null;
  lastResponseTimeMs: number | null;
  lastError: string | null;
  lastPayloadPreview: string | null;
  lastResponseBodyPreview: string | null;
}

export class ApolloClient {
  private static instance: ApolloClient | null = null;
  private apiKey = '';
  private baseUrl = 'https://api.apollo.io/api/v1';
  private timeoutMs = 12000;
  private maxRetries = 2;
  private retryDelayMs = 750;
  private dailyLimit = 5000;
  private requestsTodayCount = 0;
  private lastResetDay = '';

  private telemetry: ApolloClientTelemetry = {
    apiKeyLoaded: false,
    apiKeySource: 'None',
    apiKeyLength: 0,
    requestsCountToday: 0,
    dailyLimit: 5000,
    lastEndpointCalled: null,
    lastResponseStatus: null,
    lastResponseTimeMs: null,
    lastError: null,
    lastPayloadPreview: null,
    lastResponseBodyPreview: null,
  };

  constructor(config?: ApolloClientConfig) {
    this.configure(config);
  }

  public static getInstance(config?: ApolloClientConfig): ApolloClient {
    if (!ApolloClient.instance) ApolloClient.instance = new ApolloClient(config);
    else if (config) ApolloClient.instance.configure(config);
    return ApolloClient.instance;
  }

  public configure(config?: ApolloClientConfig): void {
    let keySource = 'None';
    let key = config?.apiKey || process.env.APOLLO_API_KEY || '';
    if (config?.apiKey) keySource = 'explicit_config';
    else if (process.env.APOLLO_API_KEY) keySource = 'process.env.APOLLO_API_KEY';

    key = key.trim();
    if ((key.startsWith('[') && key.endsWith(']')) || (key.startsWith('{') && key.endsWith('}'))) {
      key = key.slice(1, -1).trim();
    }
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
      key = key.slice(1, -1).trim();
    }

    this.apiKey = key;
    this.baseUrl = (config?.baseUrl || process.env.APOLLO_BASE_URL || 'https://api.apollo.io/api/v1').replace(/\/+$/, '');
    this.timeoutMs = config?.timeoutMs || Number(process.env.APOLLO_TIMEOUT) || 12000;
    this.maxRetries = config?.maxRetries ?? (Number(process.env.APOLLO_MAX_RETRIES) || 2);
    this.retryDelayMs = config?.retryDelayMs || Number(process.env.APOLLO_RETRY_DELAY) || 750;
    this.dailyLimit = config?.dailyLimit || Number(process.env.APOLLO_DAILY_LIMIT) || 5000;

    this.telemetry.apiKeyLoaded = Boolean(this.apiKey);
    this.telemetry.apiKeySource = keySource;
    this.telemetry.apiKeyLength = this.apiKey.length;
    this.telemetry.dailyLimit = this.dailyLimit;
  }

  public getTelemetry(): ApolloClientTelemetry {
    return { ...this.telemetry };
  }

  public getApiKey(): string {
    return this.apiKey;
  }

  private checkDailyRateLimit(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (this.lastResetDay !== today) {
      this.lastResetDay = today;
      this.requestsTodayCount = 0;
    }
    if (this.requestsTodayCount >= this.dailyLimit) {
      throw new Error(`Apollo daily request limit (${this.dailyLimit}) reached.`);
    }
    this.requestsTodayCount += 1;
    this.telemetry.requestsCountToday = this.requestsTodayCount;
  }

  public async request<T = any>(endpoint: string, method: 'GET' | 'POST' = 'POST', body?: any): Promise<ApolloResponse<T>> {
    const start = Date.now();

    if (!this.apiKey) {
      const error = 'Apollo API key is not configured.';
      this.telemetry.lastError = error;
      return { ok: false, status: 503, data: null, statusText: 'Apollo Not Configured', error, latencyMs: 0 };
    }

    try {
      this.checkDailyRateLimit();
    } catch (limitErr: any) {
      return { ok: false, status: 429, data: null, statusText: 'Rate Limit Exceeded', error: limitErr.message, latencyMs: Date.now() - start };
    }

    let fullUrl = endpoint.startsWith('http://') || endpoint.startsWith('https://')
      ? endpoint
      : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'X-Api-Key': this.apiKey,
    };

    const fetchOptions: RequestInit = { method, headers };
    let payloadPreview = '';

    if (method === 'GET') {
      const params = new URLSearchParams();
      Object.entries(body || {}).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        if (Array.isArray(value)) value.forEach((entry) => params.append(key, String(entry)));
        else params.append(key, String(value));
      });
      const query = params.toString();
      if (query) fullUrl = `${fullUrl}?${query}`;
      payloadPreview = query;
    } else {
      payloadPreview = JSON.stringify(body || {});
      fetchOptions.body = payloadPreview;
    }

    this.telemetry.lastEndpointCalled = `${method} ${fullUrl}`;
    this.telemetry.lastPayloadPreview = payloadPreview.slice(0, 500);

    let lastError = '';
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await fetch(fullUrl, { ...fetchOptions, signal: controller.signal });
        clearTimeout(timeoutId);
        const latencyMs = Date.now() - start;
        const text = await response.text();
        let parsedData: T | null = null;
        try { parsedData = text ? JSON.parse(text) : null; } catch { parsedData = null; }

        this.telemetry.lastResponseStatus = response.status;
        this.telemetry.lastResponseTimeMs = latencyMs;
        this.telemetry.lastResponseBodyPreview = text.slice(0, 500);

        if (response.ok) {
          this.telemetry.lastError = null;
          return { ok: true, status: response.status, data: parsedData, statusText: response.statusText, latencyMs };
        }

        lastError = `Apollo returned HTTP ${response.status}.`;
        this.telemetry.lastError = lastError;
        const retryable = [429, 500, 502, 503, 504].includes(response.status);
        if (!retryable || attempt === this.maxRetries) {
          return { ok: false, status: response.status, data: parsedData, statusText: response.statusText, error: lastError, latencyMs };
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        const isAbort = err?.name === 'AbortError';
        lastError = isAbort ? `Apollo request timed out after ${this.timeoutMs}ms.` : `Apollo network request failed: ${err?.message || String(err)}`;
        this.telemetry.lastError = lastError;
        if (attempt === this.maxRetries) {
          return { ok: false, status: isAbort ? 504 : 502, data: null, statusText: isAbort ? 'Gateway Timeout' : 'Bad Gateway', error: lastError, latencyMs: Date.now() - start };
        }
      }

      const delay = this.retryDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 150);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    return { ok: false, status: 502, data: null, statusText: 'Apollo Request Failed', error: lastError || 'Apollo request failed.', latencyMs: Date.now() - start };
  }
}

export const apolloClient = ApolloClient.getInstance();
