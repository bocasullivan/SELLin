"use client";

// NONAKTIF: halaman Invoice lama disimpan sebagai referensi, tidak ada di navigasi.
// Editor dan dokumen masih digunakan oleh Dashboard sampai dipisahkan lebih lanjut.

import { useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  FileText,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  Users,
  X,
  Trash2,
  ArrowLeft,
  Printer,
  Menu,
  Clock3,
  Command,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { demoInvoices } from "@/lib/demo-data";
import {
  calculateTotals,
  currency,
  dateLabel,
  isOverdue,
  localDate,
  type Invoice,
} from "@/lib/invoice";

type View = "Ringkasan" | "Invoice" | "Pelanggan" | "Pengaturan";
const navigation = [
  { label: "Ringkasan", icon: LayoutDashboard },
  { label: "Invoice", icon: FileText },
  { label: "Pelanggan", icon: Users },
  { label: "Pengaturan", icon: Settings },
] as const;
const amount = (invoice: Invoice) =>
  calculateTotals(invoice.items, invoice.discount, invoice.tax).total;

export function Workspace() {
  const [view, setView] = useState<View>("Invoice");
  const [invoices, setInvoices] = useState(demoInvoices);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Semua invoice");
  const [editor, setEditor] = useState<Invoice | null>(null);
  const [preview, setPreview] = useState<Invoice | null>(null);
  const [notice, setNotice] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [business, setBusiness] = useState({
    name: "Bisnis kamu",
    email: "hello@bisnis.example",
    address: "Jakarta, Indonesia",
    bank: "Isi rekening melalui Pengaturan",
  });
  const today = localDate();
  const unpaid = invoices.filter((i) => i.status === "Belum dibayar");
  const paid = invoices.filter((i) => i.status === "Lunas");
  const late = unpaid.filter((i) => isOverdue(i, today));
  const filtered = invoices.filter(
    (i) =>
      `${i.number} ${i.client}`.toLowerCase().includes(search.toLowerCase()) &&
      (filter === "Semua invoice" ||
        (filter === "Terlambat" ? isOverdue(i, today) : i.status === filter)),
  );

  function createInvoice() {
    const year = today.slice(0, 4);
    const sequence =
      Math.max(
        0,
        ...invoices
          .filter((i) => i.number.startsWith(`INV-${year}-`))
          .map((i) => Number(i.number.split("-").at(-1)) || 0),
      ) + 1;
    setEditor({
      id: crypto.randomUUID(),
      number: `INV-${year}-${String(sequence).padStart(3, "0")}`,
      client: "",
      email: "",
      address: "",
      issued: today,
      due: today,
      status: "Draft",
      items: [{ id: crypto.randomUUID(), description: "", quantity: 1, price: 0 }],
      discount: 0,
      tax: 0,
      notes:
        "Terima kasih atas kepercayaannya. Silakan lakukan pembayaran sebelum tanggal jatuh tempo.",
    });
  }
  function saveInvoice(invoice: Invoice) {
    setInvoices((previous) =>
      previous.some((i) => i.id === invoice.id)
        ? previous.map((i) => (i.id === invoice.id ? invoice : i))
        : [invoice, ...previous],
    );
    setEditor(null);
    setNotice("Draft tersimpan di sesi demo ini. Refresh akan menghapus perubahan.");
  }

  return (
    <div className="workspace">
      <aside className={`sidebar ${mobileNav ? "is-open" : ""}`}>
        <Link className="brand" href="/" aria-label="SELLin beranda">
          <span className="brand-symbol">
            <Command size={20} />
          </span>
          SELL<span className="brand-light">in</span>
          <span className="brand-dot">.</span>
        </Link>
        <div className="workspace-switch">
          <span className="workspace-avatar">B</span>
          <div>
            <strong>Workspace pribadi</strong>
            <span>Ruang kerja kamu</span>
          </div>
          <ChevronDown size={15} />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Navigasi utama">
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${view === label ? "active" : ""}`}
              onClick={() => {
                setView(label);
                setEditor(null);
                setMobileNav(false);
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
              {label === "Invoice" && <span className="nav-count">{invoices.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="quiet-card">
            <span className="tiny-symbol">
              <FileText size={17} />
            </span>
            <strong>Lebih rapi. Lebih simpel.</strong>
            <p>Invoice profesional, tanpa harus mulai dari nol.</p>
            <span>
              Made for your everyday work <ArrowUpRight size={13} />
            </span>
          </div>
          <button
            className="help-link"
            onClick={() =>
              setNotice(
                "Ini preview SELLin. Buat draft, lihat invoice, atau coba cetak melalui browser. Data hanya bertahan selama sesi ini.",
              )
            }
          >
            <CircleHelp size={17} /> Bantuan & informasi <ArrowUpRight size={14} />
          </button>
          <div className="profile">
            <span className="profile-avatar">K</span>
            <div>
              <strong>Akun pribadi</strong>
              <span>Mode demo · belum login</span>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      {mobileNav && (
        <button
          className="nav-backdrop"
          aria-label="Tutup navigasi"
          onClick={() => setMobileNav(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="Buka navigasi"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{editor ? "Buat invoice" : view}</strong>
          </div>
          <div className="topbar-right">
            <span className="demo-tag">
              <span /> UI preview
            </span>
            <span className="header-avatar">K</span>
          </div>
        </header>
        <main>
          <div className="demo-banner">
            <span>
              <CircleHelp size={15} />
              <strong>Mode demo</strong>
              <span>Data contoh, tanpa login. Perubahan hilang saat halaman dimuat ulang.</span>
            </span>
            <span className="demo-banner-label">TAHAP 01</span>
          </div>
          {notice && (
            <div className="notice" role="status">
              <span>{notice}</span>
              <button
                className="icon-button"
                aria-label="Tutup pemberitahuan"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {editor ? (
            <InvoiceEditor
              invoice={editor}
              onCancel={() => setEditor(null)}
              onSave={saveInvoice}
              onPreview={setPreview}
            />
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">YOUR BUSINESS, ORGANIZED</div>
                  <h1>
                    {view === "Ringkasan"
                      ? "Semua dalam kendali."
                      : view === "Invoice"
                        ? "Invoice"
                        : view === "Pelanggan"
                          ? "Pelanggan"
                          : "Pengaturan"}
                    <span className="heading-dot">.</span>
                  </h1>
                  <p>
                    {view === "Invoice"
                      ? "Lebih sedikit administrasi. Lebih banyak waktu untuk berkarya."
                      : view === "Ringkasan"
                        ? "Lihat gambaran tagihan dan aktivitas bisnis kamu."
                        : view === "Pelanggan"
                          ? "Orang-orang di balik setiap kerja sama yang baik."
                          : "Identitas bisnis untuk invoice yang lebih personal."}
                  </p>
                </div>
                {view !== "Pengaturan" && (
                  <Button onClick={createInvoice}>
                    <Plus size={17} /> Buat invoice
                  </Button>
                )}
              </div>
              {(view === "Invoice" || view === "Ringkasan") && (
                <>
                  <section className="stats-grid" aria-label="Ringkasan invoice">
                    <Stat
                      label="Belum dibayar"
                      value={currency(unpaid.reduce((s, i) => s + amount(i), 0))}
                      detail={`${unpaid.length} invoice menunggu pembayaran`}
                      icon={<ArrowUpRight size={18} />}
                    />
                    <Stat
                      label="Pembayaran diterima"
                      value={currency(paid.reduce((s, i) => s + amount(i), 0))}
                      detail={`${paid.length} invoice sudah lunas · seluruh periode`}
                      icon={<ArrowDownLeft size={18} />}
                    />
                    <Stat
                      label="Melewati jatuh tempo"
                      value={currency(late.reduce((s, i) => s + amount(i), 0))}
                      detail={`${late.length} invoice perlu ditindaklanjuti`}
                      icon={<Clock3 size={18} />}
                    />
                  </section>
                  <section className="invoice-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>
                          {view === "Ringkasan" ? "Aktivitas invoice" : "Semua invoice"}{" "}
                          <span className="count-pill">{invoices.length}</span>
                        </h2>
                        <p>Kelola setiap tagihan, dari draft sampai lunas.</p>
                      </div>
                      <span className="panel-caption">Satu tempat. Semua tertata.</span>
                    </div>
                    <div className="table-controls">
                      <div className="filter-tabs" aria-label="Filter status">
                        {["Semua invoice", "Belum dibayar", "Lunas", "Draft"].map((label) => (
                          <button
                            key={label}
                            className={filter === label ? "selected" : ""}
                            onClick={() => setFilter(label)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className="search-box">
                        <Search size={16} />
                        <input
                          aria-label="Cari invoice atau pelanggan"
                          placeholder="Cari invoice atau pelanggan..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Nomor invoice</th>
                            <th>Pelanggan</th>
                            <th>Jatuh tempo</th>
                            <th>Status</th>
                            <th className="align-right">Jumlah</th>
                            <th>
                              <span className="sr-only">Aksi</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((invoice) => (
                            <tr key={invoice.id}>
                              <td>
                                <button
                                  className="invoice-number"
                                  onClick={() => setPreview(invoice)}
                                >
                                  <span className="document-icon">
                                    <FileText size={17} />
                                  </span>
                                  {invoice.number}
                                </button>
                                <span className="cell-sub invoice-date">
                                  {dateLabel(invoice.issued)}
                                </span>
                              </td>
                              <td>
                                <strong className="client-name">{invoice.client}</strong>
                                <span className="cell-sub">{invoice.email}</span>
                              </td>
                              <td>
                                <span className={isOverdue(invoice, today) ? "overdue-date" : ""}>
                                  {dateLabel(invoice.due)}
                                </span>
                                {isOverdue(invoice, today) && (
                                  <span className="cell-sub">Melewati jatuh tempo</span>
                                )}
                              </td>
                              <td>
                                <StatusBadge invoice={invoice} today={today} />
                              </td>
                              <td className="align-right total-cell">
                                {currency(amount(invoice))}
                              </td>
                              <td>
                                <button
                                  className="icon-button row-action"
                                  aria-label={`Lihat ${invoice.number}`}
                                  onClick={() => setPreview(invoice)}
                                >
                                  <ArrowUpRight size={18} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!filtered.length && (
                        <div className="empty-state">
                          <Search size={27} />
                          <h3>Tidak ada invoice ditemukan</h3>
                          <p>Coba kata kunci atau filter lainnya.</p>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSearch("");
                              setFilter("Semua invoice");
                            }}
                          >
                            Reset pencarian
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="table-footer">
                      <span>
                        Menampilkan {filtered.length} dari {invoices.length} invoice
                      </span>
                      <span>
                        Data demo <span className="footer-dot">•</span> IDR / Rupiah
                      </span>
                    </div>
                  </section>
                  <div className="bottom-note">
                    <span>
                      <span className="note-line" /> Dibuat untuk membuat pekerjaanmu lebih ringan.
                    </span>
                    <span>SELLin / invoicing, simply.</span>
                  </div>
                </>
              )}
              {view === "Pelanggan" && (
                <div className="customer-grid">
                  {Array.from(new Set(invoices.map((i) => i.client))).map((client) => {
                    const records = invoices.filter((i) => i.client === client);
                    return (
                      <article className="customer-card" key={client}>
                        <span className="customer-avatar">
                          {client
                            .split(" ")
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <h2>{client}</h2>
                        <p>{records[0].email}</p>
                        <div>
                          <span>{records.length} invoice</span>
                          <strong>
                            {currency(records.reduce((sum, i) => sum + amount(i), 0))}
                          </strong>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setView("Invoice");
                            setSearch(client);
                            setFilter("Semua invoice");
                          }}
                        >
                          Lihat invoice <ArrowUpRight size={15} />
                        </Button>
                      </article>
                    );
                  })}
                </div>
              )}
              {view === "Pengaturan" && (
                <form
                  className="settings-card"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setNotice(
                      "Identitas bisnis diperbarui untuk preview sesi ini. Belum tersimpan permanen.",
                    );
                  }}
                >
                  <h2>Profil bisnis</h2>
                  <p>Informasi ini muncul pada preview dan hasil cetak invoice.</p>
                  <label>
                    Nama bisnis
                    <input
                      required
                      maxLength={100}
                      value={business.name}
                      onChange={(e) => setBusiness({ ...business, name: e.target.value })}
                    />
                  </label>
                  <label>
                    Email bisnis
                    <input
                      type="email"
                      required
                      value={business.email}
                      onChange={(e) => setBusiness({ ...business, email: e.target.value })}
                    />
                  </label>
                  <label>
                    Alamat
                    <textarea
                      value={business.address}
                      onChange={(e) => setBusiness({ ...business, address: e.target.value })}
                    />
                  </label>
                  <label>
                    Informasi pembayaran
                    <textarea
                      value={business.bank}
                      onChange={(e) => setBusiness({ ...business, bank: e.target.value })}
                    />
                  </label>
                  <Button type="submit">
                    <Check size={16} /> Terapkan untuk preview
                  </Button>
                </form>
              )}
            </>
          )}
        </main>
        <footer className="app-footer">
          <span>© 2026 SELLin</span>
          <span>A little less paperwork.</span>
        </footer>
      </div>
      {preview && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreview(null);
          }}
        >
          <section
            className="preview-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-title"
          >
            <div className="preview-toolbar">
              <div>
                <strong id="preview-title">Preview invoice</strong>
                <span>Demo · bukan invoice resmi</span>
              </div>
              <div className="preview-actions">
                {preview.status === "Draft" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditor(preview);
                      setPreview(null);
                    }}
                  >
                    Edit draft
                  </Button>
                )}
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer size={16} /> Cetak / PDF
                </Button>
                <button
                  autoFocus
                  className="icon-button"
                  aria-label="Tutup preview"
                  onClick={() => setPreview(null)}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <InvoiceDocument invoice={preview} business={business} />
            <p className="print-hint">
              Pilih “Save as PDF” pada dialog cetak browser. PDF server akan ditambahkan pada tahap
              berikutnya.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="stat-card">
      <div className="stat-label">
        {label}
        <span>{icon}</span>
      </div>
      <strong className="stat-value">{value}</strong>
      <span className="stat-detail">
        <span />
        {detail}
      </span>
    </article>
  );
}
function StatusBadge({ invoice, today }: { invoice: Invoice; today: string }) {
  const late = isOverdue(invoice, today);
  return (
    <span
      className={`status-badge ${invoice.status === "Lunas" ? "paid" : invoice.status === "Draft" ? "draft" : late ? "late" : "unpaid"}`}
    >
      {invoice.status === "Lunas" ? <Check size={12} /> : <span className="status-dot" />}
      {late ? "Terlambat" : invoice.status}
    </span>
  );
}

export function InvoiceEditor({
  invoice,
  onCancel,
  onSave,
  onPreview,
}: {
  invoice: Invoice;
  onCancel: () => void;
  onSave: (i: Invoice) => void;
  onPreview: (i: Invoice) => void;
}) {
  const [draft, setDraft] = useState(invoice);
  const totals = calculateTotals(draft.items, draft.discount, draft.tax);
  const update = (key: keyof Invoice, value: Invoice[keyof Invoice]) =>
    setDraft((previous) => ({ ...previous, [key]: value }));
  return (
    <>
      <button className="back-link" onClick={onCancel}>
        <ArrowLeft size={15} /> Kembali ke workspace
      </button>
      <div className="page-heading editor-heading">
        <div>
          <div className="eyebrow">MAKE IT OFFICIAL</div>
          <h1>
            {invoice.client ? "Edit draft" : "Buat invoice"}
            <span className="heading-dot">.</span>
          </h1>
          <p>Detail yang jelas. Kesan yang profesional.</p>
        </div>
        <span className="status-badge draft">
          <span className="status-dot" />
          Draft
        </span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(draft);
        }}
        className="editor-grid"
      >
        <div className="editor-fields">
          <section className="form-card">
            <h2>
              <span>01</span> Detail invoice
            </h2>
            <div className="field-grid">
              <label>
                Nomor invoice
                <input required value={draft.number} readOnly />
              </label>
              <label>
                Tanggal invoice
                <input
                  required
                  type="date"
                  value={draft.issued}
                  onChange={(e) => update("issued", e.target.value)}
                />
              </label>
              <label>
                Jatuh tempo
                <input
                  required
                  type="date"
                  min={draft.issued}
                  value={draft.due}
                  onChange={(e) => update("due", e.target.value)}
                />
              </label>
            </div>
          </section>
          <section className="form-card">
            <h2>
              <span>02</span> Ditagihkan kepada
            </h2>
            <div className="field-grid two">
              <label>
                Nama pelanggan
                <input
                  required
                  maxLength={100}
                  placeholder="Contoh: Studio Senja"
                  value={draft.client}
                  onChange={(e) => update("client", e.target.value)}
                />
              </label>
              <label>
                Email pelanggan
                <input
                  type="email"
                  placeholder="hello@pelanggan.com"
                  value={draft.email}
                  onChange={(e) => update("email", e.target.value)}
                />
              </label>
            </div>
            <label>
              Alamat <span className="optional">(opsional)</span>
              <textarea
                rows={2}
                placeholder="Alamat pelanggan"
                value={draft.address}
                onChange={(e) => update("address", e.target.value)}
              />
            </label>
          </section>
          <section className="form-card">
            <h2>
              <span>03</span> Item & layanan
            </h2>
            {draft.items.map((item, index) => (
              <div className="item-fields" key={item.id}>
                <label>
                  Deskripsi
                  <input
                    required
                    maxLength={200}
                    placeholder="Nama produk atau jasa"
                    value={item.description}
                    onChange={(e) =>
                      update(
                        "items",
                        draft.items.map((i, n) =>
                          n === index ? { ...i, description: e.target.value } : i,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Qty
                  <input
                    required
                    type="number"
                    min="1"
                    max="100000"
                    step="1"
                    value={item.quantity}
                    onChange={(e) =>
                      update(
                        "items",
                        draft.items.map((i, n) =>
                          n === index ? { ...i, quantity: Number(e.target.value) } : i,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Harga (Rp)
                  <input
                    required
                    type="number"
                    min="0"
                    max="100000000000"
                    step="1"
                    value={item.price}
                    onChange={(e) =>
                      update(
                        "items",
                        draft.items.map((i, n) =>
                          n === index ? { ...i, price: Number(e.target.value) } : i,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  className="icon-button delete-item"
                  disabled={draft.items.length === 1}
                  aria-label={`Hapus item ${index + 1}`}
                  onClick={() =>
                    update(
                      "items",
                      draft.items.filter((i) => i.id !== item.id),
                    )
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                update("items", [
                  ...draft.items,
                  { id: crypto.randomUUID(), description: "", quantity: 1, price: 0 },
                ])
              }
            >
              <Plus size={15} /> Tambah item
            </Button>
          </section>
          <section className="form-card">
            <h2>
              <span>04</span> Detail tambahan
            </h2>
            <div className="field-grid two">
              <label>
                Diskon (%)
                <input
                  required
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={draft.discount}
                  onChange={(e) => update("discount", Number(e.target.value))}
                />
              </label>
              <label>
                Pajak (%)
                <input
                  required
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={draft.tax}
                  onChange={(e) => update("tax", Number(e.target.value))}
                />
              </label>
            </div>
            <label>
              Catatan
              <textarea
                rows={3}
                value={draft.notes}
                onChange={(e) => update("notes", e.target.value)}
              />
            </label>
          </section>
        </div>
        <aside className="editor-summary">
          <div className="summary-title">
            <FileText size={18} />
            <h2>Ringkasan invoice</h2>
          </div>
          <p>{draft.number}</p>
          <div className="summary-rows">
            <div>
              <span>Subtotal</span>
              <strong>{currency(totals.subtotal)}</strong>
            </div>
            <div>
              <span>Diskon ({draft.discount}%)</span>
              <strong>− {currency(totals.discountAmount)}</strong>
            </div>
            <div>
              <span>Pajak ({draft.tax}%)</span>
              <strong>{currency(totals.taxAmount)}</strong>
            </div>
          </div>
          <div className="summary-total">
            <span>Total tagihan</span>
            <strong>{currency(totals.total)}</strong>
            <small>IDR / Rupiah</small>
          </div>
          <Button type="submit">
            <Check size={16} /> Simpan draft
          </Button>
          <Button type="button" variant="outline" onClick={() => onPreview(draft)}>
            Lihat preview <ArrowUpRight size={16} />
          </Button>
          <p className="summary-disclaimer">
            Draft hanya disimpan dalam sesi demo. Belum ada penerbitan atau pengiriman invoice.
          </p>
        </aside>
      </form>
    </>
  );
}

export function InvoiceDocument({
  invoice,
  business,
}: {
  invoice: Invoice;
  business: { name: string; email: string; address: string; bank: string };
}) {
  const totals = calculateTotals(invoice.items, invoice.discount, invoice.tax);
  return (
    <article className="invoice-document">
      <div className="document-top">
        <div>
          <strong className="document-business">{business.name}</strong>
          <p>
            {business.email}
            <br />
            {business.address}
          </p>
        </div>
        <div className="document-label">
          <h2>INVOICE</h2>
          <p>{invoice.number}</p>
          <span>PREVIEW / DEMO</span>
        </div>
      </div>
      <div className="document-meta">
        <div>
          <span>DITAGIHKAN KEPADA</span>
          <strong>{invoice.client || "Nama pelanggan"}</strong>
          <p>
            {invoice.email}
            <br />
            {invoice.address}
          </p>
        </div>
        <div>
          <span>TANGGAL INVOICE</span>
          <strong>{dateLabel(invoice.issued)}</strong>
          <span className="due-label">JATUH TEMPO</span>
          <strong>{dateLabel(invoice.due)}</strong>
        </div>
      </div>
      <table className="document-table">
        <thead>
          <tr>
            <th>Deskripsi</th>
            <th>Qty</th>
            <th className="align-right">Harga</th>
            <th className="align-right">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr key={item.id}>
              <td>{item.description || "Deskripsi item"}</td>
              <td>{item.quantity}</td>
              <td className="align-right">{currency(item.price)}</td>
              <td className="align-right">{currency(Math.round(item.quantity * item.price))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="document-totals">
        <div>
          <span>Subtotal</span>
          <strong>{currency(totals.subtotal)}</strong>
        </div>
        {invoice.discount > 0 && (
          <div>
            <span>Diskon ({invoice.discount}%)</span>
            <strong>− {currency(totals.discountAmount)}</strong>
          </div>
        )}
        {invoice.tax > 0 && (
          <div>
            <span>Pajak ({invoice.tax}%)</span>
            <strong>{currency(totals.taxAmount)}</strong>
          </div>
        )}
        <div className="document-grand-total">
          <span>Total</span>
          <strong>{currency(totals.total)}</strong>
        </div>
      </div>
      <div className="document-notes">
        <span>INFORMASI PEMBAYARAN</span>
        <p>{business.bank}</p>
        {invoice.notes && (
          <>
            <span>CATATAN</span>
            <p>{invoice.notes}</p>
          </>
        )}
      </div>
      <div className="document-footer">
        Terima kasih atas kerja samanya.<span>Dokumen demo — bukan tagihan resmi.</span>
      </div>
    </article>
  );
}
