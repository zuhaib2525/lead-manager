import { useEffect, useState } from "react";
import { api } from "./api.js";

export default function ConfirmDelete({ lead, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function confirm() {
    setBusy(true);
    try {
      await api.remove(lead.id);
      onDeleted();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal small" role="alertdialog" aria-modal="true" aria-labelledby="del-title">
        <h2 id="del-title">Delete {lead.name}?</h2>
        <p className="muted">This removes the lead from {lead.company} permanently. You can't undo this.</p>
        {error && <p className="banner error" role="alert">{error}</p>}
        <div className="actions">
          <button className="btn" onClick={onClose} autoFocus>Keep lead</button>
          <button className="btn danger" onClick={confirm} disabled={busy}>{busy ? "Deleting…" : "Delete lead"}</button>
        </div>
      </div>
    </div>
  );
}
