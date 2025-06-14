"use client";
import { UploadButton, UploadDropzone } from "@/src/utils/uploadthing";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  
  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      {/* Hoş geldin mesajı */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Abdulsamet ❤️ Zehra&apos;nın Düğününe Hoşgeldiniz
        </h1>
        <p className="text-lg text-gray-600">
          Düğün fotoğraflarınızı yükleyebilirsiniz
        </p>
      </div>

      {/* <UploadButton
        endpoint="imageUploader"
        onClientUploadComplete={(res) => {
          // Do something with the response
          console.log("Files: ", res);
          alert("Upload Completed");
        }}
        onUploadError={(error: Error) => {
          // Do something with the error.
          alert(`ERROR! ${error.message}`);
        }}
      /> */}
      
      <UploadDropzone
        endpoint="imageUploader"
        onClientUploadComplete={(res) => {
          router.push(`/${res[0].key}`);
        }}
        onUploadError={(error: Error) => {
          alert(`ERROR! ${error.message}`);
        }}
      />
      

    </main>
  );
}
