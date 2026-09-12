import { randomUUID } from 'node:crypto';
import type { OnboardingCase } from './contracts.js';

export const presetCases = (): OnboardingCase[] => [
  {
    id: 'case-clean-approval',
    name: 'Synthetic case: Jordan Patel (Clean Approval)',
    createdAt: new Date().toISOString(),
    customer: { fullName: 'Jordan Patel', dateOfBirth: '1991-08-14', nationality: 'GBR' },
    identity: { documentType: 'Passport', documentNumber: 'SYN-GB-439102', nameOnDocument: 'Jordan Patel', dateOfBirthOnDocument: '1991-08-14', expiryDate: '2031-04-20' },
    address: { line1: '42 Example Street', city: 'London', country: 'GBR', proofProvided: true },
    employment: { type: 'EMPLOYED', employerOrCompany: 'Northstar Design Ltd', annualIncome: 72000 },
    documents: [
      { type: 'Government photo ID', provided: true, readable: true },
      { type: 'Proof of address', provided: true, readable: true },
      { type: 'Income evidence', provided: true, readable: true }
    ],
    risk: { pep: false, sanctionsHit: false, highRiskCountry: false, adverseMedia: false }
  },
  {
    id: 'case-id-mismatch',
    name: 'Synthetic case: Jane Smith (ID Mismatch & Expired ID)',
    createdAt: new Date().toISOString(),
    customer: { fullName: 'Jane Smith', dateOfBirth: '1985-03-15', nationality: 'USA' },
    identity: { documentType: 'Drivers License', documentNumber: 'SYN-US-991204', nameOnDocument: 'Jane A. Smith', dateOfBirthOnDocument: '1985-03-12', expiryDate: '2020-01-01' },
    address: { line1: '100 Main Street', city: 'New York', country: 'USA', proofProvided: true },
    employment: { type: 'EMPLOYED', employerOrCompany: 'Acme Corp', annualIncome: 95000 },
    documents: [
      { type: 'Government photo ID', provided: true, readable: true },
      { type: 'Proof of address', provided: true, readable: true },
      { type: 'Income evidence', provided: true, readable: true }
    ],
    risk: { pep: false, sanctionsHit: false, highRiskCountry: false, adverseMedia: false }
  },
  {
    id: 'case-sanctions-hit',
    name: 'Synthetic case: Robert Vance (Sanctions & PEP Hit)',
    createdAt: new Date().toISOString(),
    customer: { fullName: 'Robert Vance', dateOfBirth: '1975-11-30', nationality: 'GBR' },
    identity: { documentType: 'Passport', documentNumber: 'SYN-GB-882103', nameOnDocument: 'Robert Vance', dateOfBirthOnDocument: '1975-11-30', expiryDate: '2029-08-15' },
    address: { line1: '12 Financial Plaza', city: 'London', country: 'GBR', proofProvided: true },
    employment: { type: 'COMPANY', employerOrCompany: 'Vance Capital Ltd', annualIncome: 250000 },
    documents: [
      { type: 'Government photo ID', provided: true, readable: true },
      { type: 'Proof of address', provided: true, readable: true },
      { type: 'Income evidence', provided: true, readable: true }
    ],
    risk: { pep: true, sanctionsHit: true, highRiskCountry: false, adverseMedia: true }
  },
  {
    id: 'case-incomplete-docs',
    name: 'Synthetic case: Alice Taylor (Incomplete Docs & Zero Income)',
    createdAt: new Date().toISOString(),
    customer: { fullName: 'Alice Taylor', dateOfBirth: '1998-05-22', nationality: 'CAN' },
    identity: { documentType: 'Passport', documentNumber: 'SYN-CA-112344', nameOnDocument: 'Alice Taylor', dateOfBirthOnDocument: '1998-05-22', expiryDate: '2028-10-10' },
    address: { line1: '78 West Street', city: 'Toronto', country: 'CAN', proofProvided: false },
    employment: { type: 'SELF_EMPLOYED', employerOrCompany: '', annualIncome: 0 },
    documents: [
      { type: 'Government photo ID', provided: true, readable: false },
      { type: 'Proof of address', provided: false, readable: false },
      { type: 'Income evidence', provided: false, readable: false }
    ],
    risk: { pep: false, sanctionsHit: false, highRiskCountry: false, adverseMedia: false }
  }
];

export const sampleCase = (): OnboardingCase => {
  const presets = presetCases();
  const base = presets[0];
  return { ...base, id: randomUUID() };
};
