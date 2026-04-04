import fs from "node:fs";
import path from "node:path";
import { watch } from "chokidar";

export interface Skill {
  name: string;
  description: string;
  triggers: string[];
  content: string;
  filePath: string;
}

export class SkillsManager {
  private skills = new Map<string, Skill>();
  private dir: string;
  private watcher: ReturnType<typeof watch> | null = null;

  constructor(dir: string) {
    this.dir = dir;
  }

  loadAll(): void {
    if (!fs.existsSync(this.dir)) return;
    const files = fs.readdirSync(this.dir);
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      this.loadFile(path.join(this.dir, file));
    }
  }

  private loadFile(filePath: string): void {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const skill = this.parse(raw, filePath);
      if (skill) this.skills.set(skill.name, skill);
    } catch {}
  }

  private parse(raw: string, filePath: string): Skill | null {
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!fmMatch) return null;
    const frontmatter = fmMatch[1];
    const content = fmMatch[2].trim();
    const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
    const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
    if (!nameMatch) return null;
    const triggers: string[] = [];
    const triggerSection = frontmatter.match(/triggers:\n((?:\s+-\s+.+\n?)*)/);
    if (triggerSection) {
      const lines = triggerSection[1].split("\n");
      for (const line of lines) {
        const m = line.match(/^\s+-\s+(.+)/);
        if (m) triggers.push(m[1].trim());
      }
    }
    return {
      name: nameMatch[1].trim(),
      description: descMatch?.[1]?.trim() || "",
      triggers,
      content,
      filePath,
    };
  }

  getAll(): Skill[] { return Array.from(this.skills.values()); }

  match(message: string): Skill[] {
    const lower = message.toLowerCase();
    return this.getAll().filter((skill) =>
      skill.triggers.some((trigger) => lower.includes(trigger.toLowerCase()))
    );
  }

  startWatching(): void {
    if (!fs.existsSync(this.dir)) return;
    this.watcher = watch(this.dir, { ignoreInitial: true });
    this.watcher.on("add", (fp) => { if (fp.endsWith(".md")) { console.log(`[skills] Loading new skill: ${fp}`); this.loadFile(fp); } });
    this.watcher.on("change", (fp) => { if (fp.endsWith(".md")) { console.log(`[skills] Reloading skill: ${fp}`); this.loadFile(fp); } });
    this.watcher.on("unlink", (fp) => {
      if (fp.endsWith(".md")) {
        for (const [key, skill] of this.skills) {
          if (skill.filePath === fp) { this.skills.delete(key); console.log(`[skills] Removed skill: ${key}`); break; }
        }
      }
    });
  }

  stopWatching(): void { this.watcher?.close(); this.watcher = null; }
}
