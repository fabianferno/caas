import {
  bytesToHex,
  consensusIdenticalAggregation,
  cre,
  getNetwork,
  type HTTPSendRequester,
  Runner,
  type Runtime,
} from "@chainlink/cre-sdk"
import { z } from "zod"

export const configSchema = z.object({
  evms: z.array(
    z.object({
      chainName: z.string(),
      sourceContract: z.string(),
      notifyUrl: z.string(),
    })
  ),
})

type Config = z.infer<typeof configSchema>

type EventResult = {
  notified: boolean
  statusCode: number
}

const notifyWebhook = (
  sendRequester: HTTPSendRequester,
  eventData: string,
  notifyUrl: string,
): EventResult => {
  const resp = sendRequester
    .sendRequest({
      url: notifyUrl,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: Buffer.from(eventData).toString("base64"),
    })
    .result()

  return {
    notified: resp.statusCode >= 200 && resp.statusCode < 300,
    statusCode: resp.statusCode,
  }
}

const onEvmLogTrigger = (runtime: Runtime<Config>, log: any): string => {
  runtime.log("EVM log event received")

  const evmConfig = runtime.config.evms[0]
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

  const httpClient = new cre.capabilities.HTTPClient()

  const result = httpClient
    .sendRequest(runtime, notifyWebhook, consensusIdenticalAggregation<EventResult>())
    (eventPayload, evmConfig.notifyUrl)
    .result()

  runtime.log(`Webhook notified: ${result.notified}, status: ${result.statusCode}`)

  return JSON.stringify(result)
}

function initWorkflow(config: Config) {
  const evmConfig = config.evms[0]
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: evmConfig.chainName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(`Unknown chain: ${evmConfig.chainName}`)
  }

  const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)

  return [
    cre.handler(
      evmClient.logTrigger({
        addresses: [evmConfig.sourceContract],
        confidenceLevel: "CONFIDENCE_LEVEL_SAFE",
      }),
      onEvmLogTrigger,
    ),
  ]
}

export async function main() {
  const runner = await Runner.newRunner({ configSchema })
  await runner.run(initWorkflow)
}

main()
