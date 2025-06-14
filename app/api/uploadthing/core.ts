import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

// FileRouter for your app, kimlik doğrulama YOK
export const ourFileRouter = {
  imageUploader: f({
    image: { maxFileSize: "1GB", maxFileCount: 200 },
    video: { maxFileSize: "1GB", maxFileCount: 50 },
  })
    .middleware(async () => {
      // Herkes dosya yükleyebilir – auth yok
      return { userId: "anonymous" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
