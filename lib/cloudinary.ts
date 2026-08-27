import "server-only";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

type UploadResult = { url: string; publicId: string };

/**
 * Uploads a member's profile photo. Accepts a base64 data URI (from a
 * <input type="file"> read via FileReader, or a camera capture canvas
 * export) so it works identically for "upload from gallery" and
 * "capture from camera" flows on the registration form.
 */
export async function uploadMemberPhoto(
  base64DataUri: string,
  memberCode: string
): Promise<UploadResult> {
  const result = await cloudinary.uploader.upload(base64DataUri, {
    folder: "gym/members",
    public_id: memberCode,
    overwrite: true,
    resource_type: "image",
    transformation: [{ width: 600, height: 600, crop: "fill", gravity: "face" }],
  });
  return { url: result.secure_url, publicId: result.public_id };
}

/** Uploads a generated invoice PDF buffer so it has a shareable WhatsApp link. */
export async function uploadInvoicePdf(
  pdfBuffer: Buffer,
  invoiceNumber: string
): Promise<UploadResult> {
  const base64 = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;
  const publicId = invoiceNumber.toLowerCase().endsWith(".pdf")
    ? invoiceNumber
    : `${invoiceNumber}.pdf`;
  const result = await cloudinary.uploader.upload(base64, {
    folder: "gym/invoices",
    public_id: publicId,
    overwrite: true,
    resource_type: "raw", // PDFs must be uploaded as "raw", not "image"
  });
  return { url: result.secure_url, publicId: result.public_id };
}

export async function deleteCloudinaryAsset(publicId: string, resourceType: "image" | "raw" = "image") {
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
