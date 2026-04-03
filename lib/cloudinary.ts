import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

export interface UploadResult {
  url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
}

export async function uploadImage(
  file: Buffer | string,
  options: { folder?: string; transformation?: string[] } = {}
): Promise<UploadResult> {
  const { folder = 'products', transformation } = options;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        transformation: transformation || [{ quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            url: result.secure_url,
            public_id: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
          });
        } else {
          reject(new Error('Upload failed with no result'));
        }
      }
    );

    if (typeof file === 'string') {
      uploadStream.end(Buffer.from(file));
    } else {
      uploadStream.end(file);
    }
  });
}

export async function deleteImage(publicId: string): Promise<{ result: string }> {
  return cloudinary.uploader.destroy(publicId);
}
