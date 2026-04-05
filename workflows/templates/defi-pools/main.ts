import {
  consensusIdenticalAggregation,
  type CronPayload,
  cre,
  getNetwork,
  type HTTPSendRequester,
  Runner,
  type Runtime,
} from "@chainlink/cre-sdk"
import {
  encodeFunctionData,
  decodeFunctionResult,
  parseAbi,
  formatUnits,
} from "viem"
import { z } from "zod"

export const configSchema = z.object({
  schedule: z.string(),
  tokenAddresses: z.string(),
  tokenSymbols: z.string(),
  tokenDecimals: z.string(),
  coingeckoIds: z.string(),
  factoryAddress: z.string(),
  chainName: z.string(),
})

type Config = z.infer<typeof configSchema>

type PriceMap = Record<string, number>

const FACTORY_ABI = parseAbi([
  "function getPair(address tokenA, address tokenB) view returns (address)",
])

const PAIR_ABI = parseAbi([
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() view returns (address)",
  "function totalSupply() view returns (uint256)",
])

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

const fetchPrices = (
  sendRequester: HTTPSendRequester,
  coingeckoIds: string,
): PriceMap => {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoIds}&vs_currencies=usd`
  const resp = sendRequester.sendRequest({ url, method: "GET" }).result()
  const data = JSON.parse(Buffer.from(resp.body).toString("utf-8"))
  const prices: PriceMap = {}
  for (const [id, val] of Object.entries(data)) {
    prices[id] = (val as any).usd || 0
  }
  return prices
}

const onCronTrigger = (runtime: Runtime<Config>, _payload: CronPayload): string => {
  const config = runtime.config
  const addresses = config.tokenAddresses.split(",").map((s) => s.trim())
  const symbols = config.tokenSymbols.split(",").map((s) => s.trim())
  const decimals = config.tokenDecimals.split(",").map((s) => parseInt(s.trim(), 10))
  const cgIds = config.coingeckoIds.split(",").map((s) => s.trim())

  // Fetch external prices via HTTP
  const httpClient = new cre.capabilities.HTTPClient()
  const externalPrices = httpClient
    .sendRequest(runtime, fetchPrices, consensusIdenticalAggregation<PriceMap>())
    (config.coingeckoIds)
    .result()

  // Map coingecko IDs to symbols for price lookup
  const priceBySymbol: Record<string, number> = {}
  for (let i = 0; i < cgIds.length; i++) {
    priceBySymbol[symbols[i]] = externalPrices[cgIds[i]] || 0
  }

  // Setup EVM client
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.chainName,
    isTestnet: true,
  })
  if (!network) throw new Error(`Unknown chain: ${config.chainName}`)

  const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)

  // Scan all token pairs
  const pools: any[] = []
  for (let i = 0; i < addresses.length; i++) {
    for (let j = i + 1; j < addresses.length; j++) {
      try {
        // Get pair address
        const getPairData = encodeFunctionData({
          abi: FACTORY_ABI,
          functionName: "getPair",
          args: [addresses[i] as `0x${string}`, addresses[j] as `0x${string}`],
        })

        const pairResult = evmClient
          .callContract(runtime, { to: config.factoryAddress, data: getPairData })
          .result()

        const pairAddress = decodeFunctionResult({
          abi: FACTORY_ABI,
          functionName: "getPair",
          data: pairResult.data as `0x${string}`,
        }) as string

        if (!pairAddress || pairAddress === ZERO_ADDRESS) continue

        // Get token0 to determine ordering
        const token0Data = encodeFunctionData({
          abi: PAIR_ABI,
          functionName: "token0",
        })
        const token0Result = evmClient
          .callContract(runtime, { to: pairAddress, data: token0Data })
          .result()
        const token0Addr = decodeFunctionResult({
          abi: PAIR_ABI,
          functionName: "token0",
          data: token0Result.data as `0x${string}`,
        }) as string

        const isIToken0 = token0Addr.toLowerCase() === addresses[i].toLowerCase()
        const t0Idx = isIToken0 ? i : j
        const t1Idx = isIToken0 ? j : i

        // Get reserves
        const reservesData = encodeFunctionData({
          abi: PAIR_ABI,
          functionName: "getReserves",
        })
        const reservesResult = evmClient
          .callContract(runtime, { to: pairAddress, data: reservesData })
          .result()
        const [reserve0, reserve1] = decodeFunctionResult({
          abi: PAIR_ABI,
          functionName: "getReserves",
          data: reservesResult.data as `0x${string}`,
        }) as [bigint, bigint, number]

        // Get total supply
        const tsData = encodeFunctionData({
          abi: PAIR_ABI,
          functionName: "totalSupply",
        })
        const tsResult = evmClient
          .callContract(runtime, { to: pairAddress, data: tsData })
          .result()
        const totalSupply = decodeFunctionResult({
          abi: PAIR_ABI,
          functionName: "totalSupply",
          data: tsResult.data as `0x${string}`,
        }) as bigint

        const r0 = parseFloat(formatUnits(reserve0, decimals[t0Idx]))
        const r1 = parseFloat(formatUnits(reserve1, decimals[t1Idx]))
        const p0 = priceBySymbol[symbols[t0Idx]] || 0
        const p1 = priceBySymbol[symbols[t1Idx]] || 0
        const tvlUsd = r0 * p0 + r1 * p1
        const priceRatio = r1 > 0 ? r0 / r1 : 0
        const externalRatio = p1 > 0 ? p0 / p1 : 0
        const imbalancePct = externalRatio > 0
          ? Math.abs((priceRatio - externalRatio) / externalRatio) * 100
          : 0

        pools.push({
          pair: `${symbols[t0Idx]}/${symbols[t1Idx]}`,
          pairAddress,
          reserve0: formatUnits(reserve0, decimals[t0Idx]),
          reserve1: formatUnits(reserve1, decimals[t1Idx]),
          token0Symbol: symbols[t0Idx],
          token1Symbol: symbols[t1Idx],
          tvlUsd,
          priceRatio,
          externalRatio,
          imbalancePct,
          totalSupply: formatUnits(totalSupply, 18),
        })
      } catch {
        // Pair may not exist
      }
    }
  }

  // Sort by opportunity score
  pools.sort(
    (a, b) =>
      b.imbalancePct * Math.log1p(b.tvlUsd) -
      a.imbalancePct * Math.log1p(a.tvlUsd),
  )

  const result = { pools, timestamp: new Date().toISOString() }
  runtime.log(`Scanned ${pools.length} pools`)
  return JSON.stringify(result)
}

function initWorkflow(config: Config) {
  const cron = new cre.capabilities.CronCapability()
  return [
    cre.handler(
      cron.trigger({ schedule: config.schedule }),
      onCronTrigger,
    ),
  ]
}

export async function main() {
  const runner = await Runner.newRunner({ configSchema })
  await runner.run(initWorkflow)
}

main()
