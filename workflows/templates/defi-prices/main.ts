import {
  consensusIdenticalAggregation,
  type CronPayload,
  cre,
  type HTTPSendRequester,
  Runner,
  type Runtime,
} from "@chainlink/cre-sdk"
import { z } from "zod"

export const configSchema = z.object({
  schedule: z.string(),
  coingeckoIds: z.string(),
  tokenSymbols: z.string(),
})

type Config = z.infer<typeof configSchema>

type PriceResult = {
  prices: Record<string, { usd: number; usd_24h_change: number }>
  timestamp: string
}

const fetchPrices = (
  sendRequester: HTTPSendRequester,
  config: Config,
): PriceResult => {
  const ids = config.coingeckoIds
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`

  const resp = sendRequester
    .sendRequest({
      url,
      method: "GET",
    })
    .result()

  const bodyText = Buffer.from(resp.body).toString("utf-8")
  const data = JSON.parse(bodyText)

  const symbols = config.tokenSymbols.split(",")
  const idList = config.coingeckoIds.split(",")

  const prices: Record<string, { usd: number; usd_24h_change: number }> = {}
  for (let i = 0; i < idList.length; i++) {
    const id = idList[i].trim()
    const symbol = symbols[i]?.trim() || id
    const entry = data[id]
    if (entry) {
      prices[symbol] = {
        usd: entry.usd || 0,
        usd_24h_change: entry.usd_24h_change || 0,
      }
    }
  }

  return {
    prices,
    timestamp: new Date().toISOString(),
  }
}

const onCronTrigger = (runtime: Runtime<Config>, _payload: CronPayload): string => {
  const httpClient = new cre.capabilities.HTTPClient()

  const result = httpClient
    .sendRequest(runtime, fetchPrices, consensusIdenticalAggregation<PriceResult>())
    (runtime.config)
    .result()

  runtime.log(`Fetched prices: ${JSON.stringify(result.prices)}`)
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
