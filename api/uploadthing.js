const { UTApi } = require("uploadthing/server");

// Vercel serverless function handler
module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // OPTIONS request için preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Environment variable kontrolü
    if (!process.env.UPLOADTHING_SECRET) {
      console.error('UPLOADTHING_SECRET environment variable is missing');
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'UploadThing API key not configured' 
      });
    }

    // UTApi instance oluştur
    const utapi = new UTApi({
      apiKey: process.env.UPLOADTHING_SECRET,
    });

    if (req.method === 'POST') {
      console.log('POST request received');
      
      // Request body'yi kontrol et
      if (!req.body) {
        return res.status(400).json({ error: 'Request body is required' });
      }

      const { files } = req.body;
      
      if (!files || !Array.isArray(files)) {
        return res.status(400).json({ error: 'Files array is required in request body' });
      }

      console.log(`Processing ${files.length} files`);

      // Her dosya için presigned URL oluştur
      const uploadData = [];
      
      for (const fileInfo of files) {
        try {
          // UploadThing API'sine presigned URL isteği
          const presignedUrl = await utapi.requestFileAccess({
            fileKey: `wedding-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
            fileName: fileInfo.name,
            fileSize: fileInfo.size,
            fileType: fileInfo.type
          });

          uploadData.push({
            name: fileInfo.name,
            size: fileInfo.size,
            type: fileInfo.type,
            presignedUrl: presignedUrl.url,
            key: presignedUrl.key,
            url: `https://utfs.io/f/${presignedUrl.key}`
          });

        } catch (error) {
          console.error(`Error creating presigned URL for ${fileInfo.name}:`, error);
          
          // UploadThing'in basit upload endpoint'ini kullan
          uploadData.push({
            name: fileInfo.name,
            size: fileInfo.size,
            type: fileInfo.type,
            presignedUrl: `https://api.uploadthing.com/v6/uploadFiles`,
            key: `wedding-${Date.now()}-${fileInfo.name}`,
            url: null // Upload sonrası dönecek
          });
        }
      }

      console.log('Generated upload data for', uploadData.length, 'files');
      res.status(200).json(uploadData);

    } else if (req.method === 'GET') {
      // Health check endpoint
      res.status(200).json({ 
        status: 'OK', 
        message: 'UploadThing API is running',
        timestamp: new Date().toISOString(),
        hasApiKey: !!process.env.UPLOADTHING_SECRET
      });
      
    } else {
      res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
