import crypto from "crypto";

interface McpRequest {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

interface McpResponse {
  status: number;
  data: any;
  headers: Record<string, string>;
  duration: number;
}

export class McpConnector {
  private apiKey: string;
  private baseHeaders: Record<string, string>;

  constructor() {
    this.apiKey = process.env.MCP_API_KEY || process.env.API_KEY || "";
    this.baseHeaders = {
      "User-Agent": "AgentPlatform/1.0",
      "Content-Type": "application/json"
    };

    if (this.apiKey) {
      this.baseHeaders["Authorization"] = `Bearer ${this.apiKey}`;
    }
  }

  async invoke(request: McpRequest): Promise<McpResponse> {
    const startTime = Date.now();
    
    try {
      const requestOptions: RequestInit = {
        method: request.method,
        headers: {
          ...this.baseHeaders,
          ...request.headers
        },
        signal: AbortSignal.timeout(request.timeout || 30000)
      };

      if (request.body && (request.method === "POST" || request.method === "PUT")) {
        requestOptions.body = typeof request.body === "string" 
          ? request.body 
          : JSON.stringify(request.body);
      }

      // Add request signing for security
      const signature = this.signRequest(request);
      requestOptions.headers = {
        ...requestOptions.headers,
        "X-MCP-Signature": signature,
        "X-MCP-Timestamp": Date.now().toString()
      };

      const response = await fetch(request.url, requestOptions);
      
      let data;
      const contentType = response.headers.get("content-type");
      
      if (contentType?.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      const duration = Date.now() - startTime;

      // Convert Headers object to plain object
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        status: response.status,
        data,
        headers: responseHeaders,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new Error(`MCP request timeout after ${request.timeout || 30000}ms`);
      }
      
      throw new Error(`MCP request failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async connectToJira(config: {
    baseUrl: string;
    username: string;
    apiToken: string;
  }): Promise<McpResponse> {
    return this.invoke({
      url: `${config.baseUrl}/rest/api/3/search`,
      method: "GET",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${config.username}:${config.apiToken}`).toString("base64")}`
      }
    });
  }

  async connectToConfluence(config: {
    baseUrl: string;
    username: string;
    apiToken: string;
    spaceKey: string;
  }): Promise<McpResponse> {
    return this.invoke({
      url: `${config.baseUrl}/rest/api/content`,
      method: "GET",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${config.username}:${config.apiToken}`).toString("base64")}`
      }
    });
  }

  async connectToGitHub(config: {
    owner: string;
    repo: string;
    token: string;
  }): Promise<McpResponse> {
    return this.invoke({
      url: `https://api.github.com/repos/${config.owner}/${config.repo}`,
      method: "GET",
      headers: {
        "Authorization": `token ${config.token}`,
        "Accept": "application/vnd.github.v3+json"
      }
    });
  }

  async connectToSlack(config: {
    token: string;
    channel: string;
  }): Promise<McpResponse> {
    return this.invoke({
      url: "https://slack.com/api/conversations.history",
      method: "GET",
      headers: {
        "Authorization": `Bearer ${config.token}`
      }
    });
  }

  private signRequest(request: McpRequest): string {
    const timestamp = Date.now().toString();
    const payload = `${request.method}|${request.url}|${timestamp}`;
    
    if (this.apiKey) {
      return crypto
        .createHmac("sha256", this.apiKey)
        .update(payload)
        .digest("hex");
    }
    
    return "";
  }

  async testConnection(url: string): Promise<boolean> {
    try {
      const response = await this.invoke({
        url,
        method: "GET",
        timeout: 5000
      });
      
      return response.status >= 200 && response.status < 400;
    } catch (error) {
      return false;
    }
  }
}
