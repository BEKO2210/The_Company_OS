import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Minus,
  BarChart3,
  Target,
  AlertTriangle,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from 'lucide-react';
import {
  predictLiquidity,
  predictBreakEven,
  predictRiskEscalation,
  predictAgentOverload,
} from '@/ai';
import type {
  Prediction,
  BreakEvenPrediction,
  RiskEscalationPrediction,
  OverloadPrediction,
} from '@/ai/types';

// ═══════════════════════════════════════════════════════════════
// Simple SVG Chart Component (no external chart lib dependency)
// ═══════════════════════════════════════════════════════════════

function SimpleLineChart({
  prediction,
  title,
}: {
  prediction: Prediction;
  title: string;
}) {
  const { values, confidence, labels, trend } = prediction;
  if (values.length === 0) return null;

  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const width = 500;
  const height = 200;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const minVal = Math.min(...values) * 0.9;
  const maxVal = Math.max(...values) * 1.1;
  const range = maxVal - minVal || 1;

  // Generate path
  const points = values.map((v, i) => {
    const x = padding.left + (i / (values.length - 1)) * chartW;
    const y = padding.top + (1 - (v - minVal) / range) * chartH;
    return { x, y };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Confidence band (simplified)
  const ciOffset = 5 + (1 - confidence[0] / 100) * 15;
  const upperPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y - ciOffset}`)
    .join(' ');
  const lowerPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y + ciOffset}`)
    .join(' ');

  // Trend color
  const trendColor =
    trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#f59e0b';

  // Show every Nth label
  const labelStep = Math.ceil(labels.length / 8);
  const visibleLabels = labels.filter((_, i) => i % labelStep === 0);
  const visiblePoints = points.filter((_, i) => i % labelStep === 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium">{title}</h4>
        <div className="flex items-center gap-1">
          {trend === 'up' ? (
            <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />
          ) : trend === 'down' ? (
            <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
          ) : (
            <Minus className="h-3.5 w-3.5 text-amber-500" />
          )}
          <Badge
            variant="outline"
            className="text-[10px] h-5"
            style={{ borderColor: trendColor, color: trendColor }}
          >
            {trend === 'up' ? 'Steigend' : trend === 'down' ? 'Fallend' : 'Stabil'}
          </Badge>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto border rounded-md bg-muted/20"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Confidence band */}
        <path
          d={`${upperPath} L ${points[points.length - 1].x} ${points[points.length - 1].y + ciOffset} ${lowerPath.split('').reverse().join('')}`}
          fill={`${trendColor}15`}
        />

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={padding.left}
            y1={padding.top + t * chartH}
            x2={width - padding.right}
            y2={padding.top + t * chartH}
            stroke="#e5e7eb"
            strokeWidth="0.5"
            strokeDasharray="2,2"
          />
        ))}

        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const val = Math.round(minVal + (1 - t) * range);
          return (
            <text
              key={t}
              x={padding.left - 5}
              y={padding.top + t * chartH + 3}
              textAnchor="end"
              fontSize="8"
              fill="#9ca3af"
            >
              {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
            </text>
          );
        })}

        {/* Main line */}
        <path d={pathD} fill="none" stroke={trendColor} strokeWidth="2" />

        {/* Data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="2"
            fill={trendColor}
            opacity={i % 7 === 0 ? 1 : 0.3}
          />
        ))}

        {/* X-axis labels */}
        {visiblePoints.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={height - 8}
            textAnchor="middle"
            fontSize="7"
            fill="#9ca3af"
          >
            {visibleLabels[i] || ''}
          </text>
        ))}

        {/* Confidence label */}
        <text
          x={width - padding.right}
          y={padding.top - 5}
          textAnchor="end"
          fontSize="8"
          fill="#9ca3af"
        >
          CI: {confidence[0]}%
        </text>
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Break Even Card
// ═══════════════════════════════════════════════════════════════

function BreakEvenCard({
  prediction,
}: {
  prediction: BreakEvenPrediction;
}) {
  const months = prediction.monthsToBreakEven;
  const isNear = months <= 3;
  const isReachable = months > 0 && months < 36;

  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Target className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-medium">Break-Even Prognose</h4>
        </div>
        <Badge
          variant={isNear ? 'default' : isReachable ? 'secondary' : 'outline'}
          className="text-[10px]"
        >
          {months <= 0 ? 'Erreicht' : `${months} Monate`}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground">{prediction.summary}</p>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md bg-muted p-1.5">
          <div className="text-xs font-semibold">
            EUR {prediction.currentBurnRate.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground">Tägl. Burn</div>
        </div>
        <div className="rounded-md bg-muted p-1.5">
          <div className="text-xs font-semibold">
            EUR {prediction.projectedRevenue.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground">Mon. Revenue</div>
        </div>
        <div className="rounded-md bg-muted p-1.5">
          <div className="text-xs font-semibold">
            {prediction.confidence}%
          </div>
          <div className="text-[10px] text-muted-foreground">Konfidenz</div>
        </div>
      </div>

      {/* Progress bar to break-even */}
      {months > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Jetzt</span>
            <span>Break-Even: {new Date(prediction.predictedDate).toLocaleDateString('de-DE')}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isNear ? 'bg-green-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, (1 / (months + 1)) * 100))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Risk Escalation List
// ═══════════════════════════════════════════════════════════════

function RiskEscalationList({
  predictions,
}: {
  predictions: RiskEscalationPrediction[];
}) {
  if (predictions.length === 0) {
    return (
      <div className="text-center py-4 text-xs text-muted-foreground">
        Keine Risiko-Eskalationen vorhergesagt
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {predictions.slice(0, 5).map((r) => (
        <div
          key={r.riskId}
          className="flex items-center justify-between rounded-md bg-muted/30 p-2"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <AlertTriangle
                className={`h-3.5 w-3.5 shrink-0 ${
                  r.probability >= 70
                    ? 'text-red-500'
                    : r.probability >= 40
                      ? 'text-amber-500'
                      : 'text-yellow-500'
                }`}
              />
              <span className="text-xs font-medium truncate">
                {r.riskName}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {r.reason}
            </p>
          </div>
          <div className="text-right shrink-0 ml-2">
            <Badge
              variant={
                r.probability >= 70
                  ? 'destructive'
                  : r.probability >= 40
                    ? 'default'
                    : 'secondary'
              }
              className="text-[10px] h-5"
            >
              {r.probability}%
            </Badge>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {r.currentScore} → {r.predictedScore}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Agent Overload List
// ═══════════════════════════════════════════════════════════════

function AgentOverloadList({
  predictions,
}: {
  predictions: OverloadPrediction[];
}) {
  if (predictions.length === 0) {
    return (
      <div className="text-center py-4 text-xs text-muted-foreground">
        Keine Überlastung vorhergesagt
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {predictions.slice(0, 5).map((o) => (
        <div
          key={o.agentId}
          className="flex items-center justify-between rounded-md bg-muted/30 p-2"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs font-medium">{o.agentName}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {o.recommendation}
            </p>
          </div>
          <div className="text-right shrink-0 ml-2">
            <Badge
              variant={
                o.predictedOverloadDays > 7
                  ? 'destructive'
                  : o.predictedOverloadDays > 3
                    ? 'default'
                    : 'secondary'
              }
              className="text-[10px] h-5"
            >
              {o.predictedOverloadDays}d
            </Badge>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {o.confidence}% Konfidenz
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main PredictionChart Component
// ═══════════════════════════════════════════════════════════════

export function PredictionChart() {
  const [activeTab, setActiveTab] = useState('liquidity');

  const liquidity = predictLiquidity();
  const breakEven = predictBreakEven();
  const riskEscalations = predictRiskEscalation();
  const agentOverloads = predictAgentOverload();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-primary" />
          Prädiktive Analysen
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 h-8">
            <TabsTrigger value="liquidity" className="text-[10px] px-1">
              <BarChart3 className="h-3 w-3 mr-0.5" />
              Liquidität
            </TabsTrigger>
            <TabsTrigger value="breakeven" className="text-[10px] px-1">
              <Target className="h-3 w-3 mr-0.5" />
              Break-Even
            </TabsTrigger>
            <TabsTrigger value="risks" className="text-[10px] px-1">
              <AlertTriangle className="h-3 w-3 mr-0.5" />
              Risiken
            </TabsTrigger>
            <TabsTrigger value="agents" className="text-[10px] px-1">
              <Users className="h-3 w-3 mr-0.5" />
              Agenten
            </TabsTrigger>
          </TabsList>

          <TabsContent value="liquidity" className="mt-3 space-y-3">
            <SimpleLineChart prediction={liquidity} title="Liquiditätsprognose (90 Tage)" />
            <p className="text-xs text-muted-foreground">{liquidity.summary}</p>
          </TabsContent>

          <TabsContent value="breakeven" className="mt-3">
            <BreakEvenCard prediction={breakEven} />
          </TabsContent>

          <TabsContent value="risks" className="mt-3">
            <RiskEscalationList predictions={riskEscalations} />
          </TabsContent>

          <TabsContent value="agents" className="mt-3">
            <AgentOverloadList predictions={agentOverloads} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
