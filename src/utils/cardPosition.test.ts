import { describe, it, expect, vi, afterEach } from 'vitest';
import { clampHoverCardX, HOVER_CARD_WIDTH, HOVER_CARD_MARGIN } from './cardPosition';

describe('clampHoverCardX', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('ビューポート内なら中央寄せの左端を返す', () => {
    vi.stubGlobal('window', { innerWidth: 1000 });
    // centerX=500, width=320 → 500 - 160 = 340
    expect(clampHoverCardX(500)).toBe(500 - HOVER_CARD_WIDTH / 2);
  });

  it('左にはみ出す場合はマージンでクランプ', () => {
    vi.stubGlobal('window', { innerWidth: 1000 });
    expect(clampHoverCardX(0)).toBe(HOVER_CARD_MARGIN);
  });

  it('右にはみ出す場合は innerWidth - width - margin でクランプ', () => {
    vi.stubGlobal('window', { innerWidth: 1000 });
    expect(clampHoverCardX(2000)).toBe(1000 - HOVER_CARD_WIDTH - HOVER_CARD_MARGIN);
  });

  it('カード幅・マージンを引数で上書きできる', () => {
    vi.stubGlobal('window', { innerWidth: 800 });
    expect(clampHoverCardX(400, 200, 16)).toBe(300);
    expect(clampHoverCardX(0, 200, 16)).toBe(16);
    expect(clampHoverCardX(1000, 200, 16)).toBe(800 - 200 - 16);
  });
});
