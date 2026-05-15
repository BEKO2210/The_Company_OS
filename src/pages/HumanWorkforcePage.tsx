import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Star, Search, Filter, UserCheck,
  ChevronRight, Briefcase,
  Award, TrendingUp, UserCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { humanExperts } from '@/data/mockData';
import type { HumanExpert } from '@/data/models';

/* ─── helpers ─── */
const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }
});

const typeBadge = (type: HumanExpert['type']) => {
  const map: Record<string, string> = {
    freelancer: 'badge-blue',
    vendor: 'badge-teal',
    expert: 'badge-purple',
    operator: 'badge-yellow',
  };
  return map[type] || 'badge-gray';
};

const statusBadge = (status: HumanExpert['status']) => {
  const map: Record<string, string> = {
    active: 'badge-green',
    onboarding: 'badge-yellow',
    suspended: 'badge-red',
    inactive: 'badge-gray',
  };
  return map[status] || 'badge-gray';
};

const availBadge = (avail: HumanExpert['availability']) => {
  const map: Record<string, string> = {
    available: 'badge-green',
    partial: 'badge-yellow',
    busy: 'badge-orange',
    unavailable: 'badge-red',
  };
  return map[avail] || 'badge-gray';
};

const availLabel = (avail: HumanExpert['availability']) => {
  const map: Record<string, string> = {
    available: 'Sofort',
    partial: 'Teilweise',
    busy: 'Beschaftigt',
    unavailable: 'Nicht verfugbar',
  };
  return map[avail] || avail;
};

const statusLabel = (status: HumanExpert['status']) => {
  const map: Record<string, string> = {
    active: 'Aktiv',
    onboarding: 'Onboarding',
    suspended: 'Suspendiert',
    inactive: 'Inaktiv',
  };
  return map[status] || status;
};

const typeLabel = (type: HumanExpert['type']) => {
  const map: Record<string, string> = {
    freelancer: 'Freelancer',
    vendor: 'Vendor',
    expert: 'Experte',
    operator: 'Operator',
  };
  return map[type] || type;
};

/* ─── Star Rating ─── */
function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const partial = rating - fullStars;
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star
            key={i}
            className={cn(
              'w-3.5 h-3.5',
              i < fullStars ? 'text-status-yellow fill-status-yellow' :
                i === fullStars && partial >= 0.5 ? 'text-status-yellow fill-status-yellow/50' :
                  'text-text-muted'
            )}
          />
        ))}
      </div>
      <span className="text-xs font-mono-data text-text-secondary ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

/* ─── Onboarding Bar ─── */
function OnboardingBar({ progress }: { progress: number }) {
  if (progress >= 100) {
    return <span className="text-[11px] text-status-green font-medium">Abgeschlossen</span>;
  }
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden max-w-[60px]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
          className={cn(
            'h-full rounded-full',
            progress >= 80 ? 'bg-status-green' : progress >= 40 ? 'bg-status-yellow' : 'bg-status-orange'
          )}
        />
      </div>
      <span className="text-[11px] text-text-tertiary">{progress}%</span>
    </div>
  );
}

/* ─── Avatar Placeholder ─── */
function AvatarPlaceholder({ name, type }: { name: string; type: HumanExpert['type'] }) {
  const initial = name.charAt(0).toUpperCase();
  const bgColors: Record<string, string> = {
    freelancer: 'bg-accent-blue/15 text-accent-blue border-accent-blue/30',
    vendor: 'bg-accent-teal/15 text-accent-teal border-accent-teal/30',
    expert: 'bg-accent-purple/15 text-accent-purple border-accent-purple/30',
    operator: 'bg-status-yellow/15 text-status-yellow border-status-yellow/30',
  };
  return (
    <div className={cn(
      'w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0',
      bgColors[type] || 'bg-bg-tertiary text-text-secondary border-border-default'
    )}>
      <span className="text-xs font-semibold">{initial}</span>
    </div>
  );
}

/* ─── Workforce Card (mobile) ─── */
function WorkforceCard({ expert, index }: { expert: HumanExpert; index: number }) {
  return (
    <motion.div
      {...stagger(index)}
      className="data-card lg:hidden"
    >
      <div className="flex items-start gap-3 mb-3">
        <AvatarPlaceholder name={expert.name} type={expert.type} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-semibold text-text-primary truncate">{expert.name}</h3>
            <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0', typeBadge(expert.type))}>
              {typeLabel(expert.type)}
            </span>
          </div>
          <div className="text-xs text-text-secondary">{expert.skills.slice(0, 2).join(', ')}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
        <div>
          <span className="text-text-tertiary text-[11px]">Status: </span>
          <span className={cn('text-[11px] font-medium', statusBadge(expert.status))}>{statusLabel(expert.status)}</span>
        </div>
        <div>
          <span className="text-text-tertiary text-[11px]">Verfugbar: </span>
          <span className="text-text-secondary">{availLabel(expert.availability)}</span>
        </div>
        <div>
          <span className="text-text-tertiary text-[11px]">Satz: </span>
          <span className="font-mono-data text-text-primary">{eur(expert.hourlyRate)}/h</span>
        </div>
        <div>
          <span className="text-text-tertiary text-[11px]">Projekte: </span>
          <span className="text-text-secondary">{expert.completedProjects}/{expert.totalProjects}</span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <StarRating rating={expert.rating} />
        {expert.onboardingProgress < 100 && <OnboardingBar progress={expert.onboardingProgress} />}
      </div>
    </motion.div>
  );
}

/* ─── Vendor Card ─── */
function VendorCard({ expert, index }: { expert: HumanExpert; index: number }) {
  return (
    <motion.div
      {...stagger(index)}
      className="data-card"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-accent-teal/10 border border-accent-teal/20 flex items-center justify-center flex-shrink-0">
          <Briefcase className="w-5 h-5 text-accent-teal" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary truncate">{expert.name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="badge-teal text-[10px] font-medium px-1.5 py-0.5 rounded-full">Vendor</span>
            <span className="badge-green text-[10px] font-medium px-1.5 py-0.5 rounded-full">Aktiv</span>
          </div>
        </div>
      </div>
      <div className="text-xs text-text-secondary mb-2">
        {expert.skills.join(', ')}
      </div>
      <div className="flex items-center justify-between mb-2">
        <StarRating rating={expert.rating} />
        <span className="font-mono-data text-sm text-text-primary">{eur(expert.hourlyRate)}<span className="text-[11px] text-text-tertiary">/Mon</span></span>
      </div>
      <div className="text-[11px] text-text-tertiary">
        {expert.totalProjects} Projekte — {expert.completedProjects} abgeschlossen
      </div>
    </motion.div>
  );
}

/* ─── Main Page ─── */
export default function HumanWorkforcePage() {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [availFilter, setAvailFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  /* Stats */
  const freelancers = humanExperts.filter(e => e.type === 'freelancer');
  const vendors = humanExperts.filter(e => e.type === 'vendor');

  const totalNetwork = humanExperts.length;
  const availableNow = humanExperts.filter(e => e.availability === 'available').length;
  const avgRating = humanExperts.reduce((s, e) => s + e.rating, 0) / humanExperts.length;
  const activeProjects = humanExperts.reduce((s, e) => s + e.completedProjects, 0);

  const inOnboarding = humanExperts.filter(e => e.status === 'onboarding').length;
  const onboardingPending = humanExperts.filter(e => e.onboardingProgress > 0 && e.onboardingProgress < 100).length;

  /* Filter */
  const filtered = useMemo(() => {
    return humanExperts.filter(e => {
      if (typeFilter !== 'all' && e.type !== typeFilter) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (ratingFilter !== 'all') {
        if (ratingFilter === '5' && e.rating < 5) return false;
        if (ratingFilter === '4+' && e.rating < 4) return false;
        if (ratingFilter === '3+' && e.rating < 3) return false;
        if (ratingFilter === 'under3' && e.rating >= 3) return false;
      }
      if (availFilter !== 'all' && e.availability !== availFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return e.name.toLowerCase().includes(q) || e.skills.some(s => s.toLowerCase().includes(q));
      }
      return true;
    });
  }, [typeFilter, statusFilter, ratingFilter, availFilter, search]);

  const vendorList = humanExperts.filter(e => e.type === 'vendor');
  const expertList = humanExperts.filter(e => e.type === 'expert');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-container mx-auto"
    >
      {/* ── Page Header ── */}
      <motion.div {...stagger(0)} className="mb-6">
        <div className="flex items-center gap-2 text-xs text-text-tertiary mb-1">
          <span>Dashboard</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-text-secondary">Human Workforce</span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[2rem] font-bold text-text-primary tracking-tight">HUMAN WORKFORCE</h1>
            <p className="text-sm text-text-secondary mt-0.5">Human Expert Network — Freelancer, Vendors & Experten</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-3 py-2 rounded-button bg-accent-teal text-bg-primary text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed" disabled>
              <UserCheck className="w-4 h-4" />
              Expert Hinzufugen
            </button>
            <button className="flex items-center gap-2 px-3 py-2 rounded-button border border-border-default text-sm text-text-secondary hover:bg-bg-tertiary transition-colors">
              <Users className="w-4 h-4" />
              Network-Report
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div {...stagger(0)} className="data-card">
          <div className="text-[11px] font-semibold tracking-wider text-text-tertiary uppercase mb-2">Freelancer</div>
          <div className="font-mono-data text-2xl font-medium text-text-primary mb-2">{freelancers.length}</div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[11px]">
              <div className="w-1.5 h-1.5 rounded-full bg-status-green" />
              <span className="text-status-green">{freelancers.filter(f => f.status === 'active').length} aktiv</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <div className="w-1.5 h-1.5 rounded-full bg-status-yellow" />
              <span className="text-status-yellow">{freelancers.filter(f => f.status === 'onboarding').length} in Onboarding</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <div className="w-1.5 h-1.5 rounded-full bg-status-red" />
              <span className="text-status-red">{freelancers.filter(f => f.availability === 'unavailable').length} nicht verfugbar</span>
            </div>
          </div>
        </motion.div>

        <motion.div {...stagger(1)} className="data-card">
          <div className="text-[11px] font-semibold tracking-wider text-text-tertiary uppercase mb-2">Vendors</div>
          <div className="font-mono-data text-2xl font-medium text-text-primary mb-2">{vendors.length}</div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[11px]">
              <div className="w-1.5 h-1.5 rounded-full bg-status-green" />
              <span className="text-status-green">{vendors.filter(v => v.status === 'active').length} aktiv</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <div className="w-1.5 h-1.5 rounded-full bg-status-yellow" />
              <span className="text-status-yellow">{vendors.filter(v => v.status === 'onboarding').length} in Evaluation</span>
            </div>
          </div>
        </motion.div>

        <motion.div {...stagger(2)} className="data-card">
          <div className="text-[11px] font-semibold tracking-wider text-text-tertiary uppercase mb-2">Durchschnittsbewertung</div>
          <div className="font-mono-data text-2xl font-medium text-accent-teal mb-2">{avgRating.toFixed(1)} / 5.0</div>
          <div className="flex items-center gap-1 text-[11px] text-status-green mb-2">
            <TrendingUp className="w-3 h-3" />
            +0.2 vs. Q1
          </div>
          <StarRating rating={avgRating} />
        </motion.div>

        <motion.div {...stagger(3)} className="data-card">
          <div className="text-[11px] font-semibold tracking-wider text-text-tertiary uppercase mb-2">Onboarding Queue</div>
          <div className="font-mono-data text-2xl font-medium text-text-primary mb-2">{onboardingPending} / 3</div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[11px]">
              <div className="w-1.5 h-1.5 rounded-full bg-status-yellow" />
              <span className="text-status-yellow">{inOnboarding} in Bearbeitung</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <div className="w-1.5 h-1.5 rounded-full bg-text-muted" />
              <span className="text-text-tertiary">{Math.max(0, 3 - inOnboarding - onboardingPending)} wartend</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Filter Bar ── */}
      <motion.div {...stagger(4)} className="data-card mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-text-secondary mr-1">
            <Filter className="w-4 h-4" />
            <span className="text-xs font-medium">Filter:</span>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-bg-tertiary border border-border-subtle rounded-button px-3 py-1.5 text-xs text-text-primary focus:border-accent-teal focus:outline-none"
          >
            <option value="all">Alle Typen</option>
            <option value="freelancer">Freelancer</option>
            <option value="vendor">Vendor</option>
            <option value="expert">Experte</option>
            <option value="operator">Operator</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-bg-tertiary border border-border-subtle rounded-button px-3 py-1.5 text-xs text-text-primary focus:border-accent-teal focus:outline-none"
          >
            <option value="all">Alle Status</option>
            <option value="active">Aktiv</option>
            <option value="onboarding">Onboarding</option>
            <option value="inactive">Inaktiv</option>
            <option value="suspended">Suspendiert</option>
          </select>

          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="bg-bg-tertiary border border-border-subtle rounded-button px-3 py-1.5 text-xs text-text-primary focus:border-accent-teal focus:outline-none"
          >
            <option value="all">Alle Bewertungen</option>
            <option value="5">5 Sterne</option>
            <option value="4+">4+ Sterne</option>
            <option value="3+">3+ Sterne</option>
            <option value="under3">Unter 3</option>
          </select>

          <select
            value={availFilter}
            onChange={(e) => setAvailFilter(e.target.value)}
            className="bg-bg-tertiary border border-border-subtle rounded-button px-3 py-1.5 text-xs text-text-primary focus:border-accent-teal focus:outline-none"
          >
            <option value="all">Alle Verfugbarkeiten</option>
            <option value="available">Sofort</option>
            <option value="partial">Teilweise</option>
            <option value="busy">Beschaftigt</option>
            <option value="unavailable">Nicht verfugbar</option>
          </select>

          <div className="flex-1 min-w-[160px] ml-auto">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Suchen..."
                className="w-full bg-bg-tertiary border border-border-subtle rounded-button pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-teal focus:outline-none"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Workforce Table (desktop) ── */}
      <motion.div {...stagger(5)} className="data-card mb-6 hidden lg:block">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-accent-teal" />
            <h2 className="text-sm font-semibold text-text-primary tracking-tight">NETZWERK-Ubersicht</h2>
          </div>
          <span className="text-xs text-text-tertiary">{filtered.length} Mitglieder</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-2.5 px-2">Name</th>
                <th className="text-center text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-2.5 px-2">Typ</th>
                <th className="text-left text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-2.5 px-2">Skills</th>
                <th className="text-center text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-2.5 px-2">Status</th>
                <th className="text-center text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-2.5 px-2">Bewertung</th>
                <th className="text-right text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-2.5 px-2">Satz</th>
                <th className="text-center text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-2.5 px-2">Verfugbar</th>
                <th className="text-center text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-2.5 px-2">Projekte</th>
                <th className="text-left text-[11px] font-semibold text-text-tertiary uppercase tracking-wider py-2.5 px-2">Onboarding</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((expert, i) => (
                <motion.tr
                  key={expert.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-border-subtle/50 hover:bg-bg-tertiary/50 transition-colors"
                >
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-2.5">
                      <AvatarPlaceholder name={expert.name} type={expert.type} />
                      <span className="text-xs font-medium text-text-primary">{expert.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', typeBadge(expert.type))}>
                      {typeLabel(expert.type)}
                    </span>
                  </td>
                  <td className="py-2.5 px-2">
                    <div className="flex flex-wrap gap-1">
                      {expert.skills.slice(0, 2).map(s => (
                        <span key={s} className="text-[10px] text-text-secondary bg-bg-tertiary px-1.5 py-0.5 rounded">{s}</span>
                      ))}
                      {expert.skills.length > 2 && (
                        <span className="text-[10px] text-text-muted">+{expert.skills.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', statusBadge(expert.status))}>
                      {statusLabel(expert.status)}
                    </span>
                  </td>
                  <td className="py-2.5 px-2">
                    <StarRating rating={expert.rating} />
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono-data text-xs text-text-primary">{eur(expert.hourlyRate)}/h</td>
                  <td className="py-2.5 px-2 text-center">
                    <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', availBadge(expert.availability))}>
                      {availLabel(expert.availability)}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center text-xs text-text-secondary">
                    {expert.completedProjects}/{expert.totalProjects}
                  </td>
                  <td className="py-2.5 px-2">
                    <OnboardingBar progress={expert.onboardingProgress} />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ── Mobile Cards ── */}
      <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {filtered.map((expert, i) => (
          <WorkforceCard key={expert.id} expert={expert} index={i} />
        ))}
      </div>

      {/* ── Vendor Directory ── */}
      {vendorList.length > 0 && (
        <div className="mb-6">
          <motion.h2 {...stagger(6)} className="text-sm font-semibold text-text-primary tracking-tight mb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-accent-teal" />
            VENDOR DIRECTORY
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {vendorList.map((v, i) => (
              <VendorCard key={v.id} expert={v} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* ── Expert Cards ── */}
      {expertList.length > 0 && (
        <div className="mb-6">
          <motion.h2 {...stagger(7)} className="text-sm font-semibold text-text-primary tracking-tight mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-accent-purple" />
            EXPERTEN
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {expertList.map((expert, i) => (
              <motion.div
                key={expert.id}
                {...stagger(i)}
                className="data-card"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center flex-shrink-0">
                    <Award className="w-5 h-5 text-accent-purple" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-text-primary truncate">{expert.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="badge-purple text-[10px] font-medium px-1.5 py-0.5 rounded-full">Experte</span>
                      <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', statusBadge(expert.status))}>
                        {statusLabel(expert.status)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {expert.skills.map(s => (
                    <span key={s} className="text-[10px] text-accent-purple bg-accent-purple/10 px-1.5 py-0.5 rounded">{s}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between mb-2">
                  <StarRating rating={expert.rating} />
                  <span className="font-mono-data text-sm text-text-primary">{eur(expert.hourlyRate)}<span className="text-[11px] text-text-tertiary">/h</span></span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-text-tertiary">
                  <span>Verfugbar: {availLabel(expert.availability)}</span>
                  <span>{expert.completedProjects} Projekte</span>
                </div>
                {expert.onboardingProgress < 100 && (
                  <div className="mt-2 pt-2 border-t border-border-subtle">
                    <OnboardingBar progress={expert.onboardingProgress} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── Network Stats Footer ── */}
      <motion.div {...stagger(8)} className="data-card">
        <h2 className="text-sm font-semibold text-text-primary tracking-tight mb-4 flex items-center gap-2">
          <UserCircle className="w-4 h-4 text-accent-teal" />
          NETZWERK-Statistiken
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-bg-tertiary/40 rounded-lg">
            <div className="font-mono-data text-xl font-medium text-text-primary mb-1">{totalNetwork}</div>
            <div className="text-[11px] text-text-tertiary uppercase">Gesamt Netzwerk</div>
          </div>
          <div className="text-center p-3 bg-bg-tertiary/40 rounded-lg">
            <div className="font-mono-data text-xl font-medium text-status-green mb-1">{availableNow}</div>
            <div className="text-[11px] text-text-tertiary uppercase">Verfugbar Jetzt</div>
          </div>
          <div className="text-center p-3 bg-bg-tertiary/40 rounded-lg">
            <div className="font-mono-data text-xl font-medium text-accent-teal mb-1">{avgRating.toFixed(1)}</div>
            <div className="text-[11px] text-text-tertiary uppercase">Durchschnitt</div>
          </div>
          <div className="text-center p-3 bg-bg-tertiary/40 rounded-lg">
            <div className="font-mono-data text-xl font-medium text-accent-blue mb-1">{activeProjects}</div>
            <div className="text-[11px] text-text-tertiary uppercase">Abgeschlossene Projekte</div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
