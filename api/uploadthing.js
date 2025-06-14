import { createUploadthing } from "uploadthing/server";
import { UploadThingError } from "uploadthing/server";

// UploadThing instance'ı oluştur
const f = createUploadthing();

// Route definitions
const ourFileRouter = {
  // Görsel upload route'u
  imageUploader: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 10
    }
  })
    .middleware(async ({ req }) => {
      // Middleware - auth kontrolü vs yapabilirsiniz
      console.log("File upload middleware executed");
      
      // Metadata return edebilirsiniz
      return { uploadedBy: "wedding-guest" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Upload tamamlandığında çalışır
      console.log("Upload complete for user:", metadata.uploadedBy);
      console.log("File URL:", file.url);
      
      // Client'a return edilecek data
      return { uploadedBy: metadata.uploadedBy, fileUrl: file.url };
    }),
};

// Vercel serverless function için handler
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // OPTIONS request için
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // UploadThing API key kontrolü
    if (!process.env.UPLOADTHING_SECRET) {
      throw new Error('UPLOADTHING_SECRET environment variable is required');
    }

    if (req.method === 'POST') {
      // Presigned URL generation için
      const { files } = req.body;
      
      if (!files || !Array.isArray(files)) {
        return res.status(400).json({ error: 'Files array is required' });
      }

      // UploadThing'den presigned URL'leri al
      const { createUploadthing } = await import("uploadthing/server");
      const utapi = createUploadthing();
      
      // Her dosya için presigned URL oluştur
      const uploadPromises = files.map(async (fileInfo) => {
        try {
          // UploadThing'in yeni API'sını kullan
          const response = await fetch(`https://api.uploadthing.com/v6/uploadFiles`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Uploadthing-Api-Key': process.env.UPLOADTHING_SECRET,
            },
            body: JSON.stringify({
              files: [{
                name: fileInfo.name,
                size: fileInfo.size,
                type: fileInfo.type
              }],
              metadata: {
                uploadedBy: "wedding-guest"
              }
            })
          });

          if (!response.ok) {
            const errorData = await response.text();
            console.error('UploadThing API Error:', errorData);
            throw new Error(`UploadThing API error: ${response.status}`);
          }

          const data = await response.json();
          return data.data[0]; // İlk dosyanın upload bilgileri
          
        } catch (error) {
          console.error('Upload preparation error:', error);
          throw error;
        }
      });

      const uploadData = await Promise.all(uploadPromises);
      
      res.status(200).json(uploadData);

    } else if (req.method === 'GET') {
      // Health check
      res.status(200).json({ 
        status: 'OK', 
        message: 'UploadThing API is running',
        timestamp: new Date().toISOString()
      });
      
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// UploadThing router'ı export et (gerekirse)
export { ourFileRouter };
