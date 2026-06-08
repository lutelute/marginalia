import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** 区画名（どのパネルで落ちたかをエラー表示に出す） */
  name?: string;
  /** フォールバックを差し替えたい場合 */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Reactコンポーネントのクラッシュを区画内に閉じ込めるエラーバウンダリ。
 * これがないと1つの描画エラーでアプリ全体が白画面になる。
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      `[ErrorBoundary${this.props.name ? `:${this.props.name}` : ''}]`,
      error,
      info.componentStack
    );
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (error) {
      if (this.props.fallback) {
        return this.props.fallback(error, this.reset);
      }
      return (
        <div
          role="alert"
          style={{
            padding: '24px',
            color: 'var(--text-primary, #ccc)',
            background: 'var(--bg-primary, #1e1e1e)',
            height: '100%',
            overflow: 'auto',
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            ⚠️ {this.props.name ? `${this.props.name} で` : ''}エラーが発生しました
          </h2>
          <p>この区画の描画中に問題が発生しました。他の部分は引き続き利用できます。</p>
          <pre
            style={{
              background: 'rgba(255, 80, 80, 0.08)',
              border: '1px solid rgba(255, 80, 80, 0.3)',
              borderRadius: '6px',
              padding: '12px',
              whiteSpace: 'pre-wrap',
              fontSize: '12px',
            }}
          >
            {error.message}
          </pre>
          <button
            onClick={this.reset}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #444)',
              background: 'var(--bg-secondary, #2d2d2d)',
              color: 'inherit',
              cursor: 'pointer',
            }}
          >
            再試行
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
