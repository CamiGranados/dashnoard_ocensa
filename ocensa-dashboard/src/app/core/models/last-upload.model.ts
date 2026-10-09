// Refleja el anónimo `new { uploadedAt }` de GET /Tanks/lastUpload (OverViewDash.cs).
export interface LastUploadResponse {
  // ISO 8601 en UTC; null si todavía no hay cargues.
  uploadedAt: string | null;
}
