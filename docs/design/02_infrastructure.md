# Argus - インフラストラクチャ構成

## ハイブリッド構成: Supabase + AWS

認証・メタデータ管理にSupabaseを使用し、映像処理・AI推論にAWSを使用するハイブリッド構成。

```mermaid
flowchart TB
    subgraph Frontend["Frontend Layer"]
        NextJS["Next.js<br/>Vercel / CloudFront"]
    end

    subgraph Supabase["Supabase"]
        Auth["Auth<br/>認証・セッション"]
        PostgreSQL["PostgreSQL<br/>・プロジェクト<br/>・アノテーション<br/>・ユーザー設定"]
        Storage["Storage<br/>・サムネイル<br/>・プロフィール画像"]
        Realtime["Realtime<br/>・進捗通知<br/>・チャット"]
    end

    subgraph AWS["AWS"]
        subgraph Compute["Compute"]
            APIGateway["API Gateway + ECS<br/>FastAPI"]
            Worker["SQS + ECS Worker<br/>・映像エンコード<br/>・フレーム抽出"]
            GPU["EC2 GPU (g4dn/g5)<br/>・AI推論 (SAM 3, SigLIP 2)<br/>・モデル学習"]
        end

        S3["S3<br/>・映像ファイル<br/>・抽出フレーム<br/>・学習データセット<br/>・学習済みモデル"]
    end

    NextJS --> Auth
    NextJS --> APIGateway
    Auth -->|JWT検証| APIGateway
    APIGateway --> PostgreSQL
    APIGateway --> S3
    Worker --> S3
    GPU --> S3
    APIGateway --> Worker
    Worker --> GPU
```

## 環境別構成

### ローカル開発環境

Supabase CLI を使用してローカル開発環境を構築。Kong API Gateway 経由で Supabase API にアクセス。

```mermaid
flowchart LR
    subgraph SupabaseCLI["Supabase CLI (supabase start)"]
        Kong["Kong API GW<br/>:54321"]
        DB["PostgreSQL<br/>:54322"]
        StudioLocal["Studio<br/>:54323"]
        Inbucket["Inbucket<br/>:54324"]
    end

    subgraph DockerCompose["Docker Compose"]
        FE["Frontend<br/>:3000"]
        API["FastAPI<br/>:8000"]
        Worker["Celery Worker"]
        MinIO["MinIO<br/>:9000"]
        Redis["Redis<br/>:6379"]
    end

    FE --> Kong
    FE --> API
    API --> Kong
    API --> DB
    API --> MinIO
    API --> Redis
    Worker --> Redis
    Worker --> MinIO
```

#### ポート一覧

| サービス | ポート | 説明 |
|---------|--------|------|
| Supabase API (Kong) | 54321 | 認証 API (`/auth/v1/*`) |
| PostgreSQL | 54322 | データベース |
| Supabase Studio | 54323 | DB 管理 UI |
| Inbucket | 54324 | メールテスト UI |
| Frontend | 3000 | Next.js |
| Backend | 8000 | FastAPI |
| MinIO API | 9000 | S3 互換ストレージ |
| MinIO Console | 9001 | MinIO 管理 UI |
| Redis | 6379 | Celery ブローカー |

#### 起動手順

```bash
# 1. Supabase を起動
make supabase-start

# 2. 認証情報を確認して .env に設定
make supabase-status
# → anon key と JWT secret を docker/.env にコピー

# 3. 全サービスを起動
make up-dev

# アクセス
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# Supabase Studio: http://localhost:54323
# Inbucket (メール確認): http://localhost:54324
```

#### 構成ファイル

```yaml
# docker/docker-compose.yml - インフラ (Redis, MinIO)
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    command: server /data --console-address ":9001"

# docker/docker-compose.dev.yml - アプリケーション
services:
  backend:
    environment:
      - SUPABASE_URL=http://host.docker.internal:54321
      - DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:54322/postgres
    extra_hosts:
      - "host.docker.internal:host-gateway"

  frontend:
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
      - SUPABASE_URL=http://host.docker.internal:54321
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

### ステージング環境

```mermaid
flowchart TB
    Vercel["Vercel<br/>Frontend"]

    subgraph Supabase["Supabase Pro"]
        Auth["Auth"]
        DB["PostgreSQL"]
        Storage["Storage"]
        RT["Realtime"]
    end

    subgraph AWS["AWS"]
        ECS["ECS Fargate<br/>API"]
        S3["S3<br/>映像"]
        EC2["EC2 g4dn.xlarge<br/>Spot GPU Worker"]
    end

    Vercel --> Supabase
    Vercel --> ECS
    ECS --> DB
    ECS --> S3
    EC2 --> S3
```

### 本番環境

```mermaid
flowchart TB
    CDN["CloudFront + Vercel"]

    subgraph Supabase["Supabase Pro / RDS"]
        Auth["Auth"]
        DB["PostgreSQL"]
    end

    subgraph AWS["AWS VPC"]
        ALB["ALB"]

        subgraph ECSCluster["ECS Auto Scaling"]
            ECS1["ECS API"]
            ECS2["ECS API"]
            ECS3["..."]
        end

        S3CF["S3 + CloudFront<br/>映像配信"]
        SQS["SQS"]

        subgraph EKS["EKS GPU Node Group"]
            GPU1["g4dn.xlarge Spot"]
            GPU2["g4dn.xlarge Spot"]
        end

        ElastiCache["ElastiCache<br/>Redis"]
    end

    CDN --> Auth
    CDN --> ALB
    ALB --> ECSCluster
    ECSCluster --> DB
    ECSCluster --> S3CF
    ECSCluster --> SQS
    SQS --> EKS
    EKS --> S3CF
    ECSCluster --> ElastiCache
```

## 映像アップロードフロー

ユーザーはPresigned URLを使用してS3に直接アップロード（サーバー負荷軽減）。

```mermaid
sequenceDiagram
    actor User as Frontend
    participant API as FastAPI
    participant DB as Supabase
    participant S3 as S3
    participant Worker as Worker

    User->>API: 1. Upload URL要求
    API->>DB: 2. メタデータ保存
    API->>S3: 3. Presigned URL生成
    API-->>User: 4. URL返却

    User->>S3: 5. 直接アップロード

    User->>API: 6. 完了通知
    API->>DB: 7. ステータス更新
    API->>Worker: 8. 処理ジョブ投入 (SQS)

    Worker->>S3: 9. 映像取得・フレーム抽出
    Worker->>S3: 10. フレーム保存
    Worker->>DB: 11. フレーム情報登録
```

## 段階的スケールアップ

```mermaid
flowchart LR
    subgraph Phase1["開発・MVP"]
        L1["ローカルDocker<br/>+ MinIO"]
    end

    subgraph Phase2["β版"]
        L2["Supabase Pro<br/>+ S3<br/>+ ECS 1台"]
    end

    subgraph Phase3["本番 小"]
        L3["Supabase Pro<br/>+ S3<br/>+ ECS Auto Scaling"]
    end

    subgraph Phase4["本番 中"]
        L4["RDS<br/>+ S3<br/>+ EKS<br/>+ GPU Spot"]
    end

    subgraph Phase5["大規模"]
        L5["マルチリージョン<br/>+ 専用GPU"]
    end

    Phase1 --> Phase2 --> Phase3 --> Phase4 --> Phase5
```

| フェーズ | 構成 | 想定規模 | 月額コスト目安 |
|---------|------|---------|---------------|
| 開発・MVP | ローカルDocker + MinIO | 〜100本 | $0 |
| β版 | Supabase Pro + S3 + ECS (1台) | 〜1,000本 | ~$100 |
| 本番 (小) | Supabase Pro + S3 + ECS Auto Scaling | 〜10,000本 | ~$300 |
| 本番 (中) | RDS + S3 + EKS + GPU Spot | 〜100,000本 | ~$1,000 |
| 大規模 | マルチリージョン + 専用GPU | 100万本〜 | 要見積 |

## セキュリティ考慮事項

### 認証・認可
- Supabase Auth による認証（OAuth、Magic Link）
- JWT による API 認可
- Row Level Security (RLS) によるデータ分離

### ネットワーク
- VPC 内でのサービス間通信
- S3 VPC Endpoint によるプライベートアクセス
- WAF による API 保護

### データ保護
- S3 サーバーサイド暗号化 (SSE-S3)
- PostgreSQL 暗号化
- TLS 1.3 による通信暗号化

### 監査
- CloudTrail によるAPI操作ログ
- Supabase ログによる認証ログ

## コスト最適化戦略

1. **GPU インスタンス**: Spot Instance 活用（最大70%削減）
2. **S3**: Intelligent-Tiering で自動階層化
3. **ECS**: Fargate Spot で API コスト削減
4. **映像処理**: 必要なフレームのみ抽出・保存
5. **CDN**: CloudFront でオリジン負荷軽減
