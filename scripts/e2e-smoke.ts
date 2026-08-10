import { spawn, type ChildProcess } from 'node:child_process';
import WebSocket from 'ws';
import { deserialize, serialize, type ClientMessage, type ServerMessage } from '../shared/protocol';

const PORT = 8092;
const URL = `ws://127.0.0.1:${PORT}`;

class TestClient {
  private ws: WebSocket | null = null;
  readonly inbox: ServerMessage[] = [];
  private waiters: { pred: (m: ServerMessage) => boolean; resolve: (m: ServerMessage) => void }[] = [];

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(URL);
      this.ws.on('open', () => resolve());
      this.ws.on('error', reject);
      this.ws.on('message', (data) => {
        const msg = deserialize(data.toString());
        if (msg === null) return;
        const serverMsg = msg as ServerMessage;
        this.inbox.push(serverMsg);
        this.waiters = this.waiters.filter((w) => {
          if (w.pred(serverMsg)) {
            w.resolve(serverMsg);
            return false;
          }
          return true;
        });
      });
    });
  }

  send(msg: ClientMessage): void {
    this.ws?.send(serialize(msg));
  }

  waitFor(pred: (m: ServerMessage) => boolean, timeoutMs = 5000): Promise<ServerMessage> {
    const existing = this.inbox.find(pred);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('waitFor timeout')), timeoutMs);
      this.waiters.push({
        pred,
        resolve: (m) => {
          clearTimeout(timer);
          resolve(m);
        },
      });
    });
  }

  close(): void {
    this.ws?.close();
  }
}

function assert(cond: boolean, label: string): void {
  if (!cond) throw new Error(`ASSERT FAILED: ${label}`);
  console.log(`  PASS: ${label}`);
}

async function main(): Promise<void> {
  console.log('[e2e] starting server...');
  const server: ChildProcess = spawn('npx', ['tsx', 'server/index.ts'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server start timeout')), 30000);
    server.stdout?.on('data', (data) => {
      if (String(data).includes('listening')) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.stderr?.on('data', (data) => {
      const text = String(data);
      if (text.includes('Error')) {
        clearTimeout(timer);
        reject(new Error(text));
      }
    });
  });
  try {
    const a = new TestClient();
    const b = new TestClient();
    await a.connect();
    console.log('[e2e] client A connected');
    a.send({ type: 'join', payload: { difficulty: 'easy' } });
    const joinedA = await a.waitFor((m) => m.type === 'joined');
    assert(joinedA.type === 'joined', 'A received joined');
    if (joinedA.type !== 'joined') return;
    const youA = joinedA.payload.you;
    const roomId = joinedA.payload.roomId;
    assert(joinedA.payload.cells.length === 81, 'snapshot has 81 cells');

    await b.connect();
    b.send({ type: 'join', payload: { difficulty: 'easy' } });
    const joinedB = await b.waitFor((m) => m.type === 'joined');
    assert(joinedB.type === 'joined' && joinedB.payload.roomId === roomId, 'B matched into same room');
    await a.waitFor((m) => m.type === 'playerJoined');
    assert(true, 'A notified playerJoined');

    const emptyIdx = joinedA.payload.cells.findIndex((c) => !c.given);
    const solutionValue = -1;
    void solutionValue;
    a.send({ type: 'op', payload: { op: { kind: 'note', index: emptyIdx, value: 1 } } });
    const appliedA = await a.waitFor((m) => m.type === 'opApplied');
    assert(appliedA.type === 'opApplied' && appliedA.payload.result === 'note', 'A note opApplied (authoritative confirm)');
    const appliedB = await b.waitFor((m) => m.type === 'opApplied');
    assert(appliedB.type === 'opApplied' && appliedB.payload.cellIndex === emptyIdx, 'B received broadcast with cellIndex');

    const givenIdx = joinedA.payload.cells.findIndex((c) => c.given);
    const givenValue = joinedA.payload.cells[givenIdx].value;
    a.send({ type: 'op', payload: { op: { kind: 'fill', index: givenIdx, value: givenValue } } });
    const rejected = await a.waitFor((m) => m.type === 'opRejected');
    assert(rejected.type === 'opRejected' && rejected.payload.reason === 'given-cell', 'given-cell fill rejected');

    b.close();
    await a.waitFor((m) => m.type === 'playerLeft');
    assert(true, 'A notified playerLeft after B disconnect');

    const c = new TestClient();
    await c.connect();
    c.send({ type: 'join', payload: { difficulty: 'easy' } });
    const joinedC = await c.waitFor((m) => m.type === 'joined');
    assert(joinedC.type === 'joined' && joinedC.payload.roomId === roomId, 'C refills vacated slot');
    if (joinedC.type === 'joined') {
      const cInfo = joinedC.payload.players.find((p) => p.id === joinedC.payload.you);
      assert(cInfo !== undefined && cInfo.mistakes === 0, 'C mistakes start at 0');
      assert(joinedC.payload.cells[emptyIdx].notes.includes(1), 'C sees A note from current board');
    }
    void youA;
    a.close();
    c.close();
    console.log('[e2e] ALL SCENARIOS PASSED');
  } finally {
    server.kill();
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error('[e2e] FAILED:', err);
    process.exit(1);
  },
);
