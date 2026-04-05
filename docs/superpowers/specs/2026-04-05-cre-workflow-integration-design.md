# CRE Workflow Integration Design

## Overview

Integrate Chainlink Runtime Environment (CRE) workflows into the CaaS agent as first-class tools. The agent can use pre-defined workflow templates and configure new instances from them. Users interact via chat; the agent can also call workflows autonomously as part of its reasoning loop.

## Approach

**Approach A: CRE as Agent Tools.** Each workflow template/instance becomes a tool in the existing `ToolRegistry`. The `WorkflowManager` class follows the same pattern as `Scheduler` -- constructor takes config, `registerTools()` returns `RegisteredTool[]`.

## Decisions

- **Language:** TypeScript (matches agent codebase, uses Bun runtime)
- **Workflow creation model:** Template-based. Agent picks from a library of pre-built templates and fills in parameters. Does not write arbitrary workflow logic.
- **Trigger/result modes:** Both HTTP trigger + HTTP callback and HTTP trigger + EVM write. The template defines which pattern it uses.
- **Directory structure:** CRE project at repo root (`workflows/`) for CRE CLI compatibility. Agent references templates from there.
- **Access patterns:** User-initiated via chat, and agent-initiated autonomously (agent calls a workflow tool when it needs onchain data or offchain computation).
- **Lifecycle:** Simulation by default via `cre workflow simulate`. Deployment to DON available when user explicitly requests it. No confirmation guard -- `cre_manage_workflow` executes directly.

## Directory Structure

```
caas/
  agent/
    src/
      tools/
        cre-workflows.ts       # WorkflowManager + tool registrations
  workflows/                   # CRE project root (CRE CLI compatible)
    project.yaml               # CRE project config
    secrets.yaml               # Secret definitions
    templates/
      price-feed/
        template.json          # Template metadata + parameter schema
        workflow.ts            # CRE workflow source with {{placeholder}} tokens
        secrets.yaml           # Secret definitions for this template
      webhook-listener/
        template.json
        workflow.ts
        secrets.yaml
      event-responder/
        template.json
        workflow.ts
        secrets.yaml
    configured/                # User-configured workflow instances
      <instance-name>/
        config.json            # Filled parameters
        workflow.ts            # Generated from template (placeholders replaced)
        secrets.yaml           # Filled secrets
```

## Template Metadata Format

Each template has a `template.json`:

```json
{
  "name": "price-feed",
  "description": "Fetch asset price from an API and write it onchain",
  "category": "data-feeds",
  "trigger": "cron",
  "resultMode": "evm-write",
  "parameters": {
    "asset": {
      "type": "string",
      "description": "Asset symbol (e.g. ETH)",
      "required": true
    },
    "apiUrl": {
      "type": "string",
      "description": "Price API endpoint",
      "required": true
    },
    "cronSchedule": {
      "type": "string",
      "description": "Cron expression",
      "default": "0 */5 * * *"
    },
    "targetChain": {
      "type": "string",
      "description": "Target chain",
      "default": "ethereum-testnet-sepolia"
    },
    "consumerContract": {
      "type": "string",
      "description": "Consumer contract address",
      "required": true
    }
  }
}
```

## Tools

The `WorkflowManager` registers 4 tools:

### cre_list_workflows

Lists available templates and configured instances.

- **Parameters:** `{ filter?: string }` -- optional category or name filter
- **Returns:** JSON array of templates (name, description, category, trigger, parameters) and configured instances (name, template, status)
- **Used when:** User asks "what workflows do you have?" or agent discovers available capabilities

### cre_configure_workflow

Creates a configured workflow instance from a template.

- **Parameters:** `{ template: string, instanceName: string, params: Record<string, string> }`
- **Returns:** Success message with instance path and simulation command
- **Behavior:**
  1. Validates all required parameters are provided
  2. Copies template directory to `configured/<instanceName>/`
  3. Replaces `{{placeholder}}` tokens in `workflow.ts` with parameter values
  4. Writes `config.json` with the filled parameters
  5. Fills `secrets.yaml` with parameter values where needed
- **Used when:** User says "set up a price feed for ETH" or agent needs a new workflow instance

### cre_run_workflow

Simulates or triggers a configured workflow instance.

- **Parameters:** `{ instance: string, mode?: "simulate" | "trigger", input?: Record<string, unknown> }`
- **Defaults:** mode = "simulate"
- **Returns:** Workflow output (simulation stdout/stderr, or HTTP trigger response)
- **Behavior:**
  - **simulate:** Runs `cre workflow simulate` via `child_process.execSync` in the instance directory. Captures and returns stdout/stderr.
  - **trigger:** Constructs signed JWT (ES256, agent private key), sends JSON-RPC POST to CRE gateway with workflow ID and input payload. Gateway URL is read from the instance's `config.json` (set during `cre workflow deploy` output parsing, or from `project.yaml` network config). Returns response.
- **Used when:** Agent needs data from a workflow, or user says "run my price feed"

### cre_manage_workflow

Deploys, pauses, activates, or deletes a workflow on the DON.

- **Parameters:** `{ instance: string, action: "deploy" | "pause" | "activate" | "delete" }`
- **Returns:** CRE CLI output from the lifecycle command
- **Behavior:** Shells out to `cre workflow <action>` in the instance directory. Returns CLI output directly.
- **Used when:** User explicitly requests deployment or lifecycle operations

## WorkflowManager Class

Single file: `agent/src/tools/cre-workflows.ts`

```
WorkflowManager
  |- templatesDir: string
  |- configuredDir: string
  |- agentPrivateKey: string
  |- templates: Map<string, TemplateDefinition>
  |
  |- constructor(opts)           # sets paths, loads templates
  |- loadTemplates()             # reads all template.json from templatesDir
  |- listTemplates(filter?)      # returns template metadata
  |- listConfigured()            # returns configured instance metadata
  |- configureWorkflow(template, instanceName, params) # generate instance
  |- runWorkflow(instance, mode, input?) # simulate or trigger
  |- manageWorkflow(instance, action)    # deploy/pause/activate/delete
  |- registerTools() -> RegisteredTool[] # returns 4 tools
```

### Template Rendering

Simple `{{paramName}}` string replacement in workflow source files. No template engine. `String.replace()` with a regex matching `{{key}}` for each parameter.

### Simulation

```typescript
execSync("cre workflow simulate", { cwd: instanceDir, encoding: "utf-8" })
```

Captures stdout and stderr. Returns combined output as the tool result string.

### HTTP Triggering

For deployed workflows:
1. Build JWT payload: `{ workflowID, exp: now + 300 }`
2. Sign with ES256 using agent's private key
3. POST to CRE gateway:
   ```json
   {
     "jsonrpc": "2.0",
     "method": "cre_executeWorkflow",
     "params": { "workflowID": "...", "payload": {} },
     "id": 1
   }
   ```
4. Return response body as tool result

### Secrets Handling

Each configured instance gets its own `secrets.yaml`. During `configureWorkflow`, secret values referenced in parameters are written via `cre secrets set` CLI command.

## Integration Point

In `agent/src/index.ts`, after existing tool registrations:

```typescript
import { WorkflowManager } from "./tools/cre-workflows.js";

const workflowManager = new WorkflowManager({
  templatesDir: path.resolve(__dirname, "../../workflows/templates"),
  configuredDir: path.resolve(__dirname, "../../workflows/configured"),
  agentPrivateKey: config.agentPrivateKey,
});
for (const tool of workflowManager.registerTools()) tools.register(tool);
```

Follows the same pattern as `Scheduler` registration.

## Starter Templates

### price-feed

- **Trigger:** cron
- **Capabilities:** HTTP (fetch price API) + consensus (median aggregation)
- **Result:** evm-write (signed report to consumer contract)
- **Parameters:** asset, apiUrl, cronSchedule, targetChain, consumerContract

### webhook-listener

- **Trigger:** HTTP
- **Capabilities:** HTTP (call external API)
- **Result:** http-callback (return data to caller)
- **Parameters:** apiUrl, apiMethod, responseFormat

### event-responder

- **Trigger:** EVM log
- **Capabilities:** EVM read (read contract state) + HTTP (notify external service)
- **Result:** http-post (POST results to webhook URL)
- **Parameters:** sourceContract, eventSignature, sourceChain, notifyUrl

These three cover all trigger types (cron, HTTP, EVM log), both result modes (evm-write, HTTP), and the core capabilities.

## Execution Examples

### User-Initiated (Chat)

```
User: "Set up a price feed for ETH using CoinGecko"
  1. LLM calls cre_list_workflows -> sees price-feed template
  2. LLM calls cre_configure_workflow(template="price-feed", instanceName="eth-price",
     params={asset:"ETH", apiUrl:"https://api.coingecko.com/...", consumerContract:"0x..."})
  3. LLM calls cre_run_workflow(instance="eth-price", mode="simulate")
  4. Returns simulation results to user
```

### Agent-Initiated (Autonomous)

```
Agent reasoning: "I need current ETH price to answer this question"
  1. LLM calls cre_run_workflow(instance="eth-price", mode="simulate")
  2. Gets price data from simulation output
  3. Uses it in response to user
```

### Deployment (User Opt-In)

```
User: "Deploy my ETH price feed to mainnet"
  1. LLM calls cre_manage_workflow(instance="eth-price", action="deploy")
  2. Returns deployment CLI output
  3. LLM calls cre_manage_workflow(instance="eth-price", action="activate")
  4. Confirms activation to user
```
