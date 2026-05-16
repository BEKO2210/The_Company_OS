// Worker handler: loaded by the queue, runs a single agent_task by ID.
// Re-reads task from SQLite (queue payload only carries the ID).

import { getTask, markRunning, markDone, markFailed } from './taskStore.js';
import { dispatchTool } from './toolDispatcher.js';
import { getOllama } from '../adapters/ollamaAdapter.js';
import { agents as allAgents } from '../data/mockData.js';
import { ensureSkillIndex, readSkillFull } from './skillIndex.js';

function loadSkillContext(input: Record<string, unknown> | null | undefined): string {
  const skills = input && Array.isArray((input as { _skills?: unknown })._skills)
    ? (input as { _skills: string[] })._skills
    : [];
  if (skills.length === 0) return '';
  const blocks: string[] = [];
  for (const name of skills.slice(0, 3)) {
    const content = readSkillFull(name, 6000);
    if (content) blocks.push(`# Skill: ${name}\n${content}`);
  }
  return blocks.length > 0
    ? `\n\n=== EINGEBUNDENE SKILLS ===\n${blocks.join('\n\n---\n\n')}`
    : '';
}

export async function runTask(taskId: string): Promise<void> {
  const task = getTask(taskId);
  if (!task) {
    console.warn(`[ORCH] runTask: task ${taskId} not found`);
    return;
  }
  if (task.status === 'done' || task.status === 'cancelled') return;

  markRunning(taskId);
  try {
    await ensureSkillIndex();
    const skillContext = loadSkillContext(task.input as Record<string, unknown> | null);

    let result: unknown;
    if (task.tool) {
      result = await dispatchTool(task.tool, (task.input ?? {}) as Record<string, unknown>, {
        title: task.title,
        description: task.description + skillContext,
      });
    } else {
      // No explicit tool → ask the LLM to act as the assigned agent.
      const agent = task.agentId ? allAgents.find((a) => a.id === task.agentId) : null;
      const persona = agent
        ? `Du bist "${agent.name}" (${agent.role}, Abteilung ${agent.department}). Bearbeite die folgende Aufgabe als waerest du dieser Agent. Liefere ein konkretes Ergebnis (Code, Text, Plan) — keine Zusammenfassung.`
        : 'Du bist ein Agent von The Company OS. Bearbeite die Aufgabe konkret und liefere ein verwertbares Ergebnis.';
      const r = await getOllama().chat({
        messages: [
          { role: 'system', content: persona + skillContext },
          { role: 'user',   content: `${task.title}\n\n${task.description}` },
        ],
        temperature: 0.4,
      });
      result = { content: r.content, agent: agent?.id ?? null, skillsUsed: skillContext ? true : false };
    }
    markDone(taskId, result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[ORCH] Task ${taskId} failed:`, msg);
    markFailed(taskId, msg);
  }
}
