import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  formatUnits,
  parseUnits,
  type Address,
  type PublicClient,
  type WalletClient,
  zeroAddress,
} from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import type { RegisteredTool } from "../core/tools.js";
import type { WorkflowManager } from "./cre-workflows.js";

// --- ABI Definitions (for write operations only -- reads go through CRE) ---

const ERC20_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);

const FACTORY_ABI = parseAbi([
  "function getPair(address tokenA, address tokenB) view returns (address)",
]);

const PAIR_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() view returns (address)",
  "function totalSupply() view returns (uint256)",
]);

const ROUTER_ABI = parseAbi([
  "function getAmountsOut(uint256 amountIn, address[] calldata path) view returns (uint256[] memory amounts)",
  "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)",
  "function swapExactETHForTokens(uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) payable returns (uint256[] memory amounts)",
  "function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)",
  "function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) returns (uint256 amountA, uint256 amountB, uint256 liquidity)",
  "function addLiquidityETH(address token, uint256 amountTokenDesired, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity)",
  "function removeLiquidity(address tokenA, address tokenB, uint256 liquidity, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) returns (uint256 amountA, uint256 amountB)",
  "function removeLiquidityETH(address token, uint256 liquidity, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) returns (uint256 amountToken, uint256 amountETH)",
]);

// --- Types ---

export interface TokenConfig {
  symbol: string;
  address: string;
  decimals: number;
  coingeckoId: string;
}

export interface DeFiManagerOptions {
  agentPrivateKey: string;
  ethRpcUrl: string;
  tokens: TokenConfig[];
  routerAddress: string;
  factoryAddress: string;
  wethAddress: string;
  slippageBps: number;
  maxTradeAmountUsd: number;
  workflowManager: WorkflowManager;
}

interface PriceData {
  [symbol: string]: { usd: number; usd_24h_change?: number };
}

// --- DeFiManager ---
// Read operations (prices, positions, pools) delegate to CRE workflow simulations.
// Write operations (swap, add/remove liquidity) use viem directly because CRE's
// writeReport only supports KeystoneForwarder, not arbitrary contract calls.

export class DeFiManager {
  private publicClient: PublicClient;
  private walletClient: WalletClient;
  private account: ReturnType<typeof privateKeyToAccount>;
  private tokens: TokenConfig[];
  private routerAddress: Address;
  private factoryAddress: Address;
  private wethAddress: Address;
  private slippageBps: number;
  private maxTradeAmountUsd: number;
  private workflowManager: WorkflowManager;
  private instancesConfigured = false;

  constructor(opts: DeFiManagerOptions) {
    const key = (opts.agentPrivateKey.startsWith("0x")
      ? opts.agentPrivateKey
      : `0x${opts.agentPrivateKey}`) as `0x${string}`;
    this.account = privateKeyToAccount(key);
    this.publicClient = createPublicClient({
      chain: sepolia,
      transport: http(opts.ethRpcUrl),
    }) as PublicClient;
    this.walletClient = createWalletClient({
      account: this.account,
      chain: sepolia,
      transport: http(opts.ethRpcUrl),
    });
    this.tokens = opts.tokens;
    this.routerAddress = opts.routerAddress as Address;
    this.factoryAddress = opts.factoryAddress as Address;
    this.wethAddress = opts.wethAddress as Address;
    this.slippageBps = opts.slippageBps;
    this.maxTradeAmountUsd = opts.maxTradeAmountUsd;
    this.workflowManager = opts.workflowManager;
  }

  // --- CRE Workflow Helpers ---

  private ensureCREInstances(): void {
    if (this.instancesConfigured) return;

    const symbols = this.tokens.map((t) => t.symbol).join(",");
    const addresses = this.tokens.map((t) => t.address).join(",");
    const decimals = this.tokens.map((t) => t.decimals).join(",");
    const cgIds = this.tokens.map((t) => t.coingeckoId).join(",");

    // Configure defi-prices instance
    try {
      this.workflowManager.configureWorkflow("defi-prices", "defi-prices-active", {
        coingeckoIds: cgIds,
        tokenSymbols: symbols,
      });
    } catch {
      // Already configured
    }

    // Configure defi-positions instance
    try {
      this.workflowManager.configureWorkflow("defi-positions", "defi-positions-active", {
        agentAddress: this.account.address,
        tokenAddresses: addresses,
        tokenSymbols: symbols,
        tokenDecimals: decimals,
        factoryAddress: this.factoryAddress,
      });
    } catch {
      // Already configured
    }

    // Configure defi-pools instance
    try {
      this.workflowManager.configureWorkflow("defi-pools", "defi-pools-active", {
        tokenAddresses: addresses,
        tokenSymbols: symbols,
        tokenDecimals: decimals,
        coingeckoIds: cgIds,
        factoryAddress: this.factoryAddress,
      });
    } catch {
      // Already configured
    }

    this.instancesConfigured = true;
  }

  private runCREWorkflow(instanceName: string): string {
    return this.workflowManager.runWorkflow(instanceName, "simulate");
  }

  private extractJSON(creOutput: string): string | null {
    // CRE simulation outputs the result on a line like:
    //   Workflow Simulation Result:
    //   "{\"prices\":{...}}"
    // The result is a JSON-encoded string (double-quoted with escaped quotes).

    // Strategy 1: Find the "Simulation Result" line and parse the next line
    const lines = creOutput.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("Simulation Result")) {
        // The result may be on the same line or the next line
        const candidate = lines[i + 1]?.trim() || "";
        if (candidate.startsWith('"')) {
          try {
            // It's a JSON string wrapping the actual JSON
            const inner = JSON.parse(candidate);
            if (typeof inner === "string") {
              JSON.parse(inner); // validate
              return inner;
            }
          } catch {
            // Try without outer quotes
          }
        }
      }
    }

    // Strategy 2: Look for a double-quoted JSON string pattern in the output
    const resultMatch = creOutput.match(/"(\{[^"]*\})"/);
    if (resultMatch) {
      try {
        const unescaped = resultMatch[1].replace(/\\"/g, '"');
        JSON.parse(unescaped);
        return unescaped;
      } catch {
        // Not valid
      }
    }

    // Strategy 3: Find raw JSON lines
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith("{")) {
        try {
          JSON.parse(line);
          return line;
        } catch {
          // keep searching
        }
      }
    }

    return null;
  }

  // --- Shared Helpers ---

  // Direct price fetch used by write operations for fast safety cap checks.
  // Read operations use CRE workflows for price data instead.
  async fetchPrices(): Promise<PriceData> {
    const ids = this.tokens.map((t) => t.coingeckoId).join(",");
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`CoinGecko API error: ${resp.status}`);
    const data = await resp.json();
    const prices: PriceData = {};
    for (const token of this.tokens) {
      const entry = data[token.coingeckoId];
      if (entry) {
        prices[token.symbol] = {
          usd: entry.usd,
          usd_24h_change: entry.usd_24h_change,
        };
      }
    }
    return prices;
  }

  private async ensureApproval(
    tokenAddress: Address,
    spender: Address,
    amount: bigint
  ): Promise<string | null> {
    const allowance = (await this.publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [this.account.address, spender],
    })) as bigint;

    if (allowance >= amount) return null;

    const hash = await this.walletClient.writeContract({
      chain: sepolia,
      account: this.account,
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spender, amount],
    });
    await this.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  private resolveToken(symbol: string): TokenConfig | undefined {
    return this.tokens.find(
      (t) => t.symbol.toLowerCase() === symbol.toLowerCase()
    );
  }

  private applySlippage(amount: bigint): bigint {
    return (amount * BigInt(10000 - this.slippageBps)) / 10000n;
  }

  private deadline(): bigint {
    return BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 minutes
  }

  // --- CRE-backed Read Handlers ---

  private handleGetPrices(): string {
    this.ensureCREInstances();
    const output = this.runCREWorkflow("defi-prices-active");
    const json = this.extractJSON(output);
    if (json) return json;
    // Fallback: return raw CRE output
    return JSON.stringify({ creOutput: output, note: "Could not parse structured result from CRE workflow" });
  }

  private handleGetPositions(): string {
    this.ensureCREInstances();
    const output = this.runCREWorkflow("defi-positions-active");
    const json = this.extractJSON(output);
    if (json) return json;
    return JSON.stringify({ creOutput: output, note: "Could not parse structured result from CRE workflow" });
  }

  private handleScanPools(): string {
    this.ensureCREInstances();
    const output = this.runCREWorkflow("defi-pools-active");
    const json = this.extractJSON(output);
    if (json) return json;
    return JSON.stringify({ creOutput: output, note: "Could not parse structured result from CRE workflow" });
  }

  // --- Direct viem Write Handlers ---

  private async handleSwap(args: {
    fromToken: string;
    toToken: string;
    amount: string;
  }): Promise<string> {
    const fromConfig = this.resolveToken(args.fromToken);
    const toConfig = this.resolveToken(args.toToken);
    if (!fromConfig) return `Error: Unknown token "${args.fromToken}"`;
    if (!toConfig) return `Error: Unknown token "${args.toToken}"`;

    const amountIn = parseUnits(args.amount, fromConfig.decimals);

    // USD safety cap check (direct fetch for speed during writes)
    const prices = await this.fetchPrices();
    const fromPrice = prices[fromConfig.symbol]?.usd || 0;
    const tradeUsd = parseFloat(args.amount) * fromPrice;
    if (tradeUsd > this.maxTradeAmountUsd) {
      return `Error: Trade value $${tradeUsd.toFixed(2)} exceeds max allowed $${this.maxTradeAmountUsd}`;
    }

    const fromAddr = fromConfig.address as Address;
    const toAddr = toConfig.address as Address;
    const isFromETH =
      fromAddr.toLowerCase() === this.wethAddress.toLowerCase();
    const isToETH = toAddr.toLowerCase() === this.wethAddress.toLowerCase();

    // Build path -- try direct, fallback through WETH
    let path: Address[];
    if (isFromETH || isToETH) {
      path = [fromAddr, toAddr];
    } else {
      const directPair = (await this.publicClient.readContract({
        address: this.factoryAddress,
        abi: FACTORY_ABI,
        functionName: "getPair",
        args: [fromAddr, toAddr],
      })) as Address;
      if (directPair && directPair !== zeroAddress) {
        path = [fromAddr, toAddr];
      } else {
        path = [fromAddr, this.wethAddress, toAddr];
      }
    }

    // Get quote
    const amounts = (await this.publicClient.readContract({
      address: this.routerAddress,
      abi: ROUTER_ABI,
      functionName: "getAmountsOut",
      args: [amountIn, path],
    })) as bigint[];
    const amountOut = amounts[amounts.length - 1];
    const amountOutMin = this.applySlippage(amountOut);
    const dl = this.deadline();

    let hash: `0x${string}`;

    if (isFromETH) {
      hash = await this.walletClient.writeContract({
        chain: sepolia,
        account: this.account,
        address: this.routerAddress,
        abi: ROUTER_ABI,
        functionName: "swapExactETHForTokens",
        args: [amountOutMin, path, this.account.address, dl],
        value: amountIn,
      });
    } else if (isToETH) {
      await this.ensureApproval(fromAddr, this.routerAddress, amountIn);
      hash = await this.walletClient.writeContract({
        chain: sepolia,
        account: this.account,
        address: this.routerAddress,
        abi: ROUTER_ABI,
        functionName: "swapExactTokensForETH",
        args: [amountIn, amountOutMin, path, this.account.address, dl],
      });
    } else {
      await this.ensureApproval(fromAddr, this.routerAddress, amountIn);
      hash = await this.walletClient.writeContract({
        chain: sepolia,
        account: this.account,
        address: this.routerAddress,
        abi: ROUTER_ABI,
        functionName: "swapExactTokensForTokens",
        args: [amountIn, amountOutMin, path, this.account.address, dl],
      });
    }

    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash,
    });

    return JSON.stringify(
      {
        status: receipt.status === "success" ? "success" : "failed",
        txHash: hash,
        from: `${args.amount} ${fromConfig.symbol}`,
        toMin: `${formatUnits(amountOutMin, toConfig.decimals)} ${toConfig.symbol}`,
        quoted: `${formatUnits(amountOut, toConfig.decimals)} ${toConfig.symbol}`,
        path: path.map((a) => a),
        gasUsed: receipt.gasUsed.toString(),
      },
      null,
      2
    );
  }

  // Given a desired amount of tokenA, compute the optimal amount of tokenB
  // based on current pool reserves. Returns null if pool doesn't exist yet.
  private async quoteOptimalAmount(
    addrA: Address,
    addrB: Address,
    amountADesired: bigint,
    decimalsA: number,
    decimalsB: number
  ): Promise<{ amountB: bigint; reserveA: bigint; reserveB: bigint } | null> {
    const pairAddress = (await this.publicClient.readContract({
      address: this.factoryAddress,
      abi: FACTORY_ABI,
      functionName: "getPair",
      args: [addrA, addrB],
    })) as Address;

    if (!pairAddress || pairAddress === zeroAddress) return null;

    const token0 = (await this.publicClient.readContract({
      address: pairAddress,
      abi: PAIR_ABI,
      functionName: "token0",
    })) as Address;

    const reserves = (await this.publicClient.readContract({
      address: pairAddress,
      abi: PAIR_ABI,
      functionName: "getReserves",
    })) as [bigint, bigint, number];

    const isAToken0 = addrA.toLowerCase() === token0.toLowerCase();
    const reserveA = isAToken0 ? reserves[0] : reserves[1];
    const reserveB = isAToken0 ? reserves[1] : reserves[0];

    if (reserveA === 0n || reserveB === 0n) return null;

    // amountB = amountA * reserveB / reserveA (standard Uniswap V2 quote)
    const amountB = (amountADesired * reserveB) / reserveA;
    return { amountB, reserveA, reserveB };
  }

  private async handleAddLiquidity(args: {
    tokenA: string;
    tokenB: string;
    amountA: string;
    amountB?: string;
  }): Promise<string> {
    const configA = this.resolveToken(args.tokenA);
    const configB = this.resolveToken(args.tokenB);
    if (!configA) return `Error: Unknown token "${args.tokenA}"`;
    if (!configB) return `Error: Unknown token "${args.tokenB}"`;

    const addrA = configA.address as Address;
    const addrB = configB.address as Address;
    const amountADesired = parseUnits(args.amountA, configA.decimals);

    // Query pool reserves to compute optimal amountB
    let amountBDesired: bigint;
    const quote = await this.quoteOptimalAmount(
      addrA, addrB, amountADesired, configA.decimals, configB.decimals
    );

    if (quote) {
      // Pool exists -- use reserve-based optimal amount
      amountBDesired = quote.amountB;
    } else if (args.amountB) {
      // New pool -- use user-provided amountB
      amountBDesired = parseUnits(args.amountB, configB.decimals);
    } else {
      return `Error: Pool does not exist for ${configA.symbol}/${configB.symbol}. Provide amountB to create it.`;
    }

    // USD safety cap (direct fetch for speed during writes)
    const prices = await this.fetchPrices();
    const priceA = prices[configA.symbol]?.usd || 0;
    const priceB = prices[configB.symbol]?.usd || 0;
    const amountBHuman = parseFloat(formatUnits(amountBDesired, configB.decimals));
    const totalUsd = parseFloat(args.amountA) * priceA + amountBHuman * priceB;
    if (totalUsd > this.maxTradeAmountUsd) {
      return `Error: Liquidity value $${totalUsd.toFixed(2)} exceeds max $${this.maxTradeAmountUsd}`;
    }

    const isAETH = addrA.toLowerCase() === this.wethAddress.toLowerCase();
    const isBETH = addrB.toLowerCase() === this.wethAddress.toLowerCase();
    const dl = this.deadline();
    let hash: `0x${string}`;

    if (isAETH || isBETH) {
      const otherToken = isAETH ? configB : configA;
      const ethAmount = isAETH ? amountADesired : amountBDesired;
      const tokenAmount = isAETH ? amountBDesired : amountADesired;

      await this.ensureApproval(
        otherToken.address as Address,
        this.routerAddress,
        tokenAmount
      );

      hash = await this.walletClient.writeContract({
        chain: sepolia,
        account: this.account,
        address: this.routerAddress,
        abi: ROUTER_ABI,
        functionName: "addLiquidityETH",
        args: [
          otherToken.address as Address,
          tokenAmount,
          this.applySlippage(tokenAmount),
          this.applySlippage(ethAmount),
          this.account.address,
          dl,
        ],
        value: ethAmount,
      });
    } else {
      await this.ensureApproval(addrA, this.routerAddress, amountADesired);
      await this.ensureApproval(addrB, this.routerAddress, amountBDesired);

      hash = await this.walletClient.writeContract({
        chain: sepolia,
        account: this.account,
        address: this.routerAddress,
        abi: ROUTER_ABI,
        functionName: "addLiquidity",
        args: [
          addrA,
          addrB,
          amountADesired,
          amountBDesired,
          this.applySlippage(amountADesired),
          this.applySlippage(amountBDesired),
          this.account.address,
          dl,
        ],
      });
    }

    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash,
    });

    return JSON.stringify(
      {
        status: receipt.status === "success" ? "success" : "failed",
        txHash: hash,
        tokenA: `${args.amountA} ${configA.symbol}`,
        tokenB: `${formatUnits(amountBDesired, configB.decimals)} ${configB.symbol}`,
        note: quote ? "amountB auto-calculated from pool reserves" : "new pool created with provided amounts",
        gasUsed: receipt.gasUsed.toString(),
      },
      null,
      2
    );
  }

  private async handleRemoveLiquidity(args: {
    tokenA: string;
    tokenB: string;
    lpAmount: string;
  }): Promise<string> {
    const configA = this.resolveToken(args.tokenA);
    const configB = this.resolveToken(args.tokenB);
    if (!configA) return `Error: Unknown token "${args.tokenA}"`;
    if (!configB) return `Error: Unknown token "${args.tokenB}"`;

    const addrA = configA.address as Address;
    const addrB = configB.address as Address;

    const pairAddress = (await this.publicClient.readContract({
      address: this.factoryAddress,
      abi: FACTORY_ABI,
      functionName: "getPair",
      args: [addrA, addrB],
    })) as Address;

    if (!pairAddress || pairAddress === zeroAddress) {
      return `Error: No pool found for ${configA.symbol}/${configB.symbol}`;
    }

    let liquidity: bigint;
    if (args.lpAmount.toLowerCase() === "all") {
      liquidity = (await this.publicClient.readContract({
        address: pairAddress,
        abi: PAIR_ABI,
        functionName: "balanceOf",
        args: [this.account.address],
      })) as bigint;
      if (liquidity === 0n) return "Error: No LP tokens to remove";
    } else {
      liquidity = parseUnits(args.lpAmount, 18);
    }

    await this.ensureApproval(pairAddress, this.routerAddress, liquidity);

    const isAETH = addrA.toLowerCase() === this.wethAddress.toLowerCase();
    const isBETH = addrB.toLowerCase() === this.wethAddress.toLowerCase();
    const dl = this.deadline();
    let hash: `0x${string}`;

    if (isAETH || isBETH) {
      const otherToken = isAETH ? configB : configA;
      hash = await this.walletClient.writeContract({
        chain: sepolia,
        account: this.account,
        address: this.routerAddress,
        abi: ROUTER_ABI,
        functionName: "removeLiquidityETH",
        args: [
          otherToken.address as Address,
          liquidity,
          0n,
          0n,
          this.account.address,
          dl,
        ],
      });
    } else {
      hash = await this.walletClient.writeContract({
        chain: sepolia,
        account: this.account,
        address: this.routerAddress,
        abi: ROUTER_ABI,
        functionName: "removeLiquidity",
        args: [
          addrA,
          addrB,
          liquidity,
          0n,
          0n,
          this.account.address,
          dl,
        ],
      });
    }

    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash,
    });

    return JSON.stringify(
      {
        status: receipt.status === "success" ? "success" : "failed",
        txHash: hash,
        pair: `${configA.symbol}/${configB.symbol}`,
        lpRemoved: formatUnits(liquidity, 18),
        gasUsed: receipt.gasUsed.toString(),
      },
      null,
      2
    );
  }

  // --- Tool Registration ---

  registerTools(): RegisteredTool[] {
    return [
      {
        name: "defi_get_prices",
        description:
          "Get current token prices via CRE workflow (CoinGecko + consensus). Returns USD prices and 24h changes.",
        parameters: { type: "object", properties: {} },
        handler: async (): Promise<string> => {
          try {
            return this.handleGetPrices();
          } catch (err) {
            return `Error: ${err instanceof Error ? err.message : String(err)}`;
          }
        },
      },
      {
        name: "defi_get_positions",
        description:
          "Get agent wallet positions via CRE workflow (EVM reads). Returns ETH balance, token balances, and LP positions.",
        parameters: { type: "object", properties: {} },
        handler: async (): Promise<string> => {
          try {
            return this.handleGetPositions();
          } catch (err) {
            return `Error: ${err instanceof Error ? err.message : String(err)}`;
          }
        },
      },
      {
        name: "defi_scan_pools",
        description:
          "Scan Uniswap V2 pools via CRE workflow (HTTP + EVM reads). Returns reserves, TVL, price imbalances, and yield opportunities.",
        parameters: { type: "object", properties: {} },
        handler: async (): Promise<string> => {
          try {
            return this.handleScanPools();
          } catch (err) {
            return `Error: ${err instanceof Error ? err.message : String(err)}`;
          }
        },
      },
      {
        name: "defi_swap",
        description:
          "Swap tokens on Uniswap V2 (Sepolia). Supports ETH<->Token and Token<->Token swaps with slippage protection and USD safety cap.",
        parameters: {
          type: "object",
          properties: {
            fromToken: {
              type: "string",
              description: "Symbol of token to sell (e.g. WETH, USDC, LINK)",
            },
            toToken: {
              type: "string",
              description: "Symbol of token to buy",
            },
            amount: {
              type: "string",
              description:
                "Amount of fromToken to swap (in human-readable units)",
            },
          },
          required: ["fromToken", "toToken", "amount"],
        },
        handler: async (args: unknown): Promise<string> => {
          try {
            const a = args as {
              fromToken: string;
              toToken: string;
              amount: string;
            };
            return await this.handleSwap(a);
          } catch (err) {
            return `Error: ${err instanceof Error ? err.message : String(err)}`;
          }
        },
      },
      {
        name: "defi_add_liquidity",
        description:
          "Add liquidity to a Uniswap V2 pool on Sepolia. amountB is auto-calculated from pool reserves to match the correct ratio. Only provide amountB when creating a new pool.",
        parameters: {
          type: "object",
          properties: {
            tokenA: {
              type: "string",
              description: "Symbol of first token",
            },
            tokenB: {
              type: "string",
              description: "Symbol of second token",
            },
            amountA: {
              type: "string",
              description: "Amount of tokenA to deposit",
            },
            amountB: {
              type: "string",
              description: "Optional: amount of tokenB (only needed for new pools, auto-calculated otherwise)",
            },
          },
          required: ["tokenA", "tokenB", "amountA"],
        },
        handler: async (args: unknown): Promise<string> => {
          try {
            const a = args as {
              tokenA: string;
              tokenB: string;
              amountA: string;
              amountB?: string;
            };
            return await this.handleAddLiquidity(a);
          } catch (err) {
            return `Error: ${err instanceof Error ? err.message : String(err)}`;
          }
        },
      },
      {
        name: "defi_remove_liquidity",
        description:
          'Remove liquidity from a Uniswap V2 pool on Sepolia. Use lpAmount="all" to remove entire position.',
        parameters: {
          type: "object",
          properties: {
            tokenA: {
              type: "string",
              description: "Symbol of first token in the pair",
            },
            tokenB: {
              type: "string",
              description: "Symbol of second token in the pair",
            },
            lpAmount: {
              type: "string",
              description:
                'Amount of LP tokens to remove, or "all" for full withdrawal',
            },
          },
          required: ["tokenA", "tokenB", "lpAmount"],
        },
        handler: async (args: unknown): Promise<string> => {
          try {
            const a = args as {
              tokenA: string;
              tokenB: string;
              lpAmount: string;
            };
            return await this.handleRemoveLiquidity(a);
          } catch (err) {
            return `Error: ${err instanceof Error ? err.message : String(err)}`;
          }
        },
      },
    ];
  }
}
