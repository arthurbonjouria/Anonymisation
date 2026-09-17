export type PiiType =
  | "email"
  | "phone"
  | "iban"
  | "nir"
  | "postal_address"
  | "postal_code"
  | "date_naissance"
  | "date"
  | "name"
  | "custom";

/** Bounding box in normalized page coordinates: 0..1, origin top-left. */
export interface NormalizedBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Detection {
  id: string;
  page: number; // 0-indexed
  type: PiiType;
  text: string;
  box: NormalizedBox;
  confidence: number; // 0..1, heuristic
  source: "regex" | "nlp" | "ocr" | "manual";
}

export interface PageInfo {
  index: number;
  width: number; // PDF points
  height: number; // PDF points
  imageDataUrl: string; // preview PNG, base64 data URL
  isScanned: boolean;
}

export interface UploadResponse {
  fileName: string;
  pages: PageInfo[];
  detections: Detection[];
}

export interface AnonymizeZone {
  page: number;
  box: NormalizedBox;
}
