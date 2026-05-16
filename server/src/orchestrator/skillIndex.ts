// Skill index: scans the user's local skills library (Markdown files with
// YAML frontmatter), caches name/description/tags/category in memory, and
// offers cheap keyword retrieval for the CEO orchestrator.
//
// The skills are NOT loaded into the CEO prompt in full — there are ~2000.
// We pre-filter by simple token overlap and only attach top-N (name+desc).
// Workers can then lazily load the full SKILL.md when a task references it.

import fs from 'fs';
import path from 'path';

export interface SkillEntry {
  name: string;
  description: string;
  category?: string;
  domain?: string;
  tags: string[];
  file: string; // absolute path to SKILL.md
}

// Default: in-repo ./skills (populated by `npx tsx scripts/importSkills.ts`).
// Override with SKILLS_DIR to point at an external library.
function defaultSkillsDir(): string {
  if (process.env.SKILLS_DIR) return process.env.SKILLS_DIR;
  // server runs with cwd=<repo>/server or <repo>
  const cwd = process.cwd();
  const inRepo = path.resolve(cwd, '..', 'skills');
  if (fs.existsSync(inRepo)) return inRepo;
  const inRoot = path.resolve(cwd, 'skills');
  if (fs.existsSync(inRoot)) return inRoot;
  return inRepo;
}
const DEFAULT_SKILLS_DIR = defaultSkillsDir();

let _index: SkillEntry[] | null = null;
let _byName: Map<string, SkillEntry> | null = null;
let _loading: Promise<void> | null = null;

export function getSkillsDir(): string {
  return DEFAULT_SKILLS_DIR;
}

export async function ensureSkillIndex(): Promise<SkillEntry[]> {
  if (_index) return _index;
  if (_loading) { await _loading; return _index ?? []; }
  _loading = loadIndex();
  await _loading;
  _loading = null;
  return _index ?? [];
}

async function loadIndex(): Promise<void> {
  const dir = getSkillsDir();
  if (!fs.existsSync(dir)) {
    console.warn(`[ORCH] SKILLS_DIR not found: ${dir}`);
    _index = [];
    _byName = new Map();
    return;
  }

  // Fast path: pre-built INDEX.json (from scripts/importSkills.ts).
  const indexFile = path.join(dir, 'INDEX.json');
  if (fs.existsSync(indexFile)) {
    try {
      const json = JSON.parse(fs.readFileSync(indexFile, 'utf-8')) as {
        skills?: Array<{
          name: string; description?: string; category?: string;
          domain?: string; tags?: string[]; relPath?: string;
        }>;
      };
      const entries: SkillEntry[] = (json.skills ?? []).map((s) => ({
        name: s.name,
        description: s.description ?? '',
        category: s.category,
        domain: s.domain,
        tags: s.tags ?? [],
        file: s.relPath ? path.join(dir, s.relPath, 'SKILL.md') : '',
      })).filter((e) => e.file && fs.existsSync(e.file));
      _index = entries;
      _byName = new Map(entries.map((e) => [e.name, e]));
      console.log(`[ORCH] Skill index loaded from INDEX.json: ${entries.length} skills`);
      return;
    } catch (err) {
      console.warn(`[ORCH] INDEX.json parse failed, falling back to FS scan:`, (err as Error).message);
    }
  }

  // Fallback: walk one level (flat) OR two levels (domain/slug) for SKILL.md.
  const entries: SkillEntry[] = [];
  function walk(rootDir: string, depth: number): void {
    for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const sub = path.join(rootDir, entry.name);
      const skillFile = path.join(sub, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        try {
          const head = fs.readFileSync(skillFile, 'utf-8').slice(0, 4000);
          const parsed = parseFrontmatter(head);
          entries.push({
            name: parsed.name || entry.name,
            description: parsed.description || '',
            category: parsed.category,
            domain: parsed.domain,
            tags: parsed.tags,
            file: skillFile,
          });
        } catch { /* skip */ }
      } else if (depth < 2) {
        walk(sub, depth + 1);
      }
    }
  }
  walk(dir, 0);

  _index = entries;
  _byName = new Map(entries.map((e) => [e.name, e]));
  console.log(`[ORCH] Skill index loaded (FS scan): ${entries.length} skills from ${dir}`);
}

interface ParsedFrontmatter {
  name?: string;
  description?: string;
  category?: string;
  domain?: string;
  tags: string[];
}

function parseFrontmatter(text: string): ParsedFrontmatter {
  const out: ParsedFrontmatter = { tags: [] };
  const m = text.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return out;
  const body = m[1];
  // Quick YAML-ish parse: handle key: "value" / key: value / tags: [..] / tag list.
  let inTags = false;
  for (const rawLine of body.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (inTags) {
      const tagMatch = line.match(/^\s*-\s+["']?([^"'\n]+?)["']?\s*$/);
      if (tagMatch) { out.tags.push(tagMatch[1]); continue; }
      inTags = false;
    }
    const kv = line.match(/^(name|description|category|domain):\s*(.*)$/);
    if (kv) {
      const value = kv[2].trim().replace(/^["']|["']$/g, '');
      switch (kv[1]) {
        case 'name': out.name = value; break;
        case 'description': out.description = value; break;
        case 'category': out.category = value; break;
        case 'domain': out.domain = value; break;
      }
      continue;
    }
    if (/^tags:/i.test(line)) {
      const inline = line.match(/tags:\s*\[(.+)\]/);
      if (inline) {
        out.tags = inline[1].split(',').map((t) => t.trim().replace(/^["']|["']$/g, ''));
      } else {
        inTags = true;
      }
    }
  }
  return out;
}

export function getSkill(name: string): SkillEntry | undefined {
  return _byName?.get(name);
}

export function readSkillFull(name: string, maxBytes = 8000): string | null {
  const e = _byName?.get(name);
  if (!e) return null;
  try {
    const content = fs.readFileSync(e.file, 'utf-8');
    return content.length > maxBytes ? content.slice(0, maxBytes) + '\n[...truncated]' : content;
  } catch {
    return null;
  }
}

// ─── Cheap retrieval: token overlap scoring ───
const STOPWORDS = new Set([
  'der', 'die', 'das', 'und', 'oder', 'aber', 'fuer', 'für', 'mit', 'auf', 'ein', 'eine',
  'einen', 'einer', 'ich', 'du', 'wir', 'ist', 'sind', 'wird', 'werden', 'kann', 'soll',
  'the', 'and', 'or', 'a', 'an', 'for', 'with', 'to', 'of', 'in', 'on', 'is', 'are',
  'this', 'that', 'it', 'as', 'be', 'by', 'i', 'you', 'we', 'mache', 'erstelle',
]);

function tokenize(s: string): string[] {
  return s.toLowerCase()
    .replace(/[^a-z0-9äöüß]+/gi, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

export function findRelevantSkills(query: string, limit = 8): SkillEntry[] {
  const index = _index ?? [];
  if (index.length === 0) return [];
  const qTokens = new Set(tokenize(query));
  if (qTokens.size === 0) return [];
  const scored: { entry: SkillEntry; score: number }[] = [];
  for (const e of index) {
    const hay = `${e.name} ${e.description} ${e.tags.join(' ')} ${e.category ?? ''} ${e.domain ?? ''}`.toLowerCase();
    let score = 0;
    for (const t of qTokens) {
      if (hay.includes(t)) score += t.length >= 5 ? 2 : 1;
      if (e.name.toLowerCase().includes(t)) score += 3;
    }
    if (score > 0) scored.push({ entry: e, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.entry);
}
