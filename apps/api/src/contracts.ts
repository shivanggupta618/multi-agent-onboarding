import { z } from 'zod';

export const AutonomyMode = z.enum(['HUMAN_APPROVAL_REQUIRED', 'REVIEW_ON_EXCEPTION']);
export type AutonomyMode = z.infer<typeof AutonomyMode>;
export const Recommendation = z.enum(['APPROVE', 'REJECT', 'REFER_FOR_MANUAL_REVIEW']);
export type Recommendation = z.infer<typeof Recommendation>;
export const Severity = z.enum(['INFO', 'WARNING', 'CRITICAL']);

export const CaseSchema = z.object({
  id: z.string().min(1), name: z.string().min(1), createdAt: z.string(),
  customer: z.object({ fullName: z.string().trim().min(1), dateOfBirth: z.string().date(), nationality: z.string().trim().length(3) }),
  identity: z.object({ documentType: z.string().trim().min(1), documentNumber: z.string().trim().min(1), nameOnDocument: z.string().trim().min(1), dateOfBirthOnDocument: z.string().date(), expiryDate: z.string().date() }),
  address: z.object({ line1: z.string().trim().min(1), city: z.string().trim().min(1), country: z.string().trim().length(3), proofProvided: z.boolean() }),
  employment: z.object({ type: z.enum(['EMPLOYED', 'SELF_EMPLOYED', 'COMPANY']), employerOrCompany: z.string().trim().min(1), annualIncome: z.number().finite().min(0) }),
  documents: z.array(z.object({ type: z.string().trim().min(1), provided: z.boolean(), readable: z.boolean() })).min(1),
  risk: z.object({ pep: z.boolean(), sanctionsHit: z.boolean(), highRiskCountry: z.boolean(), adverseMedia: z.boolean() })
});
export type OnboardingCase = z.infer<typeof CaseSchema>;

export const FindingSchema = z.object({ code: z.string(), severity: Severity, message: z.string(), evidence: z.string() });
export type Finding = z.infer<typeof FindingSchema>;
export interface AgentOutput { agent: string; status: 'COMPLETED' | 'FAILED'; findings: Finding[]; summary: string; confidence: number; }
export interface Agent<I> { name: string; role: string; goal: string; execute(input: I): Promise<AgentOutput>; }
export interface RecommendationOutput extends AgentOutput { recommendation: Recommendation; rationale: string[]; }
export interface TraceEvent { id: string; timestamp: string; agent: string; event: 'STARTED' | 'COMPLETED' | 'RETRYING' | 'FAILED' | 'HANDOFF'; detail: string; }
export interface WorkflowResult { case: OnboardingCase; mode: AutonomyMode; status: 'COMPLETED' | 'PENDING_HUMAN_APPROVAL' | 'FAILED'; agentOutputs: AgentOutput[]; recommendation?: RecommendationOutput; trace: TraceEvent[]; }
