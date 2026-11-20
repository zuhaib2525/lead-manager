import { useCallback, useEffect, useState } from "react";
import { api, getToken, setToken } from "./api.js";
import AuthForm from "./AuthForm.jsx";
import StatsBar from "./StatsBar.jsx";
import LeadTable from "./LeadTable.jsx";
import LeadForm from "./LeadForm.jsx";
import ConfirmDelete from "./ConfirmDelete.jsx";

const PAGE_SIZE = 8;

function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(!!getToken());

  useEffect(() => {
    if (!getToken()) return;
    api.me().then(({ user }) => setUser(user)).catch(() => setToken(null)).finally(() => setBooting(false));
  }, []);

  const logout = () => { setToken(null); setUser(null); };

  if (booting) return <p className="center muted">Loading…</p>;
  if (!user) return <AuthForm onAuth={setUser} />;
  return <Leads user={user} onLogout={logout} />;
}

function Leads({ user, onLogout }) {
  const [meta, setMeta] = useState({ statuses: [], sources: [] });
  const [stats, setStats] = useState(null);
  const [result, setResult] = useState({ data: [], meta: { total: 0, page: 1, pages: 1 } });
  const [query, setQuery] = useState({ search: "", status: "", sort: "created", order: "desc", page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // null | {} (new) | lead
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState("");

  const debouncedSearch = useDebounced(query.search);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [list, s] = await Promise.all([
        api.list({ search: debouncedSearch, status: query.status, sort: query.sort, order: query.order, page: query.page, limit: PAGE_SIZE }),
        api.stats(),
      ]);
      // If the last item on the last page was removed, step back one page.
      if (list.data.length === 0 && query.page > 1) return setQuery((q) => ({ ...q, page: list.meta.pages }));
      setResult(list);
      setStats(s);
    } catch (e) {
      if (e.status === 401) return onLogout();
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, query.status, query.sort, query.order, query.page, onLogout]);

  useEffect(() => { api.meta().then(setMeta).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const patch = (p) => setQuery((q) => ({ ...q, page: 1, ...p }));
  const onSort = (key) =>
    patch({ sort: key, order: query.sort === key && query.order === "asc" ? "desc" : "asc" });
  const filtering = query.search || query.status;

  return (
    <div className="app">
      <header className="topbar">
        <h1>Lead Manager</h1>
        <div className="who">
          <span className="muted">{user.email}</span>
          <button className="btn sm" onClick={onLogout}>Sign out</button>
        </div>
      </header>

      <StatsBar stats={stats} statuses={meta.statuses} active={query.status} onSelect={(status) => patch({ status })} />

      <div className="toolbar">
        <input
          type="search"
          className="search"
          placeholder="Search by name, email or company"
          aria-label="Search leads"
          value={query.search}
          onChange={(e) => patch({ search: e.target.value })}
        />
        <select aria-label="Filter by status" value={query.status} onChange={(e) => patch({ status: e.target.value })}>
          <option value="">All statuses</option>
          {meta.statuses.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button className="btn primary" onClick={() => setEditing({})}>Add lead</button>
      </div>

      {error ? (
        <div className="banner error" role="alert">
          {error} <button className="link" onClick={load}>Try again</button>
        </div>
      ) : result.data.length === 0 && !loading ? (
        <div className="empty">
          {filtering ? (
            <>
              <p>No leads match your filters.</p>
              <button className="btn" onClick={() => patch({ search: "", status: "" })}>Clear filters</button>
            </>
          ) : (
            <>
              <p>No leads yet. Add your first lead to start tracking.</p>
              <button className="btn primary" onClick={() => setEditing({})}>Add lead</button>
            </>
          )}
        </div>
      ) : (
        <div className={loading ? "dim" : ""}>
          <LeadTable leads={result.data} sort={query.sort} order={query.order} onSort={onSort} onEdit={setEditing} onDelete={setDeleting} />
          <div className="pager">
            <span className="muted">{result.meta.total} lead{result.meta.total === 1 ? "" : "s"}</span>
            <div>
              <button className="btn sm" disabled={query.page <= 1} onClick={() => setQuery({ ...query, page: query.page - 1 })}>Previous</button>
              <span className="page-num">Page {result.meta.page} of {result.meta.pages}</span>
              <button className="btn sm" disabled={query.page >= result.meta.pages} onClick={() => setQuery({ ...query, page: query.page + 1 })}>Next</button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <LeadForm
          lead={editing.id ? editing : null}
          meta={meta}
          onClose={() => setEditing(null)}
          onSaved={(_, wasEdit) => { setEditing(null); setToast(wasEdit ? "Changes saved" : "Lead added"); load(); }}
        />
      )}
      {deleting && (
        <ConfirmDelete lead={deleting} onClose={() => setDeleting(null)} onDeleted={() => { setDeleting(null); setToast("Lead deleted"); load(); }} />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
