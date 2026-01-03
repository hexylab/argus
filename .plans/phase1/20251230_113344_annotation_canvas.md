# Issue #16: 基本 Canvas と画像表示 実装計画

**作成日時**: 2025-12-30 11:33
**Issue**: #16 基本 Canvas と画像表示
**ブランチ**: `feature/#16-annotation-canvas`

## 概要

react-konva を使った基本的な Canvas コンポーネントと画像表示を実装する。

## 完了条件

- フレーム画像が Canvas 上に表示される
- ズーム・パンで画像を操作できる

## 依存関係

- #15 (映像詳細 UI) - 完了済み

## 実装ファイル一覧

### Backend (新規)

| ファイル | 説明 |
|----------|------|
| `backend/app/api/v1/frames.py` | フレーム単体取得エンドポイント追加 |

### Frontend (新規)

| ファイル | 説明 |
|----------|------|
| `frontend/src/components/annotation/ImageLayer.tsx` | 画像レイヤー (use-image フック使用) |
| `frontend/src/components/annotation/AnnotationCanvas.tsx` | メインCanvas (ズーム・パン機能) |
| `frontend/src/app/(protected)/projects/[id]/videos/[videoId]/frames/[frameId]/page.tsx` | アノテーション画面 |
| `frontend/src/app/(protected)/projects/[id]/videos/[videoId]/frames/[frameId]/actions.ts` | Server Actions |
| `frontend/empty.js` | Turbopack canvas モジュールダミー |

### Frontend (修正)

| ファイル | 説明 |
|----------|------|
| `frontend/src/types/frame.ts` | `image_url` フィールド追加 |
| `frontend/src/lib/api/frames.ts` | `getFrame` 関数追加 |
| `frontend/src/app/(protected)/projects/[id]/videos/[videoId]/components/frame-grid.tsx` | クリックでアノテーション画面へ |
| `frontend/next.config.ts` | Turbopack canvas 設定追加 |

## 技術選定

### react-konva

- React用のKonva.jsバインディング
- 宣言的なCanvas操作が可能
- Next.js 15 App Router では `dynamic(() => import(...), { ssr: false })` が必要

### use-image

- react-konva 用の画像読み込みフック
- loading/failed 状態の管理が容易

## API 仕様

### GET `/api/v1/projects/{project_id}/videos/{video_id}/frames/{frame_id}`

フレーム単体を取得する。フルサイズ画像の presigned URL を含む。

**Response**:
```json
{
  "id": "uuid",
  "video_id": "uuid",
  "frame_number": 0,
  "timestamp_ms": 0,
  "s3_key": "string",
  "thumbnail_s3_key": "string | null",
  "thumbnail_url": "string | null",
  "image_url": "string",
  "width": 1920,
  "height": 1080,
  "created_at": "2025-01-01T00:00:00Z"
}
```

## 実装詳細

### 1. Backend: フレーム単体取得API

```python
@router.get("/{frame_id}", response_model=FrameResponse)
async def get_frame(
    project_id: UUID,
    video_id: UUID,
    frame_id: UUID,
    auth: Auth,
) -> FrameResponse:
    """Get a single frame with presigned image URL."""
    # 認可チェック
    # フレーム取得
    # image_url 生成 (s3_key から presigned URL)
```

### 2. Frontend: Next.js 設定

`next.config.ts` に Turbopack 用の canvas モジュール設定を追加:

```typescript
experimental: {
  turbo: {
    resolveAlias: {
      canvas: './empty.js',
    },
  },
},
```

### 3. Frontend: ImageLayer コンポーネント

```typescript
// use-image フックで画像読み込み
// loading/failed 状態のハンドリング
// Konva.Image でレンダリング
```

### 4. Frontend: AnnotationCanvas コンポーネント

```typescript
// Stage, Layer で構成
// マウスホイールでズーム (scaleBy)
// ドラッグでパン (draggable)
// 画像サイズに応じた初期表示調整
```

### 5. Frontend: アノテーション画面

```typescript
// dynamic import で AnnotationCanvas を読み込み
// Server Component でフレーム情報取得
// クライアントコンポーネントで Canvas 表示
```

## 実装順序

1. Backend: フレーム単体取得API追加
2. Frontend: react-konva パッケージ導入と Next.js 設定
3. Frontend: 型定義・APIクライアント更新
4. Frontend: ImageLayer コンポーネント作成
5. Frontend: AnnotationCanvas コンポーネント作成
6. Frontend: アノテーション画面ルート作成
7. Frontend: フレームグリッドからのリンク追加
8. テスト作成
9. 動作確認とCI実行

## テスト計画

### Backend テスト

- `test_get_frame_success` - 正常系
- `test_get_frame_not_found` - フレームが存在しない
- `test_get_frame_unauthorized` - 認可エラー

### Frontend テスト

- ImageLayer: 画像読み込み状態のテスト
- AnnotationCanvas: レンダリングテスト
- フレーム画面: コンポーネント統合テスト

## 注意事項

- Next.js では react-konva を SSR: false で読み込む必要がある
- Turbopack 使用時は canvas モジュールのエイリアス設定が必要
- 画像の presigned URL は有効期限があるため、適切にリフレッシュする設計を考慮
- ズーム範囲に上限/下限を設定してユーザビリティを確保
