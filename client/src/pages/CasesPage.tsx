import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { RepairCase } from '../types';

export function CasesPage() {
  const [cases, setCases] = useState<RepairCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/cases')
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load cases (${r.status})`);
        return r.json();
      })
      .then((data: RepairCase[]) => setCases(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load history'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Repair History</h1>
        <Link to="/" className="btn btn-primary">New Analysis</Link>
      </div>

      {loading && <div className="loading-state"><span className="spinner large" /> Loading history…</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && cases.length === 0 && (
        <div className="empty-state">
          <p>No past analyses yet.</p>
          <Link to="/" className="btn btn-primary">Start your first analysis</Link>
        </div>
      )}

      {!loading && cases.length > 0 && (
        <ul className="case-list">
          {cases.map((c) => (
            <li key={c.id}>
              <Link to={`/cases/${c.id}`} className="case-list-item">
                <div className="case-list-title">{c.title}</div>
                <div className="case-list-meta">
                  <span className="case-list-diagnosis">{c.diagnosis}</span>
                  <span className="case-list-date">{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
