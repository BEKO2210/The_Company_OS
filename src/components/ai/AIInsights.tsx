import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Lightbulb,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
  RefreshCw,
  Zap,
  CheckCircle2,
  Clock,
  DollarSign,
  Users,
  ShieldAlert,
  Workflow,
  TrendingDown,
} from 'lucide-react';
import { getTopRecommendations } from '@/ai';
import type { SmartRecommendation } from '@/ai/types';

interface AIInsightsProps {
  maxItems?: number;
  onNavigate?: (path: string) => void;
}

export function AIInsights({ maxItems = 5, onNavigate }: AIInsightsProps) {
  const [recommendations, setRecommendations] = useState<
    SmartRecommendation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const loadRecommendations = () => {
    setLoading(true);
    setTimeout(() => {
      setRecommendations(getTopRecommendations(maxItems));
      setLoading(false);
    }, 400);
  };

  useEffect(() => {
    loadRecommendations();
  }, [maxItems]);

  // Dismiss a recommendation
  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed((prev) => new Set([...prev, id]));
  };

  // Navigate to action
  const handleAction = (rec: SmartRecommendation) => {
    if (onNavigate) {
      onNavigate(rec.actionPath);
    }
  };

  // Get priority config
  const getPriorityConfig = (priority: SmartRecommendation['priority']) => {
    switch (priority) {
      case 'critical':
        return {
          icon: AlertTriangle,
          iconColor: 'text-red-500',
          bgColor: 'bg-red-500/10 border-red-200',
          badge: 'bg-red-500 text-white',
          label: 'Kritisch',
        };
      case 'high':
        return {
          icon: AlertCircle,
          iconColor: 'text-amber-500',
          bgColor: 'bg-amber-500/10 border-amber-200',
          badge: 'bg-amber-500 text-white',
          label: 'Hoch',
        };
      case 'medium':
        return {
          icon: Info,
          iconColor: 'text-blue-500',
          bgColor: 'bg-blue-500/10 border-blue-200',
          badge: 'bg-blue-500 text-white',
          label: 'Mittel',
        };
      case 'low':
      default:
        return {
          icon: Info,
          iconColor: 'text-muted-foreground',
          bgColor: 'bg-muted/50',
          badge: 'bg-muted text-muted-foreground',
          label: 'Niedrig',
        };
    }
  };

  // Get type icon
  const getTypeIcon = (type: SmartRecommendation['type']) => {
    switch (type) {
      case 'approval':
        return Clock;
      case 'agent':
        return Users;
      case 'budget':
        return DollarSign;
      case 'workflow':
        return Workflow;
      case 'risk':
        return ShieldAlert;
      case 'finance':
        return TrendingDown;
      default:
        return Lightbulb;
    }
  };

  // Filter out dismissed
  const visibleRecs = recommendations.filter((r) => !dismissed.has(r.id));

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-7 w-7" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-primary" />
            KI-Empfehlungen
            {visibleRecs.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5">
                {visibleRecs.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={loadRecommendations}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {visibleRecs.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium">Alles im grünen Bereich</p>
            <p className="text-xs text-muted-foreground mt-1">
              Keine dringenden Empfehlungen
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleRecs.map((rec) => {
              const priority = getPriorityConfig(rec.priority);
              const PriorityIcon = priority.icon;
              const TypeIcon = getTypeIcon(rec.type);

              return (
                <div
                  key={rec.id}
                  onClick={() => handleAction(rec)}
                  className={`group relative rounded-md border p-2.5 cursor-pointer transition-all hover:shadow-sm ${priority.bgColor}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 shrink-0">
                      <PriorityIcon
                        className={`h-4 w-4 ${priority.iconColor}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          className={`text-[10px] h-4 px-1 ${priority.badge}`}
                        >
                          {priority.label}
                        </Badge>
                        <TypeIcon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground capitalize">
                          {rec.type}
                        </span>
                      </div>
                      <p className="text-xs font-medium mt-1 leading-tight">
                        {rec.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                        {rec.description}
                      </p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="text-[10px] text-primary font-medium flex items-center gap-0.5 group-hover:underline">
                          {rec.actionLabel}
                          <ChevronRight className="h-3 w-3" />
                        </span>
                        <button
                          onClick={(e) => handleDismiss(rec.id, e)}
                          className="ml-auto text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                        >
                          Ignorieren
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
