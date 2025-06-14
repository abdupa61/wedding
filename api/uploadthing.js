import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { files } = req.body;
    
    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'Files array is required' });
    }

    // Validate files
    for (const file of files) {
      if (!file.name || !file.type) {
        return res.status(400).json({ error: 'Invalid file data' });
      }
      
      if (file.size > 8 * 1024 * 1024) { // 8MB limit
        return res.status(400).json({ error: `File ${file.name} is too large` });
      }
      
      if (!file.type.startsWith('image/')) {
        return res.status(400).json({ error: `File ${file.name} is not an image` });
      }
    }

    // Create upload URLs for each file
    const uploadPromises = files.map(async (file) => {
      try {
        // Generate a presigned URL for upload
        const response = await utapi.requestFileAccess({
          fileKey: `wedding-photos/${Date.now()}-${file.name}`,
        });
        
        return {
          name: file.name,
          url: response.url || `https://utfs.io/f/${Date.now()}-${file.name}`,
          uploadUrl: response.url
        };
      } catch (error) {
        console.error('Error creating upload URL:', error);
        return {
          name: file.name,
          url: `https://utfs.io/f/${Date.now()}-${file.name}`,
          error: error.message
        };
      }
    });

    const uploadData = await Promise.all(uploadPromises);
    
    res.status(200).json(uploadData);
    
  } catch (error) {
    console.error('Upload API Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
