import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Modal — a React-19-safe dialog.
 *
 * Use this instead of flowbite-react Modal (broken with React 19 via @floating-ui).
 * Every other flowbite-react component (Button, TextInput, Badge, Spinner, Table…)
 * is safe; only the Modal family needs replacing.
 *
 * Styling is the standard Tailwind palette with an explicit `dark:` variant on
 * every color. Do NOT use App Studio's pt-* mock-screen token classes (the
 * scaffold / surface / on-surface / outline-variant family) — those resolve
 * only inside App Studio's host shell and compile to zero CSS here.
 *
 * Props: { open, onClose, title, children, footer }
 */
export default function Modal({ open, onClose, title, children, footer }) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);

  // Keep the latest onClose reachable without making it an effect dependency.
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Focus + scroll lock, keyed on `open` ONLY. onClose is usually an inline
  // arrow, i.e. a new function on every parent render — depending on it here
  // would re-run this effect on each keystroke and yank focus back out of
  // whatever input the user is typing in.
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Escape closes — reads the current onClose through the ref.
  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(event) {
      if (event.key === 'Escape') onCloseRef.current?.();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Render nothing at all when closed — no hidden DOM, no portal.
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 dark:bg-black/70"
      onMouseDown={(event) => {
        // Backdrop click closes; clicks starting inside the panel do not.
        if (event.target === event.currentTarget) onCloseRef.current?.();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg border border-gray-200 bg-white text-gray-900 shadow-xl outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
      >
        {title ? (
          <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-700">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              type="button"
              onClick={() => onCloseRef.current?.()}
              aria-label="Close"
              className="-m-1 rounded p-1 text-xl leading-none text-gray-400 hover:bg-gray-100 hover:text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:hover:bg-gray-700 dark:hover:text-white"
            >
              &times;
            </button>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto px-5 py-4 text-gray-700 dark:text-gray-300">{children}</div>

        {footer ? (
          <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4 dark:border-gray-700">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
