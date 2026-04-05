import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export { cloudinary };

/**
 * Uploads a file buffer to Cloudinary under a specific folder.
 * Returns the secure URL and public_id.
 */
export async function uploadToCloudinary(
    buffer: Buffer,
    filename: string,
    folder = "examcraft/kyc"
): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                public_id: filename,
                resource_type: "auto",
                access_mode: "authenticated", // private — requires signed URL to access
            },
            (error, result) => {
                if (error || !result) {
                    reject(error || new Error("Cloudinary upload failed"));
                } else {
                    resolve({ url: result.secure_url, publicId: result.public_id });
                }
            }
        );
        stream.end(buffer);
    });
}
