// Pipeline strip: counts per status. Clicking a segment filters the table.
export default function StatsBar({ stats, statuses, active, onSelect }) {
  if (!stats) return <div className="stats" aria-busy="true" />;
  return (
    <nav className="stats" aria-label="Leads by status">
      <button className={`stat${active === "" ? " active" : ""}`} onClick={() => onSelect("")}>
        <b>{stats.total}</b> All leads
      </button>
      {statuses.map((s) => (
        <button key={s} className={`stat s-${s}${active === s ? " active" : ""}`} onClick={() => onSelect(active === s ? "" : s)}>
          <b>{stats.byStatus[s] ?? 0}</b> {s}
        </button>
      ))}
    </nav>
  );
}
