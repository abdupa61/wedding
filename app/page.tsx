"use client";
import { useUploadThing } from "@/src/utils/uploadthing";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useMemo } from "react";

export default function Home() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Başarı mesajları için state'ler
  const [showFileSuccess, setShowFileSuccess] = useState(false);
  const [showAudioSuccess, setShowAudioSuccess] = useState(false);
  
  // Ses kaydı için isim state'i eklendi
  const [recordingName, setRecordingName] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);
  
  // Dosya seçimi için state'ler
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Başarı mesajlarını otomatik gizleme
  useEffect(() => {
    if (showFileSuccess) {
      const timer = setTimeout(() => {
        setShowFileSuccess(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showFileSuccess]);

  useEffect(() => {
    if (showAudioSuccess) {
      const timer = setTimeout(() => {
        setShowAudioSuccess(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showAudioSuccess]);

  // Dosya yükleme için hook
  const { startUpload, isUploading: uploadThingUploading } = useUploadThing("imageUploader", {
    onClientUploadComplete: (res: any[]) => {
      console.log("✅ Dosya yükleme tamamlandı:", res);
      setSelectedFiles([]);
      setIsUploadingFile(false);
      setUploadProgress(0);
      setShowFileSuccess(true); // Başarı mesajını göster
      // File input'u da temizle
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onUploadError: (error: Error) => {
      console.error("❌ Dosya yükleme hatası:", error);
      alert(`Yükleme hatası: ${error.message}`);
      setIsUploadingFile(false);
      setUploadProgress(0);
    },
    onUploadBegin: (name: string) => {
      console.log("📤 Dosya yükleme başladı:", name);
      setIsUploadingFile(true);
    },
    onUploadProgress: (progress: number) => {
      setUploadProgress(progress);
    },
  });

  // Ses yükleme için ayrı hook
  const { startUpload: startAudioUpload, isUploading: audioUploadThingUploading } = useUploadThing("imageUploader", {
    onClientUploadComplete: (res: any[]) => {
      console.log("✅ Ses yükleme tamamlandı:", res);
      setAudioBlob(null);
      setConvertedBlob(null);
      setRecordingTime(0);
      setIsUploading(false);
      setShowAudioSuccess(true); // Başarı mesajını göster
    },
    onUploadError: (error: Error) => {
      console.error("❌ Ses yükleme hatası:", error);
      alert(`Yükleme hatası: ${error.message}`);
      setIsUploading(false);
    },
    onUploadBegin: (name: string) => {
      console.log("📤 Ses yükleme başladı:", name);
      setIsUploading(true);
    },
  });

  // Dosya seçimi fonksiyonları
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);
      setSelectedFiles(prev => [...prev, ...fileArray]);
    }
    // Input'u temizle ki aynı dosya tekrar seçilebilsin
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    
    const files = event.dataTransfer.files;
    if (files) {
      const fileArray = Array.from(files);
      setSelectedFiles(prev => [...prev, ...fileArray]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;
    
    try {
      await startUpload(selectedFiles);
    } catch (error: any) {
      console.error("❌ Dosya yükleme hatası:", error);
      alert(`Dosya yükleme sırasında hata oluştu: ${error.message || "Bilinmeyen hata"}`);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // İsim validasyonu - en az 3 karakter ve boşluk içermeli (ad soyad için)
  const isValidName = (name: string) => {
    const trimmedName = name.trim();
    return trimmedName.length >= 3 && trimmedName.includes(' ');
  };

  // Kayıt başlatma - buton her zaman aktif
  const handleStartRecording = () => {
    startRecording();
  };

  // Ses kayıt fonksiyonları
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        options.mimeType = 'audio/wav';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options.mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || 'audio/wav';
        const blob = new Blob(chunks, { type: mimeType });
        setAudioBlob(blob);
        
        await convertToWav(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setShowNameInput(false);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Mikrofon erişimi hatası:", error);
      alert("Mikrofon erişimi sağlanamadı. Lütfen tarayıcı ayarlarınızı kontrol edin.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    }
  };

  const convertToWav = async (inputBlob: Blob) => {
    setIsConverting(true);
    try {
      const audioContext = new AudioContext();
      const arrayBuffer = await inputBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const channelData = audioBuffer.getChannelData(0);
      const samples = new Int16Array(channelData.length);

      for (let i = 0; i < channelData.length; i++) {
        samples[i] = Math.max(-32768, Math.min(32767, channelData[i] * 32768));
      }

      const wavBlob = createWavBlob(samples, audioBuffer.sampleRate);
      setConvertedBlob(wavBlob);

      await audioContext.close();
    } catch (error) {
      console.error("Dönüştürme hatası:", error);
      setConvertedBlob(inputBlob);
    } finally {
      setIsConverting(false);
    }
  };

  const createWavBlob = (samples: Int16Array, sampleRate: number): Blob => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      view.setInt16(offset, samples[i], true);
      offset += 2;
    }

    return new Blob([buffer], { type: "audio/wav" });
  };

  const uploadAudio = async () => {
    const blobToUpload = convertedBlob || audioBlob;
    if (!blobToUpload) {
      console.error("Yüklenecek ses dosyası bulunamadı");
      return;
    }

    // İsim kontrolü sadece yükleme sırasında yapılacak
    if (!isValidName(recordingName)) {
      alert("Lütfen adınızı ve soyadınızı tam olarak girin! (Örn: Ahmet Yılmaz)");
      return;
    }

    try {
      // Dosya adını isim ve tarih ile oluştur
      const sanitizedName = recordingName.trim().replace(/[^a-zA-Z0-9çğıöşüÇĞIİÖŞÜ\s]/g, '').replace(/\s+/g, '-');
      const timestamp = new Date().toLocaleString('tr-TR').replace(/[/:]/g, '-').replace(/\s/g, '_');
      const fileName = `ses-kaydi-${sanitizedName}-${timestamp}.wav`;
      
      const audioFile = new File([blobToUpload], fileName, {
        type: "audio/wav",
      });

      await startAudioUpload([audioFile]);
    } catch (error: any) {
      console.error("❌ Ses yükleme hatası:", error);
      alert(`Ses yükleme sırasında hata oluştu: ${error.message || "Bilinmeyen hata"}`);
      setIsUploading(false);
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setConvertedBlob(null);
    setRecordingTime(0);
  };

  const audioUrl = useMemo(() => {
    if (convertedBlob) return URL.createObjectURL(convertedBlob);
    if (audioBlob) return URL.createObjectURL(audioBlob);
    return null;
  }, [convertedBlob, audioBlob]);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-8 sm:px-6 md:px-8 lg:px-24">
      {/* Başarı Mesajları - Fixed pozisyon */}
      {showFileSuccess && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
          <span className="text-lg">✅</span>
          <span className="font-semibold">Dosyalar başarıyla gönderildi!</span>
        </div>
      )}
      
      {showAudioSuccess && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
          <span className="text-lg">🎤</span>
          <span className="font-semibold">Ses kaydı başarıyla gönderildi!</span>
        </div>
      )}

      {/* Başlık - Responsive */}
      <div className="mb-8 md:mb-12 text-center max-w-4xl">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font text-gray-900 mb-4 md:mb-8 italic leading-tight">
          Abdulsamet & Zehra Nurcan
        </h1>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-italic gray-900 mb-3 md:mb-4 leading-relaxed">
          Düğünümüze Hoşgeldiniz
          <br />
          30.08.2025
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-gray-600 px-4">
          Düğün fotoğraflarınızı yükleyebilir ve ses kayıtları yapabilirsiniz
        </p>
      </div>

      {/* Fotoğraf/Video Yükleme - Mobile Responsive */}
      <div className="mb-6 md:mb-8 w-full max-w-sm sm:max-w-md md:max-w-lg">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-3 md:mb-4 text-center">
          📸 Fotoğraf ve Video Yükleme
        </h2>
        
        {/* Dosya Seçim Alanı - Mobile Optimized */}
        <div
          className={`border-2 border-dashed rounded-lg p-4 sm:p-6 md:p-8 text-center transition-all duration-200 cursor-pointer ${
            isDragging 
              ? "border-blue-500 bg-blue-50" 
              : "border-gray-300 hover:border-gray-400 bg-gray-50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-4xl sm:text-5xl md:text-6xl mb-2 md:mb-4">📤</div>
          <p className="text-base sm:text-lg font-semibold text-gray-700 mb-1 md:mb-2">
            {isDragging ? "Dosyaları buraya bırakın" : "Dosya seçin veya sürükleyip bırakın"}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mb-3 md:mb-0">
            Resim ve videolar (Maks. 1GB)
          </p>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <button
            type="button"
            className="mt-3 md:mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 sm:px-6 rounded-lg transition-colors duration-200 text-sm sm:text-base"
            onClick={(e) => {
              e.stopPropagation();
              // Input'u temizle ve tıkla
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
                fileInputRef.current.click();
              }
            }}
          >
            📁 Dosya Seç
          </button>
        </div>

        {/* Seçilen Dosyalar Listesi - Mobile Responsive */}
        {selectedFiles.length > 0 && (
          <div className="mt-3 md:mt-4 space-y-2">
            <h3 className="font-semibold text-gray-700 text-sm sm:text-base">Seçilen Dosyalar:</h3>
            <div className="max-h-32 sm:max-h-80 overflow-y-auto grid grid-cols-3 gap-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="bg-white border rounded-lg p-2 space-y-2">
                  {file.type.startsWith('image/') && (
                    <div className="relative">
                      <img 
                        src={URL.createObjectURL(file)} 
                        alt={file.name}
                        className="w-full h-20 object-cover rounded-lg"
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-xs sm:text-sm font-medium text-gray-700 truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700 font-bold text-sm sm:text-base p-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Yükle Butonu - Mobile Responsive */}
            <button
              onClick={uploadFiles}
              disabled={isUploadingFile || uploadThingUploading || selectedFiles.length === 0}
              className={`w-full py-2.5 md:py-3 px-3 md:px-4 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center gap-2 text-sm sm:text-base ${
                isUploadingFile || uploadThingUploading || selectedFiles.length === 0
                  ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              {isUploadingFile || uploadThingUploading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span className="hidden sm:inline">Yükleniyor...</span>
                  <span className="sm:hidden">Yükleniyor</span>
                  {uploadProgress > 0 && <span>%{uploadProgress}</span>}
                </>
              ) : (
                <>
                  <span>⬆️</span>
                  <span className="hidden sm:inline">{selectedFiles.length} Dosyayı Yükle</span>
                  <span className="sm:hidden">{selectedFiles.length} Dosya Yükle</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Ses Kayıt Bölümü - Mobile Responsive */}
      <div className="w-full max-w-sm sm:max-w-md md:max-w-lg">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-3 md:mb-4 text-center">
          🎤 Ses Kaydı
        </h2>

        <div className="bg-white p-4 sm:p-5 md:p-6 rounded-lg shadow-lg border">
          {/* İsim Girişi - Her zaman göster */}
          <div className="mb-4 space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              İsminizi girin (Adınız ve Soyadınız):
            </label>
            <input
              type="text"
              value={recordingName}
              onChange={(e) => setRecordingName(e.target.value)}
              placeholder="Örn: Ahmet Yılmaz"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              maxLength={50}
              autoComplete="off"
              spellCheck="false"
            />
            {recordingName.trim() && !isValidName(recordingName) && (
              <p className="text-xs text-orange-600">
                ⚠️ Lütfen adınızı ve soyadınızı tam olarak girin
              </p>
            )}
            {isValidName(recordingName) && (
              <p className="text-xs text-green-600">
                ✅ İsim bilgisi uygun
              </p>
            )}
          </div>

          {!audioBlob ? (
            <div className="text-center">
              {!isRecording ? (
                <button
                  onClick={handleStartRecording}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 md:py-3 px-4 md:px-6 rounded-full transition-colors duration-200 flex items-center justify-center mx-auto gap-2 text-sm sm:text-base"
                >
                  <span className="text-lg md:text-xl">🎤</span> 
                  <span className="hidden sm:inline">Kayıt Başlat</span>
                  <span className="sm:hidden">Kayıt</span>
                </button>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  <div className="flex items-center justify-center gap-2 md:gap-3">
                    <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-base md:text-lg font-mono text-red-600">{formatTime(recordingTime)}</span>
                  </div>
                  <p className="text-sm text-gray-600">🎙️ Kayıt devam ediyor...</p>
                  <button
                    onClick={stopRecording}
                    className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2.5 md:py-3 px-4 md:px-6 rounded-full transition-colors duration-200 text-sm sm:text-base"
                  >
                    ⏹️ <span className="hidden sm:inline">Kayıt Durdur</span><span className="sm:hidden">Durdur</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              <div className="text-center">
                <p className="text-gray-600 mb-1 md:mb-2 text-sm sm:text-base">
                  {isConverting ? "🔄 Ses dönüştürülüyor..." : "Kayıt tamamlandı!"}
                </p>
                <p className="text-xs sm:text-sm text-gray-500">
                  Süre: {formatTime(recordingTime)} • Format: WAV
                  {recordingName.trim() && ` • Kayıt sahibi: ${recordingName}`}
                </p>
              </div>

              <audio controls className="w-full" src={audioUrl ?? undefined}>
                Tarayıcınız ses oynatmayı desteklemiyor.
              </audio>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
                <button
                  onClick={uploadAudio}
                  disabled={isUploading || audioUploadThingUploading || isConverting || !isValidName(recordingName)}
                  className={`bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 sm:px-4 rounded transition-colors duration-200 flex items-center justify-center gap-2 text-sm sm:text-base ${
                    isUploading || audioUploadThingUploading || isConverting || !isValidName(recordingName) ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {(isUploading || audioUploadThingUploading) ? (
                    <>
                      <span className="animate-spin">⏳</span> 
                      <span className="hidden sm:inline">Yükleniyor...</span>
                      <span className="sm:hidden">Yükleniyor</span>
                    </>
                  ) : isConverting ? (
                    <>
                      <span className="animate-spin">🔄</span> 
                      <span className="hidden sm:inline">Dönüştürülüyor...</span>
                      <span className="sm:hidden">Dönüştürme</span>
                    </>
                  ) : (
                    <>
                      <span>⬆️</span> 
                      <span className="hidden sm:inline">Ses Yükle</span>
                      <span className="sm:hidden">Yükle</span>
                    </>
                  )}
                </button>
                <button
                  onClick={deleteRecording}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 sm:px-4 rounded transition-colors duration-200 text-sm sm:text-base"
                >
                  🗑️ Sil
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
