import {
  type CronPayload,
  cre,
  getNetwork,
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
  agentAddress: z.string(),
  tokenAddresses: z.string(),
  tokenSymbols: z.string(),
  tokenDecimals: z.string(),
  factoryAddress: z.string(),
  chainName: z.string(),
})

type Config = z.infer<typeof configSchema>

const ERC20_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
])

const FACTORY_ABI = parseAbi([
  "function getPair(address tokenA, address tokenB) view returns (address)",
])

const PAIR_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
])

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

const onCronTrigger = (runtime: Runtime<Config>, _payload: CronPayload): string => {
  const config = runtime.config
  const addresses = config.tokenAddresses.split(",").map((s) => s.trim())
  const symbols = config.tokenSymbols.split(",").map((s) => s.trim())
  const decimals = config.tokenDecimals.split(",").map((s) => parseInt(s.trim(), 10))
  const agent = config.agentAddress

  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.chainName,
    isTestnet: true,
  })
  if (!network) throw new Error(`Unknown chain: ${config.chainName}`)

  const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)

  // Read native ETH balance
  const ethBalance = evmClient
    .balanceAt(runtime, { address: agent })
    .result()

  const ethFormatted = formatUnits(BigInt(ethBalance.balance || "0"), 18)

  // Read ERC20 balances
  const tokenBalances: { symbol: string; balance: string; address: string }[] = []
  for (let i = 0; i < addresses.length; i++) {
    const callData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [agent as `0x${string}`],
    })

    const result = evmClient
      .callContract(runtime, {
        to: addresses[i],
        data: callData,
      })
      .result()

    const decoded = decodeFunctionResult({
      abi: ERC20_ABI,
      functionName: "balanceOf",
      data: result.data as `0x${string}`,
    }) as bigint

    tokenBalances.push({
      symbol: symbols[i],
      balance: formatUnits(decoded, decimals[i]),
      address: addresses[i],
    })
  }

  // Read LP positions for all token pairs
  const lpPositions: { pair: string; lpBalance: string; pairAddress: string }[] = []
  for (let i = 0; i < addresses.length; i++) {
    for (let j = i + 1; j < addresses.length; j++) {
      const getPairData = encodeFunctionData({
        abi: FACTORY_ABI,
        functionName: "getPair",
        args: [addresses[i] as `0x${string}`, addresses[j] as `0x${string}`],
      })

      try {
        const pairResult = evmClient
          .callContract(runtime, {
            to: config.factoryAddress,
            data: getPairData,
          })
          .result()

        const pairAddress = decodeFunctionResult({
          abi: FACTORY_ABI,
          functionName: "getPair",
          data: pairResult.data as `0x${string}`,
        }) as string

        if (pairAddress && pairAddress !== ZERO_ADDRESS) {
          const lpBalData = encodeFunctionData({
            abi: PAIR_ABI,
            functionName: "balanceOf",
            args: [agent as `0x${string}`],
          })

          const lpResult = evmClient
            .callContract(runtime, {
              to: pairAddress,
              data: lpBalData,
            })
            .result()

          const lpBal = decodeFunctionResult({
            abi: PAIR_ABI,
            functionName: "balanceOf",
            data: lpResult.data as `0x${string}`,
          }) as bigint

          if (lpBal > 0n) {
            lpPositions.push({
              pair: `${symbols[i]}/${symbols[j]}`,
              lpBalance: formatUnits(lpBal, 18),
              pairAddress,
            })
          }
        }
      } catch {
        // Pair may not exist
      }
    }
  }

  const result = {
    agent,
    nativeETH: { balance: ethFormatted },
    tokens: tokenBalances,
    lpPositions,
    timestamp: new Date().toISOString(),
  }

  runtime.log(`Positions: ${JSON.stringify(result)}`)
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
