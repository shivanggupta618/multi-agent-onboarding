import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { AutonomyMode, CaseSchema } from './contracts.js';
import { getCase, getWorkflow, listCases, storeCase, storeWorkflow } from './db.js';
import { reviewCase } from './orchestrator.js';
import { presetCases, sampleCase } from './sample.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_, res) => res.json({ status: 'ok', syntheticDataOnly: true }));
app.get('/api/cases', (_, res) => {
  let cases = listCases();
  if (cases.length === 0) {
    const presets = presetCases();
    for (const c of presets) storeCase(c);
    cases = listCases();
  }
  res.json(cases);
});

app.get('/api/cases/presets', (_, res) => res.json(presetCases()));

app.post('/api/cases/seed', (_, res) => {
  const presets = presetCases();
  for (const c of presets) storeCase(c);
  res.status(200).json({ message: 'Seeded preset synthetic cases', cases: presets });
});

app.post('/api/cases/sample', (_, res) => {
  const c = sampleCase();
  storeCase(c);
  res.status(201).json(c);
});

app.post('/api/cases', (req, res) => {
  const parsed = CaseSchema.safeParse({
    ...req.body,
    id: req.body.id ?? randomUUID(),
    createdAt: req.body.createdAt ?? new Date().toISOString()
  });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  storeCase(parsed.data);
  res.status(201).json(parsed.data);
});

app.post('/api/workflows', async (req, res) => {
  const mode = AutonomyMode.safeParse(req.body.mode);
  const c = getCase(req.body.caseId);
  if (!mode.success || !c) return res.status(400).json({ error: 'A valid caseId and autonomy mode are required.' });
  const result = await reviewCase(c, mode.data);
  const id = randomUUID();
  storeWorkflow(id, result);
  res.status(201).json({ id, ...result });
});

app.get('/api/workflows/:id', (req, res) => {
  const result = getWorkflow(req.params.id);
  if (!result) return res.status(404).json({ error: 'Workflow not found' });
  res.json(result);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
