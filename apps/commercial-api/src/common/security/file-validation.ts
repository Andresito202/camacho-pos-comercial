/**
 * Upload / media URL validation for admin content (images).
 * Does not store files; rejects unsafe MIME, extensions, and oversized claims.
 */

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "image/gif",
]);

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".svg", ".gif"]);

export type FileValidationResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export function validateImageUploadMeta(input: {
  filename?: string;
  contentType?: string;
  sizeBytes?: number;
  maxBytes?: number;
}): FileValidationResult {
  const maxBytes = input.maxBytes ?? 5 * 1024 * 1024;
  if (input.sizeBytes != null && (input.sizeBytes < 1 || input.sizeBytes > maxBytes)) {
    return {
      ok: false,
      code: "FILE_SIZE_REJECTED",
      message: `El archivo supera el máximo de ${maxBytes} bytes o está vacío.`,
    };
  }
  if (input.contentType) {
    const mime = input.contentType.split(";")[0]?.trim().toLowerCase() ?? "";
    if (!ALLOWED_MIME.has(mime)) {
      return {
        ok: false,
        code: "FILE_MIME_REJECTED",
        message: "Tipo de archivo no permitido. Solo imágenes JPEG/PNG/WebP/SVG/GIF.",
      };
    }
  }
  if (input.filename) {
    const lower = input.filename.toLowerCase();
    if (lower.includes("..") || lower.includes("/") || lower.includes("\\")) {
      return { ok: false, code: "FILE_NAME_REJECTED", message: "Nombre de archivo inválido." };
    }
    const dot = lower.lastIndexOf(".");
    const ext = dot >= 0 ? lower.slice(dot) : "";
    if (!ALLOWED_EXT.has(ext)) {
      return { ok: false, code: "FILE_EXT_REJECTED", message: "Extensión de archivo no permitida." };
    }
  }
  return { ok: true };
}

export function validatePublicImageUrl(url: string): FileValidationResult {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { ok: false, code: "URL_PROTOCOL_REJECTED", message: "Solo http/https." };
    }
    const path = parsed.pathname.toLowerCase();
    const okExt = [...ALLOWED_EXT].some((ext) => path.endsWith(ext)) || path.startsWith("/brand/");
    if (!okExt && !path.includes("/images/")) {
      return {
        ok: false,
        code: "URL_PATH_REJECTED",
        message: "URL de imagen no reconocida como recurso de medios.",
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, code: "URL_INVALID", message: "URL inválida." };
  }
}
