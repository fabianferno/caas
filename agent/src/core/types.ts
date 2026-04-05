export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LLMResponse {
  content: string | null;
  toolCalls: ToolCall[] | null;
}

export interface AgentResponse {
  text: string;
  media?: MediaAttachment[];
}

export interface MediaAttachment {
  type: "image" | "audio" | "file";
  data: Buffer;
  mimeType: string;
  filename?: string;
}

export interface StoredConversation {
  id: string;
  channelName: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}
