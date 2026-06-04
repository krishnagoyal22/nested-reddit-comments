import { v2 as cloudinary } from 'cloudinary'
import dotenv from 'dotenv'

dotenv.config()

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

/**
 * Upload video to Cloudinary
 * @param {Buffer} fileBuffer - Video file buffer
 * @param {string} originalFilename - Original filename
 * @returns {Promise<Object>} Upload result with videoUrl, thumbnailUrl, duration, fileSize
 */
export async function uploadVideo(fileBuffer, originalFilename) {
  try {
    // Convert buffer to base64 for Cloudinary upload
    const base64Video = `data:video/mp4;base64,${fileBuffer.toString('base64')}`

    // Upload video to Cloudinary with video processing options
    const result = await cloudinary.uploader.upload(base64Video, {
      resource_type: 'video',
      folder: 'nested-reddit-videos',
      public_id: `video_${Date.now()}`,
      chunk_size: 6000000, // 6MB chunks for large files
      eager: [
        {
          format: 'jpg',
          transformation: [
            { width: 640, height: 360, crop: 'fill', quality: 'auto' }
          ]
        }
      ],
      eager_async: true,
    })

    // Extract relevant information
    return {
      videoUrl: result.secure_url,
      thumbnailUrl: result.eager?.[0]?.secure_url || result.secure_url.replace(/\.[^.]+$/, '.jpg'),
      duration: result.duration || 0,
      fileSize: result.bytes || 0,
      publicId: result.public_id,
    }
  } catch (error) {
    console.error('Error uploading video to Cloudinary:', error)
    throw new Error('Failed to upload video')
  }
}

/**
 * Delete video from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<void>}
 */
export async function deleteVideo(publicId) {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'video' })
  } catch (error) {
    console.error('Error deleting video from Cloudinary:', error)
    throw new Error('Failed to delete video')
  }
}

/**
 * Validate video file signature (magic bytes)
 * Ensures file is actually a video, not a disguised malicious file
 * @param {Buffer} buffer - File buffer
 * @param {string} mimetype - MIME type
 * @returns {Object} Validation result
 */
function validateVideoSignature(buffer, mimetype) {
  if (!buffer || buffer.length < 12) {
    return { valid: false, error: 'File is too small or corrupted' }
  }

  // Common video file signatures (magic bytes)
  const videoSignatures = {
    'video/mp4': [
      [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], // ftyp
      [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // ftyp variant
    ],
    'video/webm': [
      [0x1A, 0x45, 0xDF, 0xA3], // EBML
    ],
    'video/x-msvideo': [
      [0x52, 0x49, 0x46, 0x46], // RIFF
    ],
    'video/quicktime': [
      [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], // mov uses ftyp
    ],
  }

  const signatures = videoSignatures[mimetype] || []

  // Check if file matches any known signature
  let validSignature = false
  for (const signature of signatures) {
    let matches = true
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) {
        matches = false
        break
      }
    }
    if (matches) {
      validSignature = true
      break
    }
  }

  // For RIFF files (AVI, WAV, etc.), check that it's actually a video
  if (mimetype === 'video/x-msvideo') {
    const headerStr = buffer.subarray(8, 12).toString('ascii')
    if (headerStr !== 'AVI ') {
      return { valid: false, error: 'File signature does not match video type' }
    }
    validSignature = true
  }

  if (!validSignature && signatures.length > 0) {
    return {
      valid: false,
      error: 'File signature does not match video type. The file may be corrupted or not a valid video.'
    }
  }

  return { valid: true }
}

/**
 * Validate video file
 * @param {Object} file - File object with mimetype, size, and optional buffer
 * @returns {Object} Validation result
 */
export function validateVideo(file) {
  const maxSize = parseInt(process.env.MAX_VIDEO_SIZE) || 104857600 // 100MB default
  const allowedTypes = (process.env.ALLOWED_VIDEO_TYPES || 'video/mp4,video/webm,video/quicktime').split(',')

  // Validate MIME type
  if (!allowedTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
    }
  }

  // Validate file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${Math.floor(maxSize / 1024 / 1024)}MB`
    }
  }

  // Validate file signature if buffer is provided
  if (file.buffer) {
    const signatureValidation = validateVideoSignature(file.buffer, file.mimetype)
    if (!signatureValidation.valid) {
      return signatureValidation
    }
  }

  return { valid: true }
}
