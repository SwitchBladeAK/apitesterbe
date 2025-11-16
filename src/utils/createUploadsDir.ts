import { promises as fs } from 'fs';
import path from 'path';

/**
 * Create uploads directory if it doesn't exist
 * Follows DRY principle - reusable utility
 */
export const ensureUploadsDirectory = async (): Promise<void> => {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  
  try {
    await fs.access(uploadsDir);
  } catch {
    // Directory doesn't exist, create it
    await fs.mkdir(uploadsDir, { recursive: true });
  }
};

