// ═══════════════════════════════════════════════════════════════
// AI Module Barrel Export - The Company OS
// ═══════════════════════════════════════════════════════════════

// Types
export * from './types';

// NLQ Engine
export {
  parseQuery,
  processQuery,
  generateAnswer,
  getQueryHistory,
  addToHistory,
  clearHistory,
  getSuggestions,
  EXAMPLE_QUERIES,
} from './nlqEngine';

// Decision Support
export { analyzeApproval, analyzeApprovals, getPrioritizedApprovals } from './decisionSupport';

// Summarizer
export {
  generateDailyReport,
  generateWeeklySummary,
  summarizeAuditLog,
} from './summarizer';

// Predictor
export {
  predictLiquidity,
  predictBreakEven,
  predictRiskEscalation,
  predictAgentOverload,
} from './predictor';

// Recommendations
export { getRecommendations, getTopRecommendations } from './recommendation';
