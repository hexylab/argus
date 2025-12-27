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

```mermaid
flowchart LR
    subgraph Local["Docker Compose"]
        FE["Frontend<br/>:3000"]
        API["FastAPI<br/>:8000"]
        Worker["Celery Worker"]

        subgraph Supabase["Supabase互換"]
            DB["PostgreSQL<br/>:5432"]
            AuthLocal["GoTrue<br/>:9999"]
            Studio["Studio<br/>:3001"]
        end

        MinIO["MinIO<br/>:9000"]
        Redis["Redis<br/>:6379"]
    end

    FE --> API
    API --> DB
    API --> MinIO
    API --> Redis
    Worker --> Redis
    Worker --> MinIO
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Supabase互換ローカル環境
  supabase-db:
    image: supabase/postgres:15.1.0.117
    ports:
      - "5432:5432"
    environment:
      POSTGRES_PASSWORD: postgres
    volumes:
      - supabase-db:/var/lib/postgresql/data

  supabase-auth:
    image: supabase/gotrue:v2.132.3
    depends_on:
      - supabase-db
    ports:
      - "9999:9999"
    environment:
      GOTRUE_SITE_URL: http://localhost:3000
      GOTRUE_JWT_SECRET: super-secret-jwt-token-for-dev

  supabase-studio:
    image: supabase/studio:20231123-64a766a
    ports:
      - "3001:3000"

  # S3互換ローカルストレージ
  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio-data:/data

  # Redis (Celery Queue)
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  # FastAPI Backend
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=development
      - SUPABASE_URL=http://supabase-auth:9999
      - SUPABASE_JWT_SECRET=super-secret-jwt-token-for-dev
      - S3_ENDPOINT=http://minio:9000
      - S3_ACCESS_KEY=minioadmin
      - S3_SECRET_KEY=minioadmin
      - S3_BUCKET=argus-videos
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./backend:/app
    depends_on:
      - supabase-db
      - minio
      - redis

  # Celery Worker
  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: celery -A app.worker worker --loglevel=info
    environment:
      - ENVIRONMENT=development
      - REDIS_URL=redis://redis:6379
      - S3_ENDPOINT=http://minio:9000
    volumes:
      - ./backend:/app
    depends_on:
      - redis
      - minio

  # Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=http://localhost:9999
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    volumes:
      - ./frontend:/app
      - /app/node_modules

volumes:
  supabase-db:
  minio-data:
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
