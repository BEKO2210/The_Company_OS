// ═══════════════════════════════════════════════════════════════
// The Company OS - Anomalie-Detektor
// RUN-005: Automatische Erkennung von Budget-Spikes, Fehler-Mustern,
//         Response-Time-Spikes, unueblichen Zugriffsmustern
// ═══════════════════════════════════════════════════════════════

import type {
  AnomalyReport,
  Anomaly,
  AnomalyType,
  AnomalyAction,
  AnomalyThresholds,
  AnomalySeverity,
  AgentMetrics,
  AccessLog,
} from './types.js';
import {
  DEFAULT_ANOMALY_THRESHOLDS,
} from './types.js';

// ─── Sliding Windows ───

interface WindowEntry {
  timestamp: number;
  value: number;
  metadata?: Record<string, unknown>;
}

const slidingWindows = new Map<string, WindowEntry[]>();

// ─── Utility ───

function now(): Date {
  return new Date();
}

function nowMs(): number {
  return Date.now();
}

function getWindow(key: string, maxAgeMs: number): WindowEntry[] {
  const cutoff = nowMs() - maxAgeMs;
  const entries = slidingWindows.get(key) || [];
  const filtered = entries.filter(e => e.timestamp >= cutoff);
  slidingWindows.set(key, filtered);
  return filtered;
}

function addToWindow(key: string, value: number, metadata?: Record<string, unknown>): void {
  const entries = slidingWindows.get(key) || [];
  entries.push({ timestamp: nowMs(), value, metadata });
  slidingWindows.set(key, entries);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function _stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[index];
}

// ─── Anomaly Detector ───

export class AnomalyDetector {
  private thresholds: AnomalyThresholds;
  private baselineResponseTimes = new Map<string, number[]>();

  constructor(thresholds?: Partial<AnomalyThresholds>) {
    this.thresholds = { ...DEFAULT_ANOMALY_THRESHOLDS, ...thresholds };
  }

  // ─── Configuration ───

  setThresholds(thresholds: Partial<AnomalyThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  getThresholds(): AnomalyThresholds {
    return { ...this.thresholds };
  }

  // ─── Main Analysis ───

  analyze(agentId: string, metrics: AgentMetrics): AnomalyReport {
    const _anomalies: Anomaly[] = [];
    let overallRiskScore = 0;

    // Check response time spike
    const rtAnomaly = this.checkResponseTimeInternal(agentId, metrics.responseTime);
    if (rtAnomaly) {
      _anomalies.push(rtAnomaly);
      overallRiskScore += this.severityToScore(rtAnomaly.severity);
    }

    // Check error rate
    const erAnomaly = this.checkErrorRateInternal(agentId, metrics.errorRate, metrics.consecutiveErrors);
    if (erAnomaly) {
      _anomalies.push(erAnomaly);
      overallRiskScore += this.severityToScore(erAnomaly.severity);
    }

    // Check throughput drop
    const tpAnomaly = this.checkThroughputDropInternal(agentId, metrics.throughput);
    if (tpAnomaly) {
      _anomalies.push(tpAnomaly);
      overallRiskScore += this.severityToScore(tpAnomaly.severity);
    }

    // Check consecutive timeouts
    const toAnomaly = this.checkConsecutiveTimeoutInternal(agentId, metrics.consecutiveTimeouts);
    if (toAnomaly) {
      _anomalies.push(toAnomaly);
      overallRiskScore += this.severityToScore(toAnomaly.severity);
    }

    // Determine recommended action
    const recommendedAction = this.determineAction(overallRiskScore, _anomalies);
    const shouldEscalate = overallRiskScore >= 7;

    return {
      agentId,
      timestamp: now(),
      anomalies: _anomalies,
      overallRiskScore: Math.min(overallRiskScore, 20),
      recommendedAction,
      shouldEscalate,
    };
  }

  // ─── Specific Checks ───

  checkBudgetSpike(agentId: string, amount: number): boolean {
    const windowKey = `budget:${agentId}`;
    const _history = getWindow(windowKey, 3600000); // 1 hour window

    // Add current value
    addToWindow(windowKey, amount);

    if (_history.length < 3) {
      return false; // Not enough data
    }

    const avg = mean(_history.map(e => e.value));
    if (amount > avg * this.thresholds.budgetSpikeMultiplier) {
      return true;
    }

    return false;
  }

  checkErrorPattern(agentId: string, errors: Error[]): boolean {
    const windowKey = `errors:${agentId}`;
    const windowMs = this.thresholds.errorBurstWindowMs;
    const _history = getWindow(windowKey, windowMs);

    // Add current errors
    for (const error of errors) {
      addToWindow(windowKey, 1, { message: error.message, stack: error.stack });
    }

    const totalErrors = _history.length + errors.length;
    return totalErrors >= this.thresholds.errorBurstCount;
  }

  checkResponseTimeSpike(agentId: string, responseTime: number): boolean {
    const windowKey = `rt:${agentId}`;
    const _history = getWindow(windowKey, 300000); // 5 min window

    addToWindow(windowKey, responseTime);

    if (_history.length < 3) return false;

    const baseline = percentile(_history.map(e => e.value), 75);
    return responseTime > baseline * this.thresholds.responseTimeMultiplier &&
           responseTime > this.thresholds.responseTimeBaselineMs;
  }

  checkUnusualAccess(agentId: string, accessPattern: AccessLog[]): boolean {
    const windowKey = `access:${agentId}`;
    const _history = getWindow(windowKey, 3600000); // 1 hour window

    // Add current entries
    for (const log of accessPattern) {
      addToWindow(windowKey, 1, {
        resource: log.resource,
        action: log.action,
        result: log.result,
      });
    }

    if (_history.length < 5) return false;

    // Count failures in recent access
    const failureCount = accessPattern.filter(l => l.result === 'failure').length;
    const failureRate = failureCount / Math.max(accessPattern.length, 1);

    // Count unique resources (high diversity may indicate probing)
    const uniqueResources = new Set(accessPattern.map(l => l.resource)).size;
    const resourceDiversity = uniqueResources / Math.max(accessPattern.length, 1);

    return failureRate > this.thresholds.unusualAccessPatternThreshold ||
           (resourceDiversity > 0.8 && accessPattern.length > 10);
  }

  // ─── Internal Check Implementations ───

  private checkResponseTimeInternal(agentId: string, responseTime: number): Anomaly | null {
    const windowKey = `rt:${agentId}`;
    const _history = getWindow(windowKey, 300000);
    addToWindow(windowKey, responseTime);

    if (_history.length < 3) return null;

    const values = _history.map(e => e.value);
    const p75 = percentile(values, 75);
    const baseline = Math.max(p75, this.thresholds.responseTimeBaselineMs);

    if (responseTime > baseline * this.thresholds.responseTimeMultiplier) {
      return this.createAnomaly(
        'response_time_spike',
        'critical',
        `Response time ${Math.round(responseTime)}ms exceeds ${this.thresholds.responseTimeMultiplier}x baseline (${Math.round(baseline)}ms)`,
        responseTime,
        [0, baseline * this.thresholds.responseTimeMultiplier],
        [`Current: ${responseTime}ms`, `Baseline (p75): ${Math.round(baseline)}ms`, `Multiplier: ${this.thresholds.responseTimeMultiplier}x`]
      );
    }

    if (responseTime > HEALTHY_RESPONSE_TIME_MS * 2) {
      return this.createAnomaly(
        'response_time_spike',
        'medium',
        `Response time ${Math.round(responseTime)}ms is elevated`,
        responseTime,
        [0, HEALTHY_RESPONSE_TIME_MS * 2],
        [`Current: ${responseTime}ms`, `Healthy threshold: ${HEALTHY_RESPONSE_TIME_MS * 2}ms`]
      );
    }

    return null;
  }

  private checkErrorRateInternal(agentId: string, errorRate: number, consecutiveErrors: number): Anomaly | null {
    const windowKey = `err:${agentId}`;
    const _history = getWindow(windowKey, 60000); // 1 min window
    addToWindow(windowKey, errorRate);

    if (consecutiveErrors >= this.thresholds.consecutiveTimeoutThreshold) {
      return this.createAnomaly(
        'consecutive_timeout',
        'critical',
        `${consecutiveErrors} consecutive errors detected`,
        consecutiveErrors,
        [0, this.thresholds.consecutiveTimeoutThreshold],
        [`Consecutive errors: ${consecutiveErrors}`, `Threshold: ${this.thresholds.consecutiveTimeoutThreshold}`]
      );
    }

    if (errorRate >= this.thresholds.errorRateThreshold) {
      const severity: AnomalySeverity = errorRate > 0.5 ? 'critical' : 'high';
      return this.createAnomaly(
        'error_burst',
        severity,
        `Error rate ${(errorRate * 100).toFixed(1)}% exceeds threshold`,
        errorRate,
        [0, this.thresholds.errorRateThreshold],
        [`Current: ${(errorRate * 100).toFixed(1)}%`, `Threshold: ${(this.thresholds.errorRateThreshold * 100).toFixed(1)}%`]
      );
    }

    return null;
  }

  private checkThroughputDropInternal(agentId: string, throughput: number): Anomaly | null {
    const windowKey = `tp:${agentId}`;
    const _history = getWindow(windowKey, 300000); // 5 min window

    if (_history.length >= 3) {
      const avg = mean(_history.map(e => e.value));
      if (avg > 0 && throughput < avg * this.thresholds.throughputDropMultiplier) {
        addToWindow(windowKey, throughput);
        return this.createAnomaly(
          'throughput_drop',
          'high',
          `Throughput ${throughput} dropped below ${(this.thresholds.throughputDropMultiplier * 100).toFixed(0)}% of average (${Math.round(avg)})`,
          throughput,
          [avg * this.thresholds.throughputDropMultiplier, Infinity],
          [`Current: ${throughput}`, `Average: ${Math.round(avg)}`, `Drop threshold: ${(this.thresholds.throughputDropMultiplier * 100).toFixed(0)}%`]
        );
      }
    }

    addToWindow(windowKey, throughput);
    return null;
  }

  private checkConsecutiveTimeoutInternal(agentId: string, consecutiveTimeouts: number): Anomaly | null {
    if (consecutiveTimeouts >= this.thresholds.consecutiveTimeoutThreshold) {
      return this.createAnomaly(
        'consecutive_timeout',
        'critical',
        `${consecutiveTimeouts} consecutive timeouts`,
        consecutiveTimeouts,
        [0, this.thresholds.consecutiveTimeoutThreshold],
        [`Current: ${consecutiveTimeouts}`, `Threshold: ${this.thresholds.consecutiveTimeoutThreshold}`]
      );
    }
    return null;
  }

  // ─── Anomaly Creation ───

  private createAnomaly(
    type: AnomalyType,
    severity: AnomalySeverity,
    description: string,
    detectedValue: number,
    expectedRange: [number, number],
    evidence: string[]
  ): Anomaly {
    return {
      type,
      severity,
      description,
      detectedValue,
      expectedRange,
      evidence,
    };
  }

  private severityToScore(severity: AnomalySeverity): number {
    switch (severity) {
      case 'low': return 1;
      case 'medium': return 3;
      case 'high': return 5;
      case 'critical': return 8;
      default: return 0;
    }
  }

  private determineAction(riskScore: number, _anomalies: Anomaly[]): AnomalyAction {
    if (riskScore >= 15) return 'kill_switch';
    if (riskScore >= 10) return 'quarantine';
    if (riskScore >= 7) return 'workflow_stop';
    if (riskScore >= 5) return 'circuit_breaker';
    if (riskScore >= 2) return 'monitor';
    return 'none';
  }

  // ─── Window Management ───

  clearWindows(agentId?: string): void {
    if (agentId) {
      const prefixes = ['budget:', 'errors:', 'rt:', 'err:', 'tp:', 'access:'];
      for (const prefix of prefixes) {
        slidingWindows.delete(`${prefix}${agentId}`);
      }
    } else {
      slidingWindows.clear();
    }
  }

  // ─── Baseline Management ───

  addBaselineResponseTime(agentId: string, responseTime: number): void {
    const baselines = this.baselineResponseTimes.get(agentId) || [];
    baselines.push(responseTime);
    // Keep last 100 measurements
    if (baselines.length > 100) {
      baselines.shift();
    }
    this.baselineResponseTimes.set(agentId, baselines);
  }

  getBaselineResponseTime(agentId: string): number {
    const baselines = this.baselineResponseTimes.get(agentId) || [];
    if (baselines.length === 0) return this.thresholds.responseTimeBaselineMs;
    return percentile(baselines, 75);
  }
}

// ─── Constants ───

const HEALTHY_RESPONSE_TIME_MS = 1000;

// ─── Singleton Instance ───

let anomalyDetectorInstance: AnomalyDetector | null = null;

export function getAnomalyDetector(thresholds?: Partial<AnomalyThresholds>): AnomalyDetector {
  if (!anomalyDetectorInstance) {
    anomalyDetectorInstance = new AnomalyDetector(thresholds);
  }
  return anomalyDetectorInstance;
}

export function resetAnomalyDetector(): void {
  anomalyDetectorInstance = null;
  slidingWindows.clear();
}

// ═══════════════════════════════════════════════════════════════
// Standalone helpers
// ═══════════════════════════════════════════════════════════════

export function quickAnomalyCheck(agentId: string, metrics: AgentMetrics): AnomalyReport {
  return getAnomalyDetector().analyze(agentId, metrics);
}
