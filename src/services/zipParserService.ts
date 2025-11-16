import yauzl from 'yauzl';
import { promises as fs } from 'fs';
import path from 'path';
import { IApiEndpoint } from '../models/Project';

/**
 * ZIP Parser Service
 * Follows Single Responsibility Principle - handles ZIP file operations
 */
export class ZipParserService {
  /**
   * Extract and parse ZIP file containing API project
   */
  async parseZipFile(filePath: string): Promise<{
    fileStructure: string;
    endpoints: IApiEndpoint[];
  }> {
    return new Promise((resolve, reject) => {
      const fileStructure: string[] = [];
      const endpoints: IApiEndpoint[] = [];

      yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          return reject(err);
        }

        zipfile.readEntry();
        
        zipfile.on('entry', (entry) => {
          const fileName = entry.fileName;
          
          // Skip directories
          if (fileName.endsWith('/')) {
            fileStructure.push(`📁 ${fileName}`);
            zipfile.readEntry();
            return;
          }

          fileStructure.push(`📄 ${fileName}`);

          // Read file content if it's a relevant file (JSON, JS, TS, etc.)
          if (this.isRelevantFile(fileName)) {
            zipfile.openReadStream(entry, (err, readStream) => {
              if (err) {
                zipfile.readEntry();
                return;
              }

              let content = '';
              readStream.on('data', (chunk) => {
                content += chunk.toString();
              });

              readStream.on('end', () => {
                // Try to extract endpoints from file
                const extractedEndpoints = this.extractEndpointsFromContent(fileName, content);
                endpoints.push(...extractedEndpoints);
                zipfile.readEntry();
              });
            });
          } else {
            zipfile.readEntry();
          }
        });

        zipfile.on('end', () => {
          resolve({
            fileStructure: fileStructure.join('\n'),
            endpoints
          });
        });

        zipfile.on('error', reject);
      });
    });
  }

  /**
   * Check if file is relevant for endpoint extraction
   */
  private isRelevantFile(fileName: string): boolean {
    const relevantExtensions = ['.js', '.ts', '.json', '.jsx', '.tsx', '.py', '.java'];
    const relevantDirs = ['routes', 'controllers', 'api', 'endpoints', 'src'];
    
    const ext = path.extname(fileName).toLowerCase();
    const dirs = path.dirname(fileName).split(path.sep);
    
    return relevantExtensions.includes(ext) || 
           dirs.some(dir => relevantDirs.includes(dir.toLowerCase()));
  }

  /**
   * Extract endpoints from file content
   * Uses pattern matching to find API definitions
   */
  private extractEndpointsFromContent(fileName: string, content: string): IApiEndpoint[] {
    const endpoints: IApiEndpoint[] = [];
    
    // Common patterns for API definitions
    const patterns = [
      // Express.js: app.get('/path', ...), router.post('/path', ...)
      /(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
      // Fastify: fastify.get('/path', ...)
      /fastify\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
      // NestJS decorators: @Get('/path'), @Post('/path')
      /@(Get|Post|Put|Patch|Delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        const url = match[2];
        
        endpoints.push({
          id: `endpoint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: `${method} ${url}`,
          method: method as IApiEndpoint['method'],
          url: url,
          description: `Extracted from ${fileName}`
        });
      }
    });

    return endpoints;
  }
}

export const zipParserService = new ZipParserService();

