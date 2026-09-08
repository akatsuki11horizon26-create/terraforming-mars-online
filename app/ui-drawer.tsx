"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Anything the browser will stop on with Tab. Elements can be disabled or
// hidden while the drawer is open, so the list is read at the moment Tab is
// pressed rather than cached when it opened.
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])'
].join(",");

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
  const panelRef = useRef<HTMLElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // A modal owns the keyboard while it is open: focus moves inside on open,
  // Tab cycles within it rather than walking onto the page behind, and closing
  // hands focus back to whatever opened it. Without this the drawer opened with
  // focus still on the button behind it, and Tab walked into the covered page.
  // Keyed on `open` alone: an onClose the caller rebuilds every render would
  // otherwise re-run this and yank focus back to the top mid-interaction.
  useEffect(() => {
    if (!open) return;

    openerRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    // The panel itself carries tabIndex -1 so there is always somewhere to land,
    // even in a drawer whose body holds nothing focusable.
    (panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel)?.focus();

    return () => {
      // Returning focus to a button that has since been unmounted would drop it
      // on <body>, so it only goes back if it is still on the page.
      const opener = openerRef.current;
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const focusable = () => Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const stops = focusable();
      if (stops.length === 0) {
        e.preventDefault();
        panel?.focus();
        return;
      }
      const first = stops[0];
      const last = stops[stops.length - 1];
      const active = document.activeElement;
      // Focus can also sit on the panel itself, which is in neither direction's
      // list, so anything outside the ring is sent back to the near end.
      if (e.shiftKey && (active === first || !panel?.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panel?.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="drawer-scrim" onClick={onClose} role="presentation">
      <aside
        ref={panelRef}
        tabIndex={-1}
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
