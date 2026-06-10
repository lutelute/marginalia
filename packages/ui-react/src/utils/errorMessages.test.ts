import { describe, it, expect } from 'vitest';
import { humanizeError } from './errorMessages';

describe('humanizeError', () => {
  it('Error.code === ENOENT を「ファイルが見つかりません」に変換する', () => {
    const err = Object.assign(new Error('ENOENT: no such file or directory'), {
      code: 'ENOENT',
    });
    expect(humanizeError(err)).toBe('ファイルが見つかりません');
  });

  it('メッセージ本文に埋め込まれた ENOENT も変換する（code 無し文字列）', () => {
    expect(humanizeError('ENOENT: no such file or directory, open foo.md')).toBe(
      'ファイルが見つかりません'
    );
  });

  it('EACCES を「アクセス権限がありません」に変換する', () => {
    const err = Object.assign(new Error('permission denied'), { code: 'EACCES' });
    expect(humanizeError(err)).toBe('アクセス権限がありません');
  });

  it('EPERM を「アクセス権限がありません」に変換する', () => {
    expect(humanizeError('EPERM: operation not permitted')).toBe(
      'アクセス権限がありません'
    );
  });

  it('ENOSPC を「ディスクの空き容量が不足しています」に変換する', () => {
    const err = Object.assign(new Error('no space left'), { code: 'ENOSPC' });
    expect(humanizeError(err)).toBe('ディスクの空き容量が不足しています');
  });

  it('EBUSY を「ファイルが他のプログラムで使用中です」に変換する', () => {
    expect(humanizeError('EBUSY: resource busy or locked')).toBe(
      'ファイルが他のプログラムで使用中です'
    );
  });

  it('EMFILE / ENFILE を「開いているファイルが多すぎます」に変換する', () => {
    expect(humanizeError('EMFILE: too many open files')).toBe(
      '開いているファイルが多すぎます'
    );
    expect(humanizeError('ENFILE: file table overflow')).toBe(
      '開いているファイルが多すぎます'
    );
  });

  it('EISDIR / ENOTDIR を専用メッセージに変換する', () => {
    expect(humanizeError('EISDIR: illegal operation on a directory')).toBe(
      '指定された対象はフォルダです（ファイルを指定してください）'
    );
    expect(humanizeError('ENOTDIR: not a directory')).toBe(
      '指定された対象はフォルダではありません'
    );
  });

  it('JSON パースエラー（SyntaxError）を「ファイルの形式が壊れています」に変換する', () => {
    let caught: unknown;
    try {
      JSON.parse('{ broken json ');
    } catch (e) {
      caught = e;
    }
    expect(humanizeError(caught)).toBe('ファイルの形式が壊れています');
  });

  it('YAMLException / parse を含むメッセージも形式破損として扱う', () => {
    expect(humanizeError('YAMLException: bad indentation at line 3')).toBe(
      'ファイルの形式が壊れています'
    );
  });

  it('未知のエラーは元のメッセージを「エラー: 」付きで返し情報を失わない', () => {
    expect(humanizeError(new Error('something weird happened'))).toBe(
      'エラー: something weird happened'
    );
    expect(humanizeError('custom failure text')).toBe('エラー: custom failure text');
  });

  it('null / undefined / 空メッセージは汎用メッセージにフォールバックする', () => {
    expect(humanizeError(null)).toBe('不明なエラーが発生しました');
    expect(humanizeError(undefined)).toBe('不明なエラーが発生しました');
    expect(humanizeError(new Error(''))).toBe('不明なエラーが発生しました');
  });

  it('未知 code を持つオブジェクトは message を元に変換する', () => {
    expect(humanizeError({ code: 'EUNKNOWN', message: 'mystery' })).toBe(
      'エラー: mystery'
    );
  });
});
