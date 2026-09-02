const fs = require('fs');
const path = require('path');

/**
 * Storage Service for Persistent Cloud Uploads
 * Supports Cloudinary, Supabase Storage, and fallback for local development.
 */
class StorageService {
  constructor() {
    this.cloudinary = null;
    this.initCloudinary();
  }

  initCloudinary() {
    if (process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)) {
      try {
        const cloudinary = require('cloudinary').v2;
        if (process.env.CLOUDINARY_URL) {
          cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL });
        } else {
          cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
          });
        }
        this.cloudinary = cloudinary;
        console.log('  ☁️  StorageService: Cloudinary persistent storage configured.');
      } catch (err) {
        console.warn('  ⚠️ StorageService: Cloudinary SDK notice:', err.message);
      }
    }
  }

  /**
   * Upload file to persistent storage
   * @param {Object} file - Multer file object
   * @param {string} folder - Folder name e.g. 'selfies', 'receipts', 'sites'
   * @returns {Promise<string>} Permanent public image URL
   */
  async uploadFile(file, folder = 'uploads') {
    if (!file) return null;

    // 1. If Cloudinary is configured
    if (this.cloudinary && file.path && fs.existsSync(file.path)) {
      try {
        const result = await this.cloudinary.uploader.upload(file.path, {
          folder: `safe_solutions/${folder}`,
          resource_type: 'auto'
        });
        // Clean up temporary local file
        fs.unlink(file.path, () => {});
        return result.secure_url;
      } catch (cloudErr) {
        console.error('Cloudinary upload error, using fallback:', cloudErr.message);
      }
    }

    // 2. If Supabase Storage is configured via ENV
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const fileBuffer = file.buffer || fs.readFileSync(file.path);
        const fileName = `${folder}/${Date.now()}-${file.filename || file.originalname}`;
        
        const response = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/public-uploads/${fileName}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': file.mimetype || 'image/jpeg'
          },
          body: fileBuffer
        });

        if (response.ok) {
          if (file.path && fs.existsSync(file.path)) fs.unlink(file.path, () => {});
          return `${process.env.SUPABASE_URL}/storage/v1/object/public/public-uploads/${fileName}`;
        }
      } catch (supaErr) {
        console.error('Supabase upload error, using fallback:', supaErr.message);
      }
    }

    // 3. Fallback: Return relative upload path or base64 Data URI for durable persistence if local file
    if (file.path && fs.existsSync(file.path)) {
      try {
        const fileBuffer = fs.readFileSync(file.path);
        const mime = file.mimetype || 'image/jpeg';
        return `data:${mime};base64,${fileBuffer.toString('base64')}`;
      } catch {
        const filename = path.basename(file.path);
        return `/uploads/${folder}/${filename}`;
      }
    }

    if (file.buffer) {
      const mime = file.mimetype || 'image/jpeg';
      return `data:${mime};base64,${file.buffer.toString('base64')}`;
    }

    return null;
  }
}

module.exports = new StorageService();
