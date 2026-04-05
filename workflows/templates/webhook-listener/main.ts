import {
  consensusIdenticalAggregation,
  cre,
  type HTTPPayload,
  type HTTPSendRequester,
  Runner,
  type Runtime,
} from "@chainlink/cre-sdk"
import { z } from "zod"

export const configSchema = z.object({
  apiUrl: z.string(),
  apiMethod: z.string(),
})

type Config = z.infer<typeof configSchema>

type WebhookResult = {
  statusCode: number
  body: string
}

const callExternalApi = (sendRequester: HTTPSendRequester, config: Config): WebhookResult => {
  const resp = sendRequester
    .sendRequest({
      url: config.apiUrl,
      method: config.apiMethod as "GET" | "POST",
    })
    .result()

  const bodyText = Buffer.from(resp.body).toString("utf-8")

  return {
    statusCode: resp.statusCode,
    body: bodyText,
  }
}

const onHttpTrigger = (runtime: Runtime<Config>, _payload: HTTPPayload): string => {
  runtime.log("HTTP trigger received")

  const httpClient = new cre.capabilities.HTTPClient()

  const result = httpClient
    .sendRequest(runtime, callExternalApi, consensusIdenticalAggregation<WebhookResult>())
    (runtime.config)
    .result()

  runtime.log(`API response status: ${result.statusCode}`)

  return JSON.stringify(result)
}

function initWorkflow(config: Config) {
  const http = new cre.capabilities.HTTPCapability()
  return [
    cre.handler(
      http.trigger({ authorizedKeys: [] }),
      onHttpTrigger,
    ),
  ]
}

export async function main() {
  const runner = await Runner.newRunner({ configSchema })
  await runner.run(initWorkflow)
}

main()
