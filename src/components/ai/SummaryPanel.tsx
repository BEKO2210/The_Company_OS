import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  FileText,
  ChevronRight,
  RefreshCw,
  Zap,
  Users,
  ShieldAlert,
  ClipboardList,
} from 'lucide-react';
import { generateDailyReport, generateWeeklySummary } from '@/ai';
import type { DailyReport, WeeklySummary } from '@/ai/types';

interface SummaryPanelProps {
  autoGenerate?: boolean;
}

export function SummaryPanel({ autoGenerate = true }: SummaryPanelProps) {
  const [activeTab, setActiveTab] = useState('daily');
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastGenerated, setLastGenerated] = useState<string>('');

  const generateReports = () => {
    setLoading(true);
    // Simulate brief delay for UX
    setTimeout(() => {
      setDailyReport(generateDailyReport());
      setWeeklyReport(generateWeeklySummary());
      setLastGenerated(new Date().toLocaleTimeString('de-DE'));
      setLoading(false);
    }, 500);
  };

  // Auto-generate on mount
  useEffect(() => {
    if (autoGenerate) {
      generateReports();
    }
  }, [autoGenerate]);

  // Get event icon
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <ShieldAlert className="h-4 w-4 text-amber-500" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return <FileText className="h-4 w-4 text-blue-500" />;
    }
  };

  const getEventBorderColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'border-l-red-500';
      case 'warning':
        return 'border-l-amber-500';
      case 'success':
        return 'border-l-green-500';
      default:
        return 'border-l-blue-500';
    }
  };

  // Trend icon
  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    if (trend === 'up')
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'down')
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-amber-500" />;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-8 w-8" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
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
            KI-Zusammenfassung
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastGenerated && (
              <span className="text-xs text-muted-foreground">
                {lastGenerated}
              </span>
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={generateReports}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="daily" className="text-xs">
              <Calendar className="h-3 w-3 mr-1" />
              Tagesbericht
            </TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Wochenbericht
            </TabsTrigger>
          </TabsList>

          {/* Daily Report */}
          <TabsContent value="daily" className="mt-3 space-y-3">
            {dailyReport && (
              <>
                {/* Headline */}
                <div className="rounded-md bg-primary/5 p-2.5">
                  <p className="text-sm font-medium">
                    {dailyReport.headline}
                  </p>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="rounded-md bg-muted p-2 text-center">
                    <ClipboardList className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
                    <div className="text-sm font-semibold mt-0.5">
                      {dailyReport.openApprovals}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Freigaben
                    </div>
                  </div>
                  <div className="rounded-md bg-muted p-2 text-center">
                    <ShieldAlert className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
                    <div className="text-sm font-semibold mt-0.5">
                      {dailyReport.newRisks}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Risiken
                    </div>
                  </div>
                  <div className="rounded-md bg-muted p-2 text-center">
                    <Users className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
                    <div className="text-sm font-semibold mt-0.5">
                      {dailyReport.agentStatusChanges.length}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Status-Änderungen
                    </div>
                  </div>
                  <div className="rounded-md bg-muted p-2 text-center">
                    <DollarSign className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
                    <div className="flex items-center justify-center gap-0.5 mt-0.5">
                      <span className="text-sm font-semibold">
                        EUR {dailyReport.financeUpdate.liquidity.toLocaleString()}
                      </span>
                      <TrendIcon trend={dailyReport.financeUpdate.trend} />
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Liquidität
                    </div>
                  </div>
                </div>

                {/* Events */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-medium text-muted-foreground">
                    Wichtige Ereignisse
                  </h4>
                  {dailyReport.events.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Keine kritischen Ereignisse
                    </p>
                  ) : (
                    dailyReport.events.slice(0, 5).map((event, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 rounded-md border border-l-4 ${getEventBorderColor(
                          event.type
                        )} bg-muted/30 p-2`}
                      >
                        {getEventIcon(event.type)}
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">
                            {event.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {event.description}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Overdue Items */}
                {dailyReport.overdueItems.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-medium text-red-500 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Überfällige Items ({dailyReport.overdueItems.length})
                    </h4>
                    {dailyReport.overdueItems.slice(0, 3).map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground"
                      >
                        <ChevronRight className="h-3 w-3 text-red-400" />
                        {item}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Weekly Summary */}
          <TabsContent value="weekly" className="mt-3 space-y-3">
            {weeklyReport && (
              <>
                {/* Period */}
                <div className="rounded-md bg-primary/5 p-2.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    {weeklyReport.period}
                  </p>
                  <p className="text-sm font-medium mt-0.5">
                    {weeklyReport.headline}
                  </p>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-md bg-muted p-2 text-center">
                    <CheckCircle2 className="h-3.5 w-3.5 mx-auto text-green-500" />
                    <div className="text-sm font-semibold mt-0.5">
                      {weeklyReport.completedProjects}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Abgeschlossen
                    </div>
                  </div>
                  <div className="rounded-md bg-muted p-2 text-center">
                    <Users className="h-3.5 w-3.5 mx-auto text-blue-500" />
                    <div className="text-sm font-semibold mt-0.5">
                      {weeklyReport.newCustomers}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Neue Kunden
                    </div>
                  </div>
                  <div className="rounded-md bg-muted p-2 text-center">
                    <DollarSign className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
                    <div className="text-sm font-semibold mt-0.5">
                      {weeklyReport.budgetUtilization}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Budget-Nutzung
                    </div>
                  </div>
                </div>

                {/* Risk Development */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-medium text-muted-foreground">
                    Risiko-Entwicklung
                  </h4>
                  <div className="grid grid-cols-4 gap-1.5">
                    <div className="rounded-md bg-red-500/10 p-1.5 text-center">
                      <div className="text-xs font-semibold text-red-600">
                        {weeklyReport.riskDevelopment.newRisks}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Neu
                      </div>
                    </div>
                    <div className="rounded-md bg-green-500/10 p-1.5 text-center">
                      <div className="text-xs font-semibold text-green-600">
                        {weeklyReport.riskDevelopment.mitigatedRisks}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Gemildert
                      </div>
                    </div>
                    <div className="rounded-md bg-amber-500/10 p-1.5 text-center">
                      <div className="text-xs font-semibold text-amber-600">
                        {weeklyReport.riskDevelopment.escalatedRisks}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Eskaliert
                      </div>
                    </div>
                    <div className="rounded-md bg-muted p-1.5 text-center">
                      <div className="text-xs font-semibold">
                        {weeklyReport.riskDevelopment.totalRisks}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Gesamt
                      </div>
                    </div>
                  </div>
                </div>

                {/* Agent Performance */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-medium text-muted-foreground">
                    Agent-Performance (Top {weeklyReport.agentPerformance.length})
                  </h4>
                  {weeklyReport.agentPerformance.slice(0, 5).map((perf, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-md bg-muted/30 p-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{perf.agent}</span>
                        <TrendIcon trend={perf.trend} />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              perf.efficiency >= 90
                                ? 'bg-green-500'
                                : perf.efficiency >= 70
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                            }`}
                            style={{ width: `${perf.efficiency}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">
                          {perf.efficiency}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Upcoming Deadlines */}
                {weeklyReport.upcomingDeadlines.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-medium text-muted-foreground">
                      Anstehende Deadlines
                    </h4>
                    {weeklyReport.upcomingDeadlines.slice(0, 5).map((dl, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-md bg-muted/30 p-1.5"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">
                            {dl.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(dl.date).toLocaleDateString('de-DE')}
                          </p>
                        </div>
                        <Badge
                          variant={
                            dl.priority === 'critical'
                              ? 'destructive'
                              : dl.priority === 'high'
                                ? 'default'
                                : 'secondary'
                          }
                          className="text-[10px] h-5"
                        >
                          {dl.daysLeft < 0
                            ? 'Überfällig'
                            : `${dl.daysLeft}d`}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
