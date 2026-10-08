"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { translate, type Language } from "@/lib/translations";

const LanguageContext = createContext({
  language: "id" as Language,
  setLanguage: (() => {}) as (language: Language) => void,
  t: (text: string) => text,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("id");
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t: (text) => translate(language, text) }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
