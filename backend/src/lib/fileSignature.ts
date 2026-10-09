export const ALLOWED_SLIP_TYPES = ['application/pdf', 'image/png', 'image/jpeg'] as const;
export type SlipMimeType = (typeof ALLOWED_SLIP_TYPES)[number];

export const MAX_SLIP_BYTES = 5 * 1024 * 1024;

const SIGNATURES: Record<SlipMimeType, number[]> = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  'image/jpeg': [0xff, 0xd8, 0xff],
};

export const EXTENSIONS: Record<SlipMimeType, string> = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
};

export const isAllowedSlipType = (mime: string): mime is SlipMimeType =>
  (ALLOWED_SLIP_TYPES as readonly string[]).includes(mime);

/** The declared MIME type comes from the client; the magic bytes confirm the content really is that type. */
export function contentMatchesType(data: Buffer, mime: SlipMimeType): boolean {
  const signature = SIGNATURES[mime];
  return data.length >= signature.length && signature.every((byte, i) => data[i] === byte);
}
