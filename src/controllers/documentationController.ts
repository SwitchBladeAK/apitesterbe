import { Request, Response } from 'express';
import multer from 'multer';
import { promises as fs } from 'fs';
import { asyncHandler } from '../middlewares/errorHandler';
import { aiRateLimiter } from '../middlewares/rateLimiter';
import { geminiService } from '../services/geminiService';
import { zipParserService } from '../services/zipParserService';
import { IApiEndpoint } from '../models/Project';
import { Documentation } from '../models/Documentation';
import { AuthenticatedRequest } from '../middlewares/auth';

/**
 * Configure multer for file uploads
 */
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'));
    }
  }
});

/**
 * Documentation Controller
 * Handles standalone documentation generation from ZIP/JSON imports
 */
export class DocumentationController {
  /**
   * Import APIs from ZIP file and generate documentation
   */
  importFromZip = [
    upload.single('zipfile'),
    aiRateLimiter,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      try {
        // Parse ZIP file
        const { fileStructure, endpoints } = await zipParserService.parseZipFile(req.file.path);
        
        // Generate professional documentation
        const documentation = await geminiService.generateProfessionalDocumentation(
          endpoints,
          fileStructure
        );
        
        // Save documentation to database
        const title = req.file.originalname.replace('.zip', '') || `Documentation ${new Date().toLocaleDateString()}`;
        const savedDoc = await Documentation.create({
          userId: req.userId,
          title,
          documentation,
          endpoints,
          fileStructure,
          endpointCount: endpoints.length,
          source: 'zip'
        });
        
        // Clean up uploaded file
        await fs.unlink(req.file.path);
        
        res.json({
          success: true,
          data: {
            id: savedDoc._id,
            documentation,
            endpoints,
            fileStructure,
            endpointCount: endpoints.length,
            createdAt: savedDoc.createdAt
          }
        });
      } catch (error: any) {
        // Clean up uploaded file on error
        if (req.file) {
          await fs.unlink(req.file.path).catch(() => {});
        }
        
        throw error;
      }
    })
  ];

  /**
   * Import APIs from JSON and generate documentation
   */
  importFromJson = [
    aiRateLimiter,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { apis, folderStructure, title } = req.body;

      if (!apis || !Array.isArray(apis)) {
        return res.status(400).json({
          success: false,
          message: 'APIs array is required'
        });
      }

      try {
        // Convert JSON APIs to endpoint format
        const endpoints: IApiEndpoint[] = apis.map((api: any, index: number) => ({
          id: api.id || `endpoint-${Date.now()}-${index}`,
          name: api.name || api.path || `Endpoint ${index + 1}`,
          method: api.method || 'GET',
          url: api.url || api.path || '',
          headers: api.headers || {},
          queryParams: api.queryParams || api.query || {},
          body: api.body || api.requestBody || {},
          folderPath: api.folderPath || api.folder || '',
          description: api.description || ''
        }));

        // Generate professional documentation
        const documentation = await geminiService.generateProfessionalDocumentation(
          endpoints,
          folderStructure || ''
        );

        // Save documentation to database
        const docTitle = title || `Documentation ${new Date().toLocaleDateString()}`;
        const savedDoc = await Documentation.create({
          userId: req.userId,
          title: docTitle,
          documentation,
          endpoints,
          fileStructure: folderStructure || '',
          endpointCount: endpoints.length,
          source: 'json'
        });

        res.json({
          success: true,
          data: {
            id: savedDoc._id,
            documentation,
            endpoints,
            fileStructure: folderStructure || '',
            endpointCount: endpoints.length,
            createdAt: savedDoc.createdAt
          }
        });
      } catch (error: any) {
        throw error;
      }
    })
  ];

  importFromJsonRaw = [
    aiRateLimiter,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { jsonData } = req.body;

      if (!jsonData || typeof jsonData !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'JSON data string is required'
        });
      }

      try {
        // Parse JSON
        const parsed = JSON.parse(jsonData);
        
        // Try to extract APIs from various formats
        let apis: any[] = [];
        let folderStructure = '';

        // Format 1: Direct array
        if (Array.isArray(parsed)) {
          apis = parsed;
        }
        // Format 2: Postman collection format (collection at root or nested)
        else if (parsed.collection) {
          const collection = parsed.collection;
          apis = collection.requests || [];
          
          // Build folder structure from Postman folders
          if (collection.folders && Array.isArray(collection.folders)) {
            // Map requests to folders
            apis = apis.map((req: any) => {
              // Find which folder contains this request
              const folder = collection.folders.find((f: any) => 
                f.order && Array.isArray(f.order) && f.order.includes(req.id)
              );
              return {
                ...req,
                folderPath: folder ? folder.name : '',
                folderDescription: folder ? folder.description : ''
              };
            });
            
            // Build folder structure string
            folderStructure = collection.folders
              .map((f: any) => `${f.name}${f.description ? ` - ${f.description}` : ''}\n  ${(f.order && Array.isArray(f.order) ? f.order.length : 0)} endpoints`)
              .join('\n');
          }
        }
        // Format 2b: Postman format with requests/folders at root
        else if (parsed.requests && Array.isArray(parsed.requests)) {
          apis = parsed.requests;
          
          if (parsed.folders && Array.isArray(parsed.folders)) {
            apis = apis.map((req: any) => {
              const folder = parsed.folders.find((f: any) => 
                f.order && Array.isArray(f.order) && f.order.includes(req.id)
              );
              return {
                ...req,
                folderPath: folder ? folder.name : '',
                folderDescription: folder ? folder.description : ''
              };
            });
            
            folderStructure = parsed.folders
              .map((f: any) => `${f.name}${f.description ? ` - ${f.description}` : ''}\n  ${(f.order && Array.isArray(f.order) ? f.order.length : 0)} endpoints`)
              .join('\n');
          }
        }
        // Format 3: Object with apis/endpoints property
        else if (parsed.apis && Array.isArray(parsed.apis)) {
          apis = parsed.apis;
          folderStructure = parsed.folderStructure || parsed.fileStructure || '';
        }
        else if (parsed.endpoints && Array.isArray(parsed.endpoints)) {
          apis = parsed.endpoints;
          folderStructure = parsed.folderStructure || parsed.fileStructure || '';
        }
        // Format 4: Use AI to parse if format is unknown
        else {
          // Use AI to extract APIs from unknown format
          const extracted = await geminiService.parseApiJson(JSON.stringify(parsed));
          apis = extracted.apis || [];
          folderStructure = extracted.folderStructure || '';
        }

        if (!Array.isArray(apis) || apis.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No APIs found in JSON. Please check the format.'
          });
        }

        // Convert to endpoint format
        const endpoints: IApiEndpoint[] = apis.map((api: any, index: number) => {
          // Handle Postman format
          const url = api.url || api.path || '';
          const method = (api.method || 'GET').toUpperCase();
          
          return {
            id: api.id || `endpoint-${Date.now()}-${index}`,
            name: api.name || url.split('/').pop() || `Endpoint ${index + 1}`,
            method: method,
            url: url.replace(/\{\{base_url\}\}/g, '').replace(/^\//, ''),
            headers: api.headers || api.header || {},
            queryParams: api.queryParams || api.query || (api.url && typeof api.url === 'object' ? api.url.query : {}),
            body: api.body || api.requestBody || api.request?.body || {},
            folderPath: api.folderPath || api.folder || '',
            description: api.description || ''
          };
        });

        // Generate professional documentation
        const documentation = await geminiService.generateProfessionalDocumentation(
          endpoints,
          folderStructure
        );

        // Save documentation to database
        const title = `Documentation ${new Date().toLocaleDateString()}`;
        const savedDoc = await Documentation.create({
          userId: req.userId,
          title,
          documentation,
          endpoints,
          fileStructure: folderStructure,
          endpointCount: endpoints.length,
          source: 'json'
        });

        res.json({
          success: true,
          data: {
            id: savedDoc._id,
            documentation,
            endpoints,
            fileStructure: folderStructure,
            endpointCount: endpoints.length,
            createdAt: savedDoc.createdAt
          }
        });
      } catch (error: any) {
        if (error instanceof SyntaxError) {
          return res.status(400).json({
            success: false,
            message: 'Invalid JSON format: ' + error.message
          });
        }
        throw error;
      }
    })
  ];

  /**
   * Generate documentation from endpoints (standalone)
   */
  generateFromEndpoints = [
    aiRateLimiter,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { endpoints, folderStructure, title } = req.body;

      if (!endpoints || !Array.isArray(endpoints)) {
        return res.status(400).json({
          success: false,
          message: 'Endpoints array is required'
        });
      }

      try {
        const documentation = await geminiService.generateProfessionalDocumentation(
          endpoints,
          folderStructure || ''
        );

        // Save documentation to database
        const docTitle = title || `Documentation ${new Date().toLocaleDateString()}`;
        const savedDoc = await Documentation.create({
          userId: req.userId,
          title: docTitle,
          documentation,
          endpoints,
          fileStructure: folderStructure || '',
          endpointCount: endpoints.length,
          source: 'endpoints'
        });

        res.json({
          success: true,
          data: {
            id: savedDoc._id,
            documentation,
            endpointCount: endpoints.length,
            createdAt: savedDoc.createdAt
          }
        });
      } catch (error: any) {
        throw error;
      }
    })
  ];

  /**
   * Get all previous documentation for the authenticated user
   */
  getPreviousDocumentation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const docs = await Documentation.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .select('_id title endpointCount source createdAt updatedAt')
      .limit(100);

    res.json({
      success: true,
      data: docs
    });
  });

  /**
   * Get a specific documentation by ID
   */
  getDocumentationById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    
    const doc = await Documentation.findOne({ _id: id, userId: req.userId });
    
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Documentation not found'
      });
    }

    res.json({
      success: true,
      data: doc
    });
  });

  /**
   * Delete a documentation
   */
  deleteDocumentation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    
    const doc = await Documentation.findOneAndDelete({ _id: id, userId: req.userId });
    
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Documentation not found'
      });
    }

    res.json({
      success: true,
      message: 'Documentation deleted successfully'
    });
  });
}

export const documentationController = new DocumentationController();

