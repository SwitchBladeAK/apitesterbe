import { Response } from 'express';
import axios, { AxiosRequestConfig } from 'axios';
import { asyncHandler } from '../middlewares/errorHandler';
import { AuthenticatedRequest } from '../middlewares/auth';
import { URL } from 'url';

const isHostAllowed = (targetUrl: string): boolean => {
  try {
    const u = new URL(targetUrl);
    if (!['http:', 'https:'].includes(u.protocol)) return false;
    const allowed = process.env.ALLOWED_PROXY_HOSTS; // e.g., "dogapi.dog,api.example.com"
    if (!allowed) return true; // no whitelist configured
    const set = new Set(
      allowed
        .split(',')
        .map(h => h.trim().toLowerCase())
        .filter(Boolean)
    );
    return set.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
};

export const proxyController = {
  proxy: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { url, method = 'GET', headers = {}, query = {}, body = undefined } = req.body as {
      url: string;
      method?: string;
      headers?: Record<string, string>;
      query?: Record<string, any>;
      body?: any;
    };

    if (!url) {
      return res.status(400).json({ success: false, message: 'url is required' });
    }
    if (!isHostAllowed(url)) {
      return res.status(400).json({ success: false, message: 'Target host not allowed' });
    }

    // Prevent forwarding sensitive headers from our API
    const { authorization, host, connection, ...safeHeaders } = Object.fromEntries(
      Object.entries(headers || {}).map(([k, v]) => [k.toLowerCase(), v])
    );

    const config: AxiosRequestConfig = {
      url,
      method: (method || 'GET') as any,
      headers: safeHeaders,
      params: query,
      data: body,
      timeout: 15000,
      validateStatus: () => true
    };

    try {
      const response = await axios.request(config);
      return res.status(response.status).json({
        success: response.status >= 200 && response.status < 300,
        data: {
          statusCode: response.status,
          headers: response.headers,
          body: response.data
        }
      });
    } catch (error: any) {
      return res.status(502).json({
        success: false,
        message: error?.message || 'Proxy request failed'
      });
    }
  })
};


