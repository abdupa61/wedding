// api/uploadthing.js - UploadThing Core API
export default async function handler(req, res) {
  console.log('API called with method:', req.method);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { files } = req.body;
  
  if (!files || !Array.isArray(files)) {
    return res.status(400).json({ error: 'Files array is required' });
  }
  
  try {
    const UPLOADTHING_SECRET = process.env.UPLOADTHING_SECRET;
    const UPLOADTHING_APP_ID = process.env.UPLOADTHING_APP_ID;
    
    if (!UPLOADTHING_SECRET || !UPLOADTHING_APP_ID) {
      throw new Error('UploadThing credentials not configured');
    }
    
    console.log('Requesting presigned URLs...');
    
    // 1. Presigned URL'leri al
    const presignedResponse = await fetch('https://api.uploadthing.com/v6/requestFileUpload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Uploadthing-Api-Key': UPLOADTHING_SECRET,
        'X-Uploadthing-Version': '6.13.2'
      },
      body: JSON.stringify({
        files: files.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type
        })),
        metadata: {},
        acl: 'public-read'
      })
    });
    
    if (!presignedResponse.ok) {
      const errorText = await presignedResponse.text();
      console.error('Presigned URL error:', errorText);
      throw new Error(`Presigned URL error: ${presignedResponse.status} - ${errorText}`);
    }
    
    const presignedData = await presignedResponse.json();
    console.log('Presigned URLs received:', presignedData);
    
    // Frontend'e presigned URL'leri döndür
    // Frontend bu URL'leri kullanarak doğrudan dosyaları yükleyecek
    return res.status(200).json({
      data: presignedData.data || presignedData,
      success: true
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ 
      error: 'Upload failed', 
      message: error.message 
    });
  }
}
