# 旅のしおり (tabishiori)

旅程を組み立てて、URLひとつで共有・印刷できるWebアプリ。
Next.js (App Router) + Supabase。登録不要・無料枠で運用可能。

## 機能
- 旅程エディタ(タイムライン、クイック追加、グループ化、ドラッグ並べ替え、時刻編集、時間刻み設定、並べ替え時の時刻自動詰め直し)
- URL共有(閲覧専用ページ) `/t/{id}`
- SNSシェア: URLコピー / LINE / X / Facebook / QRコード
- 印刷・PDF出力(1日1ページ) `/t/{id}/print`
- 編集は「編集キー」を知っている人だけ(作成した端末に自動保存)

## セットアップ手順

### 1. Supabase (無料)
1. https://supabase.com でアカウント作成 → New Project
2. プロジェクトができたら SQL Editor を開き、下のSQLを実行:

```sql
create table trips (
  id text primary key,
  edit_key text not null,
  name text not null,
  start_date date not null,
  end_date date not null,
  step_min int not null default 15,
  auto_recalc boolean not null default false,
  items jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- APIは全てサーバー側(service_role)経由なので、外部からの直接アクセスは全て遮断
alter table trips enable row level security;
```

3. Settings → API から以下をメモ:
   - Project URL
   - service_role キー (secret。絶対にクライアントに出さない)

### 2. Vercel (無料)
1. このプロジェクトをGitHubにpush
2. https://vercel.com で Import Project → リポジトリを選択
3. Environment Variables に以下を設定:
   - `SUPABASE_URL` = SupabaseのProject URL
   - `SUPABASE_SERVICE_ROLE_KEY` = service_roleキー
   - `NEXT_PUBLIC_BASE_URL` = デプロイ後のURL (例: https://xxx.vercel.app) ※共有URLの生成に使用。初回デプロイ後に設定して再デプロイでOK
4. Deploy

### 3. ローカルで動かす場合
```bash
npm install
cp .env.example .env.local   # 値を埋める
npm run dev
```

## 構成
```
app/
  page.js                  トップ(新規作成+この端末のしおり一覧)
  t/[id]/page.js           共有(閲覧)ページ
  t/[id]/edit/page.js      編集ページ(編集キー必須)
  t/[id]/print/page.js     印刷用ページ(1日1ページ)
  api/trips/route.js       POST 作成
  api/trips/[id]/route.js  GET 取得 / PUT 更新(編集キー検証)
components/
  Editor.jsx               旅程エディタ本体
  TripView.jsx             閲覧用タイムライン
  ShareBar.jsx             シェアボタン+QR
lib/
  supabaseAdmin.js         サーバー専用Supabaseクライアント
```

## セキュリティの考え方(v1)
- 閲覧: URL(推測困難な10文字ID)を知っている人は誰でも可
- 編集: edit_key(32文字)を知っている人のみ。キーは作成時に端末のlocalStorageへ保存
- 別端末で編集したい場合: `/t/{id}/edit?key={editKey}` のURLを自分に送る
- DBへの直接アクセスはRLSで全遮断、必ずサーバーAPI経由

## 今後の候補
- 共同編集(Supabase Realtime)
- 予定の日またぎ移動
- 場所情報の自動補完(営業時間など)
