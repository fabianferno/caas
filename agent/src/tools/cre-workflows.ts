import fs from "node:fs";
import path from "node:path";
import { execSync, execFileSync } from "node:child_process";
import type { RegisteredTool } from "../core/tools.js";

export interface TemplateParameter {
  type: string;
  description: string;
  required?: boolean;
  default?: string;
}

export interface TemplateDefinition {
  name: string;
  description: string;
  category: string;
  trigger: string;
  resultMode: string;
  parameters: Record<string, TemplateParameter>;
}

export interface ConfiguredInstance {
  name: string;
  template: string;
  params: Record<string, string>;
}

export interface WorkflowManagerOptions {
  templatesDir: string;
  configuredDir: string;
  agentPrivateKey: string;
  projectRoot?: string;
}

export class WorkflowManager {
  private templatesDir: string;
  private configuredDir: string;
  private agentPrivateKey: string;
  private projectRoot: string;
  private templates: Map<string, TemplateDefinition> = new Map();

  constructor(opts: WorkflowManagerOptions) {
    this.templatesDir = opts.templatesDir;
    this.configuredDir = opts.configuredDir;
    this.agentPrivateKey = opts.agentPrivateKey;
    this.projectRoot = opts.projectRoot || path.dirname(opts.templatesDir);
    this.loadTemplates();
  }

  private loadTemplates(): void {
    if (!fs.existsSync(this.templatesDir)) return;

    const entries = fs.readdirSync(this.templatesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const templateJsonPath = path.join(this.templatesDir, entry.name, "template.json");
      if (!fs.existsSync(templateJsonPath)) continue;

      try {
        const data = fs.readFileSync(templateJsonPath, "utf-8");
        const template: TemplateDefinition = JSON.parse(data);
        this.templates.set(template.name, template);
      } catch {
        // Skip invalid templates
      }
    }
  }

  listTemplates(filter?: string): TemplateDefinition[] {
    const all = Array.from(this.templates.values());
    if (!filter) return all;
    const lower = filter.toLowerCase();
    return all.filter(
      (t) =>
        t.name.toLowerCase().includes(lower) ||
        t.category.toLowerCase().includes(lower) ||
        t.description.toLowerCase().includes(lower)
    );
  }

  listConfigured(): ConfiguredInstance[] {
    if (!fs.existsSync(this.configuredDir)) return [];

    const entries = fs.readdirSync(this.configuredDir, { withFileTypes: true });
    const instances: ConfiguredInstance[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const configPath = path.join(this.configuredDir, entry.name, "config.json");
      if (!fs.existsSync(configPath)) continue;

      try {
        const data = fs.readFileSync(configPath, "utf-8");
        const config = JSON.parse(data);
        instances.push({
          name: entry.name,
          template: config.template,
          params: config.params,
        });
      } catch {
        // Skip invalid instances
      }
    }
    return instances;
  }

  configureWorkflow(
    templateName: string,
    instanceName: string,
    params: Record<string, string>
  ): string {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    const instanceDir = path.join(this.configuredDir, instanceName);
    if (fs.existsSync(instanceDir)) {
      throw new Error(`Instance already exists: ${instanceName}`);
    }

    // Validate required parameters
    for (const [key, param] of Object.entries(template.parameters)) {
      if (param.required && !params[key]) {
        throw new Error(`Missing required parameter: ${key}`);
      }
    }

    // Build full params with defaults
    const fullParams: Record<string, string> = {};
    for (const [key, param] of Object.entries(template.parameters)) {
      fullParams[key] = params[key] || param.default || "";
    }

    // Copy template directory to configured, excluding node_modules (symlinks break on copy)
    const templateDir = path.join(this.templatesDir, templateName);
    fs.cpSync(templateDir, instanceDir, {
      recursive: true,
      filter: (src) => !src.includes("node_modules"),
    });

    // Remove template.json from the copy
    const copiedTemplateMeta = path.join(instanceDir, "template.json");
    if (fs.existsSync(copiedTemplateMeta)) fs.unlinkSync(copiedTemplateMeta);

    // Replace {{placeholders}} in text files (skip node_modules, binary dirs)
    const textExtensions = new Set([".ts", ".js", ".json", ".yaml", ".yml", ".toml", ".env"]);
    const skipDirs = new Set(["node_modules", ".git", "dist"]);

    const replaceInDir = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          if (!skipDirs.has(entry.name)) replaceInDir(path.join(dir, entry.name));
          continue;
        }
        const ext = path.extname(entry.name);
        if (!textExtensions.has(ext)) continue;

        const filePath = path.join(dir, entry.name);
        let content = fs.readFileSync(filePath, "utf-8");
        for (const [key, value] of Object.entries(fullParams)) {
          content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
        }
        fs.writeFileSync(filePath, content, "utf-8");
      }
    };
    replaceInDir(instanceDir);

    // Write config.json with instance metadata
    fs.writeFileSync(
      path.join(instanceDir, "config.json"),
      JSON.stringify(
        { template: templateName, params: fullParams, createdAt: new Date().toISOString() },
        null,
        2
      ),
      "utf-8"
    );

    // Install dependencies if package.json exists (symlinks in node_modules break on copy)
    const pkgJson = path.join(instanceDir, "package.json");
    if (fs.existsSync(pkgJson)) {
      try {
        execFileSync("bun", ["install"], {
          cwd: instanceDir,
          encoding: "utf-8",
          timeout: 60000,
          stdio: ["pipe", "pipe", "pipe"],
        });
      } catch {
        // Fallback: try npm if bun not available
        try {
          execFileSync("npm", ["install", "--silent"], {
            cwd: instanceDir,
            encoding: "utf-8",
            timeout: 120000,
            stdio: ["pipe", "pipe", "pipe"],
          });
        } catch {
          // Dependencies may already be present or not needed
        }
      }
    }

    const relPath = path.relative(this.projectRoot, instanceDir);
    return `Configured workflow instance "${instanceName}" from template "${templateName}" at ${instanceDir}. Run from ${this.projectRoot}: cre workflow simulate ${relPath}`;
  }

  private resolveWorkflowDir(name: string): string {
    // Check configured instances first, then templates
    const configuredDir = path.join(this.configuredDir, name);
    if (fs.existsSync(configuredDir)) return configuredDir;

    const templateDir = path.join(this.templatesDir, name);
    if (fs.existsSync(templateDir)) return templateDir;

    throw new Error(`Workflow not found: ${name}. Check cre_list_workflows for available templates and instances.`);
  }

  runWorkflow(
    instanceName: string,
    mode: "simulate" | "trigger" = "simulate",
    input?: Record<string, unknown>
  ): string {
    const instanceDir = this.resolveWorkflowDir(instanceName);

    if (mode === "simulate") {
      try {
        const relPath = path.relative(this.projectRoot, instanceDir);
        const result = execSync(`cre workflow simulate ${relPath} --non-interactive --trigger-index 0 --skip-type-checks -T staging-settings`, {
          cwd: this.projectRoot,
          encoding: "utf-8",
          timeout: 120000,
          stdio: ["pipe", "pipe", "pipe"],
        });
        return result;
      } catch (err: any) {
        const stderr = err.stderr || "";
        const stdout = err.stdout || "";
        return `Simulation error:\n${stdout}\n${stderr}`;
      }
    }

    // Trigger mode: send HTTP request to CRE gateway
    const configPath = path.join(instanceDir, "config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const workflowId = config.workflowId;
    if (!workflowId) {
      return "Error: Workflow has not been deployed. No workflowId found. Deploy first with cre_manage_workflow action=deploy.";
    }

    const gatewayUrl = config.gatewayUrl;
    if (!gatewayUrl) {
      return "Error: No gateway URL configured. Deploy the workflow first.";
    }

    return `Trigger mode requires a deployed workflow. Use cre_manage_workflow to deploy first, then trigger via the CRE gateway at ${gatewayUrl}.`;
  }

  manageWorkflow(instanceName: string, action: string): string {
    const instanceDir = path.join(this.configuredDir, instanceName);
    if (!fs.existsSync(instanceDir)) {
      throw new Error(`Instance not found: ${instanceName}`);
    }

    const validActions = ["deploy", "pause", "activate", "delete"];
    if (!validActions.includes(action)) {
      throw new Error(`Invalid action: ${action}. Must be one of: ${validActions.join(", ")}`);
    }

    try {
      const relPath = path.relative(this.projectRoot, instanceDir);
      const result = execSync(`cre workflow ${action} ${relPath}`, {
        cwd: this.projectRoot,
        encoding: "utf-8",
        timeout: 120000,
        stdio: ["pipe", "pipe", "pipe"],
      });
      return result;
    } catch (err: any) {
      const stderr = err.stderr || "";
      const stdout = err.stdout || "";
      return `Error running cre workflow ${action}:\n${stdout}\n${stderr}`;
    }
  }

  registerTools(): RegisteredTool[] {
    return [
      {
        name: "cre_list_workflows",
        description:
          "List available CRE workflow templates and configured instances. Use to discover what workflows are available.",
        parameters: {
          type: "object",
          properties: {
            filter: {
              type: "string",
              description: "Optional filter by name, category, or description",
            },
          },
        },
        handler: async (args: any): Promise<string> => {
          const filter = args.filter as string | undefined;
          const templates = this.listTemplates(filter);
          const configured = this.listConfigured();
          return JSON.stringify({ templates, configured }, null, 2);
        },
      },
      {
        name: "cre_configure_workflow",
        description:
          "Create a new workflow instance from a template by filling in parameters. Use cre_list_workflows first to see available templates and their required parameters.",
        parameters: {
          type: "object",
          properties: {
            template: { type: "string", description: "Template name" },
            instanceName: { type: "string", description: "Name for the new instance" },
            params: {
              type: "object",
              description: "Template parameters as key-value pairs",
            },
          },
          required: ["template", "instanceName", "params"],
        },
        handler: async (args: any): Promise<string> => {
          try {
            return this.configureWorkflow(args.template, args.instanceName, args.params);
          } catch (err) {
            return `Error: ${err instanceof Error ? err.message : String(err)}`;
          }
        },
      },
      {
        name: "cre_run_workflow",
        description:
          'Simulate or trigger a CRE workflow. Accepts a template name (e.g. "price-feed") or a configured instance name. Defaults to simulation mode. Use mode="trigger" only for deployed workflows.',
        parameters: {
          type: "object",
          properties: {
            instance: { type: "string", description: "Template name or configured instance name" },
            mode: {
              type: "string",
              description: 'Execution mode: "simulate" (default) or "trigger"',
            },
            input: {
              type: "object",
              description: "Optional input payload for HTTP-triggered workflows",
            },
          },
          required: ["instance"],
        },
        handler: async (args: any): Promise<string> => {
          try {
            return this.runWorkflow(args.instance, args.mode || "simulate", args.input);
          } catch (err) {
            return `Error: ${err instanceof Error ? err.message : String(err)}`;
          }
        },
      },
      {
        name: "cre_manage_workflow",
        description:
          "Manage a CRE workflow lifecycle: deploy, pause, activate, or delete. Requires CRE CLI and appropriate credentials.",
        parameters: {
          type: "object",
          properties: {
            instance: { type: "string", description: "Configured instance name" },
            action: {
              type: "string",
              description: 'Lifecycle action: "deploy", "pause", "activate", or "delete"',
            },
          },
          required: ["instance", "action"],
        },
        handler: async (args: any): Promise<string> => {
          try {
            return this.manageWorkflow(args.instance, args.action);
          } catch (err) {
            return `Error: ${err instanceof Error ? err.message : String(err)}`;
          }
        },
      },
    ];
  }
}
