import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeFiManager } from "../../src/tools/defi-manager.js";

// Mock viem to avoid real RPC calls
vi.mock("viem", async () => {
  const actual = await vi.importActual("viem");
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      getBalance: vi.fn(async () => 1000000000000000000n), // 1 ETH
      readContract: vi.fn(async ({ functionName }: any) => {
        if (functionName === "balanceOf") return 500000000000000000n;
        if (functionName === "allowance") return 0n;
        if (functionName === "getPair")
          return "0x0000000000000000000000000000000000000000";
        if (functionName === "getAmountsOut") return [100n, 200n];
        return 0n;
      }),
      waitForTransactionReceipt: vi.fn(async () => ({
        status: "success",
        gasUsed: 21000n,
      })),
    })),
    createWalletClient: vi.fn(() => ({
      writeContract: vi.fn(async () => "0xmocktxhash"),
    })),
  };
});

vi.mock("viem/accounts", async () => {
  const actual = await vi.importActual("viem/accounts");
  return {
    ...actual,
    privateKeyToAccount: vi.fn(() => ({
      address: "0x1234567890abcdef1234567890abcdef12345678",
    })),
  };
});

// Mock WorkflowManager
const mockWorkflowManager = {
  configureWorkflow: vi.fn(),
  runWorkflow: vi.fn(() =>
    JSON.stringify({
      prices: {
        WETH: { usd: 3000, usd_24h_change: 2.5 },
        USDC: { usd: 1.0, usd_24h_change: 0.01 },
        LINK: { usd: 15.0, usd_24h_change: -1.2 },
      },
      timestamp: "2026-01-01T00:00:00.000Z",
    })
  ),
  listTemplates: vi.fn(() => []),
  listConfigured: vi.fn(() => []),
  registerTools: vi.fn(() => []),
} as any;

const DEFAULT_OPTS = {
  agentPrivateKey: "0x" + "a".repeat(64),
  ethRpcUrl: "https://rpc.test",
  tokens: [
    {
      symbol: "WETH",
      address: "0xfff9976782d46cc05630d1f6ebab18b2324d6b14",
      decimals: 18,
      coingeckoId: "ethereum",
    },
    {
      symbol: "USDC",
      address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      decimals: 6,
      coingeckoId: "usd-coin",
    },
    {
      symbol: "LINK",
      address: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
      decimals: 18,
      coingeckoId: "chainlink",
    },
  ],
  routerAddress: "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3",
  factoryAddress: "0xF62c03E08ada871A0bEb309762E260a7a6a880E6",
  wethAddress: "0xfff9976782d46cc05630d1f6ebab18b2324d6b14",
  slippageBps: 100,
  maxTradeAmountUsd: 100,
  workflowManager: mockWorkflowManager,
};

describe("DeFiManager", () => {
  let manager: DeFiManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new DeFiManager(DEFAULT_OPTS);
  });

  describe("registerTools", () => {
    it("returns 6 tools with correct names", () => {
      const tools = manager.registerTools();
      expect(tools).toHaveLength(6);
      const names = tools.map((t) => t.name);
      expect(names).toContain("defi_get_prices");
      expect(names).toContain("defi_get_positions");
      expect(names).toContain("defi_scan_pools");
      expect(names).toContain("defi_swap");
      expect(names).toContain("defi_add_liquidity");
      expect(names).toContain("defi_remove_liquidity");
    });

    it("all tools have descriptions and handlers", () => {
      const tools = manager.registerTools();
      for (const tool of tools) {
        expect(tool.description).toBeTruthy();
        expect(typeof tool.handler).toBe("function");
        expect(tool.parameters).toBeDefined();
      }
    });
  });

  describe("defi_get_prices (CRE-backed)", () => {
    it("delegates to CRE workflow and returns parsed result", async () => {
      const tools = manager.registerTools();
      const priceTool = tools.find((t) => t.name === "defi_get_prices")!;
      const result = await priceTool.handler({});
      const parsed = JSON.parse(result);

      expect(parsed.prices).toBeDefined();
      expect(parsed.prices.WETH.usd).toBe(3000);
      expect(parsed.timestamp).toBeDefined();
      // Verify CRE workflow was configured and run
      expect(mockWorkflowManager.configureWorkflow).toHaveBeenCalledWith(
        "defi-prices",
        "defi-prices-active",
        expect.any(Object)
      );
      expect(mockWorkflowManager.runWorkflow).toHaveBeenCalledWith(
        "defi-prices-active",
        "simulate"
      );
    });

    it("configures CRE instances only once", async () => {
      const tools = manager.registerTools();
      const priceTool = tools.find((t) => t.name === "defi_get_prices")!;
      await priceTool.handler({});
      await priceTool.handler({});
      // configureWorkflow called 3 times (prices, positions, pools) only on first invocation
      expect(mockWorkflowManager.configureWorkflow).toHaveBeenCalledTimes(3);
    });
  });

  describe("defi_get_positions (CRE-backed)", () => {
    it("delegates to CRE workflow", async () => {
      mockWorkflowManager.runWorkflow.mockReturnValueOnce(
        JSON.stringify({
          agent: "0x1234",
          nativeETH: { balance: "1.0" },
          tokens: [],
          lpPositions: [],
          timestamp: "2026-01-01T00:00:00.000Z",
        })
      );

      const tools = manager.registerTools();
      const posTool = tools.find((t) => t.name === "defi_get_positions")!;
      const result = await posTool.handler({});
      const parsed = JSON.parse(result);

      expect(parsed.agent).toBeDefined();
      expect(parsed.nativeETH).toBeDefined();
      expect(mockWorkflowManager.runWorkflow).toHaveBeenCalledWith(
        "defi-positions-active",
        "simulate"
      );
    });
  });

  describe("defi_scan_pools (CRE-backed)", () => {
    it("delegates to CRE workflow", async () => {
      mockWorkflowManager.runWorkflow.mockReturnValueOnce(
        JSON.stringify({
          pools: [],
          timestamp: "2026-01-01T00:00:00.000Z",
        })
      );

      const tools = manager.registerTools();
      const poolTool = tools.find((t) => t.name === "defi_scan_pools")!;
      const result = await poolTool.handler({});
      const parsed = JSON.parse(result);

      expect(parsed.pools).toBeDefined();
      expect(mockWorkflowManager.runWorkflow).toHaveBeenCalledWith(
        "defi-pools-active",
        "simulate"
      );
    });
  });

  describe("defi_swap safety cap", () => {
    it("rejects trades exceeding maxTradeAmountUsd", async () => {
      global.fetch = vi.fn(async () => ({
        ok: true,
        json: async () => ({
          ethereum: { usd: 3000 },
          "usd-coin": { usd: 1.0 },
          chainlink: { usd: 15.0 },
        }),
      })) as any;

      const tools = manager.registerTools();
      const swapTool = tools.find((t) => t.name === "defi_swap")!;

      // Try to swap 1 ETH at $3000 -- exceeds $100 cap
      const result = await swapTool.handler({
        fromToken: "WETH",
        toToken: "USDC",
        amount: "1",
      });
      expect(result).toContain("Error");
      expect(result).toContain("exceeds max");
    });

    it("rejects unknown tokens", async () => {
      const tools = manager.registerTools();
      const swapTool = tools.find((t) => t.name === "defi_swap")!;
      const result = await swapTool.handler({
        fromToken: "FAKE",
        toToken: "USDC",
        amount: "1",
      });
      expect(result).toContain("Error");
      expect(result).toContain("Unknown token");
    });
  });

  describe("fetchPrices (direct, used by write operations)", () => {
    it("maps coingeckoIds to token symbols", async () => {
      global.fetch = vi.fn(async () => ({
        ok: true,
        json: async () => ({
          ethereum: { usd: 2500, usd_24h_change: 1.0 },
          "usd-coin": { usd: 0.999, usd_24h_change: -0.1 },
          chainlink: { usd: 12.5, usd_24h_change: 3.0 },
        }),
      })) as any;

      const prices = await manager.fetchPrices();
      expect(prices.WETH.usd).toBe(2500);
      expect(prices.USDC.usd).toBe(0.999);
      expect(prices.LINK.usd).toBe(12.5);
    });
  });

  describe("CRE workflow configuration", () => {
    it("configures all 3 CRE workflow instances", async () => {
      const tools = manager.registerTools();
      const priceTool = tools.find((t) => t.name === "defi_get_prices")!;
      await priceTool.handler({});

      expect(mockWorkflowManager.configureWorkflow).toHaveBeenCalledWith(
        "defi-prices",
        "defi-prices-active",
        expect.objectContaining({ coingeckoIds: "ethereum,usd-coin,chainlink" })
      );
      expect(mockWorkflowManager.configureWorkflow).toHaveBeenCalledWith(
        "defi-positions",
        "defi-positions-active",
        expect.objectContaining({ agentAddress: expect.any(String) })
      );
      expect(mockWorkflowManager.configureWorkflow).toHaveBeenCalledWith(
        "defi-pools",
        "defi-pools-active",
        expect.objectContaining({ factoryAddress: expect.any(String) })
      );
    });

    it("handles already-configured instances gracefully", async () => {
      mockWorkflowManager.configureWorkflow.mockImplementation(() => {
        throw new Error("Instance already exists");
      });

      const tools = manager.registerTools();
      const priceTool = tools.find((t) => t.name === "defi_get_prices")!;
      // Should not throw even if configureWorkflow fails
      const result = await priceTool.handler({});
      expect(result).toBeTruthy();
    });
  });
});
