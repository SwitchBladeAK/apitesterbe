import { Response } from 'express';
import { Project } from '../models/Project';
import { asyncHandler } from '../middlewares/errorHandler';
import { IApiEndpoint } from '../models/Project';
import { AuthenticatedRequest } from '../middlewares/auth';

const sanitizeHeaders = (headers: Record<string, any> | undefined): Record<string, string> => {
  const result: Record<string, string> = {};
  if (!headers || typeof headers !== 'object') return result;
  const tokenRegex = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
  for (const [rawName, rawValue] of Object.entries(headers)) {
    const name = String(rawName).trim();
    if (!name || !tokenRegex.test(name)) continue;
    let value = rawValue == null ? '' : String(rawValue);
    value = value.replace(/[\r\n\x00-\x1F\x7F]/g, ' ').trim();
    result[name] = value;
  }
  return result;
};

export class EndpointController {
  private applyEnvTemplating(input: any, env: Record<string, string> | undefined): any {
    if (!env) return input;
    const replaceInString = (str: string): string =>
      str.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_, key) => (env[key] ?? ''));
    if (typeof input === 'string') return replaceInString(input);
    if (Array.isArray(input)) return input.map(v => this.applyEnvTemplating(v, env));
    if (input && typeof input === 'object') {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(input)) {
        out[k] = this.applyEnvTemplating(v as any, env);
      }
      return out;
    }
    return input;
  }

  addEndpoint = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { projectId } = req.params;
    const endpoint: IApiEndpoint = req.body;
    
    if (!endpoint.id) {
      endpoint.id = `endpoint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    endpoint.method = (endpoint.method || 'GET') as any;
    endpoint.url = (endpoint.url || '').trim();
    if (!endpoint.name || !endpoint.name.trim()) {
      endpoint.name = `${endpoint.method} ${endpoint.url || 'Unnamed Endpoint'}`.trim();
    }
    endpoint.headers = sanitizeHeaders(endpoint.headers);
    endpoint.body = endpoint.body || {};
    endpoint.queryParams = endpoint.queryParams || {};
    
    const project = await Project.findOne({ _id: projectId, ownerId: req.userId });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    project.endpoints.push(endpoint);
    await project.save();
    
    res.status(201).json({
      success: true,
      data: endpoint
    });
  });

  /**
   * Update endpoint
   */
  updateEndpoint = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { projectId, endpointId } = req.params;
    const updateData = req.body;
    
    const project = await Project.findOne({ _id: projectId, ownerId: req.userId });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    const endpointIndex = project.endpoints.findIndex(ep => ep.id === endpointId);
    if (endpointIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Endpoint not found'
      });
    }
    
    project.endpoints[endpointIndex] = { ...project.endpoints[endpointIndex], ...updateData };
    await project.save();
    
    res.json({
      success: true,
      data: project.endpoints[endpointIndex]
    });
  });

  /**
   * Delete endpoint
   */
  deleteEndpoint = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { projectId, endpointId } = req.params;
    
    const project = await Project.findOne({ _id: projectId, ownerId: req.userId });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    project.endpoints = project.endpoints.filter(ep => ep.id !== endpointId);
    await project.save();
    
    res.json({
      success: true,
      message: 'Endpoint deleted successfully'
    });
  });

  /**
   * Test endpoint (execute request)
   */
  testEndpoint = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { projectId, endpointId } = req.params;
    
    const project = await Project.findOne({ _id: projectId, ownerId: req.userId });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    const endpoint = project.endpoints.find(ep => ep.id === endpointId);
    if (!endpoint) {
      return res.status(404).json({
        success: false,
        message: 'Endpoint not found'
      });
    }
    
    const axios = require('axios');
    const startTime = Date.now();
    
    try {
      const env = project.envVars || {};
      const method = endpoint.method;
      const templatedUrl = this.applyEnvTemplating(endpoint.url, env);
      const templatedHeaders = sanitizeHeaders(this.applyEnvTemplating(endpoint.headers || {}, env));
      const templatedQuery = this.applyEnvTemplating(endpoint.queryParams || {}, env);
      const templatedBody = this.applyEnvTemplating(endpoint.body || {}, env);

      const config: any = {
        method,
        url: templatedUrl,
        headers: templatedHeaders,
      };
      if (!config.headers['accept'] && !config.headers['Accept']) {
        config.headers['Accept'] = 'application/json';
      }
      
      if (templatedQuery && Object.keys(templatedQuery).length > 0) {
        config.params = templatedQuery;
      }
      
      if (templatedBody && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        config.data = templatedBody;
      }
      
      const response = await axios(config);
      const responseTime = Date.now() - startTime;
      const historyEntry = {
        id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date(),
        request: {
          url: config.url,
          method: String(config.method),
          headers: config.headers,
          queryParams: config.params || {},
          body: config.data
        },
        response: {
          statusCode: response.status,
          headers: response.headers,
          body: response.data,
          responseTime
        }
      };
      endpoint.responseHistory = endpoint.responseHistory || [];
      endpoint.responseHistory.unshift(historyEntry);
      endpoint.responseHistory = endpoint.responseHistory.slice(0, 25);
      await project.save();
      
      res.json({
        success: true,
        data: {
          statusCode: response.status,
          headers: response.headers,
          body: response.data,
          responseTime
        }
      });
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      const statusCode = error.response?.status || 500;
      const headers = error.response?.headers || {};
      const body = error.response?.data || { message: error.message };

      try {
        const env = project.envVars || {};
        const method = endpoint.method;
        const templatedUrl = this.applyEnvTemplating(endpoint.url, env);
        const templatedHeaders = sanitizeHeaders(this.applyEnvTemplating(endpoint.headers || {}, env));
        const templatedQuery = this.applyEnvTemplating(endpoint.queryParams || {}, env);
        const templatedBody = this.applyEnvTemplating(endpoint.body || {}, env);
        const historyEntry = {
          id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: new Date(),
          request: {
            url: templatedUrl,
            method: String(method),
            headers: templatedHeaders,
            queryParams: templatedQuery,
            body: templatedBody
          },
          response: {
            statusCode,
            headers,
            body,
            responseTime
          }
        };
        endpoint.responseHistory = endpoint.responseHistory || [];
        endpoint.responseHistory.unshift(historyEntry);
        endpoint.responseHistory = endpoint.responseHistory.slice(0, 25);
        await project.save();
      } catch (_) {}

      res.status(statusCode).json({
        success: false,
        data: {
          statusCode,
          headers,
          body,
          responseTime
        }
      });
    }
  });

  getHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { projectId, endpointId } = req.params;
    const project = await Project.findOne({ _id: projectId, ownerId: req.userId });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const endpoint = project.endpoints.find(e => e.id === endpointId);
    if (!endpoint) return res.status(404).json({ success: false, message: 'Endpoint not found' });
    res.json({ success: true, data: endpoint.responseHistory || [] });
  });

  rerunFromHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { projectId, endpointId, historyId } = req.params as any;
    const project = await Project.findOne({ _id: projectId, ownerId: req.userId });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const endpoint = project.endpoints.find(e => e.id === endpointId);
    if (!endpoint) return res.status(404).json({ success: false, message: 'Endpoint not found' });
    const entry = (endpoint.responseHistory || []).find(h => h.id === historyId);
    if (!entry) return res.status(404).json({ success: false, message: 'History entry not found' });

    const axios = require('axios');
    const startTime = Date.now();
    try {
      const cfg: any = {
        method: entry.request.method,
        url: entry.request.url,
        headers: sanitizeHeaders(entry.request.headers || {}),
        params: entry.request.queryParams || {},
        data: entry.request.body
      };
      if (!cfg.headers['accept'] && !cfg.headers['Accept']) {
        cfg.headers['Accept'] = 'application/json';
      }
      const response = await axios(cfg);
      const responseTime = Date.now() - startTime;
      const historyEntry = {
        id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date(),
        request: entry.request,
        response: {
          statusCode: response.status,
          headers: response.headers,
          body: response.data,
          responseTime
        }
      };
      endpoint.responseHistory = endpoint.responseHistory || [];
      endpoint.responseHistory.unshift(historyEntry);
      endpoint.responseHistory = endpoint.responseHistory.slice(0, 25);
      await project.save();
      res.json({ success: true, data: historyEntry });
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      res.status(error.response?.status || 500).json({
        success: false,
        data: {
          statusCode: error.response?.status || 500,
          headers: error.response?.headers || {},
          body: error.response?.data || { message: error.message },
          responseTime
        }
      });
    }
  });

  getInsights = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { projectId, endpointId } = req.params as any;
    const project = await Project.findOne({ _id: projectId, ownerId: req.userId });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const endpoint = project.endpoints.find(e => e.id === endpointId);
    if (!endpoint) return res.status(404).json({ success: false, message: 'Endpoint not found' });
    const recentHistory = (endpoint.responseHistory || []).slice(0, 5);
    const testCases = (project.testCases || []).filter(tc => tc.endpointId === endpointId);
    const env = project.envVars || {};
    const method = endpoint.method;
    const templatedUrl = this.applyEnvTemplating(endpoint.url, env);
    const templatedHeaders = sanitizeHeaders(this.applyEnvTemplating(endpoint.headers || {}, env));
    const templatedQuery = this.applyEnvTemplating(endpoint.queryParams || {}, env);
    const templatedBody = this.applyEnvTemplating(endpoint.body || {}, env);
    const requestPreview = {
      method,
      url: templatedUrl,
      headers: templatedHeaders,
      queryParams: templatedQuery,
      body: templatedBody
    };
    res.json({ success: true, data: { endpoint, testCases, recentHistory, requestPreview } });
  });
}

export const endpointController = new EndpointController();

