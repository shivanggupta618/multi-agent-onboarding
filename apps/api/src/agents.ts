import type { Agent, AgentOutput, Finding, OnboardingCase, RecommendationOutput } from './contracts.js';

const finding = (code: string, severity: Finding['severity'], message: string, evidence: string): Finding => ({ code, severity, message, evidence });

export const documentAgent: Agent<OnboardingCase> = {
  name: 'Document Completeness Agent', role: 'Evidence verifier', goal: 'Confirm required synthetic onboarding documents are present and legible.',
  async execute(c) {
    const findings: Finding[] = [];
    const requiredDocuments = ['Government photo ID', 'Proof of address', 'Income evidence'];
    for (const type of requiredDocuments) if (!c.documents.some(d => d.type === type)) findings.push(finding('DOC_REQUIRED_MISSING', 'WARNING', `Required ${type} was not included`, 'Mandatory document checklist'));
    for (const d of c.documents) { if (!d.provided) findings.push(finding('DOC_MISSING', 'WARNING', `${d.type} is missing`, 'Document checklist')); else if (!d.readable) findings.push(finding('DOC_UNREADABLE', 'WARNING', `${d.type} cannot be read`, 'Document checklist')); }
    if (!c.address.proofProvided) findings.push(finding('ADDRESS_PROOF_MISSING', 'WARNING', 'Address proof is missing', 'Address details'));
    return { agent: this.name, status: 'COMPLETED', findings, summary: findings.length ? 'Document gaps require follow-up.' : 'All supplied documents are complete and readable.', confidence: findings.length ? .84 : .96 };
  }
};
export const financialAgent: Agent<OnboardingCase> = {
  name: 'Financial Profile Agent', role: 'Financial plausibility reviewer', goal: 'Identify incomplete or implausible declared income information requiring review.',
  async execute(c) {
    const findings: Finding[] = [];
    if (c.employment.annualIncome === 0) findings.push(finding('ZERO_DECLARED_INCOME', 'WARNING', 'Declared annual income is zero', 'Employment / company information'));
    if (!c.employment.employerOrCompany.trim()) findings.push(finding('EMPLOYMENT_SOURCE_MISSING', 'WARNING', 'Employer or company information is missing', 'Employment / company information'));
    return { agent: this.name, status: 'COMPLETED', findings, summary: findings.length ? 'Financial profile needs manual validation.' : 'Financial profile is complete.', confidence: findings.length ? .86 : .95 };
  }
};
export const identityAgent: Agent<OnboardingCase> = {
  name: 'Identity Consistency Agent', role: 'Identity reconciliation', goal: 'Compare customer declarations with the supplied identity document.',
  async execute(c) {
    const findings: Finding[] = [];
    if (c.customer.fullName.trim().toLowerCase() !== c.identity.nameOnDocument.trim().toLowerCase()) findings.push(finding('NAME_MISMATCH', 'CRITICAL', 'Profile name differs from identity document', `${c.customer.fullName} vs ${c.identity.nameOnDocument}`));
    if (c.customer.dateOfBirth !== c.identity.dateOfBirthOnDocument) findings.push(finding('DOB_MISMATCH', 'CRITICAL', 'Date of birth differs from identity document', `${c.customer.dateOfBirth} vs ${c.identity.dateOfBirthOnDocument}`));
    if (new Date(c.identity.expiryDate) < new Date()) findings.push(finding('ID_EXPIRED', 'CRITICAL', 'Identity document has expired', c.identity.expiryDate));
    return { agent: this.name, status: 'COMPLETED', findings, summary: findings.length ? 'Identity inconsistency found.' : 'Declared identity matches the document.', confidence: findings.length ? .92 : .98 };
  }
};
export const riskAgent: Agent<OnboardingCase> = {
  name: 'Risk Indicator Agent', role: 'Risk screener', goal: 'Assess declared risk indicators against transparent policy rules.',
  async execute(c) {
    const findings: Finding[] = [];
    if (c.risk.sanctionsHit) findings.push(finding('SANCTIONS_HIT', 'CRITICAL', 'Potential sanctions match', 'Synthetic sanctions indicator'));
    if (c.risk.pep) findings.push(finding('PEP', 'WARNING', 'Politically exposed person indicator', 'Risk profile'));
    if (c.risk.highRiskCountry) findings.push(finding('HIGH_RISK_GEO', 'WARNING', 'High-risk country connection', 'Risk profile'));
    if (c.risk.adverseMedia) findings.push(finding('ADVERSE_MEDIA', 'WARNING', 'Adverse media indicator', 'Risk profile'));
    return { agent: this.name, status: 'COMPLETED', findings, summary: findings.length ? 'Risk indicators need enhanced review.' : 'No basic risk indicators detected.', confidence: .9 };
  }
};
export const recommendationAgent = {
  name: 'Recommendation Agent', role: 'Decision synthesizer', goal: 'Produce a non-executable, policy-based recommendation from specialist findings.',
  async execute(outputs: AgentOutput[]): Promise<RecommendationOutput> {
    const all = outputs.flatMap(o => o.findings);
    const critical = all.filter(f => f.severity === 'CRITICAL'); const warnings = all.filter(f => f.severity === 'WARNING');
    const recommendation = critical.some(f => ['SANCTIONS_HIT', 'ID_EXPIRED'].includes(f.code)) ? 'REJECT' as const : critical.length || warnings.length ? 'REFER_FOR_MANUAL_REVIEW' as const : 'APPROVE' as const;
    const rationale = recommendation === 'APPROVE' ? ['All specialist agents completed with no material findings.'] : all.map(f => `${f.severity}: ${f.message}`);
    return { agent: this.name, status: 'COMPLETED', findings: all, summary: `Recommendation: ${recommendation}`, confidence: critical.length ? .94 : warnings.length ? .82 : .97, recommendation, rationale };
  }
};
