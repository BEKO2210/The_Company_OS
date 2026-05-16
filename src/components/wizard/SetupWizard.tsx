import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hexagon, ChevronRight, ChevronLeft, Check, Building2, Bot,
  Boxes, Wallet, Shield, Sparkles, X, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type CompanyConfig, DEFAULT_CONFIG, getCompanyConfig, saveCompanyConfig,
} from '@/lib/storage';

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number];

interface Props {
  onComplete: () => void;
}

type StepKey = 'welcome' | 'company' | 'departments' | 'agents' | 'unit' | 'budget' | 'policy' | 'done';

interface StepDef {
  key: StepKey;
  title: string;
  subtitle: string;
  icon: typeof Hexagon;
}

const STEPS: StepDef[] = [
  { key: 'welcome',     title: 'Willkommen',     subtitle: 'Lass uns deine KI-Firma einrichten', icon: Sparkles },
  { key: 'company',     title: 'Firma & Founder', subtitle: 'Wer bist du, wie heisst die Firma?', icon: Hexagon },
  { key: 'departments', title: 'Abteilungen',    subtitle: 'Welche Bereiche brauchst du?',     icon: Building2 },
  { key: 'agents',      title: 'Agenten',        subtitle: 'Erste KI-Agenten anlegen',         icon: Bot },
  { key: 'unit',        title: 'Business Unit',  subtitle: 'Dein erstes Produkt-/Revenue-Modell', icon: Boxes },
  { key: 'budget',      title: 'Budget',         subtitle: 'Monatsbudget und Ziele',           icon: Wallet },
  { key: 'policy',      title: 'Kill-Switch',    subtitle: 'Sicherheits-Standard bestaetigen', icon: Shield },
  { key: 'done',        title: 'Fertig',         subtitle: 'Alles bereit',                     icon: Check },
];

const DEPT_TEMPLATES = [
  'Engineering', 'Marketing', 'Sales', 'Operations', 'Finance', 'Legal', 'QA', 'Support',
];

const AGENT_TEMPLATES: { name: string; role: string; department: string; autonomyLevel: CompanyConfig['agents'][number]['autonomyLevel']; riskCeiling: CompanyConfig['agents'][number]['riskCeiling'] }[] = [
  { name: 'CEO-Agent', role: 'Executive',  department: 'Executive',  autonomyLevel: 'supervised',         riskCeiling: 'high' },
  { name: 'CTO-Agent', role: 'Engineering', department: 'Engineering', autonomyLevel: 'supervised',         riskCeiling: 'medium' },
  { name: 'CFO-Agent', role: 'Finance',    department: 'Finance',    autonomyLevel: 'approval-required',  riskCeiling: 'medium' },
];

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Reusable bits ───────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-text-muted mt-1">{hint}</span>}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'w-full h-10 px-3 rounded-input bg-bg-tertiary border border-border-default text-sm text-text-primary',
        'placeholder:text-text-muted focus:outline-none focus:border-accent-teal/60 transition-colors',
        props.className,
      )}
    />
  );
}

function NumberInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <TextInput type="number" inputMode="numeric" {...props} />;
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'w-full h-10 px-3 rounded-input bg-bg-tertiary border border-border-default text-sm text-text-primary',
        'focus:outline-none focus:border-accent-teal/60 transition-colors',
        props.className,
      )}
    />
  );
}

function PrimaryButton({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={cn(
        'inline-flex items-center justify-center gap-2 h-10 px-5 rounded-button text-sm font-medium',
        'bg-accent-teal text-bg-primary hover:bg-accent-teal/90 transition-colors',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        rest.className,
      )}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={cn(
        'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-button text-sm font-medium',
        'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors',
        rest.className,
      )}
    >
      {children}
    </button>
  );
}

// ─── Step Renderers ──────────────────────────────────────────────────────

function StepWelcome() {
  return (
    <div className="flex flex-col items-center text-center max-w-md mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-accent-teal/10 border border-accent-teal/30 flex items-center justify-center mb-6">
        <Hexagon className="w-8 h-8 text-accent-teal" strokeWidth={2} />
      </div>
      <h2 className="text-2xl font-bold text-text-primary tracking-tight mb-2">The Company OS</h2>
      <p className="text-sm text-text-secondary leading-relaxed">
        Willkommen. In den naechsten Schritten richten wir deine KI-native Firma ein:
        Founder, Abteilungen, Agenten, Business Unit, Budget und Sicherheits-Policy.
        Du kannst jeden Schritt ueberspringen und spaeter ergaenzen.
      </p>
    </div>
  );
}

function StepCompany({ cfg, set }: { cfg: CompanyConfig; set: (next: CompanyConfig) => void }) {
  return (
    <div className="max-w-lg mx-auto w-full space-y-4">
      <Field label="Firmenname">
        <TextInput
          value={cfg.companyName}
          onChange={(e) => set({ ...cfg, companyName: e.target.value })}
          placeholder="z.B. Acme AI GmbH"
          autoFocus
        />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Dein Name">
          <TextInput value={cfg.founderName} onChange={(e) => set({ ...cfg, founderName: e.target.value })} placeholder="Vor- und Nachname" />
        </Field>
        <Field label="Rolle">
          <TextInput value={cfg.founderRole} onChange={(e) => set({ ...cfg, founderRole: e.target.value })} placeholder="CEO" />
        </Field>
      </div>
      <Field label="E-Mail">
        <TextInput type="email" value={cfg.founderEmail} onChange={(e) => set({ ...cfg, founderEmail: e.target.value })} placeholder="founder@firma.com" />
      </Field>
    </div>
  );
}

function StepDepartments({ cfg, set }: { cfg: CompanyConfig; set: (next: CompanyConfig) => void }) {
  const selected = new Set(cfg.departments.map((d) => d.name));
  const toggle = (name: string) => {
    if (selected.has(name)) {
      set({ ...cfg, departments: cfg.departments.filter((d) => d.name !== name) });
    } else {
      set({ ...cfg, departments: [...cfg.departments, { id: uid('dept'), name }] });
    }
  };
  return (
    <div className="max-w-2xl mx-auto w-full">
      <p className="text-xs text-text-tertiary text-center mb-4">Waehle eine oder mehrere Abteilungen. Du kannst spaeter weitere hinzufuegen.</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {DEPT_TEMPLATES.map((name) => {
          const active = selected.has(name);
          return (
            <button
              key={name}
              type="button"
              onClick={() => toggle(name)}
              className={cn(
                'h-16 rounded-card border text-sm font-medium flex items-center justify-center transition-all',
                active
                  ? 'bg-accent-teal/10 border-accent-teal text-accent-teal'
                  : 'bg-bg-tertiary border-border-default text-text-secondary hover:border-border-strong hover:text-text-primary',
              )}
            >
              {name}
            </button>
          );
        })}
      </div>
      <div className="mt-4 text-center text-xs text-text-tertiary">
        {cfg.departments.length} ausgewaehlt
      </div>
    </div>
  );
}

function StepAgents({ cfg, set }: { cfg: CompanyConfig; set: (next: CompanyConfig) => void }) {
  const addTemplate = (tpl: typeof AGENT_TEMPLATES[number]) => {
    set({ ...cfg, agents: [...cfg.agents, { id: uid('agent'), ...tpl }] });
  };
  const removeAgent = (id: string) => set({ ...cfg, agents: cfg.agents.filter((a) => a.id !== id) });

  return (
    <div className="max-w-2xl mx-auto w-full space-y-4">
      <p className="text-xs text-text-tertiary text-center">Empfehlung: starte mit 1-3 Agenten. Vorlagen klicken zum Hinzufuegen.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {AGENT_TEMPLATES.map((tpl) => (
          <button
            key={tpl.name}
            type="button"
            onClick={() => addTemplate(tpl)}
            className="rounded-card border border-border-default bg-bg-tertiary hover:border-accent-teal/60 transition-colors p-3 text-left"
          >
            <div className="flex items-center gap-2 mb-1">
              <Bot className="w-4 h-4 text-accent-teal" />
              <span className="text-sm font-semibold text-text-primary">{tpl.name}</span>
            </div>
            <div className="text-[11px] text-text-tertiary">{tpl.role} - {tpl.autonomyLevel}</div>
          </button>
        ))}
      </div>
      <div className="border-t border-border-subtle pt-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary mb-2">Hinzugefuegt ({cfg.agents.length})</div>
        {cfg.agents.length === 0 ? (
          <div className="text-center text-xs text-text-muted py-6 border border-dashed border-border-subtle rounded-card">Noch keine Agenten</div>
        ) : (
          <div className="space-y-2">
            {cfg.agents.map((a) => (
              <div key={a.id} className="flex items-center gap-3 bg-bg-tertiary border border-border-subtle rounded-card px-3 py-2">
                <Bot className="w-4 h-4 text-accent-teal flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary truncate">{a.name}</div>
                  <div className="text-[11px] text-text-tertiary truncate">{a.role} - {a.department} - risk {a.riskCeiling}</div>
                </div>
                <button
                  type="button"
                  onClick={() => removeAgent(a.id)}
                  className="w-8 h-8 rounded-button flex items-center justify-center text-text-tertiary hover:text-status-red hover:bg-status-red/10 transition-colors"
                  aria-label="Entfernen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StepBusinessUnit({ cfg, set }: { cfg: CompanyConfig; set: (next: CompanyConfig) => void }) {
  const bu = cfg.businessUnit ?? { id: uid('bu'), name: '', revenueModel: 'subscription', phase: 0 };
  const update = (next: typeof bu) => set({ ...cfg, businessUnit: next });
  return (
    <div className="max-w-lg mx-auto w-full space-y-4">
      <Field label="Name">
        <TextInput value={bu.name} onChange={(e) => update({ ...bu, name: e.target.value })} placeholder="z.B. Studio Aurora" autoFocus />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Revenue-Modell">
          <Select value={bu.revenueModel} onChange={(e) => update({ ...bu, revenueModel: e.target.value })}>
            <option value="subscription">Subscription</option>
            <option value="one-time">One-time</option>
            <option value="usage">Usage-based</option>
            <option value="service">Service</option>
            <option value="marketplace">Marketplace</option>
          </Select>
        </Field>
        <Field label="Phase">
          <Select value={String(bu.phase)} onChange={(e) => update({ ...bu, phase: Number(e.target.value) })}>
            <option value="0">0 - Idee</option>
            <option value="1">1 - Discovery</option>
            <option value="2">2 - MVP</option>
            <option value="3">3 - Validation</option>
            <option value="4">4 - Scale</option>
          </Select>
        </Field>
      </div>
      <p className="text-[11px] text-text-muted text-center">
        Du kannst diesen Schritt ueberspringen und spaeter eine Business Unit anlegen.
      </p>
    </div>
  );
}

function StepBudget({ cfg, set }: { cfg: CompanyConfig; set: (next: CompanyConfig) => void }) {
  const b = cfg.budget;
  return (
    <div className="max-w-lg mx-auto w-full space-y-4">
      <Field label="Monatsbudget (EUR)" hint="Gesamtes Operations-Budget pro Monat">
        <NumberInput value={b.monthly || ''} onChange={(e) => set({ ...cfg, budget: { ...b, monthly: Number(e.target.value || 0) } })} placeholder="z.B. 12000" min={0} />
      </Field>
      <Field label="Liquiditaets-Ziel (EUR)" hint="Mindest-Cash, der gehalten werden soll">
        <NumberInput value={b.liquidityTarget || ''} onChange={(e) => set({ ...cfg, budget: { ...b, liquidityTarget: Number(e.target.value || 0) } })} placeholder="z.B. 20000" min={0} />
      </Field>
      <Field label="Break-Even (EUR / Monat)" hint="MRR-Ziel zum Break-Even">
        <NumberInput value={b.breakEvenTarget || ''} onChange={(e) => set({ ...cfg, budget: { ...b, breakEvenTarget: Number(e.target.value || 0) } })} placeholder="z.B. 8000" min={0} />
      </Field>
    </div>
  );
}

function StepPolicy({ cfg, set }: { cfg: CompanyConfig; set: (next: CompanyConfig) => void }) {
  return (
    <div className="max-w-lg mx-auto w-full">
      <div className="data-card">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-card bg-status-red/10 border border-status-red/30 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-status-red" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-text-primary mb-1">Kill-Switch Status</h3>
            <p className="text-xs text-text-secondary leading-relaxed mb-4">
              Der Kill-Switch ist die letzte Sicherheitsebene. Im armed-Zustand koennen Agenten innerhalb ihrer Policy autonom handeln.
              Bei einem Trigger werden alle Agenten sofort pausiert.
            </p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={cfg.killSwitchArmed}
                onChange={(e) => set({ ...cfg, killSwitchArmed: e.target.checked })}
                className="w-4 h-4 rounded border-border-default bg-bg-tertiary accent-accent-teal"
              />
              <span className="text-sm text-text-primary">Kill-Switch armed (empfohlen)</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepDone({ cfg }: { cfg: CompanyConfig }) {
  const summary = [
    { label: 'Firma',         value: cfg.companyName || '(leer)' },
    { label: 'Founder',       value: cfg.founderName ? `${cfg.founderName} - ${cfg.founderRole}` : '(leer)' },
    { label: 'Abteilungen',   value: cfg.departments.length ? cfg.departments.map((d) => d.name).join(', ') : '(keine)' },
    { label: 'Agenten',       value: cfg.agents.length ? `${cfg.agents.length} angelegt` : '(keine)' },
    { label: 'Business Unit', value: cfg.businessUnit?.name || '(keine)' },
    { label: 'Monatsbudget',  value: cfg.budget.monthly ? `${cfg.budget.monthly.toLocaleString('de-DE')} EUR` : '(nicht gesetzt)' },
    { label: 'Kill-Switch',   value: cfg.killSwitchArmed ? 'armed' : 'disabled' },
  ];
  return (
    <div className="max-w-lg mx-auto w-full">
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-14 h-14 rounded-full bg-status-green/10 border border-status-green/30 flex items-center justify-center mb-3">
          <Check className="w-7 h-7 text-status-green" strokeWidth={2.5} />
        </div>
        <h2 className="text-lg font-semibold text-text-primary tracking-tight">Konfiguration bereit</h2>
      </div>
      <div className="data-card divide-y divide-border-subtle">
        {summary.map((s) => (
          <div key={s.label} className="flex items-start justify-between gap-4 py-2 first:pt-0 last:pb-0">
            <span className="text-xs text-text-tertiary">{s.label}</span>
            <span className="text-xs text-text-primary text-right max-w-[260px] truncate">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Container ───────────────────────────────────────────────────────────

export default function SetupWizard({ onComplete }: Props) {
  const [idx, setIdx] = useState(0);
  const [cfg, setCfg] = useState<CompanyConfig>(() => {
    const existing = getCompanyConfig();
    return existing.companyName ? existing : { ...DEFAULT_CONFIG };
  });

  const current = STEPS[idx];
  const isLast = idx === STEPS.length - 1;
  const canBack = idx > 0;

  // Validation per step (only Welcome and Done have no requirement).
  const canForward = useMemo(() => {
    switch (current.key) {
      case 'company': return cfg.companyName.trim().length > 0;
      default: return true;
    }
  }, [current.key, cfg]);

  const finish = () => {
    saveCompanyConfig(cfg);
    onComplete();
  };

  const skipAll = () => {
    saveCompanyConfig({ ...cfg, createdAt: new Date().toISOString() });
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-bg-primary flex flex-col">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-border-subtle flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-teal/15 flex items-center justify-center">
            <Hexagon className="w-5 h-5 text-accent-teal" strokeWidth={2} />
          </div>
          <div>
            <div className="text-sm font-semibold text-text-primary leading-none">The Company OS</div>
            <div className="text-[10px] font-medium text-accent-teal tracking-widest uppercase">Setup</div>
          </div>
        </div>
        <button
          onClick={skipAll}
          className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-primary transition-colors"
          aria-label="Setup ueberspringen"
        >
          Spaeter <X className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* Progress */}
      <div className="px-6 pt-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
              Schritt {idx + 1} / {STEPS.length}
            </div>
            <div className="text-[11px] text-text-tertiary">{current.title}</div>
          </div>
          <div className="h-1 bg-bg-tertiary rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${((idx + 1) / STEPS.length) * 100}%` }}
              transition={{ duration: 0.4, ease: easeOut }}
              className="h-full bg-accent-teal rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-10">
        <div className="max-w-3xl mx-auto h-full flex flex-col">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-card bg-bg-tertiary border border-border-subtle mb-3">
              <current.icon className="w-5 h-5 text-accent-teal" />
            </div>
            <h1 className="text-xl font-semibold text-text-primary tracking-tight">{current.title}</h1>
            <p className="text-xs text-text-tertiary mt-1">{current.subtitle}</p>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={current.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: easeOut }}
              className="flex-1"
            >
              {current.key === 'welcome'     && <StepWelcome />}
              {current.key === 'company'     && <StepCompany cfg={cfg} set={setCfg} />}
              {current.key === 'departments' && <StepDepartments cfg={cfg} set={setCfg} />}
              {current.key === 'agents'      && <StepAgents cfg={cfg} set={setCfg} />}
              {current.key === 'unit'        && <StepBusinessUnit cfg={cfg} set={setCfg} />}
              {current.key === 'budget'      && <StepBudget cfg={cfg} set={setCfg} />}
              {current.key === 'policy'      && <StepPolicy cfg={cfg} set={setCfg} />}
              {current.key === 'done'        && <StepDone cfg={cfg} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <footer className="h-20 flex items-center justify-between px-6 border-t border-border-subtle flex-shrink-0">
        <GhostButton onClick={() => canBack && setIdx(idx - 1)} disabled={!canBack}>
          <ChevronLeft className="w-4 h-4" /> Zurueck
        </GhostButton>
        <div className="flex items-center gap-2">
          {!isLast && (
            <GhostButton onClick={() => setIdx(idx + 1)}>
              Ueberspringen
            </GhostButton>
          )}
          {isLast ? (
            <PrimaryButton onClick={finish}>
              <Check className="w-4 h-4" /> Zum Dashboard
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={() => setIdx(idx + 1)} disabled={!canForward}>
              Weiter <ChevronRight className="w-4 h-4" />
            </PrimaryButton>
          )}
        </div>
      </footer>
    </div>
  );
}
