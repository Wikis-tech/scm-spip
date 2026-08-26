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

  private apiKey: string = "";
  private baseUrl: string = "https://api.apollo.io/api/v1";
  private timeoutMs: number = 15000;
  private maxRetries: number = 3;
  private retryDelayMs: number = 1000;
  private dailyLimit: number = 5000;

  private requestsTodayCount: number = 0;
  private lastResetDay: string = "";

  private telemetry: ApolloClientTelemetry = {
    apiKeyLoaded: false,
    apiKeySource: "None",
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
    if (!ApolloClient.instance) {
      ApolloClient.instance = new ApolloClient(config);
    } else if (config) {
      ApolloClient.instance.configure(config);
    }
    return ApolloClient.instance;
  }

  public configure(config?: ApolloClientConfig): void {
    // 1. Resolve API Key from config or environment
    let keySource = "None";
    let key = config?.apiKey || process.env.APOLLO_API_KEY || "";
    if (config?.apiKey) {
      keySource = "explicit_config";
    } else if (process.env.APOLLO_API_KEY) {
      keySource = "process.env.APOLLO_API_KEY";
    } else if (process.env.VITE_APOLLO_API_KEY) {
      key = process.env.VITE_APOLLO_API_KEY;
      keySource = "process.env.VITE_APOLLO_API_KEY";
    } else {
      key = "KpuBuIUPuGIKOatjdoiVeA"; // Default fallback key
      keySource = "default_fallback";
    }

    if (key) {
      key = key.trim();
      if ((key.startsWith("[") && key.endsWith("]")) || (key.startsWith("{") && key.endsWith("}"))) {
        key = key.substring(1, key.length - 1).trim();
      }
      if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
        key = key.substring(1, key.length - 1).trim();
      }
    }

    this.apiKey = key;

    // 2. Resolve Base URL
    const rawBaseUrl = config?.baseUrl || process.env.APOLLO_BASE_URL || "https://api.apollo.io/api/v1";
    this.baseUrl = rawBaseUrl.replace(/\/+$/, "");

    // 3. Resolve Timeouts and Limits
    this.timeoutMs = config?.timeoutMs || Number(process.env.APOLLO_TIMEOUT) || 15000;
    this.maxRetries = config?.maxRetries || Number(process.env.APOLLO_MAX_RETRIES) || 3;
    this.retryDelayMs = config?.retryDelayMs || Number(process.env.APOLLO_RETRY_DELAY) || 1000;
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
    const today = new Date().toISOString().split("T")[0];
    if (this.lastResetDay !== today) {
      this.lastResetDay = today;
      this.requestsTodayCount = 0;
    }

    if (this.requestsTodayCount >= this.dailyLimit) {
      throw new Error(`Apollo Client daily request limit (${this.dailyLimit}) reached for today (${today}). Request throttled.`);
    }

    this.requestsTodayCount++;
    this.telemetry.requestsCountToday = this.requestsTodayCount;
  }

  /**
   * Executes a safe, enterprise HTTP request against Apollo REST API endpoints
   * @param endpoint Endpoint path (e.g. "/organizations/search" or "https://api.apollo.io/api/v1/...")
   * @param method HTTP Method ("GET" | "POST")
   * @param body Request payload or query parameters
   */
  public async request<T = any>(
    endpoint: string,
    method: "GET" | "POST" = "POST",
    body?: any
  ): Promise<ApolloResponse<T>> {
    const start = Date.now();

    // Enforce daily rate limits
    try {
      this.checkDailyRateLimit();
    } catch (limitErr: any) {
      return {
        ok: false,
        status: 429,
        data: null,
        statusText: "Rate Limit Exceeded",
        error: limitErr.message,
        latencyMs: Date.now() - start,
      };
    }

    // Format full target URL
    let fullUrl = endpoint.startsWith("http://") || endpoint.startsWith("https://")
      ? endpoint
      : `${this.baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    };

    if (this.apiKey) {
      headers["X-Api-Key"] = this.apiKey;
    }

    let fetchOptions: RequestInit = {
      method,
      headers,
    };

    let queryOrBodyPreview = "";

    if (method === "GET") {
      const params = new URLSearchParams();
      if (body) {
        Object.keys(body).forEach((k) => {
          if (body[k] !== undefined && body[k] !== null) {
            params.append(k, String(body[k]));
          }
        });
      }
      const queryStr = params.toString();
      if (queryStr) {
        fullUrl = `${fullUrl}?${queryStr}`;
      }
      queryOrBodyPreview = queryStr;
    } else {
      queryOrBodyPreview = JSON.stringify(body || {});
      fetchOptions.body = queryOrBodyPreview;
    }

    this.telemetry.lastEndpointCalled = `${method} ${fullUrl}`;
    this.telemetry.lastPayloadPreview = queryOrBodyPreview.substring(0, 500);

    let attempt = 0;
    let lastErrorMsg = "";

    while (attempt <= this.maxRetries) {
      attempt++;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(fullUrl, {
          ...fetchOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const latencyMs = Date.now() - start;
        this.telemetry.lastResponseTimeMs = latencyMs;
        this.telemetry.lastResponseStatus = response.status;

        const text = await response.text();
        this.telemetry.lastResponseBodyPreview = text.substring(0, 500);

        let parsedData: T | null = null;
        try {
          parsedData = JSON.parse(text);
        } catch {
          // Response body is not JSON
        }

        if (response.ok) {
          this.telemetry.lastError = null;
          return {
            ok: true,
            status: response.status,
            data: parsedData,
            statusText: response.statusText,
            latencyMs,
          };
        }

        // Retryable HTTP status codes
        const isRetryableStatus = [429, 500, 502, 503, 504].includes(response.status);
        lastErrorMsg = `HTTP ${response.status} (${response.statusText}): ${text.substring(0, 200)}`;
        this.telemetry.lastError = lastErrorMsg;

        if (isRetryableStatus && attempt <= this.maxRetries) {
          const delay = this.retryDelayMs * Math.pow(2, attempt - 1) + Math.random() * 200;
          console.warn(`[APOLLO CLIENT] Request failed with status ${response.status}. Retrying attempt ${attempt}/${this.maxRetries} after ${Math.round(delay)}ms...`);
          await new Promise((res) => setTimeout(res, delay));
          continue;
        }

        return {
          ok: false,
          status: response.status,
          data: parsedData,
          statusText: response.statusText,
          error: lastErrorMsg,
          latencyMs,
        };
      } catch (err: any) {
        clearTimeout(timeoutId);
        const latencyMs = Date.now() - start;
        this.telemetry.lastResponseTimeMs = latencyMs;
        this.telemetry.lastResponseStatus = 500;

        const isAbort = err.name === "AbortError";
        lastErrorMsg = isAbort
          ? `Timeout after ${this.timeoutMs}ms calling ${fullUrl}`
          : `Network Exception: ${err.message || String(err)}`;

        this.telemetry.lastError = lastErrorMsg;

        if (attempt <= this.maxRetries) {
          const delay = this.retryDelayMs * Math.pow(2, attempt - 1) + Math.random() * 200;
          console.warn(`[APOLLO CLIENT] Network/Timeout error (${lastErrorMsg}). Retrying attempt ${attempt}/${this.maxRetries} after ${Math.round(delay)}ms...`);
          await new Promise((res) => setTimeout(res, delay));
          continue;
        }

        return {
          ok: false,
          status: 500,
          data: null,
          statusText: "Internal Client Exception",
          error: lastErrorMsg,
          latencyMs,
        };
      }
    }

    return {
      ok: false,
      status: 500,
      data: null,
      statusText: "Max Retries Exceeded",
      error: lastErrorMsg || "Max retries exceeded",
      latencyMs: Date.now() - start,
    };
  }
}

export const apolloClient = ApolloClient.getInstance();
