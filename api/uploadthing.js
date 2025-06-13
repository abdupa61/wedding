// api/uploadthing.js - Vercel serverless function
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { files } = req.body;

  if (!files || !Array.isArray(files)) {
    return res.status(400).json({ error: 'Files array is required' });
  }

  try {
    // uploadThing API anahtarları - environment variables'dan al
    const UPLOADTHING_SECRET = process.env.UPLOADTHING_SECRET;
    const UPLOADTHING_APP_ID = process.env.UPLOADTHING_APP_ID;

    if (!UPLOADTHING_SECRET || !UPLOADTHING_APP_ID) {
      throw new Error('uploadThing credentials not configured');
    }

    // uploadThing API'sine presigned URL isteği
    const response = await fetch('https://uploadthing.com/api/requestFileUpload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Uploadthing-Api-Key': UPLOADTHING_SECRET,
        'X-Uploadthing-Version': '6.0.2'
      },
      body: JSON.stringify({
        files: files.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type
        })),
        metadata: {},
        callbackUrl: null,
        callbackSlug: null
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`uploadThing API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Presigned URL'leri frontend'e döndür
    res.status(200).json(data);

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed', 
      message: error.message 
    });
  }
}
