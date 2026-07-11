import { v2 as cloudinary, UploadApiResponse, UploadApiOptions } from 'cloudinary';
import { createModuleLogger } from '../utils/logger';

const log = createModuleLogger('Cloudinary');

// ─── Configuration ────────────────────────────────────────────────────────────

export function initializeCloudinary(): void {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  log.info('Cloudinary configured');
}

// ─── Upload Helpers ───────────────────────────────────────────────────────────

export type UploadFolder =
  | 'products'
  | 'categories'
  | 'stores'
  | 'banners'
  | 'avatars'
  | 'documents';

/**
 * Upload a buffer or base64 string to Cloudinary.
 * Returns the secure URL and public ID.
 */
export async function uploadToCloudinary(
  source: string | Buffer,
  folder: UploadFolder,
  options: Partial<UploadApiOptions> = {}
): Promise<{ url: string; publicId: string }> {
  const uploadOptions: UploadApiOptions = {
    folder: `aether-mart/${folder}`,
    resource_type: 'image',
    quality: 'auto',
    fetch_format: 'auto',
    ...options,
  };

  let result: UploadApiResponse;

  if (Buffer.isBuffer(source)) {
    result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(uploadOptions, (err, res) => {
        if (err || !res) reject(err ?? new Error('Upload failed'));
        else resolve(res);
      });
      stream.end(source);
    });
  } else {
    result = await cloudinary.uploader.upload(source, uploadOptions);
  }

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

/**
 * Delete an asset from Cloudinary by its public ID.
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    log.error('Failed to delete from Cloudinary', { publicId, error });
  }
}

/**
 * Build a Cloudinary transformation URL for resizing/optimizing images on-the-fly.
 */
export function getTransformedUrl(
  publicId: string,
  width: number,
  height?: number
): string {
  return cloudinary.url(publicId, {
    width,
    height,
    crop: 'fill',
    quality: 'auto',
    fetch_format: 'auto',
    secure: true,
  });
}

export { cloudinary };
