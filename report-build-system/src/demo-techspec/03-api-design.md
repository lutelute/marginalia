# API設計

## エンドポイント一覧

### 認証API

| メソッド | パス | 説明 |
|----------|------|------|
| POST | `/auth/token` | アクセストークン発行 |
| POST | `/auth/refresh` | トークンリフレッシュ |
| DELETE | `/auth/revoke` | トークン失効 |

### 推論API

| メソッド | パス | 説明 |
|----------|------|------|
| POST | `/api/v1/chat` | チャット推論リクエスト |
| POST | `/api/v1/embeddings` | テキスト埋め込みベクトル生成 |
| GET | `/api/v1/models` | 利用可能モデル一覧 |

## リクエスト仕様

### チャット推論リクエスト

```json
{
  "model": "company-llm-v2",
  "messages": [
    {"role": "system", "content": "あなたは社内アシスタントです。"},
    {"role": "user", "content": "先月の売上レポートを要約してください。"}
  ],
  "max_tokens": 2048,
  "temperature": 0.7
}
```

### レスポンス仕様

```json
{
  "id": "chat-20260205-001",
  "model": "company-llm-v2",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "先月の売上は..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 45,
    "completion_tokens": 320,
    "total_tokens": 365
  }
}
```

## エラーコード

| コード | 意味 | 対処 |
|--------|------|------|
| 401 | 認証エラー | トークンを再取得 |
| 429 | レート制限超過 | `Retry-After`ヘッダーの秒数後にリトライ |
| 502 | バックエンド障害 | サーキットブレーカー発動中、自動復旧を待つ |
| 503 | サービス過負荷 | オートスケーリング中、しばらく後にリトライ |
