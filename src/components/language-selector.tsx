"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import type { Language } from "@/lib/translations";

function Flag({ language }: { language: Language }) {
  return language === "id" ? (
    <svg viewBox="0 0 30 20" className="language-flag" aria-hidden="true">
      <path fill="#fff" d="M0 0h30v20H0z" />
      <path fill="#d82831" d="M0 0h30v10H0z" />
    </svg>
  ) : (
    <svg viewBox="0 0 60 40" className="language-flag" aria-hidden="true">
      <path fill="#18366d" d="M0 0h60v40H0z" />
      <path stroke="#fff" strokeWidth="8" d="m0 0 60 40M60 0 0 40" />
      <path stroke="#cf263b" strokeWidth="3" d="m0 0 60 40M60 0 0 40" />
      <path stroke="#fff" strokeWidth="13" d="M30 0v40M0 20h60" />
      <path stroke="#cf263b" strokeWidth="7" d="M30 0v40M0 20h60" />
    </svg>
  );
}

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function choose(next: Language) {
    setLanguage(next);
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div
      className="language-selector"
      ref={containerRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        className="language-trigger"
        type="button"
        aria-label={language === "id" ? "Bahasa tampilan" : "Display language"}
        aria-expanded={open}
        aria-controls="language-options"
        onClick={() => setOpen(!open)}
      >
        <Flag language={language} />
        <span>{language === "id" ? "Indonesia" : "English"}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div id="language-options" className="account-menu language-menu">
          {(["id", "en"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={language === option}
              onClick={() => choose(option)}
            >
              <Flag language={option} />
              <span>{option === "id" ? "Indonesia" : "English"}</span>
              {language === option && <Check size={15} className="language-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
