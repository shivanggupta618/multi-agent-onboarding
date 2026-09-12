import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type Case = {
  id: string;
  name: string;
  customer: { fullName: string; dateOfBirth: string; nationality: string };
  identity: { documentType: string; documentNumber: string; nameOnDocument: string; dateOfBirthOnDocument: string; expiryDate: string };
  address: { line1: string; city: string; country: string; proofProvided: boolean };
  employment: { type: string; employerOrCompany: string; annualIncome: number };
  documents: { type: string; provided: boolean; readable: boolean }[];
  risk: { pep: boolean; sanctionsHit: boolean; highRiskCountry: boolean; adverseMedia: boolean };
};

type Workflow = any;

const api = async (path: string, options?: RequestInit) => {
  const r = await fetch(`/api${path}`, options);
  if (!r.ok) throw new Error((await r.json()).error || 'Request failed');
  return r.json();
};

const label = (s: string) => s.replaceAll('_', ' ').replace(/\b\w/g, (x: string) => x.toUpperCase());

function App() {
  const [cases, setCases] = useState<Case[]>([]);
  const [selected, setSelected] = useState<Case | null>(null);
  const [mode, setMode] = useState('HUMAN_APPROVAL_REQUIRED');
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () =>
    api('/cases')
      .then((d: Case[]) => {
        setCases(d);
        if (!selected && d[0]) setSelected(d[0]);
      })
      .catch(e => setError(e.message));

  useEffect(() => {
    void load();
  }, []);

  const seedPresets = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api('/cases/seed', { method: 'POST' });
      setCases(res.cases);
      if (res.cases.length > 0) setSelected(res.cases[0]);
      setWorkflow(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const loadRandomSample = async () => {
    setBusy(true);
    setError('');
    try {
      const c = await api('/cases/sample', { method: 'POST' });
      setCases(x => [c, ...x]);
      setSelected(c);
      setWorkflow(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setBusy(true);
        setError('');
        const saved = await api('/cases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(json)
        });
        setCases(old => [saved, ...old.filter(x => x.id !== saved.id)]);
        setSelected(saved);
        setWorkflow(null);
      } catch (err: any) {
        setError(`Failed to parse or save uploaded JSON case: ${err.message}`);
      } finally {
        setBusy(false);
      }
    };
    reader.readAsText(file);
  };

  const run = async () => {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      const saved = await api('/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selected)
      });
      setCases(old => [saved, ...old.filter(x => x.id !== saved.id)]);
      setSelected(saved);
      const w = await api('/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: saved.id, mode })
      });
      setWorkflow(w);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const modify = (path: string, value: any) => {
    if (!selected) return;
    const next = structuredClone(selected) as any;
    const keys = path.split('.');
    let ptr = next;
    keys.slice(0, -1).forEach(k => (ptr = ptr[k]));
    ptr[keys[keys.length - 1]] = value;
    setSelected(next);
  };

  const save = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const c = await api('/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selected)
      });
      setCases(old => [c, ...old.filter(x => x.id !== c.id)]);
      setSelected(c);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main>
      <header>
        <div>
          <span className="eyebrow">SYNTHETIC DATA ONLY · CONTROLLED DEMO</span>
          <h1>
            Onboarding<span>Review</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="secondary" onClick={seedPresets} disabled={busy}>
            ⚡ Load Presets
          </button>
          <button className="secondary" onClick={() => fileInputRef.current?.click()} disabled={busy}>
            📁 Upload JSON Case
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json" style={{ display: 'none' }} />
        </div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">MULTI-AGENT CASE REVIEWER</p>
          <h2>
            Turn evidence into an <em>explainable</em> recommendation.
          </h2>
          <p>
            Specialist agents independently assess customer identity, completeness, financial profile, and risk indicators. A supervisor coordinates workflow hand-offs, retries failures, and records an auditable trace.
          </p>
        </div>
        <div className="flow">
          <b>01 Intake</b>
          <i>→</i>
          <b>02 Specialists</b>
          <i>→</i>
          <b>03 Decision</b>
          <i>→</i>
          <b>04 Human control</b>
        </div>
      </section>

      {error && <div className="error">{error}</div>}

      <section className="controls">
        <label>
          Synthetic Case
          <select
            value={selected?.id || ''}
            onChange={e => {
              setSelected(cases.find(c => c.id === e.target.value) || null);
              setWorkflow(null);
            }}
          >
            <option value="">Select a synthetic case</option>
            {cases.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Autonomy mode
          <select value={mode} onChange={e => setMode(e.target.value)}>
            <option value="HUMAN_APPROVAL_REQUIRED">Human approval required (All cases queued)</option>
            <option value="REVIEW_ON_EXCEPTION">Human review only on exception (Auto-approve clean cases)</option>
          </select>
        </label>
        <button onClick={run} disabled={!selected || busy}>
          {busy ? 'Processing agent review…' : 'Run multi-agent review →'}
        </button>
      </section>

      {selected ? (
        <section className="grid">
          <div className="case-card">
            <div className="card-title">
              <div>
                <p className="eyebrow">SYNTHETIC CASE FILE</p>
                <h3>{selected.name}</h3>
              </div>
              <button className="text" onClick={save}>
                Save edits
              </button>
            </div>
            <div className="fields">
              <Field n="Customer name" v={selected.customer.fullName} set={v => modify('customer.fullName', v)} />
              <Field n="Date of birth" v={selected.customer.dateOfBirth} set={v => modify('customer.dateOfBirth', v)} />
              <Field n="Document name" v={selected.identity.nameOnDocument} set={v => modify('identity.nameOnDocument', v)} />
              <Field n="Document expiry" v={selected.identity.expiryDate} set={v => modify('identity.expiryDate', v)} />
              <Field n="Annual income ($)" v={selected.employment.annualIncome} set={v => modify('employment.annualIncome', Number(v))} />
              <Field
                n="Address proof"
                v={selected.address.proofProvided ? 'Provided' : 'Missing'}
                set={v => modify('address.proofProvided', v === 'Provided')}
                options={['Provided', 'Missing']}
              />
            </div>
            <div className="risk">
              <p className="eyebrow">SUPPORTING DOCUMENTS</p>
              {selected.documents.map((d, i) => (
                <label className="toggle" key={d.type}>
                  {d.type}
                  <input
                    type="checkbox"
                    checked={d.provided && d.readable}
                    onChange={e => {
                      modify(`documents.${i}.provided`, e.target.checked);
                      modify(`documents.${i}.readable`, e.target.checked);
                    }}
                  />
                  <span />
                </label>
              ))}
            </div>
            <div className="risk">
              <p className="eyebrow">RISK INDICATORS</p>
              {Object.entries(selected.risk).map(([key, val]) => (
                <label className="toggle" key={key}>
                  {label(key)}
                  <input type="checkbox" checked={val} onChange={e => modify(`risk.${key}`, e.target.checked)} />
                  <span />
                </label>
              ))}
            </div>
          </div>

          <div className="results">
            <p className="eyebrow">ORCHESTRATION & AGENT FINDINGS</p>
            {workflow ? (
              <Results w={workflow} />
            ) : (
              <div className="empty">
                Select an autonomy mode and click <strong>Run multi-agent review →</strong>. Findings from specialist agents and the supervisor trace will render here.
              </div>
            )}
          </div>
        </section>
      ) : (
        <div className="empty large">Load a synthetic onboarding case to begin review.</div>
      )}

      <footer>
        ⚠️ AI recommendations are strictly advisory and non-executable. This demo application does not execute account opening, money transfer, or core banking transactions.
      </footer>
    </main>
  );
}

function Field({ n, v, set, options }: { n: string; v: any; set: (v: string) => void; options?: string[] }) {
  return (
    <label>
      {n}
      {options ? (
        <select value={v} onChange={e => set(e.target.value)}>
          {options.map(o => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input value={v} onChange={e => set(e.target.value)} />
      )}
    </label>
  );
}

function Results({ w }: { w: Workflow }) {
  const r = w.recommendation;
  return (
    <>
      <div className={`decision ${r.recommendation}`}>
        <span>Final recommendation</span>
        <strong>{label(r.recommendation)}</strong>
        <small>
          {w.status === 'PENDING_HUMAN_APPROVAL'
            ? '⏸️ Queued for human approval — non-executable advisory output.'
            : '✅ Workflow completed automatically — advisory output only.'}
        </small>
      </div>
      <div className="agents">
        {w.agentOutputs.map((a: any) => (
          <article key={a.agent}>
            <div>
              <b>{a.agent}</b>
              <span className={`status-${a.status.toLowerCase()}`}>{a.status}</span>
            </div>
            <p>{a.summary}</p>
            {a.findings.length ? (
              <ul>
                {a.findings.map((f: any) => (
                  <li key={f.code} className={f.severity}>
                    <strong>[{f.severity}]</strong> {f.message}
                    <small>Evidence: {f.evidence}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <small className="clear">✓ No material findings detected</small>
            )}
          </article>
        ))}
      </div>
      <article className="rationale">
        <b>Decision Basis & Rationale</b>
        {r.rationale.map((x: string) => (
          <p key={x}>• {x}</p>
        ))}
        <small>Overall Confidence Score: {Math.round(r.confidence * 100)}% · Synthesized by Recommendation Agent</small>
      </article>
      <details open>
        <summary>Execution Trace & Audit Log ({w.trace.length} events)</summary>
        {w.trace.map((t: any) => (
          <div className="trace" key={t.id}>
            <time>{new Date(t.timestamp).toLocaleTimeString()}</time>
            <b>{t.agent}</b>
            <span className={`event-${t.event.toLowerCase()}`}>{t.event}</span>
            <p>{t.detail}</p>
          </div>
        ))}
      </details>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
