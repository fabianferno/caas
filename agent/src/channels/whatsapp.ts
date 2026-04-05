import makeWASocketDefault, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";

// Handle both ESM default export styles
const makeWASocket = (makeWASocketDefault as any).default ?? makeWASocketDefault;
type WASocket = ReturnType<typeof makeWASocket>;
import type { Channel, MessageHandler, IncomingMessage } from "./types.js";
import type { AgentResponse } from "../core/types.js";

export interface WhatsAppChannelOptions {
  sessionDir: string;
  allowedUserIds: string[];
}

const MAX_RECONNECT_ATTEMPTS = 3;

export class WhatsAppChannel implements Channel {
  name = "whatsapp";
  private socket: WASocket | null = null;
  private sessionDir: string;
  private allowedUserIds: Set<string>;
  private handler: MessageHandler | null = null;
  private stopping = false;
  private reconnectAttempts = 0;

  constructor(opts: WhatsAppChannelOptions) {
    this.sessionDir = opts.sessionDir;
    this.allowedUserIds = new Set(opts.allowedUserIds);
  }

  async start(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(this.sessionDir);
    this.socket = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      logger: { level: "silent", child: () => ({}) } as any,
    });

    this.socket.ev.on("creds.update", saveCreds);

    this.socket.ev.on("connection.update", (update: any) => {
      const { connection, lastDisconnect } = update;
      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        if (
          statusCode !== DisconnectReason.loggedOut &&
          !this.stopping &&
          this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS
        ) {
          this.reconnectAttempts++;
          console.log(
            `[whatsapp] Reconnecting (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`
          );
          setTimeout(() => this.start(), 3000);
        } else if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.warn(
            "[whatsapp] Max reconnect attempts reached. Pair your phone by scanning the QR code."
          );
        } else {
          console.log("[whatsapp] Logged out");
        }
      } else if (connection === "open") {
        this.reconnectAttempts = 0;
        console.log("[whatsapp] Connected");
      }
    });

    this.socket.ev.on("messages.upsert", ({ messages }: any) => {
      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;
        const userId = msg.key.remoteJid || "";
        if (
          this.allowedUserIds.size > 0 &&
          !this.allowedUserIds.has(userId.replace("@s.whatsapp.net", ""))
        ) {
          continue;
        }
        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          "";
        if (!text || !this.handler) continue;
        const incoming: IncomingMessage = {
          channelName: "whatsapp",
          conversationId: userId,
          userId,
          text,
        };
        this.handler(incoming);
      }
    });
  }

  async stop(): Promise<void> {
    this.stopping = true;
    this.socket?.end(undefined);
    this.socket = null;
  }

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  async send(conversationId: string, response: AgentResponse): Promise<void> {
    if (!this.socket) return;
    await this.socket.sendMessage(conversationId, { text: response.text });
  }
}
