/* eslint-disable @next/next/no-img-element -- Local signature data URL is rendered directly for printing. */
import { useLanguage } from "@/components/language-provider";
import { Mail, Phone } from "lucide-react";
import type { BusinessSettings } from "@/lib/business";
import { calculateTotals, currency, type Invoice } from "@/lib/invoice";

function fullDate(value: string, language: "id" | "en") {
  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function InvoiceDocument({
  invoice,
  business,
}: {
  invoice: Invoice;
  business: BusinessSettings;
}) {
  const { t, language } = useLanguage();

  const totals = calculateTotals(invoice.items, 0, 0);
  const bank = [business.bankName, business.accountName ? `(${business.accountName})` : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <article className="invoice-document reference-invoice">
      <header className="reference-header">
        <h2>INVOICE</h2>
        <img
          className="reference-logo"
          src={business.logo || "/default-logo.svg"}
          alt={`Logo ${business.name}`}
        />
      </header>
      <div className="reference-identifiers">
        <div>
          <span>{t("Date:")}</span>
          <strong>{fullDate(invoice.issued, language)}</strong>
        </div>
        <div>
          <span>{t("No. Invoice :")}</span>
          <strong>{invoice.number || t("Pilih customer terlebih dahulu")}</strong>
        </div>
      </div>
      <div className="reference-parties">
        <section className="reference-bill">
          <h3>{t("Bill to:")}</h3>
          <strong>{invoice.client || t("Nama customer")}</strong>
          <p>{invoice.address || t("Alamat customer belum diisi")}</p>
        </section>
        <section className="reference-payment">
          <h3>{t("Payment Method:")}</h3>
          <p>
            {t("Bank Name:")} {bank || "—"}
          </p>
          <p>
            {t("Account Number:")} {business.accountNumber || "—"}
          </p>
        </section>
      </div>
      <table className="document-table">
        <thead>
          <tr>
            <th>{t("Device")}</th>
            <th>{t("Deskripsi")}</th>
            <th>{t("Qty")}</th>
            <th className="align-right">{t("Harga")}</th>
            <th className="align-right">{t("Jumlah")}</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr key={item.id}>
              <td>{item.device || "—"}</td>
              <td>{item.description || t("Deskripsi item")}</td>
              <td>{item.quantity}</td>
              <td className="align-right">{currency(item.price)}</td>
              <td className="align-right">{currency(Math.round(item.quantity * item.price))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <footer className="reference-bottom">
        <div className="reference-thanks-total">
          <strong className="reference-thanks">{t("THANK YOU!")}</strong>
          <div className="reference-total">
            <span>{t("Total:")}</span>
            <strong>{currency(totals.total)}</strong>
          </div>
        </div>
        <div className="reference-contact-signature">
          <div className="reference-contact">
            <p>
              <Phone size={15} />
              <span>{business.phone || t("Nomor telepon belum diisi")}</span>
            </p>
            <p>
              <Mail size={15} />
              <span>{business.email || t("Email belum diisi")}</span>
            </p>
          </div>
          <div className="reference-author">
            <div className="reference-signature">
              {business.signature && (
                <img
                  src={business.signature}
                  alt={`${t("Tanda tangan")} ${business.invoiceAuthor || t("pembuat invoice")}`}
                />
              )}
            </div>
            <strong>{business.invoiceAuthor || t("Nama Pembuat Invoice")}</strong>
          </div>
        </div>
      </footer>
    </article>
  );
}
