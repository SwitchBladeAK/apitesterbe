import { Request, Response } from 'express';
import axios from 'axios';
import { asyncHandler } from '../middlewares/errorHandler';
import { Project } from '../models/Project';

export class TestsController {
  private randomString(len = 5): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
    return out;
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomFloat(min: number, max: number, decimals = 2): number {
    const n = Math.random() * (max - min) + min;
    return parseFloat(n.toFixed(decimals));
  }

  private applyPlaceholders(value: any): any {
    if (typeof value === 'string') {
      if (value === '{{UUID}}') {
        // simple uuid v4-ish
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
          const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      }
      if (value === '{{RANDOM_STRING}}') return this.randomString(6);
      if (value.startsWith('{{RANDOM_INT')) {
        const m = value.match(/\{\{RANDOM_INT:(-?\d+),(-?\d+)\}\}/);
        if (m) return this.randomInt(parseInt(m[1], 10), parseInt(m[2], 10));
        return this.randomInt(1, 1000);
      }
      if (value.startsWith('{{RANDOM_FLOAT')) {
        const m = value.match(/\{\{RANDOM_FLOAT:([-\d.]+),([-\d.]+)(?:,(\d+))?\}\}/);
        if (m) return this.randomFloat(parseFloat(m[1]), parseFloat(m[2]), m[3] ? parseInt(m[3], 10) : 2);
        return this.randomFloat(1, 1000, 2);
      }
      return value;
    } else if (Array.isArray(value)) {
      return value.map(v => this.applyPlaceholders(v));
    } else if (value && typeof value === 'object') {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(value)) {
        out[k] = this.applyPlaceholders(v);
      }
      return out;
    }
    return value;
  }

  private randomizeByHeuristics(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    const clone: any = Array.isArray(obj) ? [] : {};
    for (const [key, val] of Object.entries(obj)) {
      if (val && typeof val === 'object') {
        clone[key] = this.randomizeByHeuristics(val);
        continue;
      }
      const lowerKey = key.toLowerCase();
      if (typeof val === 'string') {
        if (lowerKey.includes('name')) {
          clone[key] = `${val} - ${this.randomString(5)}`;
        } else if (lowerKey.includes('cpu')) {
          const models = ['Intel Core i7', 'Intel Core i9', 'Apple M1', 'Apple M2', 'AMD Ryzen 7'];
          clone[key] = models[this.randomInt(0, models.length - 1)];
        } else if (lowerKey.includes('breed')) {
          const breeds = ['Border Collie', 'Golden Retriever', 'German Shepherd', 'Shiba Inu', 'Poodle'];
          clone[key] = breeds[this.randomInt(0, breeds.length - 1)];
        } else if (lowerKey.includes('tag')) {
          clone[key] = `tag-${this.randomString(5).toLowerCase()}`;
        } else {
          clone[key] = val;
        }
      } else if (typeof val === 'number') {
        if (lowerKey.includes('price')) {
          clone[key] = this.randomFloat(500, 2500, 2);
        } else if (lowerKey.includes('year')) {
          clone[key] = this.randomInt(2016, new Date().getFullYear());
        } else {
          // nudge numeric ±10%
          const delta = val * 0.1;
          clone[key] = this.randomFloat(val - delta, val + delta, 2);
        }
      } else {
        clone[key] = val;
      }
    }
    return clone;
  }

  private toSnippet(value: any, maxLen = 2000): any {
    try {
      const str = typeof value === 'string' ? value : JSON.stringify(value);
      if (str.length > maxLen) {
        return str.slice(0, maxLen) + '…';
      }
      return typeof value === 'string' ? value : JSON.parse(str);
    } catch {
      return value;
    }
  }

  runTests = asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const { testCaseIds, randomize, count } = req.body as { testCaseIds?: string[]; randomize?: boolean; count?: number };
    const sendCount = Math.max(1, Math.min(20, Number.isFinite(count as any) ? (count as number) : 1));

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const casesToRun = project.testCases.filter(tc =>
      !testCaseIds || testCaseIds.length === 0 ? true : testCaseIds.includes(tc.id)
    );

    const results: Array<{ id: string; status: 'pass' | 'fail'; statusCode: number; error?: string }> = [];

    for (const tc of casesToRun) {
      const endpoint = project.endpoints.find(e => e.id === tc.endpointId);
      if (!endpoint) {
        results.push({ id: tc.id, status: 'fail', statusCode: 0, error: 'Endpoint not found' });
        tc.status = 'fail';
        continue;
      }

      for (let i = 0; i < sendCount; i++) {
        try {
          const config: any = {
            method: endpoint.method,
            url: endpoint.url,
            headers: endpoint.headers || {},
            params: endpoint.queryParams || {},
            data: undefined as any,
            validateStatus: () => true,
            timeout: 15000
          };
          if (!config.headers['accept'] && !config.headers['Accept']) {
            config.headers['Accept'] = 'application/json';
          }

          const baseBody = endpoint.body || undefined;
          const withPlaceholders = this.applyPlaceholders(baseBody);
          const applyRandom = Boolean(randomize) || sendCount > 1;
          config.data = applyRandom ? this.randomizeByHeuristics(withPlaceholders) : withPlaceholders;

          const resp = await axios.request(config);
          const ok = resp.status >= 200 && resp.status < 300;
          tc.status = ok ? 'pass' : 'fail';
          results.push({
            id: sendCount > 1 ? `${tc.id}#${i + 1}` : tc.id,
            status: ok ? 'pass' : 'fail',
            statusCode: resp.status,
            error: ok ? undefined : `Expected 2xx, got ${resp.status}`,
            details: ok ? undefined : {
              responseHeaders: resp.headers,
              responseBody: this.toSnippet(resp.data),
              request: {
                method: String(config.method),
                url: String(config.url),
                headers: config.headers,
                params: config.params,
                body: this.toSnippet(config.data)
              }
            }
          } as any);
        } catch (error: any) {
          tc.status = 'fail';
          const statusCode = error?.response?.status ?? 0;
          results.push({
            id: sendCount > 1 ? `${tc.id}#${i + 1}` : tc.id,
            status: 'fail',
            statusCode,
            error: error?.message || 'Request failed',
            details: {
              responseHeaders: error?.response?.headers,
              responseBody: this.toSnippet(error?.response?.data),
              request: {
                method: String(error?.config?.method || endpoint.method),
                url: String(error?.config?.url || endpoint.url),
                headers: error?.config?.headers || endpoint.headers || {},
                params: error?.config?.params || endpoint.queryParams || {},
                body: this.toSnippet(error?.config?.data)
              }
            }
          } as any);
        }
      }
    }

    await project.save();

    res.json({
      success: true,
      data: {
        results
      }
    });
  });
}

export const testsController = new TestsController();


