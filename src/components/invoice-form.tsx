"use client";

import { useLanguage } from "@/components/language-provider";
import { useId, useState } from "react";
import { Check, ChevronDown, Eye, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Customer } from "@/components/workspace";
import {
  calculateTotals,
  currency,
  nextInvoiceNumber,
  type Invoice,
  type InvoiceItem,
} from "@/lib/invoice";

function CustomerLookup({
  field,
  customers,
  selected,
  onSelect,
  onClear,
}: {
  field: "id" | "name";
  customers: Customer[];
  selected?: Customer;
  onSelect: (c: Customer) => void;
  onClear: () => void;
}) {
  const { t } = useLanguage();

  const id = useId();
  const [query, setQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const results = customers.filter(
    (c) => query === null || `${c.id} ${c.name}`.toLowerCase().includes(query.toLowerCase()),
  );
  function choose(customer: Customer) {
    onSelect(customer);
    setQuery(null);
    setOpen(false);
  }
  return (
    <div
      className="customer-lookup"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setOpen(false);
          setQuery(null);
        }
      }}
    >
      <label htmlFor={id}>{t(field === "id" ? "ID Customer" : "Cari nama customer")}</label>
      <div className="lookup-input">
        <input
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-activedescendant={open && results[index] ? `${id}-${results[index].id}` : undefined}
          value={query ?? selected?.[field] ?? ""}
          placeholder={t(field === "id" ? "Ketik ID customer..." : "Ketik nama customer...")}
          autoComplete="off"
          onFocus={() => {
            setQuery(null);
            setIndex(0);
            setOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
            setOpen(true);
            onClear();
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setIndex((n) => Math.min(n + 1, results.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((n) => Math.max(0, n - 1));
            }
            if (e.key === "Enter" && open) {
              e.preventDefault();
              if (results[index]) choose(results[index]);
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
              setQuery(null);
            }
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={t(field === "id" ? "Buka pilihan ID customer" : "Buka pilihan nama customer")}
          onClick={() => {
            setQuery(null);
            setIndex(0);
            setOpen(!open);
          }}
        >
          <ChevronDown size={16} />
        </button>
      </div>
      {open && (
        <div
          id={`${id}-list`}
          role="listbox"
          className="lookup-options"
          aria-label={t("Pilihan customer")}
        >
          {results.map((customer, n) => (
            <div
              key={customer.id}
              id={`${id}-${customer.id}`}
              role="option"
              aria-selected={selected?.id === customer.id}
              className={n === index ? "highlighted" : ""}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(customer)}
            >
              <strong>{customer.id}</strong>
              <span>{customer.name}</span>
            </div>
          ))}
          {!results.length && <p>{t("Tidak ada customer ditemukan.")}</p>}
        </div>
      )}
    </div>
  );
}

export function InvoiceForm({
  invoice,
  invoices,
  customers,
  onCancel,
  onSave,
  onPreview,
}: {
  invoice: Invoice;
  invoices: Invoice[];
  customers: Customer[];
  onCancel: () => void;
  onSave: (invoice: Invoice) => void;
  onPreview: (invoice: Invoice) => void;
}) {
  const { t } = useLanguage();

  const [data, setData] = useState(invoice);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [focusItemId, setFocusItemId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState(invoice.customerId ?? "");
  const selected = customers.find((c) => c.id === customerId);
  const [error, setError] = useState("");
  const totals = calculateTotals(data.items, 0, 0);
  const editing = invoices.some((i) => i.id === invoice.id);
  let number = "";
  let numberingError = "";
  if (selected && data.issued) {
    try {
      number =
        // REVISI : Nomor invoice tersimpan tidak berubah saat tanggal/customer dikoreksi.
        editing
          ? invoice.number
          : nextInvoiceNumber(
              invoices.filter((i) => i.id !== data.id),
              selected.id,
              data.issued,
            );
      // REVISI END
    } catch (err) {
      numberingError = err instanceof Error ? err.message : "Nomor invoice tidak tersedia.";
    }
  }
  const prepared: Invoice = {
    ...data,
    number,
    customerId,
    client: selected?.name ?? "",
    email: selected?.contact ?? "",
    address: selected
      ? [selected.address === "—" ? "" : selected.address, selected.city].filter(Boolean).join(", ")
      : "",
    discount: 0,
    tax: 0,
    notes: "",
  };
  function updateItem(index: number, changes: Partial<InvoiceItem>) {
    setData((previous) => ({
      ...previous,
      items: previous.items.map((item, n) => (n === index ? { ...item, ...changes } : item)),
    }));
  }
  function addItem() {
    const id = crypto.randomUUID();
    setFocusItemId(id);
    setData((previous) => ({
      ...previous,
      items: [...previous.items, { id, device: "", description: "", quantity: 1, price: 0 }],
    }));
  }
  function handlePriceChange(index: number, item: InvoiceItem, value: string) {
    setPriceDrafts((previous) => ({ ...previous, [item.id]: value }));
    if (value !== "") updateItem(index, { price: Number(value) });
  }
  function handlePriceBlur(item: InvoiceItem) {
    setPriceDrafts((previous) => {
      const next = { ...previous };
      delete next[item.id];
      return next;
    });
  }
  function validCustomer() {
    if (!selected || !number) {
      setError(numberingError || "Pilih customer dari dropdown ID atau nama terlebih dahulu.");
      return false;
    }
    setError("");
    return true;
  }

  return (
    <form
      className="editor-grid revised-editor"
      onSubmit={(e) => {
        e.preventDefault();
        if (validCustomer()) onSave(prepared);
      }}
    >
      <div className="editor-fields">
        {error && (
          <div className="notice form-error" role="alert">
            {t(error)}
          </div>
        )}
        <section className="form-card">
          <h2>{t("Detail invoice")}</h2>
          <div className="field-grid two">
            <label>
              {t("Nomor invoice")}
              <input disabled value={number} placeholder={t("Otomatis setelah memilih customer")} />
            </label>
            <label>
              {t("Tanggal invoice")}
              <input
                required
                type="date"
                value={data.issued}
                onChange={(e) => setData({ ...data, issued: e.target.value })}
              />
            </label>
          </div>
          {numberingError && <p role="alert">{t(numberingError)}</p>}
          <label>
            {t("Status")}
            <select
              value={data.status}
              onChange={(e) => setData({ ...data, status: e.target.value as Invoice["status"] })}
            >
              <option value="Belum dibayar">{t("Belum dibayar")}</option>
              <option value="Lunas">{t("Lunas")}</option>
            </select>
          </label>
        </section>
        <section className="form-card">
          <h2>{t("Customer")}</h2>
          <div className="field-grid two">
            {(["id", "name"] as const).map((field) => (
              <CustomerLookup
                key={field}
                field={field}
                customers={customers}
                selected={selected}
                onSelect={(c) => {
                  setCustomerId(c.id);
                  setError("");
                }}
                onClear={() => setCustomerId("")}
              />
            ))}
          </div>
          <label>
            {t("Nama customer")}
            <input disabled value={prepared.client} />
          </label>
          <label>
            {t("Kontak")}
            <input disabled value={prepared.email} />
          </label>
          <label>
            {t("Alamat")}
            <textarea disabled value={prepared.address} />
          </label>
        </section>
        <section className="form-card">
          <h2>{t("Item & layanan")}</h2>
          {data.items.map((item, index) => (
            <div className="item-fields device-item-fields" key={item.id}>
              <label>
                {t("Device")}
                <input
                  ref={(element) => {
                    if (element && item.id === focusItemId) element.focus();
                  }}
                  maxLength={150}
                  placeholder={t("Device / pemilik")}
                  value={item.device ?? ""}
                  onFocus={() => {
                    if (focusItemId === item.id) setFocusItemId(null);
                  }}
                  onChange={(e) => updateItem(index, { device: e.target.value })}
                />
              </label>
              <label>
                {t("Deskripsi")}
                <input
                  required
                  maxLength={200}
                  placeholder={t("Produk atau layanan")}
                  value={item.description}
                  onChange={(e) => updateItem(index, { description: e.target.value })}
                />
              </label>
              <label>
                {t("Qty")}
                <input
                  required
                  type="number"
                  min="1"
                  max="100000"
                  step="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                />
              </label>
              <label>
                {t("Harga (Rp)")}
                <input
                  required
                  type="number"
                  min="0"
                  max="100000000000"
                  step="1"
                  value={priceDrafts[item.id] ?? item.price}
                  onChange={(e) => handlePriceChange(index, item, e.target.value)}
                  onBlur={() => handlePriceBlur(item)}
                />
              </label>
              <button
                type="button"
                className="icon-button delete-item"
                aria-label={`${t("Hapus item")} ${index + 1}`}
                disabled={data.items.length === 1}
                tabIndex={-1}
                onClick={() =>
                  setData({ ...data, items: data.items.filter((i) => i.id !== item.id) })
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addItem}>
            <Plus size={16} />
            {t("Tambah item")}
          </Button>
        </section>
        {/* NONAKTIF: Detail tambahan disimpan dalam InvoiceFormNonaktif di workspace.tsx. */}
      </div>
      <aside className="editor-summary">
        <h2>{t("Ringkasan invoice")}</h2>
        <p>{number || t("Pilih customer untuk nomor invoice")}</p>
        <div className="summary-rows">
          <div>
            <span>{t("Subtotal")}</span>
            <strong>{currency(totals.subtotal)}</strong>
          </div>
          {/* NONAKTIF: Diskon dan pajak disimpan dalam InvoiceFormNonaktif. */}
        </div>
        <div className="summary-total">
          <span>{t("Total tagihan")}</span>
          <strong>{currency(totals.total)}</strong>
          <small>{t("IDR / Rupiah")}</small>
        </div>
        <Button type="submit">
          <Check size={16} />
          {t("Simpan invoice")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="preview-button"
          onClick={() => {
            if (validCustomer()) onPreview(prepared);
          }}
        >
          <Eye size={17} />
          {t("Preview invoice")}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("Batal")}
        </Button>
      </aside>
    </form>
  );
}
