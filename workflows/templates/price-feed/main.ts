import {
  bytesToHex,
  consensusMedianAggregation,
  type CronPayload,
  cre,
  getNetwork,
  type HTTPSendRequester,
  hexToBase64,
  Runner,
  type Runtime,
} from "@chainlink/cre-sdk"
import { encodeAbiParameters, parseAbiParameters } from "viem"
import { z } from "zod"

export const configSchema = z.object({
  schedule: z.string(),
  apiUrl: z.string(),
  evms: z.array(
    z.object({
      chainName: z.string(),
      consumerContract: z.string(),
      gasLimit: z.string(),
    })
  ),
})

type Config = z.infer<typeof configSchema>

const fetchPrice = (sendRequester: HTTPSendRequester, config: Config): bigint => {
  const resp = sendRequester
    .sendRequest({
      url: config.apiUrl,
      method: "GET",
    })
    .result()

  const bodyText = Buffer.from(resp.body).toString("utf-8")
  const price = Math.round(parseFloat(bodyText.trim()) * 1e8)
  return BigInt(price)
}

const onCronTrigger = (runtime: Runtime<Config>, _payload: CronPayload): string => {
  const evmConfig = runtime.config.evms[0]

  const httpClient = new cre.capabilities.HTTPClient()

  const price = httpClient
    .sendRequest(runtime, fetchPrice, consensusMedianAggregation<bigint>())
    (runtime.config)
    .result()

  runtime.log(`Fetched price: ${price}`)

  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: evmConfig.chainName,
    isTestnet: true,
  })
  if (!network) {
    throw new Error(`Unknown chain: ${evmConfig.chainName}`)
  }

  const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)

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

  return JSON.stringify({ price: price.toString(), txHash })
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
