export const IMAGE_BYTES = 2 * 1024 * 1024;

export function decodePrivateImage(value: string) {
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw new Error("Gambar harus PNG, JPG, atau WebP.");
  const bytes = Buffer.from(match[2], "base64");
  const valid =
    match[1] === "png"
      ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : match[1] === "jpeg"
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (!valid || bytes.length > IMAGE_BYTES)
    throw new Error("Gambar tidak valid atau melebihi 2 MB.");
  return { bytes, contentType: `image/${match[1]}` };
}

export function privateImageUrl(kind: "logo" | "signature", version: string) {
  return `/api/settings/image/${kind}?v=${encodeURIComponent(version)}`;
}
