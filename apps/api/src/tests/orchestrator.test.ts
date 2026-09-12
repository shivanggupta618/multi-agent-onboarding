import { describe, expect, it } from 'vitest';
import { reviewCase } from '../orchestrator.js';
import { presetCases } from '../sample.js';

describe('Supervisor Orchestrator Workflow', () => {
  const presets = presetCases();
  const cleanCase = presets.find(c => c.id === 'case-clean-approval')!;
  const sanctionsCase = presets.find(c => c.id === 'case-sanctions-hit')!;

  describe('Autonomy Modes', () => {
    it('should queue PENDING_HUMAN_APPROVAL under HUMAN_APPROVAL_REQUIRED mode even for clean cases', async () => {
      const result = await reviewCase(cleanCase, 'HUMAN_APPROVAL_REQUIRED');
      expect(result.mode).toBe('HUMAN_APPROVAL_REQUIRED');
      expect(result.status).toBe('PENDING_HUMAN_APPROVAL');
      expect(result.recommendation?.recommendation).toBe('APPROVE');
      expect(result.trace.length).toBeGreaterThan(0);
    });

    it('should auto-complete status COMPLETED under REVIEW_ON_EXCEPTION mode for clean cases', async () => {
      const result = await reviewCase(cleanCase, 'REVIEW_ON_EXCEPTION');
      expect(result.mode).toBe('REVIEW_ON_EXCEPTION');
      expect(result.status).toBe('COMPLETED');
      expect(result.recommendation?.recommendation).toBe('APPROVE');
    });

    it('should set PENDING_HUMAN_APPROVAL under REVIEW_ON_EXCEPTION mode when findings exist', async () => {
      const result = await reviewCase(sanctionsCase, 'REVIEW_ON_EXCEPTION');
      expect(result.mode).toBe('REVIEW_ON_EXCEPTION');
      expect(result.status).toBe('PENDING_HUMAN_APPROVAL');
      expect(result.recommendation?.recommendation).toBe('REJECT');
    });
  });

  describe('Execution Trace & Auditability', () => {
    it('should log audit trace events for workflow start, specialist execution, handoff, and synthesis', async () => {
      const result = await reviewCase(cleanCase, 'HUMAN_APPROVAL_REQUIRED');
      const events = result.trace.map(t => t.event);
      expect(events).toContain('STARTED');
      expect(events).toContain('COMPLETED');
      expect(events).toContain('HANDOFF');

      const agentsInTrace = new Set(result.trace.map(t => t.agent));
      expect(agentsInTrace).toContain('Supervisor');
      expect(agentsInTrace).toContain('Document Completeness Agent');
      expect(agentsInTrace).toContain('Identity Consistency Agent');
      expect(agentsInTrace).toContain('Financial Profile Agent');
      expect(agentsInTrace).toContain('Risk Indicator Agent');
      expect(agentsInTrace).toContain('Recommendation Agent');
    });
  });
});
