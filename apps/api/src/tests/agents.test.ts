import { describe, expect, it } from 'vitest';
import { documentAgent, financialAgent, identityAgent, recommendationAgent, riskAgent } from '../agents.js';
import { presetCases } from '../sample.js';

describe('Specialized Agent Contracts & Evaluation Logic', () => {
  const presets = presetCases();
  const cleanCase = presets.find(c => c.id === 'case-clean-approval')!;
  const idMismatchCase = presets.find(c => c.id === 'case-id-mismatch')!;
  const sanctionsCase = presets.find(c => c.id === 'case-sanctions-hit')!;
  const incompleteCase = presets.find(c => c.id === 'case-incomplete-docs')!;

  describe('Document Completeness Agent', () => {
    it('should complete with zero findings for a valid complete document set', async () => {
      const output = await documentAgent.execute(cleanCase);
      expect(output.agent).toBe('Document Completeness Agent');
      expect(output.status).toBe('COMPLETED');
      expect(output.findings).toHaveLength(0);
      expect(output.confidence).toBeGreaterThan(0.9);
    });

    it('should flag missing address proof and unreadable documents', async () => {
      const output = await documentAgent.execute(incompleteCase);
      expect(output.status).toBe('COMPLETED');
      expect(output.findings.length).toBeGreaterThan(0);
      const codes = output.findings.map(f => f.code);
      expect(codes).toContain('ADDRESS_PROOF_MISSING');
      expect(codes).toContain('DOC_UNREADABLE');
    });
  });

  describe('Identity Consistency Agent', () => {
    it('should pass matching identity details', async () => {
      const output = await identityAgent.execute(cleanCase);
      expect(output.status).toBe('COMPLETED');
      expect(output.findings).toHaveLength(0);
    });

    it('should detect name mismatch, DOB mismatch, and expired document', async () => {
      const output = await identityAgent.execute(idMismatchCase);
      expect(output.status).toBe('COMPLETED');
      const codes = output.findings.map(f => f.code);
      expect(codes).toContain('NAME_MISMATCH');
      expect(codes).toContain('DOB_MISMATCH');
      expect(codes).toContain('ID_EXPIRED');
    });
  });

  describe('Financial Profile Agent', () => {
    it('should pass plausible employment and income', async () => {
      const output = await financialAgent.execute(cleanCase);
      expect(output.status).toBe('COMPLETED');
      expect(output.findings).toHaveLength(0);
    });

    it('should flag zero income and missing employer details', async () => {
      const output = await financialAgent.execute(incompleteCase);
      expect(output.status).toBe('COMPLETED');
      const codes = output.findings.map(f => f.code);
      expect(codes).toContain('ZERO_DECLARED_INCOME');
      expect(codes).toContain('EMPLOYMENT_SOURCE_MISSING');
    });
  });

  describe('Risk Indicator Agent', () => {
    it('should pass clean risk profile', async () => {
      const output = await riskAgent.execute(cleanCase);
      expect(output.status).toBe('COMPLETED');
      expect(output.findings).toHaveLength(0);
    });

    it('should detect sanctions hit and PEP indicators', async () => {
      const output = await riskAgent.execute(sanctionsCase);
      expect(output.status).toBe('COMPLETED');
      const codes = output.findings.map(f => f.code);
      expect(codes).toContain('SANCTIONS_HIT');
      expect(codes).toContain('PEP');
      expect(codes).toContain('ADVERSE_MEDIA');
    });
  });

  describe('Recommendation Agent', () => {
    it('should synthesize APPROVE for clean specialist outputs', async () => {
      const outputs = await Promise.all([
        documentAgent.execute(cleanCase),
        identityAgent.execute(cleanCase),
        financialAgent.execute(cleanCase),
        riskAgent.execute(cleanCase)
      ]);
      const rec = await recommendationAgent.execute(outputs);
      expect(rec.recommendation).toBe('APPROVE');
      expect(rec.rationale[0]).toContain('All specialist agents completed with no material findings');
    });

    it('should synthesize REJECT when critical sanctions or expired ID exist', async () => {
      const outputs = await Promise.all([
        documentAgent.execute(sanctionsCase),
        identityAgent.execute(sanctionsCase),
        financialAgent.execute(sanctionsCase),
        riskAgent.execute(sanctionsCase)
      ]);
      const rec = await recommendationAgent.execute(outputs);
      expect(rec.recommendation).toBe('REJECT');
    });

    it('should synthesize REFER_FOR_MANUAL_REVIEW when non-critical warnings exist', async () => {
      const outputs = await Promise.all([
        documentAgent.execute(incompleteCase),
        identityAgent.execute(incompleteCase),
        financialAgent.execute(incompleteCase),
        riskAgent.execute(incompleteCase)
      ]);
      const rec = await recommendationAgent.execute(outputs);
      expect(rec.recommendation).toBe('REFER_FOR_MANUAL_REVIEW');
    });
  });
});
