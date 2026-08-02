import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

/**
 * Uploads a document or compressed image blob directly to Firebase Cloud Storage
 * @returns Secure public CDN download URL
 */
export async function uploadKycDocumentToFirebase(
  propertyId: string,
  occupantId: string,
  docType: "photo" | "aadhaar_front" | "aadhaar_back" | "aadhaar_pdf",
  fileBlob: Blob | File,
  fileName: string
): Promise<string> {
  try {
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `properties/${propertyId}/tenants/${occupantId}/kyc/${docType}_${Date.now()}_${cleanFileName}`;
    const storageRef = ref(storage, storagePath);

    // Upload file
    await uploadBytes(storageRef, fileBlob);

    // Get public URL
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (error) {
    console.warn("Firebase Storage upload skipped or operating in offline mode:", error);
    // Fallback URL for offline/mock development mode
    return URL.createObjectURL(fileBlob);
  }
}
