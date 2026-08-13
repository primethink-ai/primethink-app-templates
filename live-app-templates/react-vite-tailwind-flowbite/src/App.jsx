import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Modal,
  ModalBody,
  ModalHeader,
  Spinner,
  TextInput
} from 'flowbite-react';

// TODO: Give each production app a unique entity name.
const ENTITY_NAME = 'vite_template_decision';

function normalizeList(result) {
  return Array.isArray(result) ? result : (Array.isArray(result?.entities) ? result.entities : []);
}

function usePrimeThinkDecisions() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const connected = Boolean(window.pt);

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (!window.pt) {
      setLoading(false);
      return;
    }
    if (!quiet) setLoading(true);
    setError('');
    try {
      const result = await window.pt.list({ entityNames: [ENTITY_NAME], limit: 100 });
      setItems(
        normalizeList(result)
          .filter((entity) => entity.entity_name === ENTITY_NAME)
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      );
    } catch (requestError) {
      console.error('Could not load decisions:', requestError);
      setError('Decisions could not be loaded. Refresh the app to try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    if (!window.pt?.onEntityChanged) return undefined;

    let timer;
    const unsubscribe = window.pt.onEntityChanged(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => refresh({ quiet: true }), 250);
    });

    return () => {
      window.clearTimeout(timer);
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [refresh]);

  const add = useCallback(async (text) => {
    await window.pt.add(ENTITY_NAME, { text, resolved: false });
    await refresh({ quiet: true });
  }, [refresh]);

  const toggle = useCallback(async (item) => {
    await window.pt.edit(item.id, { resolved: item.data?.resolved !== true }, true);
    await refresh({ quiet: true });
  }, [refresh]);

  const remove = useCallback(async (item) => {
    await window.pt.delete(item.id);
    await refresh({ quiet: true });
  }, [refresh]);

  return { items, loading, error, connected, refresh, add, toggle, remove };
}

function MarkIcon() {
  return (
    <svg viewBox="0 0 40 40" className="size-10 text-ledger-600 dark:text-emerald-300" fill="none" aria-hidden="true">
      <path d="M7 7h26v26H7z" stroke="currentColor" strokeWidth="2.5" />
      <path d="m13 20 4.5 4.5L28 14" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

function DecisionRow({ item, busy, onToggle, onDelete }) {
  const resolved = item.data?.resolved === true;
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 border-t border-slate-200 px-5 py-4 first:border-t-0 dark:border-slate-700 sm:px-6">
      <Checkbox
        aria-label={resolved ? 'Reopen decision' : 'Resolve decision'}
        checked={resolved}
        disabled={busy}
        onChange={() => onToggle(item)}
        className="mt-1"
      />
      <div className="min-w-0">
        <p className={`break-words text-sm leading-6 ${resolved ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
          {item.data?.text || 'Untitled decision'}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge color={resolved ? 'success' : 'warning'} size="xs">
            {resolved ? 'Resolved' : 'Open'}
          </Badge>
          <span className="font-mono text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Record #{item.id}</span>
        </div>
      </div>
      <Button color="red" size="xs" outline disabled={busy} onClick={() => onDelete(item)}>
        Delete
      </Button>
    </li>
  );
}

export default function App() {
  const { items, loading, error, connected, add, toggle, remove } = usePrimeThinkDecisions();
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState(null);

  const counts = useMemo(() => ({
    open: items.filter((item) => item.data?.resolved !== true).length,
    resolved: items.filter((item) => item.data?.resolved === true).length
  }), [items]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function handleAdd(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !connected || saving) return;
    setSaving(true);
    try {
      await add(text);
      setDraft('');
      setModalOpen(false);
      setNotice({ type: 'success', text: 'Decision added to this chat.' });
    } catch (requestError) {
      console.error('Could not add decision:', requestError);
      setNotice({ type: 'failure', text: 'The decision was not saved. Try again.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(item) {
    setBusyId(item.id);
    try {
      await toggle(item);
    } catch (requestError) {
      console.error('Could not update decision:', requestError);
      setNotice({ type: 'failure', text: 'The decision was not updated. Try again.' });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm('Delete this decision? This cannot be undone.')) return;
    setBusyId(item.id);
    try {
      await remove(item);
      setNotice({ type: 'success', text: 'Decision deleted.' });
    } catch (requestError) {
      console.error('Could not delete decision:', requestError);
      setNotice({ type: 'failure', text: 'The decision was not deleted. Try again.' });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#eef2f3] px-4 py-8 text-slate-950 antialiased dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-7 grid gap-7 border-b-2 border-slate-950 pb-7 dark:border-slate-100 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <MarkIcon />
              <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-ledger-700 dark:text-emerald-300">PrimeThink decision ledger</span>
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.045em] text-slate-950 dark:text-white sm:text-6xl">
              Record the call.<br />Keep the reasoning moving.
            </h1>
          </div>
          <Button color="green" size="lg" disabled={!connected} onClick={() => setModalOpen(true)}>
            Add decision
          </Button>
        </header>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <Card className="rounded-none border-slate-300 shadow-none dark:border-slate-700 dark:bg-slate-900">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Connection</span>
            <strong className={`text-base ${connected ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
              {connected ? '● Platform connected' : '○ PrimeThink required'}
            </strong>
          </Card>
          <Card className="rounded-none border-slate-300 shadow-none dark:border-slate-700 dark:bg-slate-900">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Open</span>
            <strong className="text-3xl font-black text-slate-950 dark:text-white">{counts.open}</strong>
          </Card>
          <Card className="rounded-none border-slate-300 shadow-none dark:border-slate-700 dark:bg-slate-900">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Resolved</span>
            <strong className="text-3xl font-black text-slate-950 dark:text-white">{counts.resolved}</strong>
          </Card>
        </div>

        {!connected && (
          <Alert color="warning" className="mb-6 rounded-none">
            Open the built app inside PrimeThink to enable <code className="font-mono">window.pt</code> and persistent chat data.
          </Alert>
        )}
        {error && <Alert color="failure" className="mb-6 rounded-none">{error}</Alert>}

        <section aria-labelledby="ledger-heading" className="overflow-hidden border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
            <div>
              <h2 id="ledger-heading" className="text-lg font-black">Ledger entries</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Newest decisions appear first.</p>
            </div>
            <Badge color="gray">{items.length} total</Badge>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-3 border-t border-slate-200 px-6 py-16 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <Spinner aria-label="Loading decisions" size="sm" /> Loading decisions…
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="border-t border-slate-200 px-6 py-16 text-center dark:border-slate-700">
              <MarkIcon />
              <p className="mt-4 font-black text-slate-800 dark:text-white">No decisions recorded.</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Add the first call the team should remember.</p>
            </div>
          )}

          {!loading && items.length > 0 && (
            <ul aria-live="polite">
              {items.map((item) => (
                <DecisionRow
                  key={item.id}
                  item={item}
                  busy={busyId === item.id}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          )}
        </section>

        <p className="mt-5 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Template entity: <code className="font-mono text-slate-700 dark:text-slate-300">{ENTITY_NAME}</code>. Rename it before publishing.
        </p>
      </div>

      <Modal show={modalOpen} size="md" onClose={() => !saving && setModalOpen(false)} popup>
        <ModalHeader />
        <ModalBody>
          <form onSubmit={handleAdd} className="space-y-5">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Record a decision</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Write the outcome in one clear sentence.</p>
            </div>
            <div>
              <label htmlFor="decisionText" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Decision</label>
              <TextInput
                id="decisionText"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={300}
                placeholder="We will…"
                required
                autoFocus
                disabled={saving}
              />
              <p className="mt-2 text-right font-mono text-[10px] text-slate-400">{draft.length}/300</p>
            </div>
            <div className="flex justify-end gap-3">
              <Button color="gray" type="button" disabled={saving} onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button color="green" type="submit" disabled={saving || !draft.trim()}>
                {saving ? <><Spinner size="sm" className="mr-2" /> Saving…</> : 'Save decision'}
              </Button>
            </div>
          </form>
        </ModalBody>
      </Modal>

      {notice && (
        <div className="fixed inset-x-4 bottom-4 z-50 sm:left-auto sm:w-96" role="status" aria-live="polite">
          <Alert color={notice.type} className="rounded-none shadow-lg" onDismiss={() => setNotice(null)}>
            {notice.text}
          </Alert>
        </div>
      )}
    </main>
  );
}
