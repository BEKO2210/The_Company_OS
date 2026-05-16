// One-off importer: copies skills from an external library into ./skills/
// of this repo, groups by frontmatter `domain`, writes INDEX.json + README.md
// for fast lookup by the orchestrator.
//
// Run: cd server && npx tsx scripts/importSkills.ts
//
// Optional env:
//   SKILLS_SOURCE - source library root (default: belki's Firstbrain path)
//   SKILLS_TARGET - target dir (default: <repo>/skills)
//   SKILLS_DRY_RUN=1 - print plan, don't copy

import fs from 'fs';
import path from 'path';

const SOURCE = process.env.SKILLS_SOURCE
  || 'C:\\Users\\belki\\Desktop\\mein Brain\\Firstbrain-main\\03 - Resources\\Skills';
const TARGET = process.env.SKILLS_TARGET
  || path.resolve(process.cwd(), '..', 'skills');
const DRY = process.env.SKILLS_DRY_RUN === '1';

interface Meta {
  name: string;
  description: string;
  domain: string;     // bucket folder
  category?: string;
  tags: string[];
}

interface IndexEntry extends Meta {
  slug: string;
  relPath: string;    // path relative to TARGET (forward slashes)
}

function sanitizeSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'unnamed';
}

function bucketName(domain: string): string {
  return sanitizeSlug(domain || 'uncategorized');
}

function parseFrontmatter(text: string): Meta {
  const out: Meta = { name: '', description: '', domain: 'uncategorized', tags: [] };
  const m = text.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return out;
  const body = m[1];
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
        case 'domain': out.domain = value || 'uncategorized'; break;
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

function copyDirSync(src: string, dst: string): number {
  let count = 0;
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      count += copyDirSync(s, d);
    } else if (entry.isFile()) {
      fs.copyFileSync(s, d);
      count++;
    }
  }
  return count;
}

function main(): void {
  if (!fs.existsSync(SOURCE)) {
    console.error(`Source not found: ${SOURCE}`);
    process.exit(1);
  }
  console.log(`Source : ${SOURCE}`);
  console.log(`Target : ${TARGET}`);
  console.log(`Dry-run: ${DRY ? 'yes' : 'no'}`);

  const folders = fs.readdirSync(SOURCE, { withFileTypes: true })
    .filter((d) => d.isDirectory());
  console.log(`Found ${folders.length} candidate skill folders`);

  const index: IndexEntry[] = [];
  const slugCount = new Map<string, number>();
  const perDomain = new Map<string, number>();
  let copied = 0, skipped = 0, fileTotal = 0;

  if (!DRY) {
    fs.mkdirSync(TARGET, { recursive: true });
  }

  for (const f of folders) {
    const srcDir = path.join(SOURCE, f.name);
    const skillFile = path.join(srcDir, 'SKILL.md');
    if (!fs.existsSync(skillFile)) { skipped++; continue; }

    let head = '';
    try { head = fs.readFileSync(skillFile, 'utf-8').slice(0, 8000); }
    catch { skipped++; continue; }

    const meta = parseFrontmatter(head);
    const skillName = meta.name || f.name;
    let slug = sanitizeSlug(skillName);

    // Disambiguate duplicate slugs
    const seen = slugCount.get(slug) || 0;
    if (seen > 0) slug = `${slug}-${seen + 1}`;
    slugCount.set(slug, seen + 1);

    const bucket = bucketName(meta.domain);
    const relPath = `${bucket}/${slug}`;
    const dstDir = path.join(TARGET, bucket, slug);

    if (!DRY) {
      try {
        const n = copyDirSync(srcDir, dstDir);
        fileTotal += n;
        copied++;
      } catch (err) {
        console.warn(`Copy failed for ${f.name}: ${(err as Error).message}`);
        skipped++;
        continue;
      }
    } else {
      copied++;
    }

    perDomain.set(bucket, (perDomain.get(bucket) || 0) + 1);
    index.push({
      ...meta,
      name: skillName,
      domain: bucket,
      slug,
      relPath,
    });

    if (copied % 100 === 0) {
      console.log(`  ${copied} / ${folders.length} copied ...`);
    }
  }

  // Sort index alphabetically by name (case-insensitive)
  index.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  if (!DRY) {
    // INDEX.json — fast lookup map
    fs.writeFileSync(
      path.join(TARGET, 'INDEX.json'),
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        source: SOURCE,
        count: index.length,
        domains: Array.from(perDomain.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([name, n]) => ({ name, count: n })),
        skills: index,
      }, null, 2),
    );

    // README.md — human overview
    const domainList = Array.from(perDomain.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, n]) => `- **${name}** — ${n}`)
      .join('\n');

    const top20 = index.slice(0, 20).map((e) => `- \`${e.name}\` (${e.domain}) — ${e.description}`).join('\n');

    fs.writeFileSync(
      path.join(TARGET, 'README.md'),
      `# Skill Library

Imported from \`${SOURCE}\` on ${new Date().toISOString()}.

**${index.length}** skills across **${perDomain.size}** domains.

## Domains
${domainList}

## Lookup
- Fast lookup: parse \`INDEX.json\` — keyed by skill \`name\`, with \`relPath\` to the SKILL.md folder.
- Direct folder: \`skills/<domain>/<slug>/SKILL.md\`.
- The orchestrator (\`server/src/orchestrator/skillIndex.ts\`) loads \`INDEX.json\` automatically.

## Top of A–Z
${top20}

> To re-import after the upstream library changes:
> \`cd server && npx tsx scripts/importSkills.ts\`
`,
    );
  }

  console.log('');
  console.log(`Copied : ${copied}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Files  : ${fileTotal}`);
  console.log(`Domains: ${perDomain.size}`);
  console.log(`Index  : ${path.join(TARGET, 'INDEX.json')}`);
  console.log('Done.');
}

main();
