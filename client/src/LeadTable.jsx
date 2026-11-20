const COLUMNS = [
  { key: "name", label: "Name", sortable: true },
  { key: "company", label: "Company", sortable: true },
  { key: "contact", label: "Contact" },
  { key: "source", label: "Source" },
  { key: "status", label: "Status", sortable: true },
  { key: "created", label: "Added", sortable: true },
];

export default function LeadTable({ leads, sort, order, onSort, onEdit, onDelete }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th key={c.key} aria-sort={sort === c.key ? (order === "asc" ? "ascending" : "descending") : undefined}>
                {c.sortable ? (
                  <button className="th-btn" onClick={() => onSort(c.key)}>
                    {c.label}<span aria-hidden="true">{sort === c.key ? (order === "asc" ? " ▲" : " ▼") : ""}</span>
                  </button>
                ) : c.label}
              </th>
            ))}
            <th><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.id}>
              <td data-label="Name"><strong>{l.name}</strong></td>
              <td data-label="Company">{l.company}</td>
              <td data-label="Contact"><a href={`mailto:${l.email}`}>{l.email}</a><br /><span className="muted">{l.phone}</span></td>
              <td data-label="Source">{l.source}</td>
              <td data-label="Status"><span className={`pill s-${l.status}`}>{l.status}</span></td>
              <td data-label="Added">{new Date(l.created_at.replace(" ", "T") + "Z").toLocaleDateString()}</td>
              <td className="row-actions">
                <button className="btn sm" onClick={() => onEdit(l)} aria-label={`Edit ${l.name}`}>Edit</button>
                <button className="btn sm danger-text" onClick={() => onDelete(l)} aria-label={`Delete ${l.name}`}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
