// ============================================================================
// ptr-dnd.js — Drag & drop / reordering for PrimeThink Live Apps (page_type
// "react"), with zero external dependencies. Built with React.createElement
// (aliased `h`) — served RAW (only index.js is Babel-transpiled), so NO JSX.
//
// Distilled from the hand-rolled HTML5 drag handlers in: kanban-board,
// board_view, todo-list, roadmap-management, team-sprint-board,
// gantt-chart-project-manager, mind-mapping-tool, not-linear-app. Those apps
// repeated the same dragstart/dragover/drop dance plus an order-reindex step
// before persisting to the chat DB. This is the shared, accessible version.
//
// React 18 + ReactDOM are platform browser globals — never import them. `pt` is
// a platform global; reindexOrder() produces a pt.batchEdit() payload but this
// file never calls pt itself (the app owns persistence). No localStorage.
//
// TOUCH-DEVICE CAVEAT: the HTML5 Drag and Drop API does not fire on most touch
// devices (no dragstart from touch). Every hook here therefore ALSO exposes
// keyboard reordering (Alt+ArrowUp/Down) as an accessible, touch-independent
// path, and SortableList renders real <button> move controls so reordering
// works without a mouse or a working DnD implementation. A full Pointer Events
// drag engine would be disproportionate for these list/board use cases; the
// keyboard/button fallback covers the accessibility and touch gaps.
//
// USAGE (from your JSX index.js):
//   import { useSortableList, SortableList, reindexOrder } from './ptr-dnd.js';
//
//   function TaskList({ tasks, setTasks }) {
//       const onReorder = async (next) => {
//           setTasks(next);
//           await pt.batchEdit(reindexOrder(next)); // persist new order
//       };
//       return (
//           <SortableList
//               items={tasks}
//               onReorder={onReorder}
//               renderItem={(t) => <span>{t.data.title}</span>}
//           />
//       );
//   }
// ============================================================================

const h = React.createElement;
const { useState, useCallback, useRef, useMemo } = React;

function cxLocal(...parts) { return parts.filter(Boolean).join(' '); }

// ----------------------------------------------------------------------------
// Pure helpers
// ----------------------------------------------------------------------------

/**
 * Move an item within an array from `from` to `to`, returning a new array.
 * @template T
 * @param {T[]} list
 * @param {number} from
 * @param {number} to
 * @returns {T[]}
 */
export function arrayMove(list, from, to) {
    const next = list.slice();
    if (from < 0 || from >= next.length) return next;
    const clampedTo = Math.max(0, Math.min(next.length - 1, to));
    const [item] = next.splice(from, 1);
    next.splice(clampedTo, 0, item);
    return next;
}

/**
 * Produce a pt.batchEdit() payload that writes a sequential `order` field onto
 * each item's data, matching its position in `items`. This is the reindex step
 * every reorder-persisting app repeated by hand. Skips items without an `id`.
 * @param {Array<{id:(number|string)}>} items Ordered entities.
 * @param {object} [opts]
 * @param {string} [opts.field] Data field to write (default 'order').
 * @param {number} [opts.start] Starting index (default 0).
 * @param {number} [opts.step] Increment between items (default 1).
 * @returns {Array<{id:(number|string), data:object}>} Payload for pt.batchEdit (merge).
 */
export function reindexOrder(items, opts) {
    const field = (opts && opts.field) || 'order';
    const start = (opts && opts.start != null) ? opts.start : 0;
    const step = (opts && opts.step) || 1;
    const payload = [];
    (items || []).forEach((item, i) => {
        if (item == null || item.id == null) return;
        const data = {};
        data[field] = start + i * step;
        // merge:true is REQUIRED: the server's batch edit REPLACES the whole
        // entity data unless the item explicitly asks to merge, so omitting it
        // would wipe every field except the order index.
        payload.push({ id: item.id, data, merge: true });
    });
    return payload;
}

function idOf(item, idKey, index) {
    if (item == null) return index;
    return item[idKey] != null ? item[idKey] : index;
}

// ----------------------------------------------------------------------------
// useSortableList
// ----------------------------------------------------------------------------

/**
 * Reorderable single list via HTML5 drag events + keyboard fallback. Returns
 * per-item prop getters and drop-indicator state; you spread the props onto
 * your rows. Distilled from todo-list, roadmap-management, team-sprint-board.
 * @param {object} args
 * @param {Array<object>} args.items
 * @param {function} args.onReorder Called with the reordered array.
 * @param {string} [args.idKey] Field used as the stable id (default 'id').
 * @returns {{
 *   dragIndex:number, overIndex:number,
 *   getItemProps:function, getHandleProps:function, isDragging:function
 * }}
 */
export function useSortableList({ items, onReorder, idKey = 'id' } = {}) {
    const [dragIndex, setDragIndex] = useState(-1);
    const [overIndex, setOverIndex] = useState(-1);
    const list = items || [];

    const commit = useCallback((from, to) => {
        if (from < 0 || to < 0 || from === to) return;
        onReorder && onReorder(arrayMove(list, from, to));
    }, [list, onReorder]);

    /**
     * Props for a draggable row at `index`. Spread onto the row element.
     */
    const getItemProps = useCallback((index) => ({
        draggable: true,
        'data-sortable-index': index,
        onDragStart: (e) => {
            setDragIndex(index);
            try {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(idOf(list[index], idKey, index)));
            } catch (err) { /* some browsers restrict setData */ }
        },
        onDragOver: (e) => {
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
            if (overIndex !== index) setOverIndex(index);
        },
        onDragLeave: () => { if (overIndex === index) setOverIndex(-1); },
        onDrop: (e) => {
            e.preventDefault();
            commit(dragIndex, index);
            setDragIndex(-1);
            setOverIndex(-1);
        },
        onDragEnd: () => { setDragIndex(-1); setOverIndex(-1); }
    }), [list, idKey, dragIndex, overIndex, commit]);

    /**
     * Props for an accessible move-handle button at `index`. Provides keyboard
     * reordering with Alt+ArrowUp/Down (touch/mouse-independent).
     */
    const getHandleProps = useCallback((index) => ({
        role: 'button',
        tabIndex: 0,
        'aria-label': 'Reorder item ' + (index + 1) + ' of ' + list.length + '. Use Alt+Arrow Up or Down to move.',
        onKeyDown: (e) => {
            if (!e.altKey) return;
            if (e.key === 'ArrowUp') { e.preventDefault(); commit(index, index - 1); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); commit(index, index + 1); }
        }
    }), [list.length, commit]);

    const isDragging = useCallback((index) => index === dragIndex, [dragIndex]);

    return { dragIndex, overIndex, getItemProps, getHandleProps, isDragging };
}

// ----------------------------------------------------------------------------
// DragHandle
// ----------------------------------------------------------------------------

/**
 * Visual + accessible drag handle (the classic ⠿ grip). Spread the props from
 * useSortableList().getHandleProps(index) onto it for keyboard reordering.
 * @param {object} props
 * @param {string} [props.className]
 * @returns {React.ReactElement}
 */
export function DragHandle(props = {}) {
    const { className, ...rest } = props;
    return h('span', Object.assign({
        className: cxLocal('inline-flex items-center justify-center w-6 h-6 cursor-grab active:cursor-grabbing rounded text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 select-none', className),
        'aria-hidden': rest['aria-label'] ? undefined : 'true'
    }, rest), '\u2807\u2807');
}

// ----------------------------------------------------------------------------
// SortableList
// ----------------------------------------------------------------------------

/**
 * Ready-made reorderable list. Renders each item with a drag handle and a
 * drop-indicator ring, wiring useSortableList for you. Distilled from the
 * repeated draggable-<li> lists in todo-list, roadmap-management.
 * @param {object} props
 * @param {Array<object>} props.items
 * @param {function} props.onReorder Called with the reordered array.
 * @param {function} props.renderItem (item, index) => React node for the body.
 * @param {string} [props.idKey] Stable id field (default 'id').
 * @param {boolean} [props.handle] Show a drag handle (default true).
 * @param {string} [props.className]
 * @param {string} [props.itemClassName]
 * @returns {React.ReactElement}
 */
export function SortableList({ items = [], onReorder, renderItem, idKey = 'id', handle = true, className, itemClassName } = {}) {
    const sortable = useSortableList({ items, onReorder, idKey });
    return h('ul', { role: 'list', className: cxLocal('space-y-2', className) },
        items.map((item, index) => {
            const itemProps = sortable.getItemProps(index);
            const dragging = sortable.isDragging(index);
            const over = sortable.overIndex === index && !dragging;
            return h('li', Object.assign({ key: idOf(item, idKey, index) }, itemProps, {
                className: cxLocal(
                    'flex items-center gap-2 rounded-lg border px-3 py-2 bg-white dark:bg-gray-800 transition',
                    over ? 'border-sky-500 ring-2 ring-sky-500/40 dark:border-sky-400' : 'border-gray-200 dark:border-gray-700',
                    dragging ? 'opacity-50' : '',
                    itemClassName
                )
            }),
                handle ? h(DragHandle, sortable.getHandleProps(index)) : null,
                h('div', { className: 'flex-1 min-w-0 text-sm text-gray-800 dark:text-gray-100' }, renderItem ? renderItem(item, index) : null)
            );
        })
    );
}

// ----------------------------------------------------------------------------
// useDragBoard (kanban)
// ----------------------------------------------------------------------------

/**
 * Kanban-style board DnD: move a card between columns and reindex within the
 * destination column. Items are grouped by a column key; you supply that key
 * accessor. Distilled from kanban-board, board_view, team-sprint-board.
 *
 * onMove is called with a descriptor AND a ready-to-persist reindex payload so
 * the app can `pt.batchEdit(result.updates)` in one call.
 * @param {object} args
 * @param {Array<{id:(string|number)}>} args.columns Column descriptors; each needs an id.
 * @param {Array<object>} args.items All cards across all columns.
 * @param {function} args.onMove Called with {itemId, from, to, index, items, updates}.
 * @param {string} [args.columnKey] Item data field holding its column id (default 'column').
 * @param {string} [args.idKey] Item id field (default 'id').
 * @param {string} [args.orderField] Field to reindex within a column (default 'order').
 * @returns {{
 *   dragId:(string|number|null), overColumn:(string|number|null),
 *   itemsByColumn:function, getCardProps:function, getColumnProps:function
 * }}
 */
export function useDragBoard({ columns = [], items = [], onMove, columnKey = 'column', idKey = 'id', orderField = 'order' } = {}) {
    const [dragId, setDragId] = useState(null);
    const [overColumn, setOverColumn] = useState(null);

    const colField = useCallback((item) => {
        if (item && item.data && item.data[columnKey] != null) return item.data[columnKey];
        return item ? item[columnKey] : undefined;
    }, [columnKey]);

    const itemsByColumn = useCallback((colId) => {
        return items
            .filter((it) => String(colField(it)) === String(colId))
            .sort((a, b) => {
                const av = (a.data && a.data[orderField]) != null ? a.data[orderField] : 0;
                const bv = (b.data && b.data[orderField]) != null ? b.data[orderField] : 0;
                return av - bv;
            });
    }, [items, colField, orderField]);

    const move = useCallback((itemId, toColumn, toIndex) => {
        const item = items.find((it) => String(idOf(it, idKey)) === String(itemId));
        if (!item) return;
        const from = colField(item);
        if (from === toColumn && toIndex == null) return;

        // Build the destination column's new order (excluding the moved card,
        // then inserting it at toIndex or the end).
        const dest = itemsByColumn(toColumn).filter((it) => String(idOf(it, idKey)) !== String(itemId));
        const insertAt = toIndex == null ? dest.length : Math.max(0, Math.min(dest.length, toIndex));
        dest.splice(insertAt, 0, item);

        // Reindex destination; also set the moved card's column field.
        const updates = dest.map((it, i) => {
            const data = {};
            data[orderField] = i;
            if (String(idOf(it, idKey)) === String(itemId)) data[columnKey] = toColumn;
            // merge:true — same reason as reindexOrder: batch edit replaces
            // entity data wholesale without it.
            return { id: idOf(it, idKey), data, merge: true };
        });

        onMove && onMove({ itemId, from, to: toColumn, index: insertAt, items, updates });
    }, [items, idKey, colField, itemsByColumn, orderField, columnKey, onMove]);

    /** Props for a draggable card. */
    const getCardProps = useCallback((item) => ({
        draggable: true,
        onDragStart: (e) => {
            const id = idOf(item, idKey);
            setDragId(id);
            try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(id)); } catch (err) { /* noop */ }
        },
        onDragEnd: () => { setDragId(null); setOverColumn(null); }
    }), [idKey]);

    /** Props for a column drop target. */
    const getColumnProps = useCallback((colId) => ({
        onDragOver: (e) => {
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
            if (overColumn !== colId) setOverColumn(colId);
        },
        onDragLeave: (e) => {
            // Only clear when leaving the column subtree, not its children.
            if (e.currentTarget === e.target && overColumn === colId) setOverColumn(null);
        },
        onDrop: (e) => {
            e.preventDefault();
            const id = dragId != null ? dragId : (e.dataTransfer && e.dataTransfer.getData('text/plain'));
            if (id != null && id !== '') move(id, colId, null);
            setDragId(null);
            setOverColumn(null);
        },
        'aria-dropeffect': 'move'
    }), [overColumn, dragId, move]);

    return { dragId, overColumn, itemsByColumn, getCardProps, getColumnProps, move };
}

// ----------------------------------------------------------------------------
// useFileDrop
// ----------------------------------------------------------------------------

/**
 * File drag-and-drop onto a region. Returns drag-over state and prop getters to
 * spread onto your drop target, filtering by `accept` (glob-ish list like
 * 'image/*,.pdf'). Unlike HTML5 element DnD, file drops DO work with the OS drag
 * source on desktop; there is no touch equivalent, so also offer a file input
 * (see ptr-ui.FileDropZone which composes this). Distilled from document-review,
 * rfp-expert, atelier-wardrobe, estate-agent, colour-by-number.
 * @param {object} args
 * @param {function} args.onFiles Called with an Array<File> that passed the filter.
 * @param {string} [args.accept] Comma-separated accept filter.
 * @returns {{isOver:boolean, getRootProps:function, matches:function}}
 */
export function useFileDrop({ onFiles, accept } = {}) {
    const [isOver, setIsOver] = useState(false);
    const depth = useRef(0);

    const matches = useCallback((file) => {
        if (!accept) return true;
        const rules = accept.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
        if (!rules.length) return true;
        const name = (file.name || '').toLowerCase();
        const type = (file.type || '').toLowerCase();
        return rules.some((rule) => {
            if (rule.startsWith('.')) return name.endsWith(rule);
            if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1)); // 'image/'
            return type === rule;
        });
    }, [accept]);

    const getRootProps = useCallback(() => ({
        onDragEnter: (e) => { e.preventDefault(); depth.current += 1; setIsOver(true); },
        onDragOver: (e) => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; },
        onDragLeave: (e) => { e.preventDefault(); depth.current -= 1; if (depth.current <= 0) { depth.current = 0; setIsOver(false); } },
        onDrop: (e) => {
            e.preventDefault();
            depth.current = 0;
            setIsOver(false);
            const files = e.dataTransfer && e.dataTransfer.files ? Array.prototype.slice.call(e.dataTransfer.files) : [];
            const accepted = files.filter(matches);
            if (accepted.length) onFiles && onFiles(accepted);
        }
    }), [matches, onFiles]);

    return { isOver, getRootProps, matches };
}
