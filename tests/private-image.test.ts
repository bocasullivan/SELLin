import test from "node:test";
import assert from "node:assert/strict";
import { decodePrivateImage, IMAGE_BYTES, privateImageUrl } from "../src/lib/private-image.ts";

test("private images enforce MIME, signature and two-megabyte bound", () => {
  const png = Buffer.alloc(IMAGE_BYTES);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
  const encoded = `data:image/png;base64,${png.toString("base64")}`;
  assert.equal(decodePrivateImage(encoded).bytes.length, IMAGE_BYTES);
  assert.ok(
    Buffer.byteLength(
      JSON.stringify({ action: "settings.image", data: { kind: "logo", value: encoded } }),
    ) < 3_000_000,
  );
  assert.throws(() =>
    decodePrivateImage(
      `data:image/png;base64,${Buffer.concat([png, Buffer.alloc(1)]).toString("base64")}`,
    ),
  );
  assert.throws(() => decodePrivateImage("data:image/png;base64,YWJj"));
  assert.throws(() => decodePrivateImage("data:image/svg+xml;base64,YWJj"));
  assert.equal(privateImageUrl("logo", "version"), "/api/settings/image/logo?v=version");
});
