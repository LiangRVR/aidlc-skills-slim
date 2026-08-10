import { deserialize, serialize, type ClientMessage, type ServerMessage } from '../../shared/protocol';

export interface WsTransport {
  connect(url: string): Promise<void>;
  send(msg: ClientMessage): void;
  onMessage(cb: (msg: ServerMessage) => void): void;
  onClose(cb: () => void): void;
  close(): void;
}

export class WebSocketClient implements WsTransport {
  private ws: WebSocket | null = null;
  private messageCb: ((msg: ServerMessage) => void) | null = null;
  private closeCb: (() => void) | null = null;

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;
      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch (err) {
        reject(err);
        return;
      }
      this.ws = ws;
      ws.onopen = () => {
        settled = true;
        resolve();
      };
      ws.onerror = () => {
        if (!settled) reject(new Error('connection failed'));
      };
      ws.onmessage = (event: MessageEvent) => {
        if (typeof event.data !== 'string') return;
        const msg = deserialize(event.data);
        if (msg === null) {
          console.warn('ignored malformed frame');
          return;
        }
        this.messageCb?.(msg as ServerMessage);
      };
      ws.onclose = () => {
        this.closeCb?.();
      };
    });
  }

  send(msg: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(serialize(msg));
    }
  }

  onMessage(cb: (msg: ServerMessage) => void): void {
    this.messageCb = cb;
  }

  onClose(cb: () => void): void {
    this.closeCb = cb;
  }

  close(): void {
    const ws = this.ws;
    this.ws = null;
    ws?.close();
  }
}
