// ============================================================================
// ptr-ui.js — Shared React widget kit for PrimeThink Live Apps (page_type
// "react"). Every component is built with React.createElement (aliased `h`)
// because ONLY index.js is Babel-transpiled on the platform; this file is
// served raw, so it must contain NO JSX.
//
// Distilled from the recurring UI in: crm, todo-list, kanban-board,
// people-directory, wiki, roadmap-management, feedback-tracker,
// document-review, internal-tools-registry, life-logger,
// bank-transactions-manager, form-submissions-admin,
// estate-agent-leads-dashboard, db-schema-docs and the dashboard-style apps.
// Those apps each hand-rolled their own toast/modal/confirm/table/badge/stat
// widgets with the same Tailwind conventions (bg-white dark:bg-gray-800
// surfaces, sky accent, focus:ring-2 focus:ring-sky-500). This kit is the
// single accessible, XSS-safe, dark-mode-ready implementation of all of them.
//
// React 18 + ReactDOM are platform browser globals — never import them.
// `pt` is a platform global; this file never touches it. No localStorage.
//
// USAGE (from your JSX index.js):
//   import { Button, Modal, ToastProvider, useToast, DataTable } from './ptr-ui.js';
//
//   function App() {
//       const [open, setOpen] = React.useState(false);
//       return (
//           <ToastProvider>
//               <Button variant="primary" onClick={() => setOpen(true)}>Open</Button>
//               <Modal open={open} onClose={() => setOpen(false)} title="Hello">
//                   <p>Body</p>
//               </Modal>
//           </ToastProvider>
//       );
//   }
//
//   // Toasts (component tree must be wrapped in <ToastProvider>):
//   const toast = useToast();
//   toast.success('Saved');
// ============================================================================

const h = React.createElement;
const {
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo,
    useContext,
    createContext,
    Fragment
} = React;

// Sibling library (written in parallel). pt-format.hashColor gives a stable
// avatar colour from a name; a local fallback (below) covers the case where it
// is not exported. Namespace import so a missing export degrades gracefully
// rather than throwing at module link time.
import * as ptFormat from './pt-format.js';

// ----------------------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------------------

/**
 * Join class-name fragments, dropping falsy values. Lets components merge a
 * caller-supplied `className` with their own defaults.
 * @param {...(string|false|null|undefined)} parts
 * @returns {string}
 */
export function cx(...parts) {
    return parts.filter(Boolean).join(' ');
}

let _idSeq = 0;
/**
 * Stable unique id for aria wiring (label/description associations). Prefixed
 * so it is obvious in the DOM where it came from.
 * @param {string} [prefix]
 * @returns {string}
 */
export function useId(prefix) {
    const ref = useRef(null);
    if (ref.current === null) {
        _idSeq += 1;
        ref.current = (prefix || 'ptr') + '-' + _idSeq;
    }
    return ref.current;
}

// A conservative fallback for stable avatar colours when pt-format.js has not
// been deployed alongside this file. pt-format.hashColor is preferred (see
// Avatar) — this only guards the standalone case.
const _AVATAR_BG = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500',
    'bg-teal-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
    'bg-purple-500', 'bg-pink-500'
];
function _fallbackHashColor(str) {
    let hash = 0;
    const s = String(str || '');
    for (let i = 0; i < s.length; i++) {
        hash = (hash << 5) - hash + s.charCodeAt(i);
        hash |= 0;
    }
    return _AVATAR_BG[Math.abs(hash) % _AVATAR_BG.length];
}

// ----------------------------------------------------------------------------
// Spinner
// ----------------------------------------------------------------------------

/**
 * Indeterminate loading spinner. Distilled from the `Spinner` in demo-react
 * and the ad-hoc "loading…" overlays in crm/document-review.
 * @param {object} props
 * @param {string} [props.label] Text shown under the spinner (also aria-label).
 * @param {'sm'|'md'|'lg'} [props.size]
 * @param {string} [props.className]
 * @returns {React.ReactElement}
 */
export function Spinner({ label, size = 'md', className } = {}) {
    const dim = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-12 h-12' : 'w-8 h-8';
    return h('div', {
        className: cx('flex flex-col items-center justify-center text-gray-400 dark:text-gray-500', label && 'py-8', className),
        role: 'status',
        'aria-live': 'polite',
        'aria-label': label || 'Loading'
    },
        h('svg', { className: cx(dim, 'animate-spin', label && 'mb-3'), fill: 'none', viewBox: '0 0 24 24', 'aria-hidden': 'true' },
            h('circle', { className: 'opacity-25', cx: 12, cy: 12, r: 10, stroke: 'currentColor', strokeWidth: 4 }),
            h('path', { className: 'opacity-75', fill: 'currentColor', d: 'M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z' })
        ),
        label ? h('p', { className: 'text-sm' }, label) : null
    );
}

// ----------------------------------------------------------------------------
// Card
// ----------------------------------------------------------------------------

/**
 * Surface card with optional title/subtitle/actions header. Distilled from the
 * near-identical card shells across every dashboard app.
 * @param {object} props
 * @param {React.ReactNode} [props.title]
 * @param {React.ReactNode} [props.subtitle]
 * @param {React.ReactNode} [props.actions] Right-aligned header content.
 * @param {React.ReactNode} [props.children]
 * @param {string} [props.className]
 * @returns {React.ReactElement}
 */
export function Card({ title, subtitle, actions, children, className } = {}) {
    const hasHeader = title || subtitle || actions;
    return h('div', {
        className: cx('bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 flex flex-col', className)
    },
        hasHeader ? h('div', { className: 'flex items-start justify-between gap-3 mb-4' },
            h('div', { className: 'min-w-0' },
                title ? h('h2', { className: 'text-sm font-semibold text-gray-900 dark:text-gray-100' }, title) : null,
                subtitle ? h('p', { className: 'text-xs text-gray-500 dark:text-gray-400 mt-0.5' }, subtitle) : null
            ),
            actions ? h('div', { className: 'flex items-center gap-2 flex-shrink-0' }, actions) : null
        ) : null,
        children
    );
}

// ----------------------------------------------------------------------------
// Button / IconButton
// ----------------------------------------------------------------------------

const _BTN_VARIANTS = {
    // text-white is intentionally mode-agnostic (sits on a coloured fill).
    primary: 'bg-sky-600 hover:bg-sky-500 text-white dark:bg-sky-500 dark:hover:bg-sky-400 focus:ring-sky-500',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 focus:ring-gray-400',
    danger: 'bg-red-600 hover:bg-red-500 text-white dark:bg-red-600 dark:hover:bg-red-500 focus:ring-red-500',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 dark:hover:bg-gray-700 dark:text-gray-200 focus:ring-gray-400'
};
const _BTN_SIZES = { sm: 'px-2.5 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-base' };

/**
 * Primary action button with variants and a loading state.
 * @param {object} props
 * @param {'primary'|'secondary'|'danger'|'ghost'} [props.variant]
 * @param {'sm'|'md'|'lg'} [props.size]
 * @param {boolean} [props.loading] Shows a spinner and disables the button.
 * @param {boolean} [props.disabled]
 * @param {'button'|'submit'|'reset'} [props.type]
 * @param {function} [props.onClick]
 * @param {React.ReactNode} [props.children]
 * @param {string} [props.className]
 * @returns {React.ReactElement}
 */
export function Button(props = {}) {
    const {
        variant = 'primary', size = 'md', loading = false, disabled = false,
        type = 'button', onClick, children, className, ...rest
    } = props;
    const isDisabled = disabled || loading;
    return h('button', Object.assign({
        type,
        onClick,
        disabled: isDisabled
    }, rest, {
        'aria-busy': loading ? 'true' : undefined,
        className: cx(
            'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            _BTN_SIZES[size] || _BTN_SIZES.md,
            _BTN_VARIANTS[variant] || _BTN_VARIANTS.primary,
            className
        )
    }),
        loading ? h(Spinner, { size: 'sm' }) : null,
        children
    );
}

/**
 * Square icon-only button. `label` is required for accessibility (aria-label).
 * Distilled from the countless bare `<button>✕</button>` close/action icons.
 * @param {object} props
 * @param {string} props.label Accessible name (aria-label + title).
 * @param {React.ReactNode} props.children Icon / glyph.
 * @param {function} [props.onClick]
 * @param {'sm'|'md'} [props.size]
 * @param {string} [props.className]
 * @returns {React.ReactElement}
 */
export function IconButton({ label, children, onClick, size = 'md', className, ...rest } = {}) {
    const dim = size === 'sm' ? 'w-7 h-7 text-sm' : 'w-9 h-9 text-base';
    return h('button', Object.assign({
        type: 'button',
        onClick,
        'aria-label': label,
        title: label
    }, rest, {
        className: cx(
            'inline-flex items-center justify-center rounded-lg transition',
            'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700',
            'focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50',
            dim, className
        )
    }), children);
}

// ----------------------------------------------------------------------------
// Form controls: Input / Textarea / Select / Checkbox / Toggle
// ----------------------------------------------------------------------------

const _FIELD_BASE = 'w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50';

/**
 * Labelled text input. Pass any native <input> prop through.
 * @param {object} props
 * @param {string} [props.label]
 * @param {string} [props.error] Error message shown below (also sets aria-invalid).
 * @param {string} [props.className]
 * @returns {React.ReactElement}
 */
export function Input({ label, error, className, id, ...rest } = {}) {
    const autoId = useId('input');
    const fieldId = id || autoId;
    return h('div', { className: cx('flex flex-col gap-1', className) },
        label ? h('label', { htmlFor: fieldId, className: 'text-xs font-medium text-gray-600 dark:text-gray-300' }, label) : null,
        h('input', Object.assign({
            id: fieldId,
            'aria-invalid': error ? 'true' : undefined,
            className: cx(_FIELD_BASE, error && 'border-red-500 dark:border-red-500 focus:ring-red-500')
        }, rest)),
        error ? h('p', { className: 'text-xs text-red-600 dark:text-red-400' }, error) : null
    );
}

/**
 * Labelled textarea. Pass any native <textarea> prop through.
 * @param {object} props
 * @param {string} [props.label]
 * @param {string} [props.error]
 * @param {number} [props.rows]
 * @param {string} [props.className]
 * @returns {React.ReactElement}
 */
export function Textarea({ label, error, rows = 4, className, id, ...rest } = {}) {
    const autoId = useId('textarea');
    const fieldId = id || autoId;
    return h('div', { className: cx('flex flex-col gap-1', className) },
        label ? h('label', { htmlFor: fieldId, className: 'text-xs font-medium text-gray-600 dark:text-gray-300' }, label) : null,
        h('textarea', Object.assign({
            id: fieldId,
            rows,
            'aria-invalid': error ? 'true' : undefined,
            className: cx(_FIELD_BASE, 'resize-y', error && 'border-red-500 dark:border-red-500 focus:ring-red-500')
        }, rest)),
        error ? h('p', { className: 'text-xs text-red-600 dark:text-red-400' }, error) : null
    );
}

/**
 * Labelled native select. `options` is an array of {value,label} or strings.
 * @param {object} props
 * @param {string} [props.label]
 * @param {Array<{value:string,label:string}|string>} props.options
 * @param {string} [props.placeholder] Adds a disabled first option.
 * @param {string} [props.className]
 * @returns {React.ReactElement}
 */
export function Select({ label, options = [], placeholder, className, id, ...rest } = {}) {
    const autoId = useId('select');
    const fieldId = id || autoId;
    const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
    return h('div', { className: cx('flex flex-col gap-1', className) },
        label ? h('label', { htmlFor: fieldId, className: 'text-xs font-medium text-gray-600 dark:text-gray-300' }, label) : null,
        h('select', Object.assign({ id: fieldId, className: _FIELD_BASE }, rest),
            placeholder ? h('option', { value: '', disabled: true }, placeholder) : null,
            opts.map((o) => h('option', { key: o.value, value: o.value }, o.label))
        )
    );
}

/**
 * Checkbox with an inline label. Controlled via `checked`/`onChange`.
 * @param {object} props
 * @param {React.ReactNode} [props.label]
 * @param {boolean} [props.checked]
 * @param {function} [props.onChange] Receives the change event.
 * @param {string} [props.className]
 * @returns {React.ReactElement}
 */
export function Checkbox({ label, checked, onChange, className, id, ...rest } = {}) {
    const autoId = useId('check');
    const fieldId = id || autoId;
    return h('label', { htmlFor: fieldId, className: cx('inline-flex items-center gap-2 cursor-pointer select-none text-sm text-gray-800 dark:text-gray-200', className) },
        h('input', Object.assign({
            id: fieldId,
            type: 'checkbox',
            checked: !!checked,
            onChange,
            className: 'w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-sky-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-500'
        }, rest)),
        label != null ? h('span', null, label) : null
    );
}

/**
 * Accessible on/off toggle switch (role=switch). Controlled via `checked`.
 * @param {object} props
 * @param {boolean} props.checked
 * @param {function} props.onChange Called with the next boolean value.
 * @param {string} [props.label] Accessible name.
 * @param {boolean} [props.disabled]
 * @param {string} [props.className]
 * @returns {React.ReactElement}
 */
export function Toggle({ checked, onChange, label, disabled = false, className } = {}) {
    return h('button', {
        type: 'button',
        role: 'switch',
        'aria-checked': checked ? 'true' : 'false',
        'aria-label': label,
        disabled,
        onClick: () => !disabled && onChange && onChange(!checked),
        className: cx(
            'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 disabled:opacity-50',
            checked ? 'bg-sky-600 dark:bg-sky-500' : 'bg-gray-300 dark:bg-gray-600',
            className
        )
    },
        h('span', {
            'aria-hidden': 'true',
            className: cx('inline-block h-5 w-5 transform rounded-full bg-white shadow transition', checked ? 'translate-x-5' : 'translate-x-0.5')
        })
    );
}

// ----------------------------------------------------------------------------
// Badge / Avatar
// ----------------------------------------------------------------------------

const _BADGE_COLORS = {
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    sky: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
};

/**
 * Status pill. Distilled from the status/tag chips in crm, feedback-tracker,
 * kanban-board, internal-tools-registry, roadmap-management.
 * @param {object} props
 * @param {'gray'|'sky'|'green'|'amber'|'red'|'purple'|'blue'} [props.color]
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 * @returns {React.ReactElement}
 */
export function Badge({ color = 'gray', children, className } = {}) {
    return h('span', {
        className: cx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', _BADGE_COLORS[color] || _BADGE_COLORS.gray, className)
    }, children);
}

/**
 * Circular avatar. Renders an image if `src` is given, else initials on a
 * stable colour derived from the name (via pt-format.hashColor when available).
 * Distilled from the member avatars in people-directory, crm, demo-react.
 * @param {object} props
 * @param {string} props.name Used for initials + colour + alt text.
 * @param {string} [props.src] Optional image URL.
 * @param {'sm'|'md'|'lg'} [props.size]
 * @param {string} [props.className]
 * @returns {React.ReactElement}
 */
export function Avatar({ name = '', src, size = 'md', className } = {}) {
    const dim = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-sm';
    const inits = String(name).trim().split(/\s+/).slice(0, 2).map((p) => p[0] || '').join('').toUpperCase() || '?';
    // Prefer pt-format.hashColor, but only if it yields a Tailwind bg-* class
    // (we apply it via className). Otherwise fall back to the local palette.
    let color = _fallbackHashColor(name);
    if (ptFormat && typeof ptFormat.hashColor === 'function') {
        const c = ptFormat.hashColor(name);
        if (typeof c === 'string' && c.indexOf('bg-') === 0) color = c;
    }
    if (src) {
        return h('img', {
            src,
            alt: name,
            className: cx('rounded-full object-cover flex-shrink-0', dim, className)
        });
    }
    // text-white sits on a coloured fill, so it is intentionally mode-agnostic.
    return h('span', {
        'aria-hidden': false,
        role: 'img',
        'aria-label': name,
        className: cx('rounded-full text-white font-semibold flex items-center justify-center flex-shrink-0', color, dim, className)
    }, inits);
}

// ----------------------------------------------------------------------------
// EmptyState / ErrorState
// ----------------------------------------------------------------------------

/**
 * Placeholder for empty lists/tables. Distilled from the "No items yet" blocks
 * in todo-list, crm, feedback-tracker, people-directory.
 * @param {object} props
 * @param {React.ReactNode} [props.icon]
 * @param {string} props.title
 * @param {string} [props.message]
 * @param {React.ReactNode} [props.action] e.g. a <Button>.
 * @param {string} [props.className]
 * @returns {React.ReactElement}
 */
export function EmptyState({ icon, title, message, action, className } = {}) {
    return h('div', { className: cx('flex flex-col items-center justify-center text-center py-12 px-4', className) },
        icon ? h('div', { className: 'text-4xl mb-3 text-gray-300 dark:text-gray-600', 'aria-hidden': 'true' }, icon) : null,
        h('h3', { className: 'text-sm font-semibold text-gray-700 dark:text-gray-200' }, title),
        message ? h('p', { className: 'mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-sm' }, message) : null,
        action ? h('div', { className: 'mt-4' }, action) : null
    );
}

/**
 * Error placeholder with an optional retry action.
 * @param {object} props
 * @param {string} [props.title]
 * @param {string} [props.message]
 * @param {function} [props.onRetry]
 * @param {string} [props.className]
 * @returns {React.ReactElement}
 */
export function ErrorState({ title = 'Something went wrong', message, onRetry, className } = {}) {
    return h('div', { role: 'alert', className: cx('flex flex-col items-center justify-center text-center py-12 px-4', className) },
        h('div', { className: 'text-4xl mb-3 text-red-400 dark:text-red-500', 'aria-hidden': 'true' }, '\u26A0'),
        h('h3', { className: 'text-sm font-semibold text-gray-800 dark:text-gray-100' }, title),
        message ? h('p', { className: 'mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-sm' }, message) : null,
        onRetry ? h('div', { className: 'mt-4' }, h(Button, { variant: 'secondary', size: 'sm', onClick: onRetry }, 'Try again')) : null
    );
}

// ----------------------------------------------------------------------------
// Focus-trap hook (shared by Modal / Drawer)
// ----------------------------------------------------------------------------

const _FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Trap Tab focus inside `ref` while `active`, move focus in on open, restore it
 * to the previously-focused element on close, and call `onEscape` on Escape.
 * @param {React.RefObject<HTMLElement>} ref
 * @param {boolean} active
 * @param {function} [onEscape]
 */
export function useFocusTrap(ref, active, onEscape) {
    useEffect(() => {
        if (!active || !ref.current) return undefined;
        const node = ref.current;
        const previouslyFocused = document.activeElement;
        const focusables = node.querySelectorAll(_FOCUSABLE);
        (focusables[0] || node).focus();

        function onKeyDown(e) {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onEscape && onEscape();
                return;
            }
            if (e.key !== 'Tab') return;
            const items = Array.prototype.filter.call(node.querySelectorAll(_FOCUSABLE), (el) => el.offsetParent !== null);
            if (items.length === 0) { e.preventDefault(); return; }
            const first = items[0];
            const last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault(); last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault(); first.focus();
            }
        }
        node.addEventListener('keydown', onKeyDown);
        return () => {
            node.removeEventListener('keydown', onKeyDown);
            if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
        };
    }, [active, ref, onEscape]);
}

// ----------------------------------------------------------------------------
// Modal
// ----------------------------------------------------------------------------

const _MODAL_SIZES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

/**
 * Accessible modal dialog rendered through ReactDOM.createPortal (guarded).
 * Escape and backdrop-click close it, focus is trapped and restored, and it is
 * announced with role="dialog" aria-modal="true". Distilled from the modal
 * overlays in crm, todo-list, feedback-tracker, document-review, wiki, etc.
 * @param {object} props
 * @param {boolean} props.open
 * @param {function} props.onClose
 * @param {React.ReactNode} [props.title]
 * @param {React.ReactNode} [props.children]
 * @param {React.ReactNode} [props.footer]
 * @param {'sm'|'md'|'lg'|'xl'} [props.size]
 * @param {boolean} [props.closeOnBackdrop]
 * @returns {React.ReactElement|null}
 */
export function Modal({ open, onClose, title, children, footer, size = 'md', closeOnBackdrop = true } = {}) {
    const panelRef = useRef(null);
    const titleId = useId('modal-title');
    useFocusTrap(panelRef, open, onClose);

    useEffect(() => {
        if (!open) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [open]);

    if (!open) return null;

    const overlay = h('div', {
        className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70',
        onMouseDown: (e) => { if (closeOnBackdrop && e.target === e.currentTarget) onClose && onClose(); }
    },
        h('div', {
            ref: panelRef,
            role: 'dialog',
            'aria-modal': 'true',
            'aria-labelledby': title ? titleId : undefined,
            tabIndex: -1,
            className: cx('w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh] focus:outline-none', _MODAL_SIZES[size] || _MODAL_SIZES.md)
        },
            title ? h('div', { className: 'flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-700' },
                h('h2', { id: titleId, className: 'text-base font-semibold text-gray-900 dark:text-gray-100' }, title),
                h(IconButton, { label: 'Close dialog', onClick: onClose }, '\u2715')
            ) : null,
            h('div', { className: 'px-5 py-4 overflow-y-auto text-sm text-gray-700 dark:text-gray-200' }, children),
            footer ? h('div', { className: 'px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2' }, footer) : null
        )
    );

    if (ReactDOM && typeof ReactDOM.createPortal === 'function') {
        return ReactDOM.createPortal(overlay, document.body);
    }
    // Fallback: render inline if the platform ReactDOM lacks createPortal.
    return overlay;
}

// ----------------------------------------------------------------------------
// ConfirmDialog + useConfirm
// ----------------------------------------------------------------------------

const _ConfirmContext = createContext(null);

/**
 * Standalone confirm dialog (also used internally by ConfirmProvider).
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} [props.title]
 * @param {string} [props.message]
 * @param {string} [props.confirmLabel]
 * @param {string} [props.cancelLabel]
 * @param {'primary'|'danger'} [props.variant] Style of the confirm button.
 * @param {function} props.onConfirm
 * @param {function} props.onCancel
 * @returns {React.ReactElement|null}
 */
export function ConfirmDialog({ open, title = 'Are you sure?', message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'primary', onConfirm, onCancel } = {}) {
    return h(Modal, { open, onClose: onCancel, title, size: 'sm',
        footer: h(Fragment, null,
            h(Button, { variant: 'secondary', onClick: onCancel }, cancelLabel),
            h(Button, { variant: variant === 'danger' ? 'danger' : 'primary', onClick: onConfirm }, confirmLabel)
        )
    }, message ? h('p', null, message) : null);
}

/**
 * Provider that hosts a single confirm dialog for the whole app. Wrap your
 * tree once, then call the promise-based `useConfirm()` anywhere below.
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @returns {React.ReactElement}
 */
export function ConfirmProvider({ children } = {}) {
    const [state, setState] = useState(null); // {options, resolve}
    const confirm = useCallback((options) => new Promise((resolve) => {
        setState({ options: typeof options === 'string' ? { message: options } : (options || {}), resolve });
    }), []);
    const close = useCallback((result) => {
        setState((s) => { if (s) s.resolve(result); return null; });
    }, []);
    return h(_ConfirmContext.Provider, { value: confirm },
        children,
        h(ConfirmDialog, Object.assign({}, state && state.options, {
            open: !!state,
            onConfirm: () => close(true),
            onCancel: () => close(false)
        }))
    );
}

/**
 * Returns an async `confirm(optionsOrMessage)` that resolves true/false.
 * Requires a <ConfirmProvider> ancestor. Distilled from the window.confirm()
 * and hand-rolled openConfirm() calls scattered across crm, feedback-tracker,
 * todo-list, life-logger.
 * @returns {(opts:(string|object)) => Promise<boolean>}
 */
export function useConfirm() {
    const ctx = useContext(_ConfirmContext);
    if (!ctx) throw new Error('useConfirm() requires a <ConfirmProvider> ancestor');
    return ctx;
}

// ----------------------------------------------------------------------------
// Toasts: ToastProvider / ToastHost / useToast
// ----------------------------------------------------------------------------

const _ToastContext = createContext(null);

const _TOAST_STYLES = {
    info: 'bg-gray-800 text-white dark:bg-gray-700',
    success: 'bg-green-600 text-white dark:bg-green-600',
    error: 'bg-red-600 text-white dark:bg-red-600',
    warning: 'bg-amber-500 text-white dark:bg-amber-500'
};

/**
 * Fixed, stacking toast region (aria-live="polite"). Rendered by ToastProvider;
 * you normally do not use this directly.
 * @param {object} props
 * @param {Array<{id:number,type:string,message:string}>} props.toasts
 * @param {function} props.onDismiss
 * @returns {React.ReactElement}
 */
export function ToastHost({ toasts, onDismiss } = {}) {
    const node = h('div', {
        className: 'fixed bottom-4 right-4 z-[60] flex flex-col gap-2 items-end',
        role: 'region',
        'aria-label': 'Notifications',
        'aria-live': 'polite'
    },
        (toasts || []).map((t) => h('div', {
            key: t.id,
            role: t.type === 'error' ? 'alert' : 'status',
            className: cx('flex items-center gap-3 px-4 py-2.5 rounded-lg shadow-lg text-sm max-w-sm animate-[fadeIn_.15s_ease-out]', _TOAST_STYLES[t.type] || _TOAST_STYLES.info)
        },
            h('span', { className: 'flex-1 break-words' }, t.message),
            h('button', { type: 'button', 'aria-label': 'Dismiss', onClick: () => onDismiss(t.id), className: 'opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/70 rounded' }, '\u2715')
        ))
    );
    if (ReactDOM && typeof ReactDOM.createPortal === 'function') {
        return ReactDOM.createPortal(node, document.body);
    }
    return node;
}

/**
 * Provider that owns the toast queue. Wrap your tree once, then call
 * `useToast()` below. Distilled from the bespoke showToast() helpers in crm,
 * feedback-tracker, internal-tools-registry, life-logger and many others.
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {number} [props.duration] Auto-dismiss ms (default 3000).
 * @returns {React.ReactElement}
 */
export function ToastProvider({ children, duration = 3000 } = {}) {
    const [toasts, setToasts] = useState([]);
    const seq = useRef(0);
    const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);
    const push = useCallback((message, type = 'info', ms) => {
        seq.current += 1;
        const id = seq.current;
        setToasts((list) => list.concat([{ id, message: String(message), type }]));
        const life = ms == null ? duration : ms;
        if (life > 0) setTimeout(() => dismiss(id), life);
        return id;
    }, [duration, dismiss]);

    const api = useMemo(() => ({
        show: push,
        info: (m, ms) => push(m, 'info', ms),
        success: (m, ms) => push(m, 'success', ms),
        error: (m, ms) => push(m, 'error', ms),
        warning: (m, ms) => push(m, 'warning', ms),
        dismiss
    }), [push, dismiss]);

    return h(_ToastContext.Provider, { value: api },
        children,
        h(ToastHost, { toasts, onDismiss: dismiss })
    );
}

/**
 * Returns the toast API: {show, info, success, error, warning, dismiss}.
 * Requires a <ToastProvider> ancestor.
 * @returns {{show:function,info:function,success:function,error:function,warning:function,dismiss:function}}
 */
export function useToast() {
    const ctx = useContext(_ToastContext);
    if (!ctx) throw new Error('useToast() requires a <ToastProvider> ancestor');
    return ctx;
}

// ----------------------------------------------------------------------------
// Tabs
// ----------------------------------------------------------------------------

/**
 * Accessible tab bar (role=tablist, arrow-key navigation). Renders only the
 * tab strip; you render the active panel yourself from `active`. Distilled from
 * the section tabs in crm, internal-tools-registry, db-schema-docs, wiki.
 * @param {object} props
 * @param {Array<{id:string,label:React.ReactNode}>} props.tabs
 * @param {string} props.active Currently-selected tab id.
 * @param {function} props.onChange Called with the new tab id.
 * @param {string} [props.className]
 * @returns {React.ReactElement}
 */
export function Tabs({ tabs = [], active, onChange, className } = {}) {
    function onKeyDown(e) {
        const idx = tabs.findIndex((t) => t.id === active);
        if (idx < 0) return;
        let next = idx;
        if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = tabs.length - 1;
        else return;
        e.preventDefault();
        onChange && onChange(tabs[next].id);
    }
    return h('div', { role: 'tablist', 'aria-orientation': 'horizontal', onKeyDown, className: cx('flex gap-1 border-b border-gray-200 dark:border-gray-700', className) },
        tabs.map((t) => {
            const selected = t.id === active;
            return h('button', {
                key: t.id,
                type: 'button',
                role: 'tab',
                id: 'tab-' + t.id,
                'aria-selected': selected ? 'true' : 'false',
                tabIndex: selected ? 0 : -1,
                onClick: () => onChange && onChange(t.id),
                className: cx(
                    'px-4 py-2 text-sm font-medium -mb-px border-b-2 transition focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-t',
                    selected
                        ? 'border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400'
                        : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                )
            }, t.label);
        })
    );
}

// ----------------------------------------------------------------------------
// Tooltip
// ----------------------------------------------------------------------------

/**
 * Lightweight hover/focus tooltip. Wraps a single child and shows `label` on
 * hover or keyboard focus. Uses CSS only (no positioning library).
 * @param {object} props
 * @param {string} props.label
 * @param {React.ReactNode} props.children
 * @param {'top'|'bottom'} [props.placement]
 * @param {string} [props.className]
 * @returns {React.ReactElement}
 */
export function Tooltip({ label, children, placement = 'top', className } = {}) {
    const [show, setShow] = useState(false);
    const pos = placement === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1';
    return h('span', {
        className: cx('relative inline-flex', className),
        onMouseEnter: () => setShow(true),
        onMouseLeave: () => setShow(false),
        onFocus: () => setShow(true),
        onBlur: () => setShow(false)
    },
        children,
        show ? h('span', {
            role: 'tooltip',
            className: cx('absolute left-1/2 -translate-x-1/2 z-50 whitespace-nowrap px-2 py-1 rounded text-xs shadow-lg pointer-events-none bg-gray-900 text-white dark:bg-gray-700', pos)
        }, label) : null
    );
}

// ----------------------------------------------------------------------------
// SearchInput (debounced)
// ----------------------------------------------------------------------------

/**
 * Debounce a changing value. Generic helper reused by SearchInput and DataTable.
 * @template T
 * @param {T} value
 * @param {number} [delay]
 * @returns {T}
 */
export function useDebounced(value, delay = 250) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
}

/**
 * Search box that debounces before calling `onSearch`. Distilled from the
 * filter inputs in crm, people-directory, internal-tools-registry, wiki.
 * @param {object} props
 * @param {function} props.onSearch Called with the debounced query string.
 * @param {string} [props.placeholder]
 * @param {number} [props.delay]
 * @param {string} [props.className]
 * @returns {React.ReactElement}
 */
export function SearchInput({ onSearch, placeholder = 'Search\u2026', delay = 250, className, ...rest } = {}) {
    const [value, setValue] = useState('');
    const debounced = useDebounced(value, delay);
    const cb = useRef(onSearch);
    cb.current = onSearch;
    useEffect(() => { cb.current && cb.current(debounced); }, [debounced]);
    return h('div', { className: cx('relative', className) },
        h('span', { 'aria-hidden': 'true', className: 'absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500' }, '\uD83D\uDD0D'),
        h('input', Object.assign({
            type: 'search',
            role: 'searchbox',
            value,
            placeholder,
            onChange: (e) => setValue(e.target.value),
            className: cx(_FIELD_BASE, 'pl-9')
        }, rest))
    );
}

// ----------------------------------------------------------------------------
// Pagination
// ----------------------------------------------------------------------------

/**
 * Simple prev/next + page-number pagination control.
 * @param {object} props
 * @param {number} props.page 1-based current page.
 * @param {number} props.pageCount Total number of pages.
 * @param {function} props.onChange Called with the new 1-based page.
 * @param {string} [props.className]
 * @returns {React.ReactElement|null}
 */
export function Pagination({ page, pageCount, onChange, className } = {}) {
    if (!pageCount || pageCount <= 1) return null;
    const go = (p) => { if (p >= 1 && p <= pageCount && p !== page) onChange && onChange(p); };
    const numbers = [];
    const from = Math.max(1, page - 2);
    const to = Math.min(pageCount, from + 4);
    for (let i = from; i <= to; i++) numbers.push(i);
    const numBtn = (p) => h('button', {
        key: p,
        type: 'button',
        'aria-current': p === page ? 'page' : undefined,
        onClick: () => go(p),
        className: cx('min-w-[2rem] px-2 py-1 rounded-lg text-sm transition focus:outline-none focus:ring-2 focus:ring-sky-500',
            p === page ? 'bg-sky-600 text-white dark:bg-sky-500' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700')
    }, p);
    return h('nav', { role: 'navigation', 'aria-label': 'Pagination', className: cx('flex items-center gap-1', className) },
        h('button', { type: 'button', 'aria-label': 'Previous page', disabled: page <= 1, onClick: () => go(page - 1), className: 'px-2 py-1 rounded-lg text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-sky-500' }, '\u2039'),
        numbers.map(numBtn),
        h('button', { type: 'button', 'aria-label': 'Next page', disabled: page >= pageCount, onClick: () => go(page + 1), className: 'px-2 py-1 rounded-lg text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-sky-500' }, '\u203A')
    );
}

// ----------------------------------------------------------------------------
// DataTable
// ----------------------------------------------------------------------------

/**
 * Accessible data table with sortable headers, loading and empty states.
 * Distilled from the bespoke tables in crm, bank-transactions-manager,
 * form-submissions-admin, estate-agent-leads-dashboard, internal-tools-registry,
 * people-directory.
 * @param {object} props
 * @param {Array<{key:string,label:React.ReactNode,sortable?:boolean,render?:function,className?:string,align?:string}>} props.columns
 * @param {Array<object>} props.rows
 * @param {{key:string,dir:'asc'|'desc'}} [props.sort] Current sort state.
 * @param {function} [props.onSort] Called with a column key when a sortable header is activated.
 * @param {function|string} [props.rowKey] Row key accessor (fn) or field name; defaults to `id`.
 * @param {React.ReactNode} [props.empty] Rendered when there are no rows.
 * @param {boolean} [props.loading]
 * @param {function} [props.onRowClick]
 * @param {string} [props.className]
 * @returns {React.ReactElement}
 */
export function DataTable({ columns = [], rows = [], sort, onSort, rowKey = 'id', empty, loading = false, onRowClick, className } = {}) {
    const keyOf = typeof rowKey === 'function' ? rowKey : (r, i) => (r && r[rowKey] != null ? r[rowKey] : i);
    const alignCls = (a) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');

    function headerCell(col) {
        const sortable = col.sortable && onSort;
        const isSorted = sort && sort.key === col.key;
        const ariaSort = isSorted ? (sort.dir === 'asc' ? 'ascending' : 'descending') : (sortable ? 'none' : undefined);
        const inner = sortable
            ? h('button', {
                type: 'button',
                onClick: () => onSort(col.key),
                className: 'inline-flex items-center gap-1 font-semibold hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 rounded'
            }, col.label, h('span', { 'aria-hidden': 'true', className: 'text-[10px]' }, isSorted ? (sort.dir === 'asc' ? '\u25B2' : '\u25BC') : '\u21C5'))
            : col.label;
        return h('th', {
            key: col.key,
            scope: 'col',
            'aria-sort': ariaSort,
            className: cx('px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide', alignCls(col.align), col.className)
        }, inner);
    }

    return h('div', { className: cx('overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700', className) },
        h('table', { className: 'min-w-full divide-y divide-gray-200 dark:divide-gray-700' },
            h('thead', { className: 'bg-gray-50 dark:bg-gray-800/60' },
                h('tr', null, columns.map(headerCell))
            ),
            h('tbody', { className: 'divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-800' },
                loading
                    ? h('tr', null, h('td', { colSpan: columns.length, className: 'px-3 py-8' }, h(Spinner, { label: 'Loading\u2026' })))
                    : rows.length === 0
                        ? h('tr', null, h('td', { colSpan: columns.length, className: 'px-3 py-8' }, empty || h(EmptyState, { title: 'No data' })))
                        : rows.map((row, i) => h('tr', {
                            key: keyOf(row, i),
                            onClick: onRowClick ? () => onRowClick(row) : undefined,
                            className: cx('transition', onRowClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40')
                        },
                            columns.map((col) => h('td', {
                                key: col.key,
                                className: cx('px-3 py-2 text-sm text-gray-700 dark:text-gray-200', alignCls(col.align), col.className)
                            }, col.render ? col.render(row, i) : row[col.key]))
                        ))
            )
        )
    );
}

// ----------------------------------------------------------------------------
// StatCard / ProgressBar / Skeleton / PageHeader
// ----------------------------------------------------------------------------

/**
 * KPI / metric card. Distilled from the dashboard summary tiles in crm,
 * estate-agent-leads-dashboard, form-submissions-admin, team-wellness-dashboard.
 * @param {object} props
 * @param {React.ReactNode} props.label
 * @param {React.ReactNode} props.value
 * @param {React.ReactNode} [props.icon]
 * @param {{value:React.ReactNode,positive?:boolean}} [props.delta] Trend badge.
 * @param {string} [props.className]
 * @returns {React.ReactElement}
 */
export function StatCard({ label, value, icon, delta, className } = {}) {
    return h('div', { className: cx('bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4', className) },
        icon ? h('div', { 'aria-hidden': 'true', className: 'w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-sky-50 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300' }, icon) : null,
        h('div', { className: 'min-w-0' },
            h('p', { className: 'text-xs font-medium text-gray-500 dark:text-gray-400 truncate' }, label),
            h('div', { className: 'flex items-baseline gap-2' },
                h('p', { className: 'text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums' }, value),
                delta ? h('span', { className: cx('text-xs font-medium', delta.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400') }, (delta.positive ? '\u2191' : '\u2193') + ' ' + delta.value) : null
            )
        )
    );
}

/**
 * Determinate progress bar with accessible role=progressbar.
 * @param {object} props
 * @param {number} props.value Current value.
 * @param {number} [props.max]
 * @param {string} [props.label] Accessible name.
 * @param {boolean} [props.showLabel] Show a numeric % label.
 * @param {string} [props.className]
 * @returns {React.ReactElement}
 */
export function ProgressBar({ value = 0, max = 100, label, showLabel = false, className } = {}) {
    const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
    return h('div', { className: cx('w-full', className) },
        h('div', {
            role: 'progressbar',
            'aria-valuenow': Math.round(value),
            'aria-valuemin': 0,
            'aria-valuemax': max,
            'aria-label': label,
            className: 'w-full h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700'
        },
            h('div', { className: 'h-full bg-sky-600 dark:bg-sky-500 transition-all', style: { width: pct + '%' } })
        ),
        showLabel ? h('p', { className: 'mt-1 text-xs text-gray-500 dark:text-gray-400 text-right tabular-nums' }, Math.round(pct) + '%') : null
    );
}

/**
 * Shimmering placeholder block for loading states.
 * @param {object} props
 * @param {string} [props.className] Sizing classes, e.g. 'h-4 w-32'.
 * @returns {React.ReactElement}
 */
export function Skeleton({ className } = {}) {
    return h('div', { 'aria-hidden': 'true', className: cx('animate-pulse rounded bg-gray-200 dark:bg-gray-700', className || 'h-4 w-full') });
}

/**
 * Page header with title, optional description and right-aligned actions.
 * Distilled from the top bars in crm, internal-tools-registry, roadmap-management.
 * @param {object} props
 * @param {React.ReactNode} props.title
 * @param {React.ReactNode} [props.description]
 * @param {React.ReactNode} [props.actions]
 * @param {string} [props.className]
 * @returns {React.ReactElement}
 */
export function PageHeader({ title, description, actions, className } = {}) {
    return h('div', { className: cx('flex flex-wrap items-start justify-between gap-4 mb-6', className) },
        h('div', { className: 'min-w-0' },
            h('h1', { className: 'text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100' }, title),
            description ? h('p', { className: 'mt-1 text-sm text-gray-500 dark:text-gray-400' }, description) : null
        ),
        actions ? h('div', { className: 'flex items-center gap-2 flex-shrink-0' }, actions) : null
    );
}

// ----------------------------------------------------------------------------
// Drawer / Sidebar
// ----------------------------------------------------------------------------

/**
 * Slide-in drawer panel (portal, focus-trapped, Escape/backdrop close). Doubles
 * as an off-canvas Sidebar. Distilled from the detail/side panels in crm,
 * people-directory, internal-tools-registry, roadmap-management.
 * @param {object} props
 * @param {boolean} props.open
 * @param {function} props.onClose
 * @param {'left'|'right'} [props.side]
 * @param {React.ReactNode} [props.title]
 * @param {React.ReactNode} [props.children]
 * @param {string} [props.width] Tailwind width class (default 'w-80').
 * @returns {React.ReactElement|null}
 */
export function Drawer({ open, onClose, side = 'right', title, children, width = 'w-80' } = {}) {
    const panelRef = useRef(null);
    const titleId = useId('drawer-title');
    useFocusTrap(panelRef, open, onClose);
    if (!open) return null;
    const sideCls = side === 'left' ? 'left-0' : 'right-0';
    const node = h('div', {
        className: 'fixed inset-0 z-50 bg-black/40 dark:bg-black/60',
        onMouseDown: (e) => { if (e.target === e.currentTarget) onClose && onClose(); }
    },
        h('div', {
            ref: panelRef,
            role: 'dialog',
            'aria-modal': 'true',
            'aria-labelledby': title ? titleId : undefined,
            tabIndex: -1,
            className: cx('absolute top-0 bottom-0 flex flex-col bg-white dark:bg-gray-800 shadow-xl border-gray-200 dark:border-gray-700 focus:outline-none', side === 'left' ? 'border-r' : 'border-l', sideCls, width, 'max-w-[90vw]')
        },
            h('div', { className: 'flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700' },
                title ? h('h2', { id: titleId, className: 'text-sm font-semibold text-gray-900 dark:text-gray-100' }, title) : h('span', null),
                h(IconButton, { label: 'Close panel', onClick: onClose }, '\u2715')
            ),
            h('div', { className: 'flex-1 overflow-y-auto p-4 text-sm text-gray-700 dark:text-gray-200' }, children)
        )
    );
    if (ReactDOM && typeof ReactDOM.createPortal === 'function') {
        return ReactDOM.createPortal(node, document.body);
    }
    return node;
}

/** Alias: a Drawer is the off-canvas Sidebar these apps use interchangeably. */
export const Sidebar = Drawer;

// ----------------------------------------------------------------------------
// FileDropZone
// ----------------------------------------------------------------------------

/**
 * Accessible file drop zone with drag-over state and click-to-browse. Calls
 * back with a FileList. Distilled from the upload areas in document-review,
 * rfp-expert, atelier-wardrobe, estate-agent, alice-...-badge-maker.
 * (For the drop/upload plumbing itself see pt-docs.js / ptr-dnd useFileDrop.)
 * @param {object} props
 * @param {function} props.onFiles Called with a FileList of dropped/selected files.
 * @param {string} [props.accept] Input accept filter (e.g. 'image/*,.pdf').
 * @param {boolean} [props.multiple]
 * @param {React.ReactNode} [props.label]
 * @param {string} [props.className]
 * @returns {React.ReactElement}
 */
export function FileDropZone({ onFiles, accept, multiple = true, label, className } = {}) {
    const [over, setOver] = useState(false);
    const inputRef = useRef(null);
    const openPicker = () => inputRef.current && inputRef.current.click();
    return h('div', {
        role: 'button',
        tabIndex: 0,
        'aria-label': typeof label === 'string' ? label : 'Upload files',
        onClick: openPicker,
        onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(); } },
        onDragOver: (e) => { e.preventDefault(); setOver(true); },
        onDragLeave: () => setOver(false),
        onDrop: (e) => {
            e.preventDefault();
            setOver(false);
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) onFiles && onFiles(e.dataTransfer.files);
        },
        className: cx(
            'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-sky-500',
            over
                ? 'border-sky-500 bg-sky-50 dark:border-sky-400 dark:bg-sky-900/20'
                : 'border-gray-300 bg-gray-50 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800/40 dark:hover:border-gray-500',
            className
        )
    },
        h('div', { className: 'text-3xl text-gray-400 dark:text-gray-500', 'aria-hidden': 'true' }, '\u2601'),
        h('p', { className: 'text-sm text-gray-600 dark:text-gray-300' }, label || 'Drag files here, or click to browse'),
        accept ? h('p', { className: 'text-xs text-gray-400 dark:text-gray-500' }, accept) : null,
        h('input', {
            ref: inputRef,
            type: 'file',
            accept,
            multiple,
            className: 'hidden',
            onChange: (e) => { if (e.target.files && e.target.files.length) onFiles && onFiles(e.target.files); e.target.value = ''; }
        })
    );
}
