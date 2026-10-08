"use client";
/* eslint-disable @next/next/no-img-element -- Local raster data URLs need no server image optimization. */

import { useLanguage } from "@/components/language-provider";
import { useRef, useState } from "react";
import { Check, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BusinessSettings } from "@/lib/business";

export function BusinessSettingsForm({
  settings,
  onSave,
}: {
  settings: BusinessSettings;
  onSave: (settings: BusinessSettings) => void;
}) {
  const { t } = useLanguage();

  const [draft, setDraft] = useState(settings);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  function field(key: keyof BusinessSettings, value: string) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }
  async function signature(file?: File, target: "signature" | "logo" = "signature") {
    if (!file) return;
    setError("");
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      setError("Gunakan gambar PNG, JPG, atau WebP dengan ukuran maksimal 2 MB.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setLoading(true);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("File tidak dapat dibaca."));
        reader.readAsDataURL(file);
      });
      const image = new Image();
      image.src = data;
      await image.decode();
      if (image.naturalWidth > 6000 || image.naturalHeight > 6000)
        throw new Error("Dimensi gambar terlalu besar. Gunakan maksimal 6000 × 6000 piksel.");
      field(target, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gambar tanda tangan tidak valid.");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
      if (logoRef.current) logoRef.current.value = "";
    }
  }
  return (
    <form
      className="settings-card settings-spacing expanded-settings"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(draft);
      }}
    >
      <section className="settings-section">
        <h2>{t("Logo invoice")}</h2>
        <p>{t("Ditampilkan di kanan atas invoice. PNG, JPG, atau WebP, maksimal 2 MB.")}</p>
        <label htmlFor="logo-file" className="signature-upload-label">
          <Upload size={16} />
          {t("Unggah logo")}
        </label>
        <input
          id="logo-file"
          ref={logoRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={loading}
          onChange={(e) => void signature(e.target.files?.[0], "logo")}
        />
        <div className="signature-preview">
          <img src={draft.logo || "/default-logo.svg"} alt={t("Preview logo invoice")} />
          {draft.logo && (
            <Button type="button" variant="ghost" onClick={() => field("logo", "")}>
              <X size={15} />
              {t("Kembali ke logo default")}
            </Button>
          )}
        </div>
      </section>
      <section className="settings-section">
        <h2>{t("Profil bisnis")}</h2>
        <p>{t("Identitas dan kontak yang digunakan pada invoice.")}</p>
        <label>
          {t("Nama bisnis")}
          <input
            required
            maxLength={100}
            value={draft.name}
            onChange={(e) => field("name", e.target.value)}
          />
        </label>
        <label>
          {t("Alamat bisnis")}
          <textarea
            maxLength={500}
            value={draft.address}
            onChange={(e) => field("address", e.target.value)}
          />
        </label>
        <div className="field-grid two">
          <label>
            {t("Nomor telepon")}
            <input
              type="tel"
              maxLength={40}
              value={draft.phone}
              onChange={(e) => field("phone", e.target.value)}
              placeholder="Contoh: 0812-3456-7890"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              maxLength={150}
              value={draft.email}
              onChange={(e) => field("email", e.target.value)}
              placeholder={t("nama@bisnis.com")}
            />
          </label>
        </div>
      </section>
      <section className="settings-section">
        <h2>{t("Payment Method")}</h2>
        <p>{t("Ditampilkan sebagai Nama Bank (Nama Rekening) dan Account Number.")}</p>
        <div className="field-grid two">
          <label>
            {t("Nama Bank")}
            <input
              maxLength={80}
              value={draft.bankName}
              onChange={(e) => field("bankName", e.target.value)}
              placeholder={t("Contoh: BCA")}
            />
          </label>
          <label>
            {t("Nama Rekening")}
            <input
              maxLength={150}
              value={draft.accountName}
              onChange={(e) => field("accountName", e.target.value)}
              placeholder={t("Nama pemilik rekening")}
            />
          </label>
        </div>
        <label>
          {t("Account Number / Nomor Rekening")}
          <input
            type="text"
            inputMode="numeric"
            maxLength={60}
            value={draft.accountNumber}
            onChange={(e) => field("accountNumber", e.target.value)}
            placeholder="Contoh: 123 456 7890"
          />
        </label>
      </section>
      <section className="settings-section">
        <h2>{t("Pembuat invoice & tanda tangan")}</h2>
        <p>{t("Nama dan tanda tangan ditampilkan di kanan bawah invoice.")}</p>
        <label>
          {t("Nama Pembuat Invoice")}
          <input
            maxLength={150}
            value={draft.invoiceAuthor}
            onChange={(e) => field("invoiceAuthor", e.target.value)}
          />
        </label>
        <label htmlFor="signature-file" className="signature-upload-label">
          <Upload size={16} />
          {t("Unggah tanda tangan")}
        </label>
        <input
          ref={fileRef}
          id="signature-file"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => void signature(e.target.files?.[0])}
          disabled={loading}
        />
        <p className="signature-help">
          {t("PNG transparan disarankan. PNG, JPG, atau WebP; maksimal 2 MB.")}{" "}
          {loading && "Memeriksa gambar…"}
        </p>
        {error && (
          <p role="alert" className="form-error">
            {t(error)}
          </p>
        )}
        {draft.signature && (
          <div className="signature-preview">
            <img src={draft.signature} alt={t("Preview tanda tangan")} />
            <Button type="button" variant="ghost" onClick={() => field("signature", "")}>
              <X size={15} />
              {t("Hapus tanda tangan")}
            </Button>
          </div>
        )}
      </section>
      <Button type="submit" disabled={loading}>
        <Check size={16} />
        {t("Simpan pengaturan")}
      </Button>
    </form>
  );
}
