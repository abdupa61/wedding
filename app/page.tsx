"use client";
import { UploadButton, UploadDropzone } from "@/src/utils/uploadthing";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";

export default function Home() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Timer başlat
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Mikrofon erişimi hatası:', error);
      alert('Mikrofon erişimi sağlanamadı. Lütfen tarayıcı ayarlarınızı kontrol edin.');
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
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const uploadAudio = async () => {
    if (!audioBlob) return;
    
    try {
      // Blob'u File nesnesine dönüştür
      const audioFile = new File([audioBlob], `ses-kaydi-${Date.now()}.webm`, {
        type: 'audio/webm'
      });
      
      // FormData oluştur
      const formData = new FormData();
      formData.append('files', audioFile);
      
      // UploadThing endpoint'ine yükle
      const response = await fetch('/api/uploadthing', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Ses kayıt yüklendi:', result);
        alert('Ses kaydınız başarıyla yüklendi!');
        setAudioBlob(null);
        setRecordingTime(0);
      } else {
        throw new Error('Yükleme başarısız');
      }
    } catch (error) {
      console.error('Ses yükleme hatası:', error);
      alert('Ses yükleme sırasında hata oluştu');
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      {/* Hoş geldin mesajı */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Abdulsamet      &      Zehra
          <br />
          Düğünümüze Hoşgeldiniz
          <br />
          30.08.2025
        </h1>
        <p className="text-lg text-gray-600">
          Düğün fotoğraflarınızı yükleyebilir ve ses kayıtları yapabilirsiniz
        </p>
      </div>

      {/* Fotoğraf/Video Yükleme */}
      <div className="mb-8 w-full max-w-lg">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4 text-center">
          📸 Fotoğraf ve Video Yükleme
        </h2>
        <UploadDropzone
          endpoint="imageUploader"
          onClientUploadComplete={(res) => {
            router.push(`/${res[0].key}`);
          }}
          onUploadError={(error: Error) => {
            alert(`HATA! ${error.message}`);
          }}
          content={{
            label: "Dosya seçin veya sürükleyip bırakın",
            allowedContent: "Resim ve videolar",
            button: "Dosya Seç"
          }}
        />
      </div>

      {/* Ses Kayıt Bölümü */}
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
                  <span className="text-xl">🎤</span>
                  Kayıt Başlat
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-lg font-mono text-red-600">
                      {formatTime(recordingTime)}
                    </span>
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
                <p className="text-gray-600 mb-2">Kayıt tamamlandı!</p>
                <p className="text-sm text-gray-500">Süre: {formatTime(recordingTime)}</p>
              </div>
              
              <audio controls className="w-full">
                <source src={URL.createObjectURL(audioBlob)} type="audio/webm" />
                Tarayıcınız ses oynatmayı desteklemiyor.
              </audio>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={uploadAudio}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
                >
                  ⬆️ Yükle
                </button>
                <button
                  onClick={deleteRecording}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
                >
                  🗑️ Sil
                </button>
                <button
                  onClick={startRecording}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
                >
                  🔄 Yeniden Kaydet
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
