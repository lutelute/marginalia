import React from 'react';
import { DiffResult, DiffLine, SideBySidePair, createSideBySidePairs } from '../../utils/diff';
import type { AnnotationV2 } from '../../types/annotations';
import { getTypeConfig } from '../../constants/annotationTypes';

/** 行番号（変更後）→ その行に掛かる注釈。DiffPanel が mapAnnotationsToLines で生成 */
export type AnnotationsByLine = Record<number, AnnotationV2[]>;

interface DiffViewerProps {
  diffResult: DiffResult;
  viewMode: 'unified' | 'side-by-side';
  annotationsByNewLine?: AnnotationsByLine;
}

/** 変更後の行に掛かる注釈マーカー（型色ドット + 件数、内容はツールチップ） */
function AnnotationGutter({ annotations }: { annotations?: AnnotationV2[] }) {
  if (!annotations || annotations.length === 0) {
    return <span className="diff-ann-gutter" />;
  }
  const tooltip = annotations
    .map((a) => `[${getTypeConfig(a.type).label}] ${a.author}: ${a.content}`)
    .join('\n');
  const color = getTypeConfig(annotations[0].type).color;
  return (
    <span className="diff-ann-gutter has-annotations" title={tooltip}>
      <span className="diff-ann-dot" style={{ backgroundColor: color }} />
      {annotations.length > 1 && <span className="diff-ann-count">{annotations.length}</span>}
    </span>
  );
}

function UnifiedView({
  lines,
  annotationsByNewLine,
}: {
  lines: DiffLine[];
  annotationsByNewLine?: AnnotationsByLine;
}) {
  return (
    <div className="diff-unified">
      {lines.map((line, index) => (
        <div key={index} className={`diff-line diff-${line.type}`}>
          <span className="diff-line-number old">
            {line.type !== 'added' ? line.oldLineNumber : ''}
          </span>
          <span className="diff-line-number new">
            {line.type !== 'removed' ? line.newLineNumber : ''}
          </span>
          <AnnotationGutter
            annotations={
              line.newLineNumber !== undefined
                ? annotationsByNewLine?.[line.newLineNumber]
                : undefined
            }
          />
          <span className="diff-line-prefix">
            {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
          </span>
          <span className="diff-line-content">{line.content || ' '}</span>
        </div>
      ))}
    </div>
  );
}

function SideBySideView({
  pairs,
  annotationsByNewLine,
}: {
  pairs: SideBySidePair[];
  annotationsByNewLine?: AnnotationsByLine;
}) {
  return (
    <div className="diff-side-by-side">
      <div className="diff-side left">
        <div className="diff-side-header">変更前</div>
        {pairs.map((pair, index) => (
          <div
            key={index}
            className={`diff-line ${pair.left ? `diff-${pair.left.type}` : 'diff-empty'}`}
          >
            <span className="diff-line-number">
              {pair.left?.oldLineNumber || ''}
            </span>
            <span className="diff-line-content">
              {pair.left?.content || ' '}
            </span>
          </div>
        ))}
      </div>
      <div className="diff-side right">
        <div className="diff-side-header">変更後</div>
        {pairs.map((pair, index) => (
          <div
            key={index}
            className={`diff-line ${pair.right ? `diff-${pair.right.type}` : 'diff-empty'}`}
          >
            <span className="diff-line-number">
              {pair.right?.newLineNumber || ''}
            </span>
            <AnnotationGutter
              annotations={
                pair.right?.newLineNumber !== undefined
                  ? annotationsByNewLine?.[pair.right.newLineNumber]
                  : undefined
              }
            />
            <span className="diff-line-content">
              {pair.right?.content || ' '}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DiffViewer({ diffResult, viewMode, annotationsByNewLine }: DiffViewerProps) {
  const annotatedLineCount = annotationsByNewLine ? Object.keys(annotationsByNewLine).length : 0;
  return (
    <div className="diff-viewer">
      <div className="diff-stats">
        <span className="stat added">+{diffResult.addedCount}</span>
        <span className="stat removed">-{diffResult.removedCount}</span>
        <span className="stat unchanged">{diffResult.unchangedCount} 行変更なし</span>
        {annotatedLineCount > 0 && (
          <span className="stat annotated">📍 注釈あり {annotatedLineCount} 行</span>
        )}
      </div>

      {viewMode === 'unified' ? (
        <UnifiedView lines={diffResult.lines} annotationsByNewLine={annotationsByNewLine} />
      ) : (
        <SideBySideView
          pairs={createSideBySidePairs(diffResult)}
          annotationsByNewLine={annotationsByNewLine}
        />
      )}

      <style>{`
        .diff-viewer {
          font-family: Menlo, Monaco, 'Courier New', monospace;
          font-size: 12px;
          overflow: auto;
        }

        .diff-stats {
          display: flex;
          gap: 12px;
          padding: 8px 12px;
          background-color: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
        }

        .diff-stats .stat {
          font-size: 11px;
          font-weight: 600;
        }

        .diff-stats .added {
          color: var(--success-color);
        }

        .diff-stats .removed {
          color: var(--error-color);
        }

        .diff-stats .unchanged {
          color: var(--text-muted);
        }

        .diff-stats .annotated {
          color: var(--text-secondary);
        }

        /* 注釈ガター */
        .diff-ann-gutter {
          width: 26px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 2px;
          flex-shrink: 0;
          user-select: none;
        }

        .diff-ann-gutter.has-annotations {
          cursor: help;
        }

        .diff-ann-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }

        .diff-ann-count {
          font-size: 10px;
          color: var(--text-muted);
        }

        /* Unified view */
        .diff-unified {
          padding: 8px 0;
        }

        .diff-unified .diff-line {
          display: flex;
          line-height: 1.6;
        }

        .diff-unified .diff-line-number {
          width: 40px;
          padding: 0 8px;
          text-align: right;
          color: var(--text-muted);
          background-color: var(--bg-secondary);
          user-select: none;
        }

        .diff-unified .diff-line-prefix {
          width: 20px;
          text-align: center;
          font-weight: bold;
          user-select: none;
        }

        .diff-unified .diff-line-content {
          flex: 1;
          padding: 0 8px;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .diff-unified .diff-added {
          background-color: rgba(76, 175, 80, 0.15);
        }

        .diff-unified .diff-added .diff-line-prefix {
          color: var(--success-color);
        }

        .diff-unified .diff-removed {
          background-color: rgba(244, 67, 54, 0.15);
        }

        .diff-unified .diff-removed .diff-line-prefix {
          color: var(--error-color);
        }

        /* Side by side view */
        .diff-side-by-side {
          display: flex;
        }

        .diff-side {
          flex: 1;
          overflow: auto;
        }

        .diff-side.left {
          border-right: 1px solid var(--border-color);
        }

        .diff-side-header {
          padding: 8px 12px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
          background-color: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
          position: sticky;
          top: 0;
        }

        .diff-side-by-side .diff-line {
          display: flex;
          line-height: 1.6;
          min-height: 1.6em;
        }

        .diff-side-by-side .diff-line-number {
          width: 40px;
          padding: 0 8px;
          text-align: right;
          color: var(--text-muted);
          background-color: var(--bg-secondary);
          user-select: none;
        }

        .diff-side-by-side .diff-line-content {
          flex: 1;
          padding: 0 8px;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .diff-side-by-side .diff-added {
          background-color: rgba(76, 175, 80, 0.15);
        }

        .diff-side-by-side .diff-removed {
          background-color: rgba(244, 67, 54, 0.15);
        }

        .diff-side-by-side .diff-empty {
          background-color: var(--bg-tertiary);
        }
      `}</style>
    </div>
  );
}

export default DiffViewer;
