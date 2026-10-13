"use client";

import { useLanguage } from "@/components/language-provider";
import { SessionActivity } from "@/components/session-activity";
import { LanguageSelector } from "@/components/language-selector";
import { TablePagination } from "@/components/table-pagination";
import { paginate } from "@/lib/pagination";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { InvoiceForm } from "@/components/invoice-form";
import { InvoiceDocument } from "@/components/invoice-document";
import { BusinessSettingsForm } from "@/components/business-settings";
import type { BusinessSettings } from "@/lib/business";
import type { RecordInfo } from "@/lib/record-info";
import { publishAuthChange } from "@/lib/auth-sync";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Command,
  FileText,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Printer,
  Search,
  Settings,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateTotals, currency, dateLabel, localDate, type Invoice } from "@/lib/invoice";

type View = "Dashboard" | "Pelanggan" | "Pengaturan";
export type Customer = {
  info?: RecordInfo;
  id: string;
  name: string;
  address: string;
  city: string;
  contact: string;
  notes: string;
};
const navigation = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Pelanggan", icon: Users },
  { label: "Pengaturan", icon: Settings },
] as const;
const total = (i: Invoice) => calculateTotals(i.items, i.discount, i.tax).total;
type WorkspaceData = {
  // REVISI : Tenggat Undo dari server untuk notifikasi floating.
  pendingDeletes: { id: string; number: string; deadline: string }[];
  // REVISI END
  customers: Customer[];
  invoices: Invoice[];
  numberingInvoices: Invoice[];
  business: BusinessSettings;
  usedCustomerIds: string[];
};

export function Workspace({
  userEmail,
  initialData,
}: {
  userEmail: string;
  initialData: WorkspaceData;
}) {
  const { t, language } = useLanguage();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error("Logout failed");
      publishAuthChange();
      window.location.replace("/login");
    } catch {
      setNotice(
        language === "en"
          ? "Unable to sign out. Please try again."
          : "Logout gagal. Silakan coba lagi.",
      );
      setLoggingOut(false);
    }
  }

  const [view, setView] = useState<View>("Dashboard");
  const [invoices, setInvoices] = useState<Invoice[]>(initialData.invoices);
  const [numberingInvoices, setNumberingInvoices] = useState(initialData.numberingInvoices);
  const [customers, setCustomers] = useState(initialData.customers);
  // REVISI : Kode manual tidak membutuhkan daftar counter di state UI.
  // REVISI END
  const [saving, setSaving] = useState(false);
  // REVISI : Pending delete bertahan setelah refresh dan finalisasi diminta saat tenggat.
  const [pendingDeletes, setPendingDeletes] = useState(initialData.pendingDeletes ?? []);
  useEffect(() => {
    if (!pendingDeletes.length) return;
    const deadline = Math.min(...pendingDeletes.map((item) => new Date(item.deadline).getTime()));
    const timer = window.setTimeout(
      () => {
        void mutate("invoice.finalize", {});
      },
      Math.max(0, deadline - Date.now()) + 100,
    );
    return () => window.clearTimeout(timer);
  }, [pendingDeletes]);
  // REVISI END
  const savingRef = useRef(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerDeleteTarget, setCustomerDeleteTarget] = useState<Customer | null>(null);
  const [search, setSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [invoicePage, setInvoicePage] = useState(1);
  const [customerPage, setCustomerPage] = useState(1);
  const [filter, setFilter] = useState("Semua invoice");
  const [editor, setEditor] = useState<Invoice | null>(null);
  const [preview, setPreview] = useState<Invoice | null>(null);
  const [infoTarget, setInfoTarget] = useState<{ title: string; info?: RecordInfo } | null>(null);
  const [customerEditor, setCustomerEditor] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [business, setBusiness] = useState(initialData.business);
  const profileRef = useRef<HTMLDivElement>(null);
  const profileButton = useRef<HTMLButtonElement>(null);
  const navButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    function close(event: PointerEvent) {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (profileOpen) {
        setProfileOpen(false);
        profileButton.current?.focus();
      }
      if (mobileNav) {
        setMobileNav(false);
        navButton.current?.focus();
      }
    }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [profileOpen, mobileNav]);
  useEffect(() => {
    if (!mobileNav) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileNav]);

  function navigate(next: View) {
    setView(next);
    setEditor(null);
    setMobileNav(false);
    setProfileOpen(false);
  }
  function createInvoice() {
    const today = localDate();
    setEditor({
      id: crypto.randomUUID(),
      number: "",
      client: "",
      email: "",
      address: "",
      issued: today,
      due: today,
      status: "Belum dibayar",
      items: [{ id: crypto.randomUUID(), device: "", description: "", quantity: 1, price: 0 }],
      discount: 0,
      tax: 0,
      notes: "",
    });
  }
  async function mutate(action: string, data: object) {
    if (savingRef.current) return false;
    savingRef.current = true;
    setSaving(true);
    try {
      const response = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, data }),
      });
      if (response.status === 401) {
        window.location.replace("/login");
        return false;
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setInvoices(result.invoices);
      setNumberingInvoices(result.numberingInvoices);
      setCustomers(result.customers);
      setBusiness(result.business);
      // REVISI : Daftar counter tidak lagi digunakan untuk kode manual.
      // REVISI END
      // REVISI : Sinkronisasi notifikasi Undo setelah mutasi.
      setPendingDeletes(result.pendingDeletes ?? []);
      // REVISI END
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Data gagal disimpan.");
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function saveInvoice(invoice: Invoice) {
    if (
      await mutate("invoice.save", {
        ...invoice,
        existing: invoices.some((record) => record.id === invoice.id),
      })
    ) {
      setEditor(null);
      setNotice("Invoice berhasil disimpan.");
    }
  }
  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const read = (key: string) => String(data.get(key) ?? "").trim();

    const customer: Customer = {
      // REVISI : Kode customer diisi manual.
      id: read("code").toUpperCase(),
      // REVISI END
      name: read("name"),
      address: read("address"),
      city: read("city"),
      contact: read("contact"),
      notes: read("notes"),
    };

    // REVISI : Kirim kode asli agar perubahan kode tetap menemukan UUID yang sama.
    if (
      await mutate("customer.save", {
        ...customer,
        originalCode: editingCustomer?.id,
        existing: !!editingCustomer,
      })
    ) {
      // REVISI END
      setCustomerEditor(false);
      setEditingCustomer(null);
      setNotice("Customer berhasil disimpan. Invoice lama tetap menyimpan identitas sebelumnya.");
    }
  }

  function openCustomerEditor(customer: Customer | null = null) {
    // REVISI : Hilangkan batas customer 4199.
    // REVISI END
    setEditingCustomer(customer);
    setCustomerEditor(true);
  }

  async function deleteCustomer() {
    if (!customerDeleteTarget) return;
    if (await mutate("customer.delete", { id: customerDeleteTarget.id })) {
      setCustomerDeleteTarget(null);
      setNotice(
        "Customer dihapus. ID tidak digunakan ulang dan invoice sebelumnya tetap tersimpan.",
      );
    }
  }

  async function confirmDeleteInvoice() {
    if (!deleteTarget) return;

    if (await mutate("invoice.delete", { id: deleteTarget.id })) {
      setDeleteTarget(null);
      // REVISI : Gunakan toast Undo 5 detik, bukan sukses permanen 2 detik.
      setNotice("");
      // REVISI END
    }
  }

  const active = invoices.filter((i) => i.status !== "Draft");
  const unpaid = active.filter((i) => i.status === "Belum dibayar");
  const paid = active.filter((i) => i.status === "Lunas");
  const filtered = active.filter(
    (i) =>
      `${i.number} ${i.client}`.toLowerCase().includes(search.toLowerCase()) &&
      (filter === "Semua invoice" || i.status === filter),
  );
  const invoicePagination = paginate(filtered, invoicePage);
  const filteredCustomers = customers.filter((customer) =>
    Object.values(customer).join(" ").toLowerCase().includes(customerSearch.toLowerCase()),
  );
  const customerPagination = paginate(filteredCustomers, customerPage);

  return (
    <div className="workspace revised-workspace">
      {saving && (
        <div className="notice" role="status">
          {language === "en" ? "Saving…" : "Menyimpan…"}
        </div>
      )}
      <aside
        id="main-navigation"
        className={`sidebar ${mobileNav ? "is-open" : ""}`}
        aria-label="Navigasi SELLin"
      >
        <div className="sidebar-brand-row">
          <button
            className="brand brand-home"
            onClick={() => navigate("Dashboard")}
            aria-label={t("SELLin, buka ringkasan")}
          >
            <span className="brand-symbol">
              <Command size={20} />
            </span>
            SELL<span className="brand-light">in</span>
            <span className="brand-dot">.</span>
          </button>
          <button
            className="icon-button mobile-nav-close"
            aria-label={t("Tutup sidebar")}
            onClick={() => {
              setMobileNav(false);
              navButton.current?.focus();
            }}
          >
            <X size={21} />
          </button>
        </div>
        <nav aria-label={t("Navigasi utama")}>
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${view === label ? "active" : ""}`}
              aria-current={view === label ? "page" : undefined}
              onClick={() => navigate(label)}
            >
              <Icon size={18} />
              <span>{t(label)}</span>
            </button>
          ))}
        </nav>
      </aside>
      {mobileNav && (
        <button
          className="nav-backdrop"
          aria-label={t("Tutup sidebar")}
          onClick={() => {
            setMobileNav(false);
            navButton.current?.focus();
          }}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              ref={navButton}
              className="mobile-menu icon-button"
              aria-label={t("Buka sidebar")}
              aria-expanded={mobileNav}
              aria-controls="main-navigation"
              onClick={() => setMobileNav(!mobileNav)}
            >
              <Menu size={21} />
            </button>
            <strong>
              {editor
                ? invoices.some((i) => i.id === editor.id)
                  ? t("Edit invoice")
                  : t("Buat invoice")
                : t(view)}
            </strong>
          </div>
          <div className="topbar-right">
            <LanguageSelector />
            <div className="profile-dropdown" ref={profileRef}>
              <button
                ref={profileButton}
                className="header-avatar avatar-button"
                aria-label={t("Buka menu akun")}
                aria-expanded={profileOpen}
                aria-controls="account-dropdown"
                onClick={() => setProfileOpen(!profileOpen)}
              >
                {userEmail[0].toUpperCase()}
              </button>
              {profileOpen && (
                <div id="account-dropdown" className="account-menu">
                  <button onClick={() => navigate("Pengaturan")}>
                    <Settings size={17} />
                    {t("Pengaturan")}
                  </button>
                  <div className="menu-divider" />
                  <button
                    className="logout-action"
                    onClick={() => void logout()}
                    disabled={loggingOut}
                  >
                    <LogOut size={17} />
                    {t("Logout")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main>
          <SessionActivity userEmail={userEmail} />
          {/* REVISI : Floating Undo terpisah dari notifikasi sukses biasa. */}
          {pendingDeletes.length > 0 && (
            <div className="notice workspace-toast undo-toast" role="status">
              <span>
                {pendingDeletes[0].number} —{" "}
                {language === "en" ? "Undo within 5 seconds" : "Undo dalam 5 detik"}
              </span>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => void mutate("invoice.undo", { id: pendingDeletes[0].id })}
              >
                Undo
              </Button>
            </div>
          )}
          {/* REVISI END */}
          {notice && (
            <div className="notice workspace-toast" role="status" aria-live="polite">
              <span>{t(notice)}</span>
              <button
                className="icon-button"
                aria-label={t("Tutup pemberitahuan")}
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {editor ? (
            <InvoiceForm
              invoice={editor}
              invoices={numberingInvoices}
              customers={customers}
              onCancel={() => setEditor(null)}
              onSave={saveInvoice}
              onPreview={setPreview}
            />
          ) : (
            <>
              {view === "Dashboard" && (
                <>
                  <section className="stats-grid" aria-label={t("Ringkasan invoice")}>
                    <Stat
                      label={t("Belum Dibayar")}
                      value={currency(unpaid.reduce((s, i) => s + total(i), 0))}
                      detail={`${unpaid.length} ${t("invoice belum dibayar")}`}
                      tone="red"
                      icon={<ArrowUpRight size={18} />}
                    />
                    <Stat
                      label={t("Pembayaran diterima")}
                      value={currency(paid.reduce((s, i) => s + total(i), 0))}
                      detail={`${paid.length} ${t("invoice lunas")}`}
                      tone="green"
                      icon={<ArrowDownLeft size={18} />}
                    />
                    <Stat
                      label={t("Total nominal invoice")}
                      value={currency(active.reduce((s, i) => s + total(i), 0))}
                      detail={`${active.length} ${t("invoice keseluruhan")}`}
                      tone="blue"
                      icon={<Wallet size={18} />}
                    />
                  </section>
                  <section className="invoice-panel">
                    <div className="table-controls dashboard-controls centered-invoice-toolbar">
                      <div className="filter-tabs" aria-label="Filter invoice">
                        {["Semua invoice", "Belum dibayar", "Lunas"].map((label) => (
                          <button
                            type="button"
                            key={label}
                            aria-pressed={filter === label}
                            className={filter === label ? "selected" : ""}
                            onClick={() => {
                              const y = window.scrollY;
                              setFilter(label);
                              setInvoicePage(1);
                              requestAnimationFrame(() =>
                                window.scrollTo({ top: y, behavior: "instant" }),
                              );
                            }}
                          >
                            {t(label)}
                          </button>
                        ))}
                      </div>
                      <SearchBox
                        value={search}
                        onChange={(value) => {
                          setSearch(value);
                          setInvoicePage(1);
                        }}
                        placeholder={t("Cari invoice atau customer...")}
                      />
                      <Button onClick={createInvoice}>
                        <Plus size={17} />
                        {t("New invoice")}
                      </Button>
                    </div>
                    <div className="table-scroll">
                      <table className="dashboard-table">
                        <thead>
                          <tr>
                            <th>{t("NomorInvoice")}</th>
                            <th>{t("Customer")}</th>
                            <th>{t("Status")}</th>
                            <th className="align-right">{t("Jumlah")}</th>
                            <th>{t("Action")}</th>
                            <th>
                              <span className="sr-only">{t("PDF preview")}</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoicePagination.records.map((invoice) => (
                            <tr key={invoice.id}>
                              <td>
                                <strong className="invoice-number">{invoice.number}</strong>
                                <span className="cell-sub">
                                  {dateLabel(invoice.issued, language)}
                                </span>
                              </td>
                              <td>
                                <strong className="client-name">{invoice.client}</strong>
                                <span className="cell-sub">{invoice.email}</span>
                              </td>
                              <td>
                                <span
                                  className={`status-badge ${invoice.status === "Lunas" ? "paid" : "unpaid"}`}
                                >
                                  {invoice.status === "Lunas" ? (
                                    <Check size={12} />
                                  ) : (
                                    <span className="status-dot" />
                                  )}
                                  {t(invoice.status)}
                                </span>
                              </td>
                              <td className="align-right total-cell">{currency(total(invoice))}</td>
                              <td>
                                <div className="invoice-row-actions">
                                  <button
                                    className="icon-button row-action edit-row-action"
                                    title={t("Edit invoice")}
                                    aria-label={`${t("Edit")} ${invoice.number}`}
                                    onClick={() => setEditor(invoice)}
                                  >
                                    <Pencil size={15} />
                                  </button>
                                  <button
                                    className="icon-button row-action delete-row-action"
                                    title={t("Hapus invoice")}
                                    aria-label={`${t("Hapus")} ${invoice.number}`}
                                    onClick={() => setDeleteTarget(invoice)}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                              <td>
                                <div className="invoice-row-actions">
                                  <button
                                    className="icon-button row-action pdf-preview-action"
                                    aria-label={`${t("Buka PDF preview")} ${invoice.number}`}
                                    title={t("Preview PDF invoice")}
                                    onClick={() => setPreview(invoice)}
                                  >
                                    <FileText size={18} />
                                  </button>
                                  <button
                                    type="button"
                                    className="icon-button row-action"
                                    title={`Info ${invoice.number}`}
                                    aria-label={`Info ${invoice.number}`}
                                    onClick={() =>
                                      setInfoTarget({ title: invoice.number, info: invoice.info })
                                    }
                                  >
                                    <Info size={18} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!filtered.length && (
                        <div className="empty-state">{t("Tidak ada invoice ditemukan.")}</div>
                      )}
                    </div>
                    <TablePagination {...invoicePagination} onPageChange={setInvoicePage} />
                  </section>
                </>
              )}
              {view === "Pelanggan" && (
                <>
                  <section className="invoice-panel">
                    <div className="customer-controls">
                      <SearchBox
                        value={customerSearch}
                        onChange={(value) => {
                          setCustomerSearch(value);
                          setCustomerPage(1);
                        }}
                        placeholder={t("Cari customer...")}
                      />
                      <Button onClick={() => openCustomerEditor()}>
                        <Plus size={17} />
                        {t("New Customer")}
                      </Button>
                    </div>
                    <div className="table-scroll">
                      <table className="customer-table">
                        <thead>
                          <tr>
                            {["ID", "Nama", "Alamat", "Kota", "Kontak", "Keterangan", "Action"].map(
                              (field) => (
                                <th key={field}>{t(field)}</th>
                              ),
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {customerPagination.records.map((customer) => (
                            <tr key={customer.id}>
                              <td>{customer.id}</td>
                              <td>
                                <strong className="client-name">{customer.name}</strong>
                              </td>
                              <td>{customer.address || "—"}</td>
                              <td>{customer.city || "—"}</td>
                              <td>{customer.contact || "—"}</td>
                              <td>{customer.notes || "—"}</td>
                              <td>
                                <div className="invoice-row-actions">
                                  <button
                                    type="button"
                                    className="icon-button row-action"
                                    title={`Info customer ${customer.id}`}
                                    aria-label={`Info customer ${customer.id}`}
                                    onClick={() =>
                                      setInfoTarget({
                                        title: `${customer.id} — ${customer.name}`,
                                        info: customer.info,
                                      })
                                    }
                                  >
                                    <Info size={15} />
                                  </button>
                                  <button
                                    className="icon-button row-action edit-row-action"
                                    aria-label={`${t("Edit Customer")} ${customer.id}`}
                                    title={t("Edit Customer")}
                                    onClick={() => openCustomerEditor(customer)}
                                  >
                                    <Pencil size={15} />
                                  </button>
                                  <button
                                    className="icon-button row-action delete-row-action"
                                    aria-label={`${t("Hapus customer")} ${customer.id}`}
                                    title={t("Hapus customer")}
                                    onClick={() => setCustomerDeleteTarget(customer)}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!filteredCustomers.length && (
                        <div className="empty-state">{t("Tidak ada customer ditemukan.")}</div>
                      )}
                    </div>
                    <TablePagination {...customerPagination} onPageChange={setCustomerPage} />
                  </section>
                </>
              )}
              {view === "Pengaturan" && (
                <BusinessSettingsForm
                  settings={business}
                  onSave={async (settings) => {
                    for (const kind of ["logo", "signature"] as const) {
                      if (settings[kind] === business[kind]) continue;
                      if (!(await mutate("settings.image", { kind, value: settings[kind] })))
                        return;
                    }
                    if (await mutate("settings.save", { ...settings, logo: "", signature: "" }))
                      setNotice("Pengaturan berhasil disimpan.");
                  }}
                />
              )}
            </>
          )}
        </main>
        <footer className="app-footer">
          <span>© 2026 SELLin</span>
        </footer>
      </div>
      {customerEditor && (
        <Dialog
          title={t(editingCustomer ? "Edit Customer" : "Buat Customer")}
          onClose={() => setCustomerEditor(false)}
        >
          <form className="customer-form" onSubmit={saveCustomer}>
            <label>
              {t("ID Customer")}
              {/* REVISI : Input kode manual maksimal 10 karakter. */}
              <input
                name="code"
                required
                maxLength={10}
                pattern="[A-Za-z0-9_-]{1,10}"
                defaultValue={editingCustomer?.id ?? ""}
              />
              {/* REVISI END */}
            </label>
            <label>
              {t("Nama")}
              <input
                name="name"
                required
                maxLength={100}
                autoFocus
                defaultValue={editingCustomer?.name ?? ""}
              />
            </label>
            <label>
              {t("Alamat")}
              <textarea
                name="address"
                maxLength={500}
                defaultValue={
                  editingCustomer?.address === "—" ? "" : (editingCustomer?.address ?? "")
                }
              />
            </label>
            <div className="field-grid two">
              <label>
                {t("Kota")}
                <input name="city" maxLength={100} defaultValue={editingCustomer?.city ?? ""} />
              </label>
              <label>
                {t("Kontak")}
                <input
                  name="contact"
                  maxLength={150}
                  placeholder={t("Nomor telepon atau email")}
                  defaultValue={editingCustomer?.contact ?? ""}
                />
              </label>
            </div>
            <label>
              {t("Keterangan")}
              <textarea name="notes" maxLength={1000} defaultValue={editingCustomer?.notes ?? ""} />
            </label>
            <Button type="submit">
              <Check size={16} />
              {t("Simpan Customer")}
            </Button>
          </form>
        </Dialog>
      )}
      {infoTarget && (
        <Dialog title={`Info — ${infoTarget.title}`} onClose={() => setInfoTarget(null)} info>
          {infoTarget.info ? (
            <dl className="record-info">
              {[
                ["Version", String(infoTarget.info.version)],
                ["UserCreate", infoTarget.info.createdBy],
                ["TglCreate", formatInfoDate(infoTarget.info.createdAt, language)],
                ["UserModify", infoTarget.info.updatedBy],
                ["TglModify", formatInfoDate(infoTarget.info.updatedAt, language)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p>
              {language === "en"
                ? "Record information is unavailable. Refresh the page and try again."
                : "Informasi data belum tersedia. Refresh halaman dan coba lagi."}
            </p>
          )}
        </Dialog>
      )}
      {preview && (
        <Dialog
          title={t("Preview invoice")}
          onClose={() => setPreview(null)}
          wide
          actions={
            <Button variant="outline" onClick={() => window.print()}>
              <Printer size={16} />
              {t("Cetak / PDF")}
            </Button>
          }
        >
          <InvoiceDocument invoice={preview} business={business} />
          <p className="print-hint">{t("Pilih “Save as PDF” pada dialog cetak browser.")}</p>
        </Dialog>
      )}
      {customerDeleteTarget && (
        <Dialog title={t("Hapus customer?")} onClose={() => setCustomerDeleteTarget(null)}>
          <div className="delete-confirmation">
            <p>
              {t("Hapus")}{" "}
              <strong>
                {customerDeleteTarget.id} — {customerDeleteTarget.name}
              </strong>
              ?{" "}
              {t(
                "ID tidak akan dipakai ulang. Invoice yang sudah dibuat tetap menyimpan data customer sebelumnya.",
              )}
            </p>
            <div>
              <Button variant="outline" onClick={() => setCustomerDeleteTarget(null)}>
                {t("Batal")}
              </Button>
              <Button className="delete-confirm-button" onClick={deleteCustomer}>
                <Trash2 size={16} />
                {t("Hapus customer")}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
      {deleteTarget && (
        <Dialog title={t("Hapus invoice?")} onClose={() => setDeleteTarget(null)}>
          <div className="delete-confirmation">
            <p>
              {t("Hapus")} <strong>{deleteTarget.number}</strong> {t("untuk")} {deleteTarget.client}
              {/* REVISI : Jelaskan batas pembatalan sebelum hard delete. */}?{" "}
              {language === "en"
                ? "You have 5 seconds to Undo before permanent deletion."
                : "Kamu punya 5 detik untuk Undo sebelum dihapus permanen."}
              {/* REVISI END */}
            </p>
            <div>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                {t("Batal")}
              </Button>
              <Button className="delete-confirm-button" onClick={confirmDeleteInvoice}>
                <Trash2 size={16} />
                {t("Hapus invoice")}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="search-box">
      <Search size={16} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
function Stat({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  tone: "red" | "green" | "blue";
}) {
  return (
    <article className={`stat-card stat-${tone}`}>
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
function formatInfoDate(value: string, language: "id" | "en") {
  return (
    new Intl.DateTimeFormat(language === "en" ? "en-GB" : "id-ID", {
      dateStyle: "medium",
      timeStyle: "medium",
      timeZone: "Asia/Jakarta",
    }).format(new Date(value)) + " WIB"
  );
}

function Dialog({
  title,
  onClose,
  children,
  actions,
  wide = false,
  info = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
  wide?: boolean;
  info?: boolean;
}) {
  const { t } = useLanguage();

  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLElement>("[autofocus], input, button")?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key !== "Tab") return;
      const nodes = Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]',
        ) ?? [],
      );
      const first = nodes[0],
        last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className={`modal-backdrop${info ? " record-info-backdrop" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        className={`preview-dialog ${wide ? "" : "customer-dialog"}${info ? " record-info-dialog" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="preview-toolbar">
          <strong>{title}</strong>
          <div className="preview-actions">
            {actions}
            <button className="icon-button" aria-label={t("Tutup dialog")} onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>
        {children}
      </section>
    </div>
  );
}

// NONAKTIF: detail tambahan dan ringkasan diskon/pajak dipertahankan di form lama.
export function InvoiceFormNonaktif({
  invoice,
  customers,
  onCancel,
  onSave,
  onPreview,
}: {
  invoice: Invoice;
  customers: Customer[];
  onCancel: () => void;
  onSave: (invoice: Invoice) => void;
  onPreview: (invoice: Invoice) => void;
}) {
  const [data, setData] = useState(invoice);
  const totals = calculateTotals(data.items, data.discount, data.tax);
  return (
    <form
      className="editor-grid revised-editor"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(data);
      }}
    >
      <div className="editor-fields">
        <section className="form-card">
          <h2>Detail invoice</h2>
          <div className="field-grid two">
            <label>
              Nomor invoice
              <input readOnly value={data.number} />
            </label>
            <label>
              Tanggal invoice
              <input
                required
                type="date"
                value={data.issued}
                onChange={(e) => setData({ ...data, issued: e.target.value })}
              />
            </label>
          </div>
          <label>
            Status
            <select
              value={data.status}
              onChange={(e) => setData({ ...data, status: e.target.value as Invoice["status"] })}
            >
              <option>Belum dibayar</option>
              <option>Lunas</option>
            </select>
          </label>
        </section>
        <section className="form-card">
          <h2>Customer</h2>
          <label>
            Pilih customer
            <select
              value=""
              onChange={(e) => {
                const c = customers.find((c) => c.id === e.target.value);
                if (c)
                  setData({
                    ...data,
                    client: c.name,
                    address: [c.address === "—" ? "" : c.address, c.city]
                      .filter(Boolean)
                      .join(", "),
                    email: c.contact,
                  });
              }}
            >
              <option value="">Pilih customer tersimpan...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nama customer
            <input
              required
              maxLength={100}
              value={data.client}
              onChange={(e) => setData({ ...data, client: e.target.value })}
            />
          </label>
          <label>
            Kontak
            <input
              maxLength={150}
              value={data.email}
              onChange={(e) => setData({ ...data, email: e.target.value })}
            />
          </label>
          <label>
            Alamat
            <textarea
              value={data.address}
              onChange={(e) => setData({ ...data, address: e.target.value })}
            />
          </label>
        </section>
        <section className="form-card">
          <h2>Item & layanan</h2>
          {data.items.map((item, index) => (
            <div className="item-fields" key={item.id}>
              <label>
                Deskripsi
                <input
                  required
                  maxLength={200}
                  value={item.description}
                  onChange={(e) =>
                    setData({
                      ...data,
                      items: data.items.map((i, n) =>
                        n === index ? { ...i, description: e.target.value } : i,
                      ),
                    })
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
                    setData({
                      ...data,
                      items: data.items.map((i, n) =>
                        n === index ? { ...i, quantity: Number(e.target.value) } : i,
                      ),
                    })
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
                    setData({
                      ...data,
                      items: data.items.map((i, n) =>
                        n === index ? { ...i, price: Number(e.target.value) } : i,
                      ),
                    })
                  }
                />
              </label>
              <button
                type="button"
                className="icon-button delete-item"
                aria-label={`Hapus item ${index + 1}`}
                disabled={data.items.length === 1}
                onClick={() =>
                  setData({ ...data, items: data.items.filter((i) => i.id !== item.id) })
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
              setData({
                ...data,
                items: [
                  ...data.items,
                  { id: crypto.randomUUID(), description: "", quantity: 1, price: 0 },
                ],
              })
            }
          >
            <Plus size={16} />
            Tambah item
          </Button>
        </section>
        <section className="form-card">
          <h2>Detail tambahan</h2>
          <div className="field-grid two">
            <label>
              Diskon (%)
              <input
                type="number"
                required
                min="0"
                max="100"
                step="0.01"
                value={data.discount}
                onChange={(e) => setData({ ...data, discount: Number(e.target.value) })}
              />
            </label>
            <label>
              Pajak (%)
              <input
                type="number"
                required
                min="0"
                max="100"
                step="0.01"
                value={data.tax}
                onChange={(e) => setData({ ...data, tax: Number(e.target.value) })}
              />
            </label>
          </div>
          <label>
            Catatan
            <textarea
              value={data.notes}
              onChange={(e) => setData({ ...data, notes: e.target.value })}
            />
          </label>
        </section>
      </div>
      <aside className="editor-summary">
        <h2>Ringkasan invoice</h2>
        <p>{data.number}</p>
        <div className="summary-rows">
          <div>
            <span>Subtotal</span>
            <strong>{currency(totals.subtotal)}</strong>
          </div>
          <div>
            <span>Diskon</span>
            <strong>− {currency(totals.discountAmount)}</strong>
          </div>
          <div>
            <span>Pajak</span>
            <strong>{currency(totals.taxAmount)}</strong>
          </div>
        </div>
        <div className="summary-total">
          <span>Total tagihan</span>
          <strong>{currency(totals.total)}</strong>
          <small>IDR / Rupiah</small>
        </div>
        <Button type="submit">
          <Check size={16} />
          Simpan invoice
        </Button>
        <Button type="button" variant="outline" onClick={() => onPreview(data)}>
          Preview
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Batal
        </Button>
      </aside>
    </form>
  );
}

// NONAKTIF: layout dokumen sebelumnya dipertahankan sebagai referensi.
export function InvoiceDocumentNonaktif({
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
        </div>
      </div>
      <div className="document-meta">
        <div>
          <span>CUSTOMER {invoice.customerId}</span>
          <strong>{invoice.client || "Nama customer"}</strong>
          <p>
            {invoice.email}
            <br />
            {invoice.address}
          </p>
        </div>
        <div>
          <span>TANGGAL INVOICE</span>
          <strong>{dateLabel(invoice.issued)}</strong>
          <span className="due-label">STATUS</span>
          <strong>{invoice.status}</strong>
        </div>
      </div>
      <table className="document-table">
        <thead>
          <tr>
            <th>Device</th>
            <th>Deskripsi</th>
            <th>Qty</th>
            <th className="align-right">Harga</th>
            <th className="align-right">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr key={item.id}>
              <td>{item.device || "—"}</td>
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
        <div className="document-grand-total">
          <span>Total</span>
          <strong>{currency(totals.total)}</strong>
        </div>
      </div>
      <div className="document-notes">
        <span>INFORMASI PEMBAYARAN</span>
        <p>{business.bank}</p>
      </div>
      <div className="document-footer">Terima kasih atas kerja samanya.</div>
    </article>
  );
}
