import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { WorkflowManager } from "../../src/tools/cre-workflows.js";

describe("WorkflowManager", () => {
  let tmpDir: string;
  let templatesDir: string;
  let configuredDir: string;
  let manager: WorkflowManager;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cre-test-"));
    templatesDir = path.join(tmpDir, "templates");
    configuredDir = path.join(tmpDir, "configured");
    fs.mkdirSync(templatesDir, { recursive: true });
    fs.mkdirSync(configuredDir, { recursive: true });

    // Create a minimal test template
    const templateDir = path.join(templatesDir, "test-template");
    fs.mkdirSync(templateDir);
    fs.writeFileSync(
      path.join(templateDir, "template.json"),
      JSON.stringify({
        name: "test-template",
        description: "A test template",
        category: "test",
        trigger: "cron",
        resultMode: "http-callback",
        parameters: {
          apiUrl: { type: "string", description: "API URL", required: true },
          schedule: { type: "string", description: "Cron schedule", default: "* * * * *" },
        },
      })
    );
    fs.writeFileSync(
      path.join(templateDir, "main.ts"),
      'const url = "{{apiUrl}}";\nconst schedule = "{{schedule}}";\nexport async function main() {}\n'
    );
    fs.writeFileSync(
      path.join(templateDir, "config.staging.json"),
      '{"apiUrl": "{{apiUrl}}", "schedule": "{{schedule}}"}'
    );
    fs.writeFileSync(
      path.join(templateDir, "workflow.yaml"),
      "staging-settings:\n  user-workflow:\n    workflow-name: test\n"
    );
    fs.writeFileSync(
      path.join(templateDir, "package.json"),
      '{"name": "test", "dependencies": {}}'
    );
    fs.writeFileSync(
      path.join(templateDir, "tsconfig.json"),
      '{"compilerOptions": {}}'
    );

    manager = new WorkflowManager({
      templatesDir,
      configuredDir,
      agentPrivateKey: "0x" + "a".repeat(64),
    });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("loadTemplates", () => {
    it("loads templates from the templates directory", () => {
      const templates = manager.listTemplates();
      expect(templates).toHaveLength(1);
      expect(templates[0].name).toBe("test-template");
    });

    it("returns empty array if no templates exist", () => {
      fs.rmSync(templatesDir, { recursive: true, force: true });
      fs.mkdirSync(templatesDir, { recursive: true });
      const mgr = new WorkflowManager({
        templatesDir,
        configuredDir,
        agentPrivateKey: "0x" + "a".repeat(64),
      });
      expect(mgr.listTemplates()).toHaveLength(0);
    });
  });

  describe("configureWorkflow", () => {
    it("creates a configured instance from a template", () => {
      const result = manager.configureWorkflow("test-template", "my-instance", {
        apiUrl: "https://example.com/api",
      });
      expect(result).toContain("my-instance");

      const instanceDir = path.join(configuredDir, "my-instance");
      expect(fs.existsSync(instanceDir)).toBe(true);

      // Check placeholder replacement in main.ts
      const mainContent = fs.readFileSync(path.join(instanceDir, "main.ts"), "utf-8");
      expect(mainContent).toContain("https://example.com/api");
      expect(mainContent).not.toContain("{{apiUrl}}");

      // Check default value was applied for schedule
      expect(mainContent).toContain("* * * * *");
    });

    it("writes config.json with filled parameters", () => {
      manager.configureWorkflow("test-template", "my-instance", {
        apiUrl: "https://example.com/api",
        schedule: "*/5 * * * *",
      });

      const configPath = path.join(configuredDir, "my-instance", "config.json");
      expect(fs.existsSync(configPath)).toBe(true);

      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      expect(config.template).toBe("test-template");
      expect(config.params.apiUrl).toBe("https://example.com/api");
      expect(config.params.schedule).toBe("*/5 * * * *");
    });

    it("throws if required parameter is missing", () => {
      expect(() => {
        manager.configureWorkflow("test-template", "my-instance", {});
      }).toThrow("apiUrl");
    });

    it("throws if template does not exist", () => {
      expect(() => {
        manager.configureWorkflow("nonexistent", "my-instance", { apiUrl: "x" });
      }).toThrow("nonexistent");
    });

    it("throws if instance name already exists", () => {
      manager.configureWorkflow("test-template", "my-instance", {
        apiUrl: "https://example.com",
      });
      expect(() => {
        manager.configureWorkflow("test-template", "my-instance", {
          apiUrl: "https://example.com",
        });
      }).toThrow("already exists");
    });
  });

  describe("listConfigured", () => {
    it("lists configured instances", () => {
      manager.configureWorkflow("test-template", "inst-1", {
        apiUrl: "https://example.com",
      });
      manager.configureWorkflow("test-template", "inst-2", {
        apiUrl: "https://example2.com",
      });

      const instances = manager.listConfigured();
      expect(instances).toHaveLength(2);
      expect(instances.map((i: any) => i.name).sort()).toEqual(["inst-1", "inst-2"]);
    });

    it("returns empty array when no instances configured", () => {
      expect(manager.listConfigured()).toHaveLength(0);
    });
  });

  describe("registerTools", () => {
    it("returns 4 tools", () => {
      const tools = manager.registerTools();
      expect(tools).toHaveLength(4);
      const names = tools.map((t) => t.name);
      expect(names).toContain("cre_list_workflows");
      expect(names).toContain("cre_configure_workflow");
      expect(names).toContain("cre_run_workflow");
      expect(names).toContain("cre_manage_workflow");
    });

    it("cre_list_workflows handler returns templates as JSON", async () => {
      const tools = manager.registerTools();
      const listTool = tools.find((t) => t.name === "cre_list_workflows")!;
      const result = await listTool.handler({});
      const parsed = JSON.parse(result);
      expect(parsed.templates).toHaveLength(1);
      expect(parsed.templates[0].name).toBe("test-template");
      expect(parsed.configured).toHaveLength(0);
    });

    it("cre_configure_workflow handler creates instance", async () => {
      const tools = manager.registerTools();
      const configureTool = tools.find((t) => t.name === "cre_configure_workflow")!;
      const result = await configureTool.handler({
        template: "test-template",
        instanceName: "my-test",
        params: { apiUrl: "https://test.com" },
      });
      expect(result).toContain("my-test");
      expect(fs.existsSync(path.join(configuredDir, "my-test"))).toBe(true);
    });
  });
});
