import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { asyncHandler } from '../middlewares/errorHandler';
import { zipParserService } from '../services/zipParserService';
import { Project } from '../models/Project';

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
 * ZIP Controller
 * Follows Single Responsibility Principle - handles ZIP file uploads and parsing
 */
export class ZipController {
  /**
   * Upload and parse ZIP file
   */
  uploadZip = [
    upload.single('zipfile'),
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const { projectId } = req.params;
      
      try {
        // Parse ZIP file
        const { fileStructure, endpoints } = await zipParserService.parseZipFile(req.file.path);
        
        // Update project with extracted endpoints
        const project = await Project.findById(projectId);
        if (!project) {
          // Clean up uploaded file
          await fs.unlink(req.file.path);
          return res.status(404).json({
            success: false,
            message: 'Project not found'
          });
        }
        
        // Add extracted endpoints to project
        project.endpoints.push(...endpoints);
        await project.save();
        
        // Clean up uploaded file
        await fs.unlink(req.file.path);
        
        res.json({
          success: true,
          data: {
            fileStructure,
            endpoints,
            message: `Successfully extracted ${endpoints.length} endpoints`
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
}

export const zipController = new ZipController();

