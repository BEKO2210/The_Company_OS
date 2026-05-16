// Maps tool names emitted by the CEO agent → concrete adapter calls.
// Each tool is awaited; the worker uses the return value as task.result.
// Adapters run in MOCK_MODE unless API_KEY is configured.

import {
  EmailAdapter, LinkedInAdapter, BankingAdapter, AccountingAdapter,
  GitHubAdapter, HostingAdapter, CalendarAdapter,
} from '../adapters/index.js';
import { getOllama } from '../adapters/ollamaAdapter.js';

// Lazy singletons so we don't re-init adapters per call.
const adapters = {
  email:      new EmailAdapter(),
  linkedin:   new LinkedInAdapter(),
  banking:    new BankingAdapter(),
  accounting: new AccountingAdapter(),
  github:     new GitHubAdapter(),
  hosting:    new HostingAdapter(),
  calendar:   new CalendarAdapter(),
};

export type ToolName =
  | 'email.send' | 'email.list'
  | 'linkedin.post' | 'linkedin.message'
  | 'banking.balance'
  | 'accounting.invoice.create'
  | 'github.pr.create'
  | 'hosting.deploy'
  | 'calendar.event.create'
  | 'llm.draft';

export const KNOWN_TOOLS: ToolName[] = [
  'email.send', 'email.list',
  'linkedin.post', 'linkedin.message',
  'banking.balance',
  'accounting.invoice.create',
  'github.pr.create',
  'hosting.deploy',
  'calendar.event.create',
  'llm.draft',
];

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}
function asNumber(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export async function dispatchTool(
  tool: string,
  input: Record<string, unknown>,
  ctx: { title: string; description: string },
): Promise<unknown> {
  switch (tool as ToolName) {
    case 'email.send': {
      return adapters.email.sendEmail(
        asString(input.to),
        asString(input.subject, ctx.title),
        asString(input.body, ctx.description),
      );
    }
    case 'email.list': {
      // EmailAdapter exposes a list of inbox emails via a method if available;
      // fall back to whatever is publicly accessible.
      const adapter = adapters.email as unknown as { getInbox?: () => unknown };
      return adapter.getInbox ? adapter.getInbox() : { mock: true, note: 'inbox listing not implemented' };
    }
    case 'linkedin.post': {
      return adapters.linkedin.post(asString(input.content, ctx.description));
    }
    case 'linkedin.message': {
      return adapters.linkedin.sendMessage(
        asString(input.profileId ?? input.to),
        asString(input.text ?? input.content, ctx.description),
      );
    }
    case 'banking.balance': {
      return adapters.banking.getBalance();
    }
    case 'accounting.invoice.create': {
      const items = Array.isArray(input.items) ? input.items as Record<string, unknown>[] : [];
      return adapters.accounting.createInvoice({
        customerName: asString(input.customerName, 'Unknown'),
        customerEmail: asString(input.customerEmail ?? input.email, 'unknown@example.com'),
        items: items.map((it) => ({
          description: asString(it.description, 'Position'),
          quantity: asNumber(it.quantity, 1),
          unitPrice: asNumber(it.amountCents ?? it.unitPrice, 0),
          vatRate: asNumber(it.vatRate, 19),
        })),
        dueDays: asNumber(input.dueDays, 14),
      });
    }
    case 'github.pr.create': {
      return adapters.github.createPullRequest({
        repo: asString(input.repo, 'company-os/main'),
        title: asString(input.title, ctx.title),
        description: asString(input.body ?? input.description, ctx.description),
        branch: asString(input.branch ?? input.head, 'feature-branch'),
        baseBranch: asString(input.base ?? input.baseBranch, 'main'),
      });
    }
    case 'hosting.deploy': {
      return adapters.hosting.deploy(asString(input.projectId, 'main'));
    }
    case 'calendar.event.create': {
      return adapters.calendar.createEvent({
        title: asString(input.title, ctx.title),
        description: asString(input.description, ctx.description),
        startTime: input.start instanceof Date ? input.start : new Date(asString(input.start ?? input.startTime, new Date().toISOString())),
        endTime: input.end instanceof Date ? input.end : new Date(asString(input.end ?? input.endTime, new Date(Date.now() + 3600_000).toISOString())),
        attendees: Array.isArray(input.attendees) ? (input.attendees as string[]).map((email) => ({ email, name: email })) : [],
      });
    }
    case 'llm.draft': {
      const r = await getOllama().chat({
        messages: [
          { role: 'system', content: 'Du bist ein Agent von The Company OS. Liefere konkretes Ergebnis auf Deutsch, kurz und sachlich.' },
          { role: 'user',   content: asString(input.instruction, `${ctx.title}\n${ctx.description}`) },
        ],
        temperature: 0.5,
      });
      return { content: r.content };
    }
    default: {
      // Unknown tool → soft-handle: run as LLM draft so worker still produces output.
      const r = await getOllama().chat({
        messages: [
          { role: 'system', content: 'Du bist ein Agent. Wir haben aktuell kein passendes Tool fuer diese Aufgabe — beschreibe in 2-4 Saetzen wie du sie ausfuehren wuerdest und welche Naechsten Schritte du empfiehlst.' },
          { role: 'user',   content: `Aufgabe: ${ctx.title}\n\n${ctx.description}\n\n(angefordertes Tool war: ${tool})` },
        ],
        temperature: 0.4,
      });
      return { fallback: true, requestedTool: tool, content: r.content };
    }
  }
}
