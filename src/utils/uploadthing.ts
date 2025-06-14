import {
  generateUploadButton,
  generateUploadDropzone,
  generateReactHelpers,
} from "@uploadthing/react";

import type { OurFileRouter } from "@/app/api/uploadthing/core";

export const UploadButton = generateUploadButton<OurFileRouter>();
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();

// useUploadThing hook'unu generateReactHelpers ile üretiyoruz
export const { useUploadThing } = generateReactHelpers<OurFileRouter>();
