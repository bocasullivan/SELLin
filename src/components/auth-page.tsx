"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowRight, Command, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/language-selector";
import { useLanguage } from "@/components/language-provider";
import { useRouter } from "next/navigation";

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const { language } = useLanguage();
  const english = language === "en";
  const registering = mode === "register";
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "", confirmation: "" });

  function validate(form: HTMLFormElement) {
    const email = form.elements.namedItem("email") as HTMLInputElement;
    const password = form.elements.namedItem("password") as HTMLInputElement;
    const confirmation = form.elements.namedItem("confirmation") as HTMLInputElement | null;
    return {
      email: !email.value.trim() ? "required" : email.validity.typeMismatch ? "invalid" : "",
      password: !password.value
        ? "required"
        : registering && password.value.length < 8
          ? "short"
          : "",
      confirmation: registering && confirmation?.value !== password.value ? "mismatch" : "",
    };
  }

  function errorText(field: keyof typeof errors) {
    const code = errors[field];
    if (code === "exists")
      return english ? "This email is already registered." : "Email sudah terdaftar.";
    if (code === "credentials")
      return english ? "Incorrect email or password." : "Email atau kata sandi salah.";
    if (code === "long")
      return english ? "Use no more than 128 characters." : "Kata sandi maksimal 128 karakter.";
    if (field === "email")
      return code === "required"
        ? english
          ? "Enter your email address."
          : "Email wajib diisi."
        : english
          ? "Enter a valid email address."
          : "Format email tidak valid.";
    if (field === "confirmation")
      return english ? "Passwords do not match." : "Konfirmasi kata sandi tidak cocok.";
    return code === "required"
      ? english
        ? "Enter your password."
        : "Kata sandi wajib diisi."
      : english
        ? "Use at least 8 characters."
        : "Kata sandi minimal 8 karakter.";
  }

  function revalidate(form: HTMLFormElement) {
    const next = validate(form);
    setErrors((previous) => ({
      email: previous.email ? next.email : "",
      password: previous.password ? next.password : "",
      confirmation: previous.confirmation ? next.confirmation : "",
    }));
    setNotice("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const next = validate(event.currentTarget);
    setErrors(next);
    setNotice("");
    const first = (["email", "password", "confirmation"] as const).find((field) => next[field]);
    if (first) {
      (event.currentTarget.elements.namedItem(first) as HTMLInputElement)?.focus();
      return;
    }
    setPending(true);
    try {
      const data = new FormData(form);
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(data)),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.errors)
          setErrors({ email: "", password: "", confirmation: "", ...result.errors });
        else setNotice(result.error ?? "unavailable");
        return;
      }
      form.reset();
      if (registering) {
        setRegistered(true);
      } else {
        // Full navigation discards cached dashboard data from any prior user.
        window.location.replace("/");
      }
    } catch {
      setNotice("unavailable");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-shell">
      <header className="auth-header">
        <Link className="brand" href="/" aria-label="SELLin">
          <span className="brand-symbol">
            <Command size={20} />
          </span>
          SELL<span className="brand-light">in</span>
          <span className="brand-dot">.</span>
        </Link>
        <LanguageSelector />
      </header>
      <main className="auth-main">
        <section className="auth-card" aria-labelledby="auth-title">
          <h1 id="auth-title">
            {registering
              ? english
                ? "Create your account"
                : "Buat akun kamu"
              : english
                ? "Welcome back"
                : "Selamat datang kembali"}
          </h1>
          <p className="auth-intro">
            {registering
              ? english
                ? "A simpler way to manage your invoices."
                : "Mulai kelola invoice dengan lebih sederhana."
              : english
                ? "Sign in to your SELLin account."
                : "Masuk ke akun SELLin kamu."}
          </p>
          {registered && (
            <p className="auth-notice" role="status">
              {english
                ? "Account created. Sign in with your email and password."
                : "Akun berhasil dibuat. Silakan masuk dengan email dan kata sandi kamu."}{" "}
              <button type="button" onClick={() => router.push("/login")}>
                {english ? "Sign in" : "Masuk"}
              </button>
            </p>
          )}
          <form
            noValidate
            onSubmit={submit}
            onChange={(event) => revalidate(event.currentTarget)}
            aria-busy={pending}
          >
            <label htmlFor="auth-email">Email</label>
            <div className="auth-input">
              <Mail size={17} />
              <input
                id="auth-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                placeholder={english ? "you@example.com" : "kamu@contoh.com"}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "auth-email-error" : undefined}
              />
            </div>
            {errors.email && (
              <p id="auth-email-error" className="auth-field-error" role="alert">
                {errorText("email")}
              </p>
            )}
            <label htmlFor="auth-password">
              {english ? "Password" : "Kata sandi"}
              {registering && (
                <span className="auth-inline-hint">
                  {" "}
                  (
                  {english
                    ? "At least 8 characters; a unique passphrase is recommended"
                    : "Minimal 8 karakter; frasa sandi unik disarankan"}
                  )
                </span>
              )}
            </label>
            <div className="auth-input">
              <LockKeyhole size={17} />
              <input
                id="auth-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={registering ? "new-password" : "current-password"}
                required
                minLength={registering ? 8 : undefined}
                maxLength={128}
                placeholder={english ? "Enter your password" : "Masukkan kata sandi"}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "auth-password-error" : undefined}
              />
              <button
                type="button"
                className="icon-button"
                aria-label={
                  showPassword
                    ? english
                      ? "Hide password"
                      : "Sembunyikan kata sandi"
                    : english
                      ? "Show password"
                      : "Tampilkan kata sandi"
                }
                aria-pressed={showPassword}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {errors.password && (
              <p id="auth-password-error" className="auth-field-error" role="alert">
                {errorText("password")}
              </p>
            )}
            {registering && (
              <>
                <label htmlFor="auth-confirmation">
                  {english ? "Confirm password" : "Konfirmasi kata sandi"}
                </label>
                <div className="auth-input">
                  <LockKeyhole size={17} />
                  <input
                    id="auth-confirmation"
                    name="confirmation"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={128}
                    placeholder={english ? "Re-enter your password" : "Ulangi kata sandi"}
                    aria-invalid={!!errors.confirmation}
                    aria-describedby={errors.confirmation ? "auth-confirmation-error" : undefined}
                  />
                </div>
                {errors.confirmation && (
                  <p id="auth-confirmation-error" className="auth-field-error" role="alert">
                    {errorText("confirmation")}
                  </p>
                )}
              </>
            )}
            {notice && (
              <div className="auth-notice auth-request-error" role="alert">
                {notice === "limited"
                  ? english
                    ? "Too many attempts. Try again in 15 minutes."
                    : "Terlalu banyak percobaan. Coba lagi dalam 15 menit."
                  : notice === "forbidden"
                    ? english
                      ? "Request rejected. Refresh the page and try again."
                      : "Permintaan ditolak. Refresh halaman dan coba lagi."
                    : english
                      ? "Unable to connect. Please try again."
                      : "Tidak dapat terhubung. Silakan coba lagi."}
              </div>
            )}
            <Button type="submit" className="auth-submit" disabled={pending || registered}>
              {pending
                ? english
                  ? "Please wait…"
                  : "Mohon tunggu…"
                : registering
                  ? english
                    ? "Create account"
                    : "Daftar"
                  : english
                    ? "Sign in"
                    : "Masuk"}
              <ArrowRight size={17} />
            </Button>
          </form>
          <p className="auth-switch">
            {registering
              ? english
                ? "Already have an account?"
                : "Sudah punya akun?"
              : english
                ? "Don't have an account?"
                : "Belum punya akun?"}{" "}
            <Link href={registering ? "/login" : "/register"}>
              {registering ? (english ? "Sign in" : "Masuk") : english ? "Register" : "Daftar"}
            </Link>
          </p>
        </section>
      </main>
      <footer className="auth-footer">© 2026 SELLin</footer>
    </div>
  );
}
