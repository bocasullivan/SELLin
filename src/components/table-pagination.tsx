"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";

type PaginationProps = {
  page: number;
  pageCount: number;
  total: number;
  from: number;
  to: number;
  onPageChange: (page: number) => void;
};

export function TablePagination({
  page,
  pageCount,
  total,
  from,
  to,
  onPageChange,
}: PaginationProps) {
  const { language } = useLanguage();
  const english = language === "en";

  return (
    <div className="table-footer pagination-footer">
      <span>
        {english ? "Showing" : "Menampilkan"} {from}–{to} {english ? "of" : "dari"} {total}{" "}
        {english ? "records" : "record"}
      </span>
      <nav
        className="pagination-controls"
        aria-label={english ? "Table pagination" : "Halaman tabel"}
      >
        <Button
          type="button"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={15} />
          {english ? "Previous" : "Sebelumnya"}
        </Button>
        <span aria-live="polite">
          {english ? "Page" : "Halaman"} {page} / {pageCount}
        </span>
        <Button
          type="button"
          variant="outline"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          {english ? "Next" : "Berikutnya"}
          <ChevronRight size={15} />
        </Button>
      </nav>
    </div>
  );
}
