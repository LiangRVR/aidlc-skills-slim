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
    a.send({ type: 'op', payload: { op: { kind: 'note', index: emptyIdx, value: 1 } } });
    const appliedA = await a.waitFor((m) => m.type === 'opApplied');
    assert(appliedA.type === 'opApplied' && appliedA.payload.result === 'note', 'A note opApplied (authoritative confirm)');
    if (appliedA.type === 'opApplied' && appliedA.payload.result === 'note') {
      assert(appliedA.payload.notes.includes(1), 'A note opApplied carries own notes');
    }
    await new Promise((r) => setTimeout(r, 300));
    assert(!b.inbox.some((m) => m.type === 'opApplied'), 'B receives nothing for A note (notes are private)');

    const emptyIdx2 = joinedA.payload.cells.findIndex((c, i) => !c.given && i !== emptyIdx);
    b.send({ type: 'op', payload: { op: { kind: 'fill', index: emptyIdx2, value: 1 } } });
    const appliedB = await b.waitFor((m) => m.type === 'opApplied');
    assert(
      appliedB.type === 'opApplied' && (appliedB.payload.result === 'correct' || appliedB.payload.result === 'wrong'),
      'B fill opApplied (correct or wrong)',
    );
    const broadcastA = await a.waitFor((m) => m.type === 'opApplied' && m.payload.result !== 'note');
    assert(
      broadcastA.type === 'opApplied' && broadcastA.payload.result !== 'note' && broadcastA.payload.cellIndex === emptyIdx2,
      'A received fill broadcast with cellIndex',
    );
    if (broadcastA.type === 'opApplied') {
      assert(typeof broadcastA.payload.scores[broadcastA.payload.playerId] === 'number', 'opApplied carries scores');
    }

    const givenIdx = joinedA.payload.cells.findIndex((c) => c.given);
    const givenValue = joinedA.payload.cells[givenIdx].value;
    a.send({ type: 'op', payload: { op: { kind: 'fill', index: givenIdx, value: givenValue } } });
    const rejected = await a.waitFor((m) => m.type === 'opRejected');
    assert(rejected.type === 'opRejected' && rejected.payload.reason === 'given-cell', 'given-cell fill rejected');

    b.close();
    const overA = await a.waitFor((m) => m.type === 'gameOver');
    assert(overA.type === 'gameOver' && overA.payload.reason === 'forfeit', 'A notified gameOver forfeit after B disconnect');
    if (overA.type === 'gameOver') {
      assert(overA.payload.winnerId === youA, 'forfeit winner is remaining player A');
    }

    const c = new TestClient();
    await c.connect();
    c.send({ type: 'join', payload: { difficulty: 'easy' } });
    const joinedC = await c.waitFor((m) => m.type === 'joined');
    assert(joinedC.type === 'joined' && joinedC.payload.roomId !== roomId, 'C gets a fresh room (no refill into forfeited room)');
    if (joinedC.type === 'joined') {
      const cInfo = joinedC.payload.players.find((p) => p.id === joinedC.payload.you);
      assert(cInfo !== undefined && cInfo.score === 0, 'C score starts at 0');
      assert(joinedC.payload.players.length === 1, 'C alone in fresh room');
      assert(joinedC.payload.yourNotes[emptyIdx] === undefined, 'C cannot see other player notes (private)');
    }
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
