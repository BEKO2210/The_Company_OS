// CEO-Agent: top-level LLM orchestrator. Takes a user message, builds a system
// prompt that lists all known agents + tools, and asks Ollama for a structured
// JSON response of the form:
//
//   { "reply": "...kurze Antwort an User...",
//     "tasks": [
//       { "agent_id": "sales-agent", "title": "...", "description": "...",
//         "priority": "high", "tool": "email.send", "input": { ... } }
//     ]
//   }
//
// The orchestrator route then turns each `tasks[]` entry into a queued
// agent_task row, returns the reply + new task IDs to the client.

import { getOllama } from '../adapters/ollamaAdapter.js';
import { agents as allAgents } from '../data/mockData.js';
import { ensureSkillIndex, findRelevantSkills } from './skillIndex.js';
import type { DispatchInput, TaskPriority } from './types.js';

export interface CeoPlan {
  reply: string;
  tasks: DispatchInput[];
  rawModelOutput: string;
}

const PRIORITY_VALUES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

const TOOL_CATALOG = `
Verfuegbare Tools (jedes Tool gehoert zu einer Adapter-Familie):
- email.send        -> { to, subject, body }
- email.list        -> { folder?, limit? }
- linkedin.post     -> { content }
- linkedin.message  -> { profileId, text }
- banking.balance   -> { accountId? }
- accounting.invoice.create -> { customerId, items: [{ description, amountCents }] }
- github.pr.create  -> { repo, title, body, branch }
- hosting.deploy    -> { projectId }
- calendar.event.create -> { title, start, end, attendees? }
- llm.draft         -> { instruction }   // freie Text-Aufgabe an den LLM
`.trim();

function buildAgentsList(): string {
  return allAgents
    .slice(0, 40)
    .map((a) => `- ${a.id} (${a.department}, ${a.role}): ${a.name} — ${(a as { description?: string }).description ?? ''}`)
    .join('\n');
}

function buildSystemPrompt(skillsBlock: string): string {
  return `Du bist der CEO-Agent von The Company OS. Du empfaengst Anweisungen vom Nutzer und delegierst sie an die passenden Agenten.

DEINE AUFGABE:
1. Verstehe was der Nutzer will.
2. Antworte auf Deutsch in 1-3 Saetzen (Feld "reply").
3. Erstelle 0..N konkrete Tasks fuer die zustaendigen Agenten (Feld "tasks").
4. Wenn passende Skills vorhanden sind, referenziere sie im Feld "skills" des Tasks — der Worker laedt die Skill-Anleitung beim Ausfuehren.
5. Wenn kein Task noetig ist (z.B. reine Frage), gib "tasks": [] zurueck.

ANTWORTFORMAT — STRENG JSON, kein Markdown:
{
  "reply": "<kurze Antwort an den Nutzer>",
  "tasks": [
    {
      "agent_id": "<id aus der Agentenliste>",
      "title": "<praegnanter Titel>",
      "description": "<was genau zu tun ist>",
      "priority": "low|medium|high|urgent",
      "tool": "<optional: tool name aus Katalog>",
      "input": { /* optional: tool-input */ },
      "skills": ["<optional: skill-name aus der Skill-Liste>"]
    }
  ]
}

REGELN:
- Niemals Text vor oder nach dem JSON.
- agent_id muss exakt aus der Liste stammen.
- tool nur setzen, wenn passendes Tool im Katalog existiert.
- skills nur setzen, wenn ein Skill aus dem unten gelisteten Auszug klar passt.
- Bei kritischen Aktionen (Geld, Vertraege, oeffentliche Posts) immer priority "high".

AGENTEN:
${buildAgentsList()}

${TOOL_CATALOG}

${skillsBlock}`;
}

export interface CeoContext {
  userMessage: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  sourceUser?: string;
}

export async function runCeo(ctx: CeoContext): Promise<CeoPlan> {
  const ollama = getOllama();

  // Pre-retrieve relevant skills from the local skills library.
  await ensureSkillIndex();
  const relevant = findRelevantSkills(ctx.userMessage, 10);
  const skillsBlock = relevant.length > 0
    ? `RELEVANTE SKILLS (Auszug aus der lokalen Skill-Bibliothek):\n${relevant
        .map((s) => `- ${s.name}: ${s.description.slice(0, 140)}`).join('\n')}`
    : 'RELEVANTE SKILLS: (keine direkt passenden Skills gefunden)';

  const messages = [
    { role: 'system' as const, content: buildSystemPrompt(skillsBlock) },
    ...(ctx.history ?? []),
    { role: 'user' as const, content: ctx.userMessage },
  ];

  const result = await ollama.chat({
    messages,
    temperature: 0.2,
    options: { format: 'json' },
  });

  const raw = result.content ?? '';
  const parsed = parseCeoOutput(raw);
  return {
    reply: parsed.reply,
    tasks: parsed.tasks.map((t) => ({
      ...t,
      source: 'chat' as const,
      sourceUser: ctx.sourceUser,
    })),
    rawModelOutput: raw,
  };
}

interface RawTask {
  agent_id?: string;
  title?: string;
  description?: string;
  priority?: string;
  tool?: string;
  input?: Record<string, unknown>;
  skills?: string[];
}

interface RawPlan {
  reply?: string;
  tasks?: RawTask[];
}

function parseCeoOutput(raw: string): { reply: string; tasks: DispatchInput[] } {
  let json: RawPlan | null = null;
  // Try direct parse, then locate first {...} block.
  try {
    json = JSON.parse(raw) as RawPlan;
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try { json = JSON.parse(m[0]) as RawPlan; } catch { /* noop */ }
    }
  }
  if (!json || typeof json !== 'object') {
    return { reply: raw.trim() || 'Konnte Antwort nicht parsen.', tasks: [] };
  }

  const reply = typeof json.reply === 'string' ? json.reply.trim() : '';
  const rawTasks = Array.isArray(json.tasks) ? json.tasks : [];

  const knownAgentIds = new Set(allAgents.map((a) => a.id));
  const tasks: DispatchInput[] = [];

  for (const t of rawTasks) {
    if (!t || typeof t !== 'object') continue;
    const agentId = String(t.agent_id ?? '').trim();
    const title = String(t.title ?? '').trim();
    if (!agentId || !title) continue;
    if (!knownAgentIds.has(agentId)) continue;
    const priority = PRIORITY_VALUES.includes(t.priority as TaskPriority)
      ? (t.priority as TaskPriority)
      : 'medium';
    const skills = Array.isArray(t.skills)
      ? t.skills.filter((s) => typeof s === 'string' && s.length < 80).slice(0, 5)
      : undefined;
    const baseInput = t.input && typeof t.input === 'object' ? t.input : {};
    tasks.push({
      agentId,
      title: title.slice(0, 200),
      description: String(t.description ?? '').slice(0, 4000),
      priority,
      tool: typeof t.tool === 'string' ? t.tool : undefined,
      input: skills && skills.length > 0 ? { ...baseInput, _skills: skills } : baseInput,
    });
  }

  return {
    reply: reply || (tasks.length ? `${tasks.length} Aufgabe(n) an Agenten verteilt.` : 'OK.'),
    tasks,
  };
}
