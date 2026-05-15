// ═══════════════════════════════════════════════════════════════
// Predictor Engine - The Company OS
// Predictive analytics: liquidity, break-even, risk escalation, agent overload
// ═══════════════════════════════════════════════════════════════

import type {
  Agent,
  FinanceEntry,
  Risk,
  Prediction,
  BreakEvenPrediction,
  RiskEscalationPrediction,
  OverloadPrediction,
} from './types';

import {
  financeEntries,
  liquidityTrend,
  agents,
  risks,
} from '@/data/mockData';

// ═══════════════════════════════════════════════════════════════
// Linear Regression Helper
// ═══════════════════════════════════════════════════════════════

function linearRegression(
  x: number[],
  y: number[]
): { slope: number; intercept: number; r2: number } {
  const n = x.length;
  if (n === 0) return { slope: 0, intercept: 0, r2: 0 };
  if (n === 1) return { slope: 0, intercept: y[0], r2: 1 };

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((s, xi, i) => s + xi * y[i], 0);
  const sumXX = x.reduce((s, xi) => s + xi * xi, 0);

  const denominator = n * sumXX - sumX * sumX;
  if (Math.abs(denominator) < 1e-10) {
    return { slope: 0, intercept: sumY / n, r2: 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const yMean = sumY / n;
  const ssTotal = y.reduce((s, yi) => s + (yi - yMean) ** 2, 0);
  const ssResidual = y.reduce(
    (s, yi, i) => s + (yi - (slope * x[i] + intercept)) ** 2,
    0
  );
  const r2 = ssTotal > 0 ? 1 - ssResidual / ssTotal : 1;

  return { slope, intercept, r2 };
}

// ═══════════════════════════════════════════════════════════════
// Liquidity Prediction
// ═══════════════════════════════════════════════════════════════

export function predictLiquidity(
  historicalData?: { day: string; value: number }[],
  months?: number
): Prediction {
  const data = historicalData || liquidityTrend;
  const forecastMonths = months || 3;
  const forecastDays = forecastMonths * 30;

  // Prepare data for regression
  const x = data.map((_, i) => i);
  const y = data.map((d) => d.value);

  const { slope, intercept, r2 } = linearRegression(x, y);

  // Generate predictions
  const predictions: number[] = [];
  const confidence: number[] = [];
  const labels: string[] = [];

  // Confidence interval widens over time
  const stdError = Math.sqrt(
    y.reduce((s, yi, i) => s + (yi - (slope * x[i] + intercept)) ** 2, 0) /
      Math.max(1, y.length - 2)
  );

  for (let i = 1; i <= forecastDays; i++) {
    const predictedValue = slope * (x.length - 1 + i) + intercept;
    predictions.push(Math.round(predictedValue));

    // Confidence decreases with time (wider interval)
    const _ciWidth = stdError * (1 + i * 0.05);
    const ciPercent = Math.max(50, 95 - i * 0.3);
    confidence.push(Math.round(ciPercent));

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + i);
    labels.push(
      futureDate.toLocaleDateString('de-DE', {
        month: 'short',
        day: 'numeric',
      })
    );
  }

  // Determine trend
  const recentAvg = y.slice(-5).reduce((s, v) => s + v, 0) / 5;
  const futureAvg =
    predictions.slice(0, 30).reduce((s, v) => s + v, 0) / 30;
  const trend: Prediction['trend'] =
    futureAvg > recentAvg * 1.05 ? 'up' : futureAvg < recentAvg * 0.95 ? 'down' : 'stable';

  const lastValue = y[y.length - 1];
  const avgPrediction = predictions.reduce((s, v) => s + v, 0) / predictions.length;
  const percentChange = lastValue > 0
    ? Math.round(((avgPrediction - lastValue) / lastValue) * 100)
    : 0;

  const trendText =
    trend === 'up'
      ? `Liquidität steigt um ca. ${Math.abs(percentChange)}% (${slope > 0 ? '+' : ''}${Math.round(slope)}/Tag)`
      : trend === 'down'
        ? `Liquidität sinkt um ca. ${Math.abs(percentChange)}% (${Math.round(slope)}/Tag)`
        : 'Liquidität bleibt stabil';

  return {
    values: predictions,
    confidence,
    labels,
    trend,
    summary: `${trendText}. Konfidenz: ${Math.round(r2 * 100)}%`,
  };
}

// ═══════════════════════════════════════════════════════════════
// Break-Even Prediction
// ═══════════════════════════════════════════════════════════════

export function predictBreakEven(
  allFinance?: FinanceEntry[]
): BreakEvenPrediction {
  const finance = allFinance || financeEntries;

  // Calculate burn rate from finance entries
  const totalSpent = finance.reduce((s, f) => s + f.spent, 0);
  const totalBudget = finance.reduce((s, f) => s + f.budget, 0);
  const monthlyBurn = totalSpent; // Assume monthly data
  const dailyBurn = monthlyBurn / 30;

  // Get current liquidity
  const currentLiquidity = totalBudget - totalSpent;

  // Projected revenue (based on invoices and studios)
  const projectedMonthlyRevenue = 15000; // Conservative estimate based on mock data
  const projectedDailyRevenue = projectedMonthlyRevenue / 30;

  // Net daily cash flow
  const netDailyCashFlow = projectedDailyRevenue - dailyBurn;

  // Break-even calculation
  let monthsToBreakEven = 0;
  let predictedDate = new Date();

  if (netDailyCashFlow <= 0) {
    // Currently burning more than earning
    // When will revenue catch up?
    // Assume 10% monthly revenue growth
    let currentRevenue = projectedMonthlyRevenue;
    let accumulatedDeficit = -currentLiquidity;
    let months = 0;
    const maxMonths = 36;

    while (accumulatedDeficit > 0 && months < maxMonths) {
      const monthlyNet = currentRevenue - monthlyBurn;
      accumulatedDeficit -= monthlyNet;
      currentRevenue *= 1.1; // 10% monthly growth
      months++;
    }

    monthsToBreakEven = months;
    predictedDate = new Date();
    predictedDate.setMonth(predictedDate.getMonth() + months);
  } else {
    // Already positive cash flow or close
    const daysToBreakEven = Math.abs(currentLiquidity / netDailyCashFlow);
    monthsToBreakEven = Math.ceil(daysToBreakEven / 30);
    predictedDate = new Date();
    predictedDate.setDate(predictedDate.getDate() + daysToBreakEven);
  }

  // Confidence based on data quality
  const confidence = Math.max(30, Math.min(85, 60 + (finance.length > 5 ? 15 : 0)));

  const summary =
    monthsToBreakEven <= 0
      ? 'Break-Even bereits erreicht oder kurz bevorstehend'
      : monthsToBreakEven <= 3
        ? `Break-Even in ${monthsToBreakEven} Monat(en) - positiver Trend`
        : monthsToBreakEven <= 6
          ? `Break-Even in ${monthsToBreakEven} Monaten - realistisch`
          : `Break-Even in ${monthsToBreakEven} Monaten - längerfristige Perspektive`;

  return {
    predictedDate: predictedDate.toISOString().split('T')[0],
    confidence,
    monthsToBreakEven,
    currentBurnRate: Math.round(dailyBurn),
    projectedRevenue: projectedDailyRevenue * 30,
    summary,
  };
}

// ═══════════════════════════════════════════════════════════════
// Risk Escalation Prediction
// ═══════════════════════════════════════════════════════════════

export function predictRiskEscalation(
  allRisks?: Risk[]
): RiskEscalationPrediction[] {
  const all = allRisks || risks;
  const activeRisks = all.filter((r) => r.status === 'active' || r.status === 'monitoring');
  const predictions: RiskEscalationPrediction[] = [];

  for (const risk of activeRisks) {
    // Calculate escalation probability
    let probability = 0;

    // Base on current score
    if (risk.score >= 14) probability += 40;
    else if (risk.score >= 10) probability += 25;
    else if (risk.score >= 7) probability += 15;
    else probability += 5;

    // Probability factor increases escalation risk
    if (risk.probability >= 4) probability += 20;
    else if (risk.probability >= 3) probability += 10;
    else if (risk.probability >= 2) probability += 5;

    // Severity factor
    if (risk.severity >= 4) probability += 15;
    else if (risk.severity >= 3) probability += 10;

    // Monitoring status means already being watched - lower escalation
    if (risk.status === 'monitoring') {
      probability -= 10;
    }

    // Cap probability
    probability = Math.max(0, Math.min(100, probability));

    // Predicted score (if escalates)
    const predictedScore = Math.min(
      25,
      Math.round(risk.score * (1 + probability / 100))
    );

    if (probability >= 30) {
      const reason = buildRiskReason(risk);
      predictions.push({
        riskId: risk.id,
        riskName: risk.name,
        currentScore: risk.score,
        predictedScore,
        probability,
        reason,
      });
    }
  }

  return predictions.sort((a, b) => b.probability - a.probability);
}

function buildRiskReason(risk: Risk): string {
  const reasons: string[] = [];

  if (risk.probability >= 4) {
    reasons.push(`Hohe Eintrittswahrscheinlichkeit (${risk.probability}/5)`);
  }
  if (risk.severity >= 4) {
    reasons.push(`Hoher Impact (${risk.severity}/5)`);
  }
  if (risk.earlyWarning) {
    reasons.push(`Frühwarnung: ${risk.earlyWarning}`);
  }

  if (reasons.length === 0) {
    reasons.push(`Trend zeigt mögliche Verschlechterung (Score: ${risk.score})`);
  }

  return reasons.join('; ');
}

// ═══════════════════════════════════════════════════════════════
// Agent Overload Prediction
// ═══════════════════════════════════════════════════════════════

export function predictAgentOverload(
  allAgents?: Agent[]
): OverloadPrediction[] {
  const all = allAgents || agents;
  const predictions: OverloadPrediction[] = [];

  for (const agent of all) {
    // Calculate current workload indicators
    let workloadScore = 0;

    // KPI-based workload (more KPIs = more active)
    workloadScore += (agent.kpis?.length || 0) * 10;

    // Budget utilization as proxy for activity
    const budgetUtilization =
      agent.budgetLimit > 0
        ? Math.min(100, (agent.budgetLimit / 50000) * 100)
        : 0;
    workloadScore += budgetUtilization * 0.3;

    // Risk ceiling affects capacity
    const riskCapacity: Record<string, number> = {
      low: 100,
      medium: 80,
      high: 60,
      critical: 40,
    };
    const capacity = riskCapacity[agent.riskCeiling] || 60;

    // Autonomy level affects overhead
    const autonomyOverhead: Record<string, number> = {
      full: 0,
      supervised: 15,
      'approval-required': 30,
      'human-only': 20,
    };
    workloadScore += autonomyOverhead[agent.autonomyLevel] || 15;

    // Status factor
    if (agent.status === 'paused') {
      workloadScore = 0; // Not working
    } else if (agent.status === 'quarantine') {
      workloadScore = 100; // Handling issues
    }

    // Predict overload (workload > capacity)
    const overloadDays = Math.max(
      0,
      Math.ceil((workloadScore - capacity) / 5)
    );
    const confidence = Math.min(95, Math.round(60 + workloadScore * 0.3));

    if (overloadDays > 0 || workloadScore > capacity * 0.8) {
      let recommendation: string;
      if (overloadDays > 7) {
        recommendation = `Sofortige Entlastung empfohlen - Aufgaben verteilen oder zusätzliche Ressourcen bereitstellen`;
      } else if (overloadDays > 3) {
        recommendation = `Entlastung in Planung - Nicht-kritische Aufgaben delegieren`;
      } else {
        recommendation = `Monitor - Workload unter Beobachtung halten`;
      }

      predictions.push({
        agentId: agent.id,
        agentName: agent.name,
        currentTasks: agent.kpis?.length || 0,
        predictedOverloadDays: overloadDays,
        confidence,
        recommendation,
      });
    }
  }

  return predictions.sort(
    (a, b) => b.predictedOverloadDays - a.predictedOverloadDays
  );
}
