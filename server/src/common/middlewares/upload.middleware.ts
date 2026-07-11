import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import path from 'path';

// ─── Allowed File Types ───────────────────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// ─── Memory Storage (files sent to Cloudinary directly) ──────────────────────
// Files are kept in memory as Buffers — never written to disk.
// This is the correct approach when streaming directly to Cloudinary.

const memoryStorage = multer.memoryStorage();

// ─── File Filters ─────────────────────────────────────────────────────────────

function imageFileFilter(
  _req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
): void {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(
      new Error(
        `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.map((t) => path.extname(t)).join(', ')}`
      )
    );
  }
}

function documentFileFilter(
  _req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
): void {
  const allAllowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];
  if (allAllowed.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(new Error('Invalid file type. Only images and PDFs are allowed.'));
  }
}

// ─── Upload Middleware Instances ──────────────────────────────────────────────

/**
 * For single image uploads (product images, avatars, etc.)
 */
export const uploadSingleImage = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
}).single('image');

/**
 * For multiple image uploads (product galleries — up to 5 images)
 */
export const uploadMultipleImages = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 5 },
}).array('images', 5);

/**
 * For document uploads (merchant verification documents)
 */
export const uploadDocument = multer({
  storage: memoryStorage,
  fileFilter: documentFileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 }, // 10MB for documents
}).single('document');
