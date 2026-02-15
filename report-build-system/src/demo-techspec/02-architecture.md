# アーキテクチャ

## システム構成

API Gatewayは以下のコンポーネントで構成される。

### Gateway Core

リクエストの受信、ルーティング判定、レスポンス返却を行うメインプロセス。非同期I/Oベースで高スループットを実現する。

### Auth Module

JWT検証とOAuth 2.0トークンの検証を担当する。Keycloakとの連携によりトークンの失効確認をリアルタイムで行う。

### Rate Limiter

Redis Clusterをバックエンドとしたスライディングウィンドウ方式のレート制限を実装する。

## 非機能要件

| 項目 | 要件 |
|------|------|
| レイテンシ | P99 < 50ms（Gateway処理のみ） |
| スループット | 10,000 req/s以上 |
| 可用性 | 99.95%（月間ダウンタイム < 22分） |
| 同時接続数 | 50,000コネクション以上 |

## デプロイメント

Kubernetes上にDeploymentとして配置し、HPA（Horizontal Pod Autoscaler）によるオートスケーリングを設定する。最小レプリカ数は3、最大は20とする。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    spec:
      containers:
      - name: gateway
        image: registry.internal/api-gateway:v0.3
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "2000m"
            memory: "2Gi"
```
