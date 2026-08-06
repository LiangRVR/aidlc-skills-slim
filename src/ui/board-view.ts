import Phaser from 'phaser';

export const BOARD_SIZE = 468;
export const CELL_SIZE = BOARD_SIZE / 9;

export interface BoardSnapshot {
  board: number[];
  notes: number[][];
  isGiven: (index: number) => boolean;
  selectedIndex: number | null;
  conflicts: Set<number>;
  wrongCells: Set<number>;
}

const COLOR_GIVEN = '#212121';
const COLOR_USER = '#1565c0';
const COLOR_WRONG = '#d32f2f';
const COLOR_NOTE = '#616161';

export class BoardView {
  private readonly originX: number;
  private readonly originY: number;
  private readonly highlight: Phaser.GameObjects.Graphics;
  private readonly grid: Phaser.GameObjects.Graphics;
  private readonly valueTexts: Phaser.GameObjects.Text[] = [];
  private readonly noteTexts: Phaser.GameObjects.Text[][] = [];

  constructor(scene: Phaser.Scene, originX: number, originY: number, onCellClick: (index: number) => void) {
    this.originX = originX;
    this.originY = originY;
    this.highlight = scene.add.graphics();
    this.grid = scene.add.graphics();
    for (let i = 0; i < 81; i++) {
      const { cx, cy } = this.cellCenter(i);
      const value = scene.add
        .text(cx, cy, '', { fontFamily: 'Arial', fontSize: '30px', color: COLOR_USER })
        .setOrigin(0.5);
      this.valueTexts.push(value);
      const notes: Phaser.GameObjects.Text[] = [];
      for (let n = 0; n < 9; n++) {
        const nx = this.originX + (i % 9) * CELL_SIZE + (n % 3) * (CELL_SIZE / 3) + CELL_SIZE / 6;
        const ny = this.originY + Math.floor(i / 9) * CELL_SIZE + Math.floor(n / 3) * (CELL_SIZE / 3) + CELL_SIZE / 6;
        notes.push(
          scene.add
            .text(nx, ny, '', { fontFamily: 'Arial', fontSize: '13px', color: COLOR_NOTE })
            .setOrigin(0.5),
        );
      }
      this.noteTexts.push(notes);
    }
    const zone = scene.add.zone(originX, originY, BOARD_SIZE, BOARD_SIZE).setOrigin(0).setInteractive();
    zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const col = Math.floor((pointer.x - originX) / CELL_SIZE);
      const row = Math.floor((pointer.y - originY) / CELL_SIZE);
      if (row >= 0 && row < 9 && col >= 0 && col < 9) onCellClick(row * 9 + col);
    });
    this.drawGrid();
  }

  render(snapshot: BoardSnapshot): void {
    this.drawHighlights(snapshot);
    for (let i = 0; i < 81; i++) {
      const value = snapshot.board[i];
      const text = this.valueTexts[i];
      if (value !== 0) {
        text.setText(String(value));
        const wrong = snapshot.wrongCells.has(i);
        text.setColor(wrong ? COLOR_WRONG : snapshot.isGiven(i) ? COLOR_GIVEN : COLOR_USER);
        text.setFontStyle(snapshot.isGiven(i) ? 'bold' : 'normal');
      } else {
        text.setText('');
      }
      const cellNotes = snapshot.notes[i] ?? [];
      for (let n = 0; n < 9; n++) {
        const show = value === 0 && cellNotes.includes(n + 1);
        this.noteTexts[i][n].setText(show ? String(n + 1) : '');
      }
    }
  }

  private drawHighlights(snapshot: BoardSnapshot): void {
    this.highlight.clear();
    this.highlight.fillStyle(0xffffff, 1).fillRect(this.originX, this.originY, BOARD_SIZE, BOARD_SIZE);
    const selected = snapshot.selectedIndex;
    const peers = new Set<number>();
    const sameValue = new Set<number>();
    if (selected !== null) {
      const row = Math.floor(selected / 9);
      const col = selected % 9;
      for (let k = 0; k < 9; k++) {
        peers.add(row * 9 + k);
        peers.add(k * 9 + col);
      }
      const br = Math.floor(row / 3) * 3;
      const bc = Math.floor(col / 3) * 3;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) peers.add((br + r) * 9 + (bc + c));
      const selectedValue = snapshot.board[selected];
      if (selectedValue !== 0) {
        for (let i = 0; i < 81; i++) if (snapshot.board[i] === selectedValue) sameValue.add(i);
      }
    }
    for (let i = 0; i < 81; i++) {
      const x = this.originX + (i % 9) * CELL_SIZE;
      const y = this.originY + Math.floor(i / 9) * CELL_SIZE;
      if (snapshot.conflicts.has(i)) {
        this.highlight.fillStyle(0xffcdd2, 1).fillRect(x, y, CELL_SIZE, CELL_SIZE);
      } else if (i === selected) {
        this.highlight.fillStyle(0xbbdefb, 1).fillRect(x, y, CELL_SIZE, CELL_SIZE);
      } else if (sameValue.has(i)) {
        this.highlight.fillStyle(0xc8e6c9, 1).fillRect(x, y, CELL_SIZE, CELL_SIZE);
      } else if (peers.has(i)) {
        this.highlight.fillStyle(0xe3f2fd, 1).fillRect(x, y, CELL_SIZE, CELL_SIZE);
      }
    }
  }

  private drawGrid(): void {
    this.grid.clear();
    for (let k = 0; k <= 9; k++) {
      const thick = k % 3 === 0;
      this.grid.lineStyle(thick ? 3 : 1, thick ? 0x424242 : 0xbdbdbd, 1);
      const p = this.originX + k * CELL_SIZE;
      this.grid.lineBetween(p, this.originY, p, this.originY + BOARD_SIZE);
      const q = this.originY + k * CELL_SIZE;
      this.grid.lineBetween(this.originX, q, this.originX + BOARD_SIZE, q);
    }
  }

  private cellCenter(index: number): { cx: number; cy: number } {
    return {
      cx: this.originX + (index % 9) * CELL_SIZE + CELL_SIZE / 2,
      cy: this.originY + Math.floor(index / 9) * CELL_SIZE + CELL_SIZE / 2,
    };
  }
}
