// ═══════════════════════════════════════════════════════════════
// Decision Support Engine - The Company OS
// AI-powered recommendation engine for approval decisions
// ═══════════════════════════════════════════════════════════════

import type {
  Agent,
  Approval,
  Risk,
  DecisionSupport,
  SimilarDecision,
  RiskFactor,
} from './types';
import { approvals as defaultApprovals, agents as defaultAgents, risks as defaultRisks } from '../data/mockData';

/**
 * Analyze an approval request and generate AI recommendation
 */
export function analyzeApproval(
  approval: Approval,
  allApprovals?: Approval[],
  allAgents?: Agent[],
  allRisks?: Risk[]
): DecisionSupport {
  const approvalsList = allApprovals || defaultApprovals;
  const agentsList = allAgents || defaultAgents;
  const risksList = allRisks || defaultRisks;

  // 1. Analyze risk level
  const riskScore = calculateRiskScore(approval, risksList);

  // 2. Find similar historical decisions
  const similarDecisions = findSimilarDecisions(approval, approvalsList);

  // 3. Calculate budget impact
  const budgetImpact = calculateBudgetImpact(approval);

  // 4. Assess time criticality
  const urgencyScore = calculateUrgency(approval);

  // 5. Evaluate requester trustworthiness
  const trustScore = evaluateRequesterTrust(approval, agentsList);

  // 6. Build risk factors
  const _riskFactors = buildRiskFactors(approval, riskScore, trustScore);

  // 7. Generate recommendation
  const { recommendation, confidence, reasoning } = generateRecommendation(
    approval,
    riskScore,
    trustScore,
    budgetImpact,
    urgencyScore,
    similarDecisions,
    _riskFactors
  );

  return {
    approvalId: approval.id,
    recommendation,
    confidence,
    reasoning,
    similarDecisions,
    riskFactors: _riskFactors,
    budgetImpact,
    urgencyScore,
  };
}

// ─── Scoring Functions ───

function calculateRiskScore(approval: Approval, risks: Risk[]): number {
  let score = 0;

  // Base score from approval risk level
  const riskLevelScores: Record<string, number> = {
    low: 10,
    medium: 30,
    high: 60,
    critical: 90,
  };
  score += riskLevelScores[approval.riskLevel] || 30;

  // Check for related active risks
  const relatedRisks = risks.filter(
    (r) =>
      r.status === 'active' &&
      (approval.description || "".toLowerCase().includes(r.category.toLowerCase()) ||
        approval.title.toLowerCase().includes(r.name.toLowerCase()))
  );
  score += relatedRisks.length * 10;

  // Red line increases risk
  if (approval.redLine) {
    score += 20;
  }

  // Amount-based risk (higher amount = higher risk)
  if (approval.amount) {
    if (approval.amount > 10000) score += 30;
    else if (approval.amount > 5000) score += 20;
    else if (approval.amount > 1000) score += 10;
    else if (approval.amount > 500) score += 5;
  }

  return Math.min(100, score);
}

function findSimilarDecisions(
  approval: Approval,
  allApprovals: Approval[]
): SimilarDecision[] {
  const scored = allApprovals
    .filter((a) => a.id !== approval.id && a.status !== 'pending')
    .map((a) => {
      let similarity = 0;

      // Same type
      if (a.type === approval.type) similarity += 30;

      // Same risk level
      if (a.riskLevel === approval.riskLevel) similarity += 20;

      // Same requester
      if (a.requester === approval.requester) similarity += 15;

      // Similar amount range
      if (a.amount && approval.amount) {
        const ratio = Math.min(a.amount, approval.amount) / Math.max(a.amount, approval.amount);
        similarity += ratio * 20;
      }

      // Same red line status
      if (a.redLine === approval.redLine) similarity += 10;

      // Title similarity (word overlap)
      const titleWords = approval.title.toLowerCase().split(/\s+/);
      const aTitleWords = a.title.toLowerCase().split(/\s+/);
      const commonWords = titleWords.filter((w) => aTitleWords.includes(w));
      similarity += (commonWords.length / Math.max(titleWords.length, 1)) * 5;

      return { approval: a, similarity: Math.round(similarity) };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);

  return scored.map((s) => ({
    id: s.approval.id,
    title: s.approval.title,
    outcome: s.approval.status === 'approved' ? 'Genehmigt' : s.approval.status === 'rejected' ? 'Abgelehnt' : 'Geprüft',
    similarity: s.similarity,
  }));
}

function calculateBudgetImpact(approval: Approval): number {
  if (!approval.amount) return 0;

  // Compare against typical budget thresholds
  const thresholds = [500, 1000, 5000, 10000, 50000];
  let impact = 0;

  for (const threshold of thresholds) {
    if (approval.amount >= threshold) {
      impact += 10;
    }
  }

  // Freelancer costs typically 10-20% of monthly budget
  if (approval.type === 'freelancer') {
    impact += 15;
  }

  // Recurring costs (hosting, licenses) have ongoing impact
  if (approval.type === 'purchase' || approval.type === 'payment') {
    impact += 5;
  }

  return Math.min(100, impact);
}

function calculateUrgency(approval: Approval): number {
  const now = Date.now();
  const createdAt = new Date(approval.createdAt).getTime();
  const ageHours = (now - createdAt) / (1000 * 60 * 60);

  let urgency = 0;

  // Age-based urgency
  if (ageHours > 72) urgency += 40; // Over 3 days
  else if (ageHours > 48) urgency += 30; // Over 2 days
  else if (ageHours > 24) urgency += 20; // Over 1 day
  else if (ageHours > 12) urgency += 10; // Over 12 hours
  else urgency += 5;

  // Type-based urgency
  const typeUrgency: Record<string, number> = {
    payment: 15,
    invoice: 20,
    deployment: 25,
    contract: 10,
    freelancer: 10,
    purchase: 5,
    communication: 10,
    other: 5,
  };
  urgency += typeUrgency[approval.type] || 5;

  // Red line items are typically more urgent
  if (approval.redLine) {
    urgency += 15;
  }

  return Math.min(100, urgency);
}

function evaluateRequesterTrust(
  approval: Approval,
  agents: Agent[]
): number {
  // Find the agent making the request
  const requesterAgent = agents.find(
    (a) =>
      a.name.toLowerCase() === approval.requester.toLowerCase() ||
      a.id.toLowerCase() === approval.requester.toLowerCase()
  );

  if (!requesterAgent) {
    return 50; // Unknown requester - neutral trust
  }

  let trust = 50;

  // Status-based trust
  if (requesterAgent.status === 'active') trust += 20;
  else if (requesterAgent.status === 'quarantine') trust -= 30;
  else if (requesterAgent.status === 'paused') trust -= 10;

  // Autonomy level
  const autonomyTrust: Record<string, number> = {
    full: 15,
    supervised: 10,
    'approval-required': 0,
    'human-only': 5,
  };
  trust += autonomyTrust[requesterAgent.autonomyLevel] || 0;

  // Risk ceiling (lower ceiling = higher trust)
  const riskTrust: Record<string, number> = {
    low: 15,
    medium: 10,
    high: 0,
    critical: -5,
  };
  trust += riskTrust[requesterAgent.riskCeiling] || 0;

  return Math.min(100, Math.max(0, trust));
}

function buildRiskFactors(
  approval: Approval,
  riskScore: number,
  trustScore: number
): RiskFactor[] {
  const factors: RiskFactor[] = [];

  // Risk level factor
  factors.push({
    name: 'Risikostufe',
    score: riskScore,
    description: `Freigabe hat Risikostufe "${approval.riskLevel}" (${riskScore}/100)`,
  });

  // Red line factor
  if (approval.redLine) {
    factors.push({
      name: 'Red-Line Status',
      score: 80,
      description: 'Dies ist eine Red-Line Freigabe mit erhöhter Aufmerksamkeit',
    });
  }

  // Requester trust factor
  factors.push({
    name: 'Anfragervertrauen',
    score: 100 - trustScore,
    description: `Vertrauen in ${approval.requester}: ${trustScore}/100`,
  });

  // Amount factor
  if (approval.amount && approval.amount > 0) {
    const amountScore = Math.min(100, Math.round((approval.amount / 10000) * 100));
    factors.push({
      name: 'Betragsrisiko',
      score: amountScore,
      description: `Betrag von EUR ${approval.amount.toLocaleString()} erfordert Prüfung`,
    });
  }

  // Type-specific factor
  const typeRisk: Record<string, number> = {
    deployment: 75,
    payment: 40,
    invoice: 30,
    contract: 60,
    freelancer: 50,
    purchase: 25,
    communication: 20,
    other: 30,
  };
  factors.push({
    name: 'Typ-Risiko',
    score: typeRisk[approval.type] || 30,
    description: `Freigabetyp "${approval.type}" hat eigenes Risikoprofil`,
  });

  return factors;
}

function generateRecommendation(
  approval: Approval,
  riskScore: number,
  trustScore: number,
  budgetImpact: number,
  urgencyScore: number,
  similarDecisions: SimilarDecision[],
  _riskFactors: RiskFactor[]
): {
  recommendation: 'approve' | 'reject' | 'review';
  confidence: number;
  reasoning: string[];
} {
  const reasoning: string[] = [];

  // Risk-based reasoning
  if (riskScore >= 70) {
    reasoning.push(`Hohes Risiko (${riskScore}/100) - Gründliche Prüfung empfohlen`);
  } else if (riskScore >= 40) {
    reasoning.push(`Mittleres Risiko (${riskScore}/100) - Standardprüfung`);
  } else {
    reasoning.push(`Niedriges Risiko (${riskScore}/100)`);
  }

  // Trust-based reasoning
  if (trustScore >= 70) {
    reasoning.push(`Vertrauenswürdiger Anfrager (${approval.requester}, ${trustScore}/100)`);
  } else if (trustScore >= 40) {
    reasoning.push(`Mittleres Vertrauen in Anfrager (${approval.requester}, ${trustScore}/100)`);
  } else {
    reasoning.push(`Niedriges Vertrauen in Anfrager (${approval.requester}, ${trustScore}/100) - Vorsicht`);
  }

  // Budget impact reasoning
  if (budgetImpact >= 50) {
    reasoning.push(`Hoher Budget-Impact (${budgetImpact}/100) - Finanzprüfung empfohlen`);
  } else if (budgetImpact > 0) {
    reasoning.push(`Budget-Impact: ${budgetImpact}/100`);
  }

  // Urgency reasoning
  if (urgencyScore >= 60) {
    reasoning.push(`Zeitkritisch (${urgencyScore}/100) - Schnelle Entscheidung nötig`);
  }

  // Similar decisions reasoning
  if (similarDecisions.length > 0) {
    const approved = similarDecisions.filter((d) => d.outcome === 'Genehmigt').length;
    const total = similarDecisions.length;
    reasoning.push(`Ähnliche Entscheidungen: ${approved}/${total} wurden genehmigt`);
  }

  // Red line reasoning
  if (approval.redLine) {
    reasoning.push('Red-Line Freigabe - Erfordert besondere Aufmerksamkeit');
  }

  // Calculate recommendation
  let approveScore = 0;
  let rejectScore = 0;
  let reviewScore = 0;

  // Risk score contribution
  if (riskScore < 30) approveScore += 30;
  else if (riskScore < 60) { reviewScore += 20; approveScore += 10; }
  else { reviewScore += 30; rejectScore += 10; }

  // Trust score contribution
  if (trustScore >= 70) approveScore += 20;
  else if (trustScore >= 40) reviewScore += 10;
  else { reviewScore += 20; rejectScore += 10; }

  // Budget impact contribution
  if (budgetImpact < 30) approveScore += 15;
  else if (budgetImpact < 60) reviewScore += 10;
  else reviewScore += 15;

  // Similar decisions contribution
  if (similarDecisions.length > 0) {
    const approvedCount = similarDecisions.filter((d) => d.outcome === 'Genehmigt').length;
    const ratio = approvedCount / similarDecisions.length;
    if (ratio >= 0.7) approveScore += 15;
    else if (ratio >= 0.4) reviewScore += 10;
    else rejectScore += 10;
  }

  // Red line always pushes toward review
  if (approval.redLine) {
    reviewScore += 15;
  }

  // Critical risk level
  if (approval.riskLevel === 'critical') {
    reviewScore += 20;
  }

  // Determine recommendation
  let recommendation: 'approve' | 'reject' | 'review';

  if (rejectScore > approveScore && rejectScore > reviewScore) {
    recommendation = 'reject';
  } else if (approveScore > reviewScore && approveScore > rejectScore) {
    recommendation = 'approve';
  } else {
    recommendation = 'review';
  }

  // If critical risk, always recommend review at minimum
  if (approval.riskLevel === 'critical' && recommendation === 'approve') {
    recommendation = 'review';
    reasoning.push('Kritisches Risiko - Automatische Eskalation zur Prüfung');
  }

  // Calculate confidence
  const maxScore = Math.max(approveScore, rejectScore, reviewScore);
  const totalScore = approveScore + rejectScore + reviewScore;
  const confidence = totalScore > 0
    ? Math.round((maxScore / totalScore) * 100)
    : 50;

  return { recommendation, confidence, reasoning };
}

/**
 * Batch analyze multiple approvals
 */
export function analyzeApprovals(approvals: Approval[]): DecisionSupport[] {
  return approvals
    .filter((a) => a.status === 'pending')
    .map((a) => analyzeApproval(a));
}

/**
 * Get priority-sorted list of pending approvals with recommendations
 */
export function getPrioritizedApprovals(approvals: Approval[]): DecisionSupport[] {
  const analyzed = analyzeApprovals(approvals);

  return analyzed.sort((a, b) => {
    // Sort by: critical urgency first, then by confidence
    const urgencyDiff = b.urgencyScore - a.urgencyScore;
    if (urgencyDiff !== 0) return urgencyDiff;

    // Higher risk first
    const riskA = a.riskFactors.reduce((s, f) => s + f.score, 0) / a.riskFactors.length;
    const riskB = b.riskFactors.reduce((s, f) => s + f.score, 0) / b.riskFactors.length;
    return riskB - riskA;
  });
}
