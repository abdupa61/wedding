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
  
  // Dosya seçimi için state'ler
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Dosya yükleme için hook
  const { startUpload, isUploading: uploadThingUploading } = useUploadThing("imageUploader", {
    onClientUploadComplete: (res: any[]) => {
      console.log("✅ Dosya yükleme tamamlandı:", res);
      setSelectedFiles([]);
      setIsUploadingFile(false);
      setUploadProgress(0);
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

  // Ses kayıt fonksiyonları (değişiklik yok)
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

    try {
      const fileName = `ses-kaydi-${Date.now()}.wav`;
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
    <main className="flex min-h-screen flex-col items-center p-24">
      {/* Başlık */}
      <div className="mb-12 text-center">
        <h1 className="text-6xl font text-gray-900 mb-8 italic">
          Abdulsamet & Zehra
        </h1>
        <h1 className="text-3xl font-italic gray-900 mb-4">
          Düğünümüze Hoşgeldiniz
		  <br />
          30.08.2025
          <br />
        </h1>
        <p className="text-lg text-gray-600">
          Düğün fotoğraflarınızı yükleyebilir ve ses kayıtları yapabilirsiniz
        </p>
      </div>

      {/* Fotoğraf/Video Yükleme - Yeni Tasarım */}
      <div className="mb-8 w-full max-w-lg">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4 text-center">
          📸 Fotoğraf ve Video Yükleme
        </h2>
        
        {/* Dosya Seçim Alanı */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer ${
            isDragging 
              ? "border-blue-500 bg-blue-50" 
              : "border-gray-300 hover:border-gray-400 bg-gray-50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-6xl mb-4">📤</div>
          <p className="text-lg font-semibold text-gray-700 mb-2">
            {isDragging ? "Dosyaları buraya bırakın" : "Dosya seçin veya sürükleyip bırakın"}
          </p>
          <p className="text-sm text-gray-500">
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
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            📁 Dosya Seç
          </button>
        </div>

        {/* Seçilen Dosyalar Listesi */}
        {selectedFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="font-semibold text-gray-700">Seçilen Dosyalar:</h3>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="ml-2 text-red-500 hover:text-red-700 font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            
            {/* Yükle Butonu */}
            <button
              onClick={uploadFiles}
              disabled={isUploadingFile || uploadThingUploading || selectedFiles.length === 0}
              className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center gap-2 ${
                isUploadingFile || uploadThingUploading || selectedFiles.length === 0
                  ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              {isUploadingFile || uploadThingUploading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Yükleniyor... {uploadProgress > 0 && `%${uploadProgress}`}
                </>
              ) : (
                <>
                  <span>⬆️</span>
                  {selectedFiles.length} Dosyayı Yükle
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Ses Kayıt Bölümü (değişiklik yok) */}
      <div className="w-full max-w-lg">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4 text-center">
          🎤 Ses Kaydı
        </h2>

        <div className="bg-white p-6 rounded-lg shadow-lg border">
          {!audioBlob ? (
            <div className="text-center">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-full transition-colors duration-200 flex items-center justify-center mx-auto gap-2"
                >
                  <span className="text-xl">🎤</span> Kayıt Başlat
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-lg font-mono text-red-600">{formatTime(recordingTime)}</span>
                  </div>
                  <button
                    onClick={stopRecording}
                    className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-full transition-colors duration-200"
                  >
                    ⏹️ Kayıt Durdur
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-gray-600 mb-2">{isConverting ? "🔄 Ses dönüştürülüyor..." : "Kayıt tamamlandı!"}</p>
                <p className="text-sm text-gray-500">
                  Süre: {formatTime(recordingTime)} • Format: WAV
                </p>
              </div>

              <audio controls className="w-full" src={audioUrl ?? undefined}>
                Tarayıcınız ses oynatmayı desteklemiyor.
              </audio>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={uploadAudio}
                  disabled={isUploading || audioUploadThingUploading || isConverting}
                  className={`bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors duration-200 flex items-center justify-center gap-2 ${
                    isUploading || audioUploadThingUploading || isConverting ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {(isUploading || audioUploadThingUploading) ? (
                    <>
                      <span className="animate-spin">⏳</span> Yükleniyor...
                    </>
                  ) : isConverting ? (
                    <>
                      <span className="animate-spin">🔄</span> Dönüştürülüyor...
                    </>
                  ) : (
                    <>
                      <span>⬆️</span> Ses Yükle
                    </>
                  )}
                </button>
                <button
                  onClick={deleteRecording}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
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
