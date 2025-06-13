// api/uploadthing.js - Vercel serverless function
export default async function handler(req, res) {
  console.log('API called with method:', req.method);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // OPTIONS request için
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request handled');
    res.status(200).end();
    return;
  }
  
  // Sadece POST method kabul et
  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed', method: req.method });
  }
  
  console.log('POST request body:', req.body);
  
  const { files } = req.body;
  
  if (!files || !Array.isArray(files)) {
    console.log('Invalid files data:', files);
    return res.status(400).json({ error: 'Files array is required' });
  }
  
  try {
    // Environment variables kontrol
    const UPLOADTHING_SECRET = process.env.UPLOADTHING_SECRET;
    const UPLOADTHING_APP_ID = process.env.UPLOADTHING_APP_ID;
    
    console.log('Environment check:', {
      hasSecret: !!UPLOADTHING_SECRET,
      hasAppId: !!UPLOADTHING_APP_ID
    });
    
    if (!UPLOADTHING_SECRET || !UPLOADTHING_APP_ID) {
      throw new Error('uploadThing credentials not configured');
    }
    
    console.log('Making request to uploadThing API...');
    
    // uploadThing API'sine presigned URL isteği
    const response = await fetch('https://api.uploadthing.com/v6/requestFileUpload', {
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
    
    console.log('uploadThing response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('uploadThing API error:', errorText);
      throw new Error(`uploadThing API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('uploadThing response data:', data);
    
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
