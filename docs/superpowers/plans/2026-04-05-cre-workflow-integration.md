# CRE Workflow Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CRE workflow management as agent tools so the agent can list, configure, simulate, and deploy Chainlink CRE workflows.

**Architecture:** A `WorkflowManager` class in `agent/src/tools/cre-workflows.ts` reads template definitions from `workflows/templates/`, registers 4 tools in the existing `ToolRegistry`, and shells out to the CRE CLI for simulation/deployment. Workflow templates live at `workflows/` (repo root) for CRE CLI compatibility.

**Tech Stack:** TypeScript, @chainlink/cre-sdk, viem, CRE CLI, child_process

---

### Task 1: Create CRE project structure and price-feed template

**Files:**
- Create: `workflows/project.yaml`
- Create: `workflows/secrets.yaml`
- Create: `workflows/.env`
- Create: `workflows/.gitignore`
- Create: `workflows/templates/price-feed/template.json`
- Create: `workflows/templates/price-feed/main.ts`
- Create: `workflows/templates/price-feed/workflow.yaml`
- Create: `workflows/templates/price-feed/config.staging.json`
- Create: `workflows/templates/price-feed/package.json`
- Create: `workflows/templates/price-feed/tsconfig.json`

- [ ] **Step 1: Create `workflows/project.yaml`**

```yaml
# CRE Project Settings
staging-settings:
  rpcs:
    - chain-name: ethereum-testnet-sepolia
      url: https://ethereum-sepolia-rpc.publicnode.com

production-settings:
  rpcs:
    - chain-name: ethereum-testnet-sepolia
      url: https://ethereum-sepolia-rpc.publicnode.com
```

- [ ] **Step 2: Create `workflows/secrets.yaml`**

```yaml
secretsNames:
    API_KEY_SECRET:
        - API_KEY_VAR
```

- [ ] **Step 3: Create `workflows/.env`**

```
API_KEY_VAR=placeholder
```

- [ ] **Step 4: Create `workflows/.gitignore`**

```
.env
configured/
node_modules/
dist/
```

- [ ] **Step 5: Create `workflows/templates/price-feed/template.json`**

```json
{
  "name": "price-feed",
  "description": "Fetch asset price from an HTTP API on a cron schedule, aggregate with median consensus, and write the result onchain to a consumer contract.",
  "category": "data-feeds",
  "trigger": "cron",
  "resultMode": "evm-write",
  "parameters": {
    "asset": {
      "type": "string",
      "description": "Asset symbol (e.g. ETH, BTC)",
      "required": true
    },
    "apiUrl": {
      "type": "string",
      "description": "Price API endpoint that returns a numeric value",
      "required": true
    },
    "cronSchedule": {
      "type": "string",
      "description": "Cron expression for trigger schedule",
      "default": "*/30 * * * * *"
    },
    "chainName": {
      "type": "string",
      "description": "Target chain selector name",
      "default": "ethereum-testnet-sepolia"
    },
    "consumerContract": {
      "type": "string",
      "description": "Consumer contract address (must implement IReceiver)",
      "required": true
    },
    "gasLimit": {
      "type": "string",
      "description": "Gas limit for the write transaction",
      "default": "500000"
    }
  }
}
```

- [ ] **Step 6: Create `workflows/templates/price-feed/main.ts`**

```typescript
import {
  CronCapability,
  EVMClient,
  HTTPClient,
  handler,
  consensusMedianAggregation,
  Runner,
  type NodeRuntime,
  type Runtime,
  getNetwork,
  bytesToHex,
  hexToBase64,
} from "@chainlink/cre-sdk"
import { encodeAbiParameters, parseAbiParameters } from "viem"

type Config = {
  schedule: string
  apiUrl: string
  evms: {
    chainName: string
    consumerContract: string
    gasLimit: string
  }[]
}

type PriceResult = {
  price: bigint
  txHash: string
}

const fetchPrice = (nodeRuntime: NodeRuntime<Config>): bigint => {
  const httpClient = new HTTPClient()

  const req = {
    url: nodeRuntime.config.apiUrl,
    method: "GET" as const,
  }

  const resp = httpClient.sendRequest(nodeRuntime, req).result()
  const bodyText = new TextDecoder().decode(resp.body)

  // Parse the response as a number and convert to bigint (scaled by 1e8)
  const price = Math.round(parseFloat(bodyText.trim()) * 1e8)
  return BigInt(price)
}

const onCronTrigger = (runtime: Runtime<Config>): PriceResult => {
  const evmConfig = runtime.config.evms[0]

  // Fetch price with median consensus
  const price = runtime
    .runInNodeMode(fetchPrice, consensusMedianAggregation())()
    .result()

  runtime.log(`Fetched price: ${price}`)

  // Write onchain
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: evmConfig.chainName,
  })
  if (!network) {
    throw new Error(`Unknown chain: ${evmConfig.chainName}`)
  }

  const evmClient = new EVMClient(network.chainSelector.selector)

  const reportData = encodeAbiParameters(
    parseAbiParameters("uint256 price"),
    [price]
  )

  const reportResponse = runtime
    .report({
      encodedPayload: hexToBase64(reportData),
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    })
    .result()

  const writeResult = evmClient
    .writeReport(runtime, {
      receiver: evmConfig.consumerContract,
      report: reportResponse,
      gasConfig: { gasLimit: evmConfig.gasLimit },
    })
    .result()

  const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32))
  runtime.log(`Write tx: ${txHash}`)

  return { price, txHash }
}

const initWorkflow = (config: Config) => {
  const cron = new CronCapability()
  return [handler(cron.trigger({ schedule: config.schedule }), onCronTrigger)]
}

export async function main() {
  const runner = await Runner.newRunner<Config>()
  await runner.run(initWorkflow)
}
```

- [ ] **Step 7: Create `workflows/templates/price-feed/workflow.yaml`**

```yaml
staging-settings:
  user-workflow:
    workflow-name: "price-feed-staging"
  workflow-artifacts:
    workflow-path: "./main.ts"
    config-path: "./config.staging.json"
    secrets-path: ""

production-settings:
  user-workflow:
    workflow-name: "price-feed-production"
  workflow-artifacts:
    workflow-path: "./main.ts"
    config-path: "./config.staging.json"
    secrets-path: ""
```

- [ ] **Step 8: Create `workflows/templates/price-feed/config.staging.json`**

```json
{
  "schedule": "*/30 * * * * *",
  "apiUrl": "https://api.mathjs.org/v4/?expr=2*21",
  "evms": [
    {
      "chainName": "ethereum-testnet-sepolia",
      "consumerContract": "0x0000000000000000000000000000000000000000",
      "gasLimit": "500000"
    }
  ]
}
```

- [ ] **Step 9: Create `workflows/templates/price-feed/package.json`**

```json
{
  "name": "price-feed-workflow",
  "version": "1.0.0",
  "main": "dist/main.js",
  "private": true,
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "license": "UNLICENSED",
  "dependencies": {
    "@chainlink/cre-sdk": "^1.5.0",
    "viem": "2.34.0"
  },
  "devDependencies": {
    "typescript": "5.9.3"
  }
}
```

- [ ] **Step 10: Create `workflows/templates/price-feed/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext"],
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "types": []
  },
  "include": ["main.ts"]
}
```

- [ ] **Step 11: Commit**

```bash
git add workflows/
git commit -m "feat: add CRE project structure and price-feed template"
```

---

### Task 2: Create webhook-listener template

**Files:**
- Create: `workflows/templates/webhook-listener/template.json`
- Create: `workflows/templates/webhook-listener/main.ts`
- Create: `workflows/templates/webhook-listener/workflow.yaml`
- Create: `workflows/templates/webhook-listener/config.staging.json`
- Create: `workflows/templates/webhook-listener/package.json`
- Create: `workflows/templates/webhook-listener/tsconfig.json`

- [ ] **Step 1: Create `workflows/templates/webhook-listener/template.json`**

```json
{
  "name": "webhook-listener",
  "description": "Listen for incoming HTTP requests, call an external API with the payload, and return the result to the caller.",
  "category": "automation",
  "trigger": "http",
  "resultMode": "http-callback",
  "parameters": {
    "apiUrl": {
      "type": "string",
      "description": "External API endpoint to call with incoming data",
      "required": true
    },
    "apiMethod": {
      "type": "string",
      "description": "HTTP method for the external API call (GET or POST)",
      "default": "GET"
    }
  }
}
```

- [ ] **Step 2: Create `workflows/templates/webhook-listener/main.ts`**

```typescript
import {
  HTTPCapability,
  HTTPClient,
  handler,
  consensusIdenticalAggregation,
  Runner,
  type NodeRuntime,
  type Runtime,
} from "@chainlink/cre-sdk"

type Config = {
  apiUrl: string
  apiMethod: string
}

type WebhookResult = {
  statusCode: number
  body: string
}

const callExternalApi = (nodeRuntime: NodeRuntime<Config>): WebhookResult => {
  const httpClient = new HTTPClient()

  const req = {
    url: nodeRuntime.config.apiUrl,
    method: nodeRuntime.config.apiMethod as "GET" | "POST",
  }

  const resp = httpClient.sendRequest(nodeRuntime, req).result()
  const bodyText = new TextDecoder().decode(resp.body)

  return {
    statusCode: resp.statusCode,
    body: bodyText,
  }
}

const onHttpTrigger = (runtime: Runtime<Config>): WebhookResult => {
  runtime.log("HTTP trigger received")

  const result = runtime
    .runInNodeMode(callExternalApi, consensusIdenticalAggregation())()
    .result()

  runtime.log(`API response status: ${result.statusCode}`)

  return result
}

const initWorkflow = (config: Config) => {
  const http = new HTTPCapability()

  // Empty authorizedKeys for simulation; must be set for deployment
  return [handler(http.trigger({ authorizedKeys: [] }), onHttpTrigger)]
}

export async function main() {
  const runner = await Runner.newRunner<Config>()
  await runner.run(initWorkflow)
}
```

- [ ] **Step 3: Create `workflows/templates/webhook-listener/workflow.yaml`**

```yaml
staging-settings:
  user-workflow:
    workflow-name: "webhook-listener-staging"
  workflow-artifacts:
    workflow-path: "./main.ts"
    config-path: "./config.staging.json"
    secrets-path: ""

production-settings:
  user-workflow:
    workflow-name: "webhook-listener-production"
  workflow-artifacts:
    workflow-path: "./main.ts"
    config-path: "./config.staging.json"
    secrets-path: ""
```

- [ ] **Step 4: Create `workflows/templates/webhook-listener/config.staging.json`**

```json
{
  "apiUrl": "https://api.mathjs.org/v4/?expr=2*21",
  "apiMethod": "GET"
}
```

- [ ] **Step 5: Create `workflows/templates/webhook-listener/package.json`**

```json
{
  "name": "webhook-listener-workflow",
  "version": "1.0.0",
  "main": "dist/main.js",
  "private": true,
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "license": "UNLICENSED",
  "dependencies": {
    "@chainlink/cre-sdk": "^1.5.0"
  },
  "devDependencies": {
    "typescript": "5.9.3"
  }
}
```

- [ ] **Step 6: Create `workflows/templates/webhook-listener/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext"],
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "types": []
  },
  "include": ["main.ts"]
}
```

- [ ] **Step 7: Commit**

```bash
git add workflows/templates/webhook-listener/
git commit -m "feat: add webhook-listener CRE workflow template"
```

---

### Task 3: Create event-responder template

**Files:**
- Create: `workflows/templates/event-responder/template.json`
- Create: `workflows/templates/event-responder/main.ts`
- Create: `workflows/templates/event-responder/workflow.yaml`
- Create: `workflows/templates/event-responder/config.staging.json`
- Create: `workflows/templates/event-responder/package.json`
- Create: `workflows/templates/event-responder/tsconfig.json`

- [ ] **Step 1: Create `workflows/templates/event-responder/template.json`**

```json
{
  "name": "event-responder",
  "description": "Listen for EVM log events from a smart contract, read additional onchain state, and POST results to a webhook URL.",
  "category": "automation",
  "trigger": "evm-log",
  "resultMode": "http-post",
  "parameters": {
    "sourceContract": {
      "type": "string",
      "description": "Contract address to monitor for events",
      "required": true
    },
    "eventSignature": {
      "type": "string",
      "description": "Event signature to filter (e.g. Transfer(address,address,uint256))",
      "required": true
    },
    "chainName": {
      "type": "string",
      "description": "Source chain selector name",
      "default": "ethereum-testnet-sepolia"
    },
    "notifyUrl": {
      "type": "string",
      "description": "Webhook URL to POST event data to",
      "required": true
    }
  }
}
```

- [ ] **Step 2: Create `workflows/templates/event-responder/main.ts`**

```typescript
import {
  EVMClient,
  HTTPClient,
  handler,
  Runner,
  type Runtime,
  type NodeRuntime,
  getNetwork,
  consensusIdenticalAggregation,
  bytesToHex,
} from "@chainlink/cre-sdk"

type Config = {
  chainName: string
  sourceContract: string
  notifyUrl: string
  evms: {
    chainName: string
  }[]
}

type EventResult = {
  notified: boolean
  statusCode: number
}

const notifyWebhook = (
  nodeRuntime: NodeRuntime<Config>,
  eventData: string
): EventResult => {
  const httpClient = new HTTPClient()

  const req = {
    url: nodeRuntime.config.notifyUrl,
    method: "POST" as const,
    headers: { "Content-Type": "application/json" },
    body: new TextEncoder().encode(eventData),
  }

  const resp = httpClient.sendRequest(nodeRuntime, req).result()

  return {
    notified: resp.statusCode >= 200 && resp.statusCode < 300,
    statusCode: resp.statusCode,
  }
}

const onEvmLogTrigger = (runtime: Runtime<Config>, log: any): EventResult => {
  runtime.log("EVM log event received")

  const txHash = log.txHash ? bytesToHex(log.txHash) : "unknown"
  const address = log.address ? bytesToHex(log.address) : "unknown"

  runtime.log(`Event from ${address} in tx ${txHash}`)

  const eventPayload = JSON.stringify({
    address,
    txHash,
    blockNumber: log.blockNumber || 0,
    topics: log.topics || [],
    data: log.data ? bytesToHex(log.data) : "0x",
  })

  const result = runtime
    .runInNodeMode(
      (nr: NodeRuntime<Config>) => notifyWebhook(nr, eventPayload),
      consensusIdenticalAggregation()
    )()
    .result()

  runtime.log(`Webhook notified: ${result.notified}, status: ${result.statusCode}`)

  return result
}

const initWorkflow = (config: Config) => {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.evms[0].chainName,
  })

  if (!network) {
    throw new Error(`Unknown chain: ${config.evms[0].chainName}`)
  }

  const evmClient = new EVMClient(network.chainSelector.selector)

  return [
    handler(
      evmClient.logTrigger({
        addresses: [config.sourceContract],
        confidenceLevel: "CONFIDENCE_LEVEL_SAFE",
      }),
      onEvmLogTrigger
    ),
  ]
}

export async function main() {
  const runner = await Runner.newRunner<Config>()
  await runner.run(initWorkflow)
}
```

- [ ] **Step 3: Create `workflows/templates/event-responder/workflow.yaml`**

```yaml
staging-settings:
  user-workflow:
    workflow-name: "event-responder-staging"
  workflow-artifacts:
    workflow-path: "./main.ts"
    config-path: "./config.staging.json"
    secrets-path: ""

production-settings:
  user-workflow:
    workflow-name: "event-responder-production"
  workflow-artifacts:
    workflow-path: "./main.ts"
    config-path: "./config.staging.json"
    secrets-path: ""
```

- [ ] **Step 4: Create `workflows/templates/event-responder/config.staging.json`**

```json
{
  "chainName": "ethereum-testnet-sepolia",
  "sourceContract": "0x0000000000000000000000000000000000000000",
  "notifyUrl": "https://httpbin.org/post",
  "evms": [
    {
      "chainName": "ethereum-testnet-sepolia"
    }
  ]
}
```

- [ ] **Step 5: Create `workflows/templates/event-responder/package.json`**

```json
{
  "name": "event-responder-workflow",
  "version": "1.0.0",
  "main": "dist/main.js",
  "private": true,
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "license": "UNLICENSED",
  "dependencies": {
    "@chainlink/cre-sdk": "^1.5.0"
  },
  "devDependencies": {
    "typescript": "5.9.3"
  }
}
```

- [ ] **Step 6: Create `workflows/templates/event-responder/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext"],
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "types": []
  },
  "include": ["main.ts"]
}
```

- [ ] **Step 7: Commit**

```bash
git add workflows/templates/event-responder/
git commit -m "feat: add event-responder CRE workflow template"
```

---

### Task 4: Write failing tests for WorkflowManager

**Files:**
- Create: `agent/tests/tools/cre-workflows.test.ts`

- [ ] **Step 1: Write tests for WorkflowManager**

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/sairammr/Documents/GitHub/caas/agent && npx vitest run tests/tools/cre-workflows.test.ts`
Expected: FAIL with "Cannot find module" or similar (WorkflowManager does not exist yet)

- [ ] **Step 3: Commit**

```bash
git add agent/tests/tools/cre-workflows.test.ts
git commit -m "test: add failing tests for WorkflowManager"
```

---

### Task 5: Implement WorkflowManager class

**Files:**
- Create: `agent/src/tools/cre-workflows.ts`

- [ ] **Step 1: Implement `WorkflowManager`**

```typescript
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
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
}

export class WorkflowManager {
  private templatesDir: string;
  private configuredDir: string;
  private agentPrivateKey: string;
  private templates: Map<string, TemplateDefinition> = new Map();

  constructor(opts: WorkflowManagerOptions) {
    this.templatesDir = opts.templatesDir;
    this.configuredDir = opts.configuredDir;
    this.agentPrivateKey = opts.agentPrivateKey;
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

    // Copy template directory to configured
    const templateDir = path.join(this.templatesDir, templateName);
    fs.mkdirSync(instanceDir, { recursive: true });

    const files = fs.readdirSync(templateDir);
    for (const file of files) {
      if (file === "template.json") continue; // Skip metadata file

      const srcPath = path.join(templateDir, file);
      const destPath = path.join(instanceDir, file);
      let content = fs.readFileSync(srcPath, "utf-8");

      // Replace all {{paramName}} placeholders
      for (const [key, value] of Object.entries(fullParams)) {
        content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
      }

      fs.writeFileSync(destPath, content, "utf-8");
    }

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

    return `Configured workflow instance "${instanceName}" from template "${templateName}" at ${instanceDir}. Run: cre workflow simulate ${instanceName}`;
  }

  runWorkflow(
    instanceName: string,
    mode: "simulate" | "trigger" = "simulate",
    input?: Record<string, unknown>
  ): string {
    const instanceDir = path.join(this.configuredDir, instanceName);
    if (!fs.existsSync(instanceDir)) {
      throw new Error(`Instance not found: ${instanceName}`);
    }

    if (mode === "simulate") {
      try {
        const result = execSync("cre workflow simulate", {
          cwd: instanceDir,
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
    // This requires a deployed workflow with a workflow ID
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
      const result = execSync(`cre workflow ${action}`, {
        cwd: instanceDir,
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
          'Simulate or trigger a configured CRE workflow instance. Defaults to simulation mode. Use mode="trigger" only for deployed workflows.',
        parameters: {
          type: "object",
          properties: {
            instance: { type: "string", description: "Configured instance name" },
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
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd /Users/sairammr/Documents/GitHub/caas/agent && npx vitest run tests/tools/cre-workflows.test.ts`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add agent/src/tools/cre-workflows.ts
git commit -m "feat: implement WorkflowManager with 4 CRE tools"
```

---

### Task 6: Integrate WorkflowManager into agent startup

**Files:**
- Modify: `agent/src/index.ts`
- Modify: `agent/src/config.ts`

- [ ] **Step 1: Add CRE config fields to `agent/src/config.ts`**

Add these fields to the `Config` interface after the existing `mcpConfigPath` field:

```typescript
  creTemplatesDir: string;
  creConfiguredDir: string;
```

Add these to the return object in `loadConfig()` after the `mcpConfigPath` line:

```typescript
    creTemplatesDir: process.env.CRE_TEMPLATES_DIR || path.resolve(__dirname, "../../workflows/templates"),
    creConfiguredDir: process.env.CRE_CONFIGURED_DIR || path.resolve(__dirname, "../../workflows/configured"),
```

Add `import path from "node:path";` at the top of the file if not already present.

- [ ] **Step 2: Wire WorkflowManager into `agent/src/index.ts`**

Add this import after the existing tool imports:

```typescript
import { WorkflowManager } from "./tools/cre-workflows.js";
```

Add this block after the MCP Bridge section (after `if (mcpTools.length > 0) console.log(...)`):

```typescript
  // CRE Workflows
  const workflowManager = new WorkflowManager({
    templatesDir: config.creTemplatesDir,
    configuredDir: config.creConfiguredDir,
    agentPrivateKey: config.agentPrivateKey,
  });
  for (const tool of workflowManager.registerTools()) tools.register(tool);
  console.log(`[cre] Loaded ${workflowManager.listTemplates().length} workflow templates`);
```

- [ ] **Step 3: Run existing tests to verify nothing is broken**

Run: `cd /Users/sairammr/Documents/GitHub/caas/agent && npx vitest run`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add agent/src/config.ts agent/src/index.ts
git commit -m "feat: integrate WorkflowManager into agent startup"
```

---

### Task 7: Create configured directory and verify end-to-end

**Files:**
- Create: `workflows/configured/.gitkeep`

- [ ] **Step 1: Create the configured directory with .gitkeep**

```
workflows/configured/.gitkeep
```

(Empty file to ensure the directory is tracked by git.)

- [ ] **Step 2: Verify the agent builds successfully**

Run: `cd /Users/sairammr/Documents/GitHub/caas/agent && npm run build`
Expected: Build completes without errors

- [ ] **Step 3: Run the full test suite**

Run: `cd /Users/sairammr/Documents/GitHub/caas/agent && npx vitest run`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add workflows/configured/.gitkeep
git commit -m "feat: add configured workflows directory and verify build"
```
