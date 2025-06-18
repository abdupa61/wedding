"use client";
import { useUploadThing } from "@/src/utils/uploadthing";
import { useRouter } from "next/navigation";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Image from 'next/image';

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
  const [showLocationSection, setShowLocationSection] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  
  // wedding music
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [showMusicButton, setShowMusicButton] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null)
  
  // Wedding date - useMemo ile stable hale getir
  const weddingDate = useMemo(() => new Date('2025-08-30T16:00:00'), []);
  
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

  // Not yazma için state'ler
  const [noteText, setNoteText] = useState("");
  const [noteAuthor, setNoteAuthor] = useState("");
  const [isUploadingNote, setIsUploadingNote] = useState(false);
  const [showNoteSuccess, setShowNoteSuccess] = useState(false);

  // Müzik kontrolü
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
  
    const handleCanPlay = () => {
      console.log("🎵 Müzik dosyası hazır");
      audio.volume = 0.3;
      
      if (userInteracted) {
        audio.play()
          .then(() => {
            console.log("🎵 Müzik başlatıldı");
            setMusicPlaying(true);
            setShowMusicButton(false);
          })
          .catch(() => {
            setShowMusicButton(true);
          });
      } else {
        setShowMusicButton(true);
      }
    };
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', () => setMusicPlaying(true));
    audio.addEventListener('pause', () => setMusicPlaying(false));
  
    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [userInteracted]);
  
  // Kullanıcı etkileşimi takibi
  useEffect(() => {
    const handleFirstInteraction = () => {
      setUserInteracted(true);
      
      const audio = audioRef.current;
      if (audio && !musicPlaying) {
        audio.play()
          .then(() => {
            console.log("🎵 İlk etkileşim sonrası müzik başlatıldı");
            setMusicPlaying(true);
            setShowMusicButton(false);
          })
          .catch(() => {
            setShowMusicButton(true);
          });
      }
    };
  
    const events = ['click', 'touchstart', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, handleFirstInteraction, { once: true });
    });
  
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleFirstInteraction);
      });
    };
  }, [musicPlaying]);
  
  useEffect(() => {
    if (showNoteSuccess) {
      const timer = setTimeout(() => {
        setShowNoteSuccess(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showNoteSuccess]);

  // Başarı mesajlarını otomatik gizleme
  useEffect(() => {
    if (showFileSuccess) {
      const timer = setTimeout(() => {
        setShowFileSuccess(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showFileSuccess]);

  // Component unmount cleanup
  useEffect(() => {
    return () => {
      // Cleanup all refs and timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);
  
  useEffect(() => {
    if (showAudioSuccess) {
      const timer = setTimeout(() => {
        setShowAudioSuccess(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showAudioSuccess]);

  // Otomatik müzik başlatma
  useEffect(() => {
    const startMusic = () => {
      if (audioRef.current) {
        audioRef.current.volume = 0.3;
        audioRef.current.play().catch(console.error);
      }
    };
  
    // Sayfa yüklendiğinde müziği başlat
    startMusic();
    
    // Kullanıcı etkileşimi sonrası da dene (tarayıcı politikası için)
    const handleInteraction = () => {
      startMusic();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
    
    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);
    
    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  // Müzik fonksiyonları
  const startMusic = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.play()
        .then(() => {
          setMusicPlaying(true);
          setShowMusicButton(false);
          setUserInteracted(true);
        })
        .catch(console.error);
    }
  };
  
  const stopMusic = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      setMusicPlaying(false);
    }
  };

  const weddingLocation = {
    name: "Mercan Korupark",
    address: "Mercan Korupark, Merkez, Sahil Yolu Cd. No:56, 61310 Akçaabat/Trabzon",
  };

  const uploadNote = async () => {
    if (!noteText.trim()) {
      alert("Lütfen bir mesaj yazın!");
      return;
    }
    
    if (!isValidName(noteAuthor)) {
      alert("Lütfen adınızı ve soyadınızı tam olarak girin! (Örn: Ahmet Yılmaz)");
      return;
    }
  
    try {
      // Dosya adını isim ve tarih ile oluştur
      const sanitizedName = noteAuthor.trim().replace(/[^a-zA-Z0-9çğıöşüÇĞIİÖŞÜ\s]/g, '').replace(/\s+/g, '-');
      const timestamp = new Date().toLocaleString('tr-TR').replace(/[/:]/g, '-').replace(/\s/g, '_');
      const fileName = `not-${sanitizedName}-${timestamp}.txt`;
      
      // Not içeriğini oluştur
      const noteContent = `Gönderen: ${noteAuthor}\nTarih: ${new Date().toLocaleString('tr-TR')}\n\nMesaj:\n${noteText}`;
      
      const noteFile = new File([noteContent], fileName, {
        type: "text/plain",
      });
  
      await startNoteUpload([noteFile]);
    } catch (error: any) {
      console.error("❌ Not yükleme hatası:", error);
      alert(`Not yükleme sırasında hata oluştu: ${error.message || "Bilinmeyen hata"}`);
      setIsUploadingNote(false);
    }
  };
  
  // Geri Sayım Fonksiyonu - useCallback ile stable hale getir
  const calculateTimeLeft = useCallback(() => {
    const now = new Date().getTime();
    const wedding = weddingDate.getTime();
    const difference = wedding - now;

    if (difference > 0) {
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000)
      };
    }
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }, [weddingDate]);
  
  // Geri sayım timer - stable dependencies
  useEffect(() => {
    // İlk değeri hemen set et
    setTimeLeft(calculateTimeLeft());
    
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
  
    return () => clearInterval(timer);
  }, [calculateTimeLeft]); // Add calculateTimeLeft to dependencies
  
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

  // Not yükleme için ayrı hook
  const { startUpload: startNoteUpload, isUploading: noteUploadThingUploading } = useUploadThing("imageUploader", {
    onClientUploadComplete: (res: any[]) => {
      console.log("✅ Not yükleme tamamlandı:", res);
      setNoteText("");
      setNoteAuthor("");
      setIsUploadingNote(false);
      setShowNoteSuccess(true);
    },
    onUploadError: (error: Error) => {
      console.error("❌ Not yükleme hatası:", error);
      alert(`Yükleme hatası: ${error.message}`);
      setIsUploadingNote(false);
    },
    onUploadBegin: (name: string) => {
      console.log("📤 Not yükleme başladı:", name);
      setIsUploadingNote(true);
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
      setIsUploadingFile(true);
      await startUpload(selectedFiles);
    } catch (error: any) {
      console.error("❌ Dosya yükleme hatası:", error);
      alert(`Dosya yükleme sırasında hata oluştu: ${error.message || "Bilinmeyen hata"}`);
      setIsUploadingFile(false);
      setUploadProgress(0);
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
    try {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
  
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
  
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      }
    } catch (error) {
      console.error("Recording stop error:", error);
      setIsRecording(false);
    }
  };

  const convertToWav = async (inputBlob: Blob) => {
    setIsConverting(true);
    let audioContext: AudioContext | null = null;
    
    try {
      audioContext = new AudioContext();
      const arrayBuffer = await inputBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
      const channelData = audioBuffer.getChannelData(0);
      const samples = new Int16Array(channelData.length);
  
      for (let i = 0; i < channelData.length; i++) {
        samples[i] = Math.max(-32768, Math.min(32767, channelData[i] * 32768));
      }
  
      const wavBlob = createWavBlob(samples, audioBuffer.sampleRate);
      setConvertedBlob(wavBlob);
    } catch (error) {
      console.error("Dönüştürme hatası:", error);
      setConvertedBlob(inputBlob);
    } finally {
      if (audioContext && audioContext.state !== 'closed') {
        await audioContext.close();
      }
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

  // Buraya ekle:
  const openInMaps = () => {
    const searchTerm = "Mercan Korupark Akçaabat Trabzon";
    const url = `https://www.google.com/maps/search/${encodeURIComponent(searchTerm)}`;
    window.open(url, '_blank');
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setConvertedBlob(null);
    setRecordingTime(0);
  };

  // Audio URL - sadece blob'lar değiştiğinde yeniden hesapla
  const audioUrl = useMemo(() => {
    if (convertedBlob) return URL.createObjectURL(convertedBlob);
    if (audioBlob) return URL.createObjectURL(audioBlob);
    return null;
  }, [convertedBlob, audioBlob]);

  // Audio URL cleanup - sadece component unmount'ta çalışır
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]); // boş dependency array

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-8 sm:px-6 md:px-8 lg:px-24">
	  {/* Otomatik Müzik */}
      <audio
        ref={audioRef}
        src="/wedding-music.mp3"
        loop
        preload="auto"
        className="hidden"
      />
	  {/* Müzik başlat butonu */}
      {showMusicButton && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
          <button
            onClick={startMusic}
            className="bg-gradient-to-r from-pink-300 to-pink-500 hover:from-pink-200 hover:to-purple-300 text-white px-4 py-2 text-sm rounded-full shadow-lg flex items-center gap-2 animate-bounce"          >
            🎵 Müziği Başlat
          </button>
        </div>
      )}
      
      {/* Müzik Kontrol Paneli */}
      {musicPlaying && (
        <div className="fixed bottom-4 left-4 z-50 bg-white bg-opacity-90 backdrop-blur-sm border border-gray-200 px-4 py-2 rounded-full shadow-lg flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-green-500 animate-pulse">🎵</span>
            <span className="text-sm font-medium text-gray-700">Müzik çalıyor</span>
          </div>
          <button
            onClick={stopMusic}
            className="text-gray-500 hover:text-red-500 transition-colors"
            title="Müziği durdur"
          >
            ⏸️
          </button>
        </div>
      )}
      {/* Başarı Mesajları - Fixed pozisyon */}
      {showFileSuccess && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
          <span className="text-lg">✅</span>
          <span className="font-semibold">Dosyalar başarıyla gönderildi!</span>
        </div>
      )}
      
	  {showNoteSuccess && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
          <span className="text-lg">📝</span>
          <span className="font-semibold">Mesajınız başarıyla gönderildi!</span>
        </div>
      )}

      {showAudioSuccess && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
          <span className="text-lg">🎤</span>
          <span className="font-semibold">Ses kaydı başarıyla gönderildi!</span>
        </div>
      )}

      {/* Başlık - Responsive */}
      <div className="text-center max-w-4xl overflow-x-auto">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font text-gray-900 mb-4 md:mb-2 italic whitespace-nowrap inline-block">
          Abdulsamet & Zehra Nurcan
        </h1>
      </div>
      {/* Geri Sayım */}
      <div className="mb-6 md:mb-8 w-full max-w-sm sm:max-w-md md:max-w-lg">
		<div className="mb-1 md:mb-1 w-full max-w-sm sm:max-w-md md:max-w-lg">  
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-3 md:mb-4 text-center">
            👰🤵 Düğüne Kalan Süre
          </h2>
		</div>
        <div className="bg-white from-white-500 text-black p-2 rounded-lg shadow-lg text-center">
          <div className="text-sm text-gray-600 mb-3 font-medium">
            📅 30 Ağustos 2025 - Saat 16:00
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-gray-200 rounded-lg p-1">
              <div className="text-lg font-bold">{timeLeft.days}</div>
              <div className="text-xs">Gün</div>
            </div>
            <div className="bg-gray-200 rounded-lg p-1">
              <div className="text-lg font-bold">{timeLeft.hours}</div>
              <div className="text-xs">Saat</div>
            </div>
            <div className="bg-gray-200 rounded-lg p-1">
              <div className="text-lg font-bold">{timeLeft.minutes}</div>
              <div className="text-xs">Dakika</div>
            </div>
            <div className="bg-gray-200 rounded-lg p-1">
              <div className="text-lg font-bold">{timeLeft.seconds}</div>
              <div className="text-xs">Saniye</div>
            </div>
          </div>
        </div>
      </div>
	  {/* Konum Bilgisi Bölümü */}
      <div className="mb-6 md:mb-8 w-full max-w-sm sm:max-w-md md:max-w-lg">  
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-3 md:mb-4 text-center">
          📍 Düğün Salonu Konumu
        </h2>
        
        <div className="bg-white p-4 sm:p-5 md:p-6 rounded-lg shadow-lg border text-center">
          <div className="mb-4">
            <h3 className="font-semibold text-lg text-gray-800 mb-2">{weddingLocation.name}</h3>
            <p className="text-gray-600 text-sm">{weddingLocation.address}</p>
          </div>
          
          <button
            onClick={openInMaps}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center mx-auto gap-2"
          >
            <span>🗺️</span>
            <span>Haritada Göster</span>
          </button>
        </div>
	  </div>
      <div className="mb-8 md:mb-2 text-center max-w-5xl">
 	    <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 px-4">
          Bu özel günümüzde çektiğiniz güzel anıları ve içten dileklerinizi bizimle paylaşabilirsiniz
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
            accept="image/*,video/*,.heic,.heif,.mov,.mp4,.jpeg,.jpg,.png,.gif,.webp,.avif"
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
                      <div className="relative w-full h-20">
                        <Image 
                          src={URL.createObjectURL(file)} 
                          alt={file.name}
                          fill
                          className="object-cover rounded-lg"
                          sizes="(max-width: 768px) 33vw, 25vw"
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
	  {/* Not/Mesaj Yazma Bölümü - Mobile Responsive */}
      <div className="mt-10 mb-6 md:mb-8 w-full max-w-sm sm:max-w-md md:max-w-lg">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-3 md:mb-4 text-center">
          📝 Mesaj Yazma
        </h2>
      
        <div className="bg-white p-4 sm:p-5 md:p-6 rounded-lg shadow-lg border space-y-4">
          {/* İsim Girişi */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              İsminizi girin (Adınız ve Soyadınız):
            </label>
            <input
              type="text"
              value={noteAuthor}
              onChange={(e) => setNoteAuthor(e.target.value)}
              placeholder="Örn: Ahmet Yılmaz"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              maxLength={50}
              autoComplete="off"
              spellCheck="false"
            />
            {noteAuthor.trim() && !isValidName(noteAuthor) && (
              <p className="text-xs text-orange-600">
                ⚠️ Lütfen adınızı ve soyadınızı tam olarak girin
              </p>
            )}
            {isValidName(noteAuthor) && (
              <p className="text-xs text-green-600">
                ✅ İsim bilgisi uygun
              </p>
            )}
          </div>
      
          {/* Mesaj Yazma Alanı */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Mesajınızı yazın:
            </label>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Düğün için güzel dileklerinizi, anılarınızı veya mesajınızı buraya yazabilirsiniz..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base resize-none"
              rows={4}
              maxLength={1000}
            />
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>Maksimum 1000 karakter</span>
              <span>{noteText.length}/1000</span>
            </div>
          </div>
      
          {/* Gönder Butonu */}
          <button
            onClick={uploadNote}
            disabled={isUploadingNote || noteUploadThingUploading || !noteText.trim() || !isValidName(noteAuthor)}
            className={`w-full py-2.5 md:py-3 px-3 md:px-4 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center gap-2 text-sm sm:text-base ${
              isUploadingNote || noteUploadThingUploading || !noteText.trim() || !isValidName(noteAuthor)
                ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                : "bg-purple-600 hover:bg-purple-700 text-white"
            }`}
          >
            {(isUploadingNote || noteUploadThingUploading) ? (
              <>
                <span className="animate-spin">⏳</span>
                <span className="hidden sm:inline">Gönderiliyor...</span>
                <span className="sm:hidden">Gönderiliyor</span>
              </>
            ) : (
              <>
                <span>📤</span>
                <span className="hidden sm:inline">Mesajı Gönder</span>
                <span className="sm:hidden">Gönder</span>
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
