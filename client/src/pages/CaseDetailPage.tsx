import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { RepairCase, ProductRecommendation } from '../types';

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [repairCase, setRepairCase] = useState<RepairCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/cases/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Case not found (${r.status})`);
        return r.json();
      })
      .then((data: RepairCase) => setRepairCase(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load case'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="page-center">
        <div className="loading-state"><span className="spinner large" /> Loading analysis…</div>
      </div>
    );
  }

  if (error || !repairCase) {
    return (
      <div className="page">
        <div className="alert alert-error">{error ?? 'Case not found'}</div>
        <Link to="/cases" className="btn btn-ghost" style={{ marginTop: '1rem' }}>Back to history</Link>
      </div>
    );
  }

  const c = repairCase;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="case-date">{new Date(c.createdAt).toLocaleString()}</div>
          <h1 className="page-title">{c.title}</h1>
        </div>
        <Link to="/cases" className="btn btn-ghost">← History</Link>
      </div>

      {/* 1. Diagnosis */}
      <section className="section">
        <h2 className="section-title">Diagnosis</h2>
        <p className="diagnosis-text">{c.diagnosis}</p>
      </section>

      {/* 2. Issue evidence */}
      <section className="section">
        <h2 className="section-title">Issue Evidence</h2>
        <div className="evidence-grid">
          <EvidenceCard label="From photo" text={c.issueEvidence.fromImage} icon="📷" />
          {c.issueEvidence.fromUserDescription && (
            <EvidenceCard label="From description" text={c.issueEvidence.fromUserDescription} icon="📝" />
          )}
          {c.issueEvidence.fromVoiceTranscript && (
            <EvidenceCard label="From voice" text={c.issueEvidence.fromVoiceTranscript} icon="🎙️" />
          )}
        </div>
      </section>

      {/* 3. Safety warning */}
      {c.safetyWarning && (
        <div className="alert alert-warning">
          <strong>⚠️ Safety Warning</strong>
          <p>{c.safetyWarning}</p>
        </div>
      )}

      {/* 4. Steps */}
      <section className="section">
        <h2 className="section-title">Repair Steps</h2>
        <ol className="steps-list">
          {c.steps.map((step, i) => (
            <li key={i} className="step-item">
              <span className="step-number">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* 5. Materials */}
      <section className="section">
        <h2 className="section-title">Materials Needed</h2>
        <ul className="materials-list">
          {c.materials.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      </section>

      {/* 6. Cost estimate */}
      <section className="section">
        <h2 className="section-title">Cost Estimate</h2>
        <div className="cost-badge">{c.costEstimate}</div>
      </section>

      {/* 7. Product recommendations */}
      {c.productRecommendations.length > 0 && (
        <section className="section">
          <h2 className="section-title">Product Recommendations</h2>
          <div className="products-grid">
            {c.productRecommendations.map((rec, i) => (
              <ProductCard key={i} rec={rec} />
            ))}
          </div>
        </section>
      )}

      {/* 8. Transcript */}
      {c.transcript && (
        <section className="section">
          <button
            className="btn btn-ghost transcript-toggle"
            onClick={() => setTranscriptOpen((o) => !o)}
          >
            {transcriptOpen ? '▲ Hide transcript' : '▼ Show voice transcript'}
          </button>
          {transcriptOpen && (
            <div className="transcript-body">
              <p>{c.transcript}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function EvidenceCard({ label, text, icon }: { label: string; text: string; icon: string }) {
  return (
    <div className="evidence-card">
      <div className="evidence-label">{icon} {label}</div>
      <p className="evidence-text">{text}</p>
    </div>
  );
}

function ProductCard({ rec }: { rec: ProductRecommendation }) {
  return (
    <div className="product-card">
      <div className="product-name">{rec.item}</div>
      <p className="product-why">{rec.whyItIsNeeded}</p>
      <p className="product-summary">{rec.searchSummary}</p>
      {rec.options.length > 0 && (
        <div className="product-options">
          {rec.options.map((opt, i) => (
            <a
              key={i}
              href={opt.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="product-link"
            >
              {opt.title} — {opt.storeName}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
