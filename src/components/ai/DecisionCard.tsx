import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  TrendingUp,
  DollarSign,
  Clock,
  Shield,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  AlertCircle,
} from 'lucide-react';
import type { DecisionSupport } from '@/ai/types';

interface DecisionCardProps {
  decision: DecisionSupport;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onReview?: (id: string) => void;
}

export function DecisionCard({
  decision,
  onAccept,
  onReject,
  onReview,
}: DecisionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [actionTaken, setActionTaken] = useState<string | null>(null);

  const {
    approvalId,
    recommendation,
    confidence,
    reasoning,
    similarDecisions,
    riskFactors,
    budgetImpact,
    urgencyScore,
  } = decision;

  // Recommendation display config
  const recConfig = {
    approve: {
      label: 'Freigeben',
      color: 'bg-green-500/10 text-green-600 border-green-200',
      icon: CheckCircle2,
      iconColor: 'text-green-500',
      badge: 'bg-green-500',
    },
    reject: {
      label: 'Ablehnen',
      color: 'bg-red-500/10 text-red-600 border-red-200',
      icon: XCircle,
      iconColor: 'text-red-500',
      badge: 'bg-red-500',
    },
    review: {
      label: 'Prüfen',
      color: 'bg-amber-500/10 text-amber-600 border-amber-200',
      icon: Eye,
      iconColor: 'text-amber-500',
      badge: 'bg-amber-500',
    },
  };

  const rec = recConfig[recommendation];
  const RecIcon = rec.icon;

  // Urgency color
  const getUrgencyColor = (score: number) => {
    if (score >= 70) return 'text-red-500';
    if (score >= 40) return 'text-amber-500';
    return 'text-green-500';
  };

  const getUrgencyLabel = (score: number) => {
    if (score >= 70) return 'Hoch';
    if (score >= 40) return 'Mittel';
    return 'Niedrig';
  };

  // Handle actions
  const handleAction = (action: 'accept' | 'reject' | 'review') => {
    setActionTaken(action);
    if (action === 'accept' && onAccept) onAccept(approvalId);
    if (action === 'reject' && onReject) onReject(approvalId);
    if (action === 'review' && onReview) onReview(approvalId);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RecIcon className={`h-5 w-5 ${rec.iconColor}`} />
            <CardTitle className="text-sm font-semibold">
              KI-Empfehlung
            </CardTitle>
          </div>
          <Badge className={`${rec.badge} text-white`}>
            {rec.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Confidence & Key Metrics */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex-1">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Konfidenz</span>
              <span>{confidence}%</span>
            </div>
            <Progress value={confidence} className="h-2" />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md bg-muted p-2 text-center">
            <DollarSign className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
            <div className="text-xs font-medium mt-0.5">{budgetImpact}/100</div>
            <div className="text-[10px] text-muted-foreground">Budget</div>
          </div>
          <div className="rounded-md bg-muted p-2 text-center">
            <Clock className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
            <div className={`text-xs font-medium mt-0.5 ${getUrgencyColor(urgencyScore)}`}>
              {getUrgencyLabel(urgencyScore)}
            </div>
            <div className="text-[10px] text-muted-foreground">Dringlichkeit</div>
          </div>
          <div className="rounded-md bg-muted p-2 text-center">
            <Shield className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
            <div className="text-xs font-medium mt-0.5">
              {riskFactors.length}
            </div>
            <div className="text-[10px] text-muted-foreground">Risiken</div>
          </div>
        </div>

        {/* Reasoning */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5 text-primary" />
            Begründung
          </h4>
          <ul className="space-y-1">
            {reasoning.slice(0, expanded ? undefined : 3).map((reason, i) => (
              <li
                key={i}
                className="flex items-start gap-1.5 text-xs text-muted-foreground"
              >
                <AlertCircle className="h-3 w-3 mt-0.5 shrink-0 text-primary/60" />
                {reason}
              </li>
            ))}
          </ul>
          {reasoning.length > 3 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Weniger anzeigen
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  {reasoning.length - 3} weitere Gründe
                </>
              )}
            </button>
          )}
        </div>

        {/* Similar Decisions */}
        {similarDecisions.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-medium flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              Ähnliche Entscheidungen
            </h4>
            <div className="space-y-1">
              {similarDecisions.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-md bg-muted px-2 py-1 text-xs"
                >
                  <span className="truncate flex-1 mr-2">{d.title}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={
                        d.outcome === 'Genehmigt'
                          ? 'text-green-600'
                          : d.outcome === 'Abgelehnt'
                            ? 'text-red-600'
                            : 'text-amber-600'
                      }
                    >
                      {d.outcome}
                    </span>
                    <span className="text-muted-foreground">
                      {d.similarity}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk Factors */}
        {riskFactors.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-medium flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-primary" />
              Risikofaktoren
            </h4>
            <div className="space-y-1">
              {riskFactors.slice(0, 3).map((rf) => (
                <div key={rf.name} className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span>{rf.name}</span>
                    <span
                      className={
                        rf.score >= 70
                          ? 'text-red-500'
                          : rf.score >= 40
                            ? 'text-amber-500'
                            : 'text-green-500'
                      }
                    >
                      {rf.score}/100
                    </span>
                  </div>
                  <Progress
                    value={rf.score}
                    className="h-1.5"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {rf.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!actionTaken ? (
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-green-600 border-green-200 hover:bg-green-50"
              onClick={() => handleAction('accept')}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Empfehlung übernehmen
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction('review')}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => handleAction('reject')}
            >
              <XCircle className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div
            className={`rounded-md p-2 text-center text-xs font-medium ${
              actionTaken === 'accept'
                ? 'bg-green-500/10 text-green-600'
                : actionTaken === 'reject'
                  ? 'bg-red-500/10 text-red-600'
                  : 'bg-amber-500/10 text-amber-600'
            }`}
          >
            {actionTaken === 'accept'
              ? 'Empfehlung übernommen'
              : actionTaken === 'reject'
                ? 'Empfehlung abgelehnt'
                : 'Zur Prüfung markiert'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
