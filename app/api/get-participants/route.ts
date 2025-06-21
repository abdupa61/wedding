import { NextRequest, NextResponse } from 'next/server';
import { UTApi } from 'uploadthing/server';

const utapi = new UTApi();

export async function GET() {
  try {
    console.log('📋 get-participants API çağrıldı');
    
    // UploadThing'den tüm dosyaları al
    const filesResponse = await utapi.listFiles();
    console.log('📋 UploadThing API response:', filesResponse);
    console.log('📋 Response type:', typeof filesResponse);
    
    // Response yapısını kontrol et
    let files = [];
    if (filesResponse && typeof filesResponse === 'object') {
      if (Array.isArray(filesResponse)) {
        files = filesResponse;
      } else if (filesResponse.files && Array.isArray(filesResponse.files)) {
        files = filesResponse.files;
      } else {
        console.log('📋 Unexpected response structure:', Object.keys(filesResponse));
        // Eğer response bir obje ise ve içinde dosya bilgileri varsa
        const responseKeys = Object.keys(filesResponse);
        for (const key of responseKeys) {
          if (Array.isArray((filesResponse as any)[key])) {
            files = (filesResponse as any)[key];
            console.log('📋 Files found in key:', key);
            break;
          }
        }
      }
    }
    
    console.log('📋 Extracted files array:', files);
    console.log('📋 Files array length:', files?.length || 0);
    console.log('📋 Is files an array?:', Array.isArray(files));
    
    // Eğer files hala boş ise, boş array döndür
    if (!Array.isArray(files) || files.length === 0) {
      console.log('📋 No files found or invalid response structure');
      return NextResponse.json({ 
        participants: [],
        debug: {
          message: 'No files found',
          responseType: typeof filesResponse,
          responseKeys: filesResponse ? Object.keys(filesResponse) : []
        }
      });
    }
    
    // Tüm dosyaları logla
    files.forEach((file, index) => {
      console.log(`📋 Dosya ${index + 1}:`, {
        name: file?.name || 'No name',
        key: file?.key || 'No key',
        size: file?.size || 'No size',
        uploadedAt: file?.uploadedAt || 'No date'
      });
    });
    
    // Katılımcı dosyasını bul (katilimci-listesi.json)
    const participantFile = files.find(file => 
      file && file.name === 'katilimci-listesi.json'
    );
    
    if (!participantFile) {
      console.log('📋 Katılımcı dosyası bulunamadı');
      console.log('📋 Aranan dosya adı: katilimci-listesi.json');
      console.log('📋 Mevcut dosya adları:', files.map(f => f?.name || 'unnamed'));
      return NextResponse.json({ 
        participants: [],
        debug: {
          message: 'Participant file not found',
          availableFiles: files.map(f => f?.name || 'unnamed')
        }
      });
    }
    
    console.log('📋 Katılımcı dosyası bulundu:', {
      name: participantFile.name,
      key: participantFile.key,
      size: participantFile.size
    });
    
    // Dosya key'ini kontrol et
    if (!participantFile.key) {
      throw new Error('Dosya key\'i bulunamadı');
    }
    
    // Dosya URL'sini oluştur
    const fileUrl = `https://utfs.io/f/${participantFile.key}`;
    console.log('📋 Dosya URL\'si:', fileUrl);
    
    // Dosyayı indir ve içeriğini oku
    const response = await fetch(fileUrl);
    console.log('📋 Fetch response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }
    
    const responseText = await response.text();
    console.log('📋 Ham dosya içeriği (ilk 200 karakter):', responseText.substring(0, 200));
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('📋 JSON parse hatası:', parseError);
      throw new Error('Dosya geçerli JSON formatında değil');
    }
    
    console.log('📋 Parse edilmiş veri tipi:', typeof data);
    console.log('📋 Parse edilmiş veri (array mi?):', Array.isArray(data));
    
    if (Array.isArray(data)) {
      console.log('📋 Katılımcı verisi başarıyla okundu:', data.length, 'katılımcı');
    } else {
      console.log('📋 Veri array değil, içerik:', data);
    }
    
    return NextResponse.json({ 
      participants: data.participants || [], // JSON dosyasındaki participants array'ini al
      fileKey: participantFile.key,          // fileKey'i de döndür
      debug: {
        fileFound: true,
        fileName: participantFile.name,
        fileKey: participantFile.key,
        dataType: typeof data,
        isArray: Array.isArray(data),
        participantCount: data.participants ? data.participants.length : 0,
        fullData: data // Debug için tam veriyi göster
      }
    });
    
  } catch (error) {
    console.error('📋 get-participants API hatası:', error);
    
    // Hata detaylarını logla
    if (error instanceof Error) {
      console.error('📋 Hata mesajı:', error.message);
      console.error('📋 Hata stack:', error.stack);
    }
    
    return NextResponse.json(
      { 
        error: 'Katılımcı listesi alınamadı', 
        details: error instanceof Error ? error.message : 'Bilinmeyen hata',
        participants: []
      },
      { status: 500 }
    );
  }
}
