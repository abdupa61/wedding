import { createUploadthing, type FileRouter } from "uploadthing/server";

const f = createUploadthing();

export const ourFileRouter = {
  imageUploader: f({
    image: { 
      maxFileSize: "1GB", 
      maxFileCount: 200,
      // Tüm image formatlarını kabul et
      contentDisposition: "inline"
    },
    video: { 
      maxFileSize: "1GB", 
      maxFileCount: 50,
      // Video formatlarını genişlet
      contentDisposition: "inline"
    },
    audio: { 
      maxFileSize: "64MB", 
      maxFileCount: 100,
      contentDisposition: "inline"
    },
    // Blob formatını da ekle (mobil uyumluluk için)
    blob: {
      maxFileSize: "1GB",
      maxFileCount: 100
    }
  })
    .middleware(async ({ req }) => {
      // Debug için request bilgilerini logla - .get() method kullan
      console.log("📱 Upload request from:", req.headers.get("user-agent"));
      return { userId: "anonymous" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("✅ Upload complete by:", metadata.userId);
      console.log("📁 File URL:", file.url);
      console.log("🎵 File type:", file.type);
      console.log("📏 File size:", file.size);
      console.log("📝 File name:", file.name);
      
      return { 
        uploadedBy: metadata.userId,
        fileUrl: file.url,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        success: true
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
