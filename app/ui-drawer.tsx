"use client";

import { useEffect, type ReactNode } from "react";

export function Drawer({
  open,
  title,
  onClose,
  children,
  width = "min(520px, 100vw)"
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="drawer-scrim" onClick={onClose} role="presentation">
      <aside
        className="drawer-panel"
        style={{ ["--drawer-w" as string]: width }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="drawer-head">
          <h2 className="drawer-title">{title}</h2>
          <button className="drawer-close" onClick={onClose} aria-label="閉じる">
            ✕
          </button>
        </header>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
  );
}
