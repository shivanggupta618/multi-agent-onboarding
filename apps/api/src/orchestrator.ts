import { randomUUID } from 'node:crypto';
import { documentAgent, financialAgent, identityAgent, recommendationAgent, riskAgent } from './agents.js';
import type { Agent, AgentOutput, AutonomyMode, OnboardingCase, TraceEvent, WorkflowResult } from './contracts.js';

const event = (trace: TraceEvent[], agent: string, type: TraceEvent['event'], detail: string) => trace.push({ id: randomUUID(), timestamp: new Date().toISOString(), agent, event: type, detail });
async function runAgent(agent: Agent<OnboardingCase>, input: OnboardingCase, trace: TraceEvent[]): Promise<AgentOutput> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    event(trace, agent.name, 'STARTED', `${agent.role}; attempt ${attempt}`);
    try { const result = await agent.execute(input); event(trace, agent.name, 'COMPLETED', result.summary); return result; }
    catch (error) { event(trace, agent.name, attempt === 2 ? 'FAILED' : 'RETRYING', error instanceof Error ? error.message : 'Unknown agent error'); }
  }
  return { agent: agent.name, status: 'FAILED', findings: [{ code: 'AGENT_FAILURE', severity: 'WARNING', message: `${agent.name} could not complete`, evidence: 'Supervisor retry exhausted' }], summary: 'Agent failure isolated; manual review required.', confidence: 0 };
}
export async function reviewCase(caseData: OnboardingCase, mode: AutonomyMode): Promise<WorkflowResult> {
  const trace: TraceEvent[] = []; event(trace, 'Supervisor', 'STARTED', `Workflow started in ${mode} mode`);
  const outputs = await Promise.all([documentAgent, identityAgent, financialAgent, riskAgent].map(a => runAgent(a, caseData, trace)));
  event(trace, 'Supervisor', 'HANDOFF', 'Specialist findings handed to Recommendation Agent');
  const recommendation = await recommendationAgent.execute(outputs);
  event(trace, recommendation.agent, 'COMPLETED', recommendation.summary);
  const hasException = outputs.some(o => o.status === 'FAILED' || o.findings.length > 0);
  const requiresApproval = mode === 'HUMAN_APPROVAL_REQUIRED' || (mode === 'REVIEW_ON_EXCEPTION' && (hasException || recommendation.recommendation !== 'APPROVE'));
  const status = requiresApproval ? 'PENDING_HUMAN_APPROVAL' : 'COMPLETED';
  event(trace, 'Supervisor', 'COMPLETED', requiresApproval ? 'Recommendation queued for human approval; no action executed.' : 'Workflow completed; recommendation remains non-executable.');
  return { case: caseData, mode, status, agentOutputs: outputs, recommendation, trace };
}
