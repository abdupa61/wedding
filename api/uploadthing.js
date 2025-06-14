// api/uploadthing.js
import { createUploadthing } from "uploadthing/next";

// UploadThing instance'ını oluştur
const f = createUploadthing();

// Route tanımla
export const ourFileRouter = {
  imageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 10 } })
    .middleware(async ({ req }) => {
      // Middleware - auth kontrolü vs yapabilirsiniz
      return { userId: "anonymous" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("file url", file.url);
      return { uploadedBy: metadata.userId };
    }),
};

// API handler
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { files } = req.body;
    
    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'Files array is required' });
    }

    // UploadThing API'sine presigned URL isteği
    const response = await fetch('https://uploadthing.com/api/uploadFiles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Uploadthing-Api-Key': process.env.UPLOADTHING_SECRET,
      },
      body: JSON.stringify({
        files: files.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type
        })),
        routeSlug: 'imageUploader'
      })
    });

    if (!response.ok) {
      throw new Error(`UploadThing API error: ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
}
