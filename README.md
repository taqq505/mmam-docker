# mmam-docker

Media Multicast Address Manager (MMAM) は、ST 2110 / NMOS フローの名前やメタデータを一元管理するフルスタックパッケージです。FastAPI + PostgreSQL で REST API を公開し、Vue 3 + Tailwind 製のシングルページ UI と Mosquitto MQTT によるリアルタイム通知を同梱しています。

> English description is available in the second half of this document.
> 本ドキュメント後半に英語版を記載しています。

## 主な特長

- **API + データベース** – 8 本の別名 / 8 本のユーザーフィールドなど放送運用向けスキーマを REST API 経由で読み書き可能。UUID (`flow_id`) を共通キーにして外部システムと連携できます。
- **Vue 3 管理 UI** – Dashboard、Flows、Search、NMOS Wizard、Planner、Checker、Settings を搭載。フロー編集・ロック操作・JSON イン/アウトをブラウザだけで完結。
- **Planner（アドレス帳）** – ドライブ (/8) → フォルダ (parent) → View (child) をツリー表示。Explorer でグリッド確認、Manage で即時編集、Backup で JSON Export/Import が可能。
- **MQTT 通知** – `.env` の `MQTT_ENABLED=true` で Mosquitto が立ち上がり、フロー更新イベントを `mmam/flows/events/...` へ publish。UI も WebSocket で購読して即時反映します。
- **自動周回機能** – コリジョン検出と NMOS 差分検出を定期的に自動実行。間隔指定またはCron式でスケジュール設定が可能で、ダッシュボードに最新のアラート件数を表示します。
- **完全オフライン対応** – すべてのフロントエンド依存ライブラリ（Vue.js、MQTT.js、Tailwind CSS、Inter Font）をローカルにバンドル。CDN依存なしでネットワーク隔離環境でも動作します。
- **HTTPS サポート** – HTTP と HTTPS の同時稼働に対応。自己署名証明書の自動生成、または社内CA発行証明書の利用が可能です。

## コンポーネント

```
docker-compose.yml
├─ mmam   : FastAPI (uvicorn --reload) HTTP/HTTPS
├─ db     : PostgreSQL 16
├─ ui     : nginx が frontend/ を配信 HTTP/HTTPS
└─ mqtt   : Mosquitto (MQTT + WebSocket)
```

### アクセスポート

**HTTP接続**:
- API: `http://localhost:8080`
- UI: `http://localhost:4173`
- MQTT (WS): `ws://localhost:9001`

**HTTPS接続**:
- API: `https://localhost:8443`
- UI: `https://localhost:4174`

ファイアウォールでポートを制御することで、HTTP/HTTPS どちらか一方のみを使用することも可能です。

## セットアップ

1. リポジトリを取得
   ```bash
   git clone https://example.com/mmam-docker.git
   cd mmam-docker
   ```

2. `.env` を作成
   ```bash
   cp .env.example .env
   # POSTGRES_*, SECRET_KEY, MQTT_* などを環境に合わせて調整
   ```
   - `INIT_ADMIN=true` で初期 `admin / admin` ユーザーを作成。
   - リアルタイム通知を使う場合は `MQTT_ENABLED=true`、`MQTT_WS_URL` をホスト名に合わせる。
   - HTTPS設定は `.env` の `HTTPS_ENABLED`、ポート設定、証明書パスで制御可能。

3. コンテナを起動
   ```bash
   docker compose up --build
   ```
   初回起動時、証明書が存在しない場合は自動的に自己署名証明書が生成されます。

4. ブラウザで `http://localhost:4173` または `https://localhost:4174` にアクセスし、`admin / admin` でログインしてパスワードを変更。

### HTTPS証明書の設定

**自己署名証明書（デフォルト）**:
初回起動時に自動生成されます。ブラウザで証明書警告が表示されますが、これは正常な動作です。

**社内CA証明書の使用**:
```bash
# 証明書ファイルを配置
cp your-company-cert.crt certs/server.crt
cp your-company-key.key certs/server.key
cp your-company-ca.crt certs/ca.crt  # オプション

# コンテナを再起動
docker compose restart
```

証明書の設定は `.env` でカスタマイズ可能:
```bash
# 証明書パス（コンテナ内パス）
CERT_FILE=/certs/server.crt
KEY_FILE=/certs/server.key
CA_FILE=/certs/ca.crt

# 自己署名証明書の設定
CERT_CN=localhost
CERT_SANS=DNS:localhost,DNS:*.local,IP:127.0.0.1
CERT_DAYS=3650
```

### よく使うコマンド

```bash
docker compose down                 # 停止
docker compose logs -f mmam         # API ログを追跡
docker compose down -v              # DB を含めリセット
docker compose restart              # 再起動（証明書更新後など）
```

## UI の使い方

### Dashboard

Summary カードで総数/Active 数、Flows ウィジェットでページングとソートを操作できます。

**最新チェック結果**:
自動周回機能が有効な場合、ダッシュボードに最新のチェック結果が表示されます：
- アラーム合計数（コリジョン + NMOS差分）
- コリジョン検出数
- NMOS差分数
- 最終更新時刻

### Flows

行の `Details` でモーダルが開き、`Edit` でフロー編集フォームへ遷移。ロックされたフローは `⚿` で表示されます。

### Search

- **Quick Search** – `q` と `limit` だけで横断検索。
- **Advanced Search** – UUID, IP, ポート範囲、日付レンジ、各種カラムフィルターを組み合わせて検索可能。

### NMOS Wizard

IS-04/05 のベースURLとバージョンを入力し `Discover` すると、ノード情報と取得したフロー候補が一覧化されます。選択したフローを `Import Selected` で flows テーブルに投入し、詳細画面から NMOS diff / apply を実行できます。

### Checker

`Checker` タブではマルチキャスト衝突や NMOS - MMAM 差分などをレポート表示。重複アドレスは赤字で表示されます。
直近に実行した結果はサーバーに保存され、タブを開くだけで最新のレポートが自動的に読み込まれます。

**自動周回設定**:
Admin権限で各チェック（コリジョン検出、NMOS差分検出）の自動実行を設定できます：
- **ON/OFF切り替え**: 自動実行の有効化・無効化
- **スケジュール設定**:
  - 間隔指定: 「30分ごと」「2時間ごと」など（最小1分、最大30日）
  - Cron式: 「毎日0時」「毎週月曜9時」など日時指定
- **次回実行予定**: 次回の自動実行時刻を表示
- **最終実行結果**: ステータスと検出件数を表示

既存の「今すぐ実行」ボタンはそのまま利用可能で、手動実行と自動実行は独立して動作します。

### Settings

API Base URL、匿名アクセス、flow lock role、Hard Delete などを制御できます。フローの JSON Export/Import もここから行います。
同じタブ内で API / Audit ログの最新 200 行を確認し、テキストファイルとしてダウンロードできます。

**API Base URL の自動設定**:
UIは接続プロトコル（HTTP/HTTPS）に応じて自動的にAPIのベースURLを設定します：
- `http://localhost:4173` でアクセス → `http://localhost:8080`
- `https://localhost:4174` でアクセス → `https://localhost:8443`

### MQTT

`MQTT_ENABLED=true` の場合、バックエンドはフロー更新時に `MQTT_TOPIC_FLOW_UPDATES` (`mmam/flows/events`) へ差分を publish します。UI も `MQTT_WS_URL` へ WebSocket 接続し、`.../all` と `.../flow/<flow_id>` を購読して即時反映します。

## Planner タブ

### Explorer

ドライブ(/8) → フォルダ(parent) → View(child) を左パネルで展開すると、右側にアドレスグリッドが表示されます。セルをダブルクリックすると該当フローの詳細が開き、Search size でハイライト幅を指定可能。/24 境界で行間を広く表示し、/27 / /28 は余白で区切り、グリッドの hover でツールチップが表示されます。

### Manage

左のツリーで選択中のフォルダに対し、右パネルで以下を実行できます。

- **Selected Folder** – 説明・メモ・カラーを編集/削除。
- **Create Folder** – CIDR または Start/End で parent を作成。
- **Create View** – 親フォルダ配下に child ビューを作成（≤4096 アドレス）。
- **Views in folder** – 各ビューの Edit/Delete。編集時はメタデータや `Reserved block` を即時更新。

### Backup

Planner 構成全体を JSON で Export / Import できます。Import は既存のフォルダ/ビュー構成を全て上書きするため、実行前に必ず Export でバックアップを取得してください。Export の JSON は `/address/buckets/export` のレスポンスそのままなので、Import で戻すと元通りの階層が復元されます。

## 自動周回機能（スケジューラ）

APScheduler を使用した自動実行機能により、定期的にチェック処理を実行できます。

### 設定方法

1. Checkerページを開く
2. 各チェック項目（Collision Check / NMOS Check）の「自動周回設定」セクションで設定
3. Admin権限が必要

### スケジュール設定

**間隔指定**:
- 単位: 分、時間、日、週、月
- 例: 30分ごと、2時間ごと、毎日、毎週
- 最小間隔: 1分
- 最大間隔: 30日

**Cron式**:
- 標準的なcron式（5フィールド形式）
- 例:
  - `0 0 * * *` - 毎日0時
  - `0 */6 * * *` - 6時間ごと
  - `0 9 * * 1` - 毎週月曜9時
  - `*/30 * * * *` - 30分ごと

### 実行結果

- ダッシュボードに最新のアラート件数を表示
- 各チェック項目に最終実行時刻、ステータス、検出件数を表示
- 実行結果は `scheduled_jobs` テーブルに保存

### データベーステーブル

```sql
-- スケジュールされたジョブ
CREATE TABLE scheduled_jobs (
    job_id TEXT PRIMARY KEY,           -- 'collision_check', 'nmos_check'
    job_type TEXT NOT NULL,            -- ジョブタイプ
    enabled BOOLEAN NOT NULL,          -- 有効/無効
    schedule_type TEXT NOT NULL,       -- 'interval' or 'cron'
    schedule_value TEXT NOT NULL,      -- 秒数 or cron式
    last_run_at TIMESTAMP,             -- 最終実行時刻
    last_run_status TEXT,              -- 'success', 'error'
    last_run_result JSONB,             -- 実行結果（件数など）
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

## オフライン対応

すべてのフロントエンド依存ライブラリをローカルにバンドルしています。

### バンドル済みライブラリ

```
frontend/vendor/
├── vue.global.prod.js     (Vue.js 3.4.21, 145 KB)
├── mqtt.min.js            (MQTT.js 5.3.5, 319 KB)
├── tailwind-cdn.js        (Tailwind CSS 3.4.1 JIT, 404 KB)
├── inter-font.css         (Inter Font CSS)
├── VERSION.txt            (バージョン情報)
└── fonts/
    ├── inter-400.ttf      (318 KB)
    ├── inter-500.ttf      (318 KB)
    └── inter-600.ttf      (319 KB)
```

合計サイズ: 約1.8 MB

### ライブラリの更新

依存ライブラリを更新する場合：

```bash
cd frontend

# 更新スクリプトのバージョン設定を編集
vim update-vendor.sh
# VUE_VERSION="3.5.0" などに変更

# 更新を実行
./update-vendor.sh all

# または個別に更新
./update-vendor.sh vue      # Vue.jsのみ
./update-vendor.sh mqtt     # MQTT.jsのみ
./update-vendor.sh tailwind # Tailwind CSSのみ

# ブラウザで動作確認後、コミット
git add vendor/
git commit -m "chore: update vendor dependencies"
```

`vendor/VERSION.txt` でバージョン情報を確認できます。

## API サマリ

### 認証
- `POST /api/login` – JWT を取得。
- `GET /api/me` – 現在のユーザー情報を取得。

### フロー管理
- `GET /api/flows` / `POST /api/flows` / `PATCH /api/flows/{id}` – フロー CRUD。
- `POST /api/flows/{id}/lock` / `DELETE /api/flows/{id}/lock` – フローのロック/アンロック。
- `DELETE /api/flows/{id}/hard` – フローの完全削除（Admin権限）。
- `GET /api/flows/export` / `POST /api/flows/import` – フローのJSON Export/Import。

### Planner（アドレス帳）
- `GET /api/address/buckets/privileged` – ドライブ一覧を取得。
- `GET /api/address/buckets/{id}/children` – フォルダ/ビューの子要素を取得。
- `POST /api/address/buckets/parent` – フォルダ作成。
- `POST /api/address/buckets/child` – ビュー作成。
- `PATCH /api/address/buckets/{id}` / `DELETE /api/address/buckets/{id}` – 更新・削除。
- `GET /api/address/buckets/export` / `POST /api/address/buckets/import` – Planner バックアップ入出力。
- `GET /api/address-map` – アドレスマップデータを取得（Explorer用）。

### NMOS連携
- `POST /api/nmos/discover` – NMOS ノードからフロー候補を取得。
- `GET /api/flows/{id}/nmos/check` – NMOSとの差分をチェック。
- `POST /api/flows/{id}/nmos/apply` – NMOS設定を適用。
- `POST /api/nmos/detect-is04-from-rds` – RDSからIS-04エンドポイントを検出。
- `POST /api/nmos/detect-is05` – IS-05エンドポイントを検出。

### Checker
- `GET /api/checker/latest?kind=collisions|nmos` – 最後に実行した Checker 結果を取得。
- `GET /api/checker/collisions` – コリジョン検出を実行。
- `GET /api/checker/nmos?timeout=5` – NMOS差分検出を実行。

### 自動化（スケジューラ）
- `GET /api/automation/jobs` – 全ジョブの一覧と状態を取得（Editor権限以上）。
- `GET /api/automation/jobs/{job_id}` – 特定ジョブの詳細を取得。
- `PUT /api/automation/jobs/{job_id}` – ジョブ設定を更新（Admin権限）。
- `POST /api/automation/jobs/{job_id}/enable` – ジョブを有効化（Admin権限）。
- `POST /api/automation/jobs/{job_id}/disable` – ジョブを無効化（Admin権限）。
- `GET /api/automation/summary` – ダッシュボード用サマリー（Viewer権限以上）。

### ユーザー管理
- `GET /api/users` – ユーザー一覧を取得（Editor権限以上）。
- `POST /api/users` – ユーザー作成（Admin権限）。
- `PATCH /api/users/{username}` – ユーザー更新（Admin権限）。
- `DELETE /api/users/{username}` – ユーザー削除（Admin権限）。

### 設定・ログ
- `GET /api/settings` / `PATCH /api/settings/{key}` – システム設定の取得・更新。
- `GET /api/logs?kind=api|audit&lines=200` – ログの取得（Admin権限）。
- `GET /api/logs/download?kind=api|audit` – ログのダウンロード（Admin権限）。
- `GET /api/health` – ヘルスチェック。

認証は JWT (Bearer) で、`.env` の `SECRET_KEY` を共有キーにしています。`DISABLE_AUTH=true` で開発用に無効化することも可能です。

## 環境変数リファレンス

### データベース
```bash
POSTGRES_USER=mmam
POSTGRES_PASSWORD=secret
POSTGRES_DB=mmam
DB_HOST=db
DB_PORT=5432
```

### アプリケーション
```bash
SECRET_KEY=supersecret            # JWT署名キー
INIT_ADMIN=true                   # 初期adminユーザー作成
DISABLE_AUTH=false                # 認証の無効化（開発用）
```

### MQTT
```bash
MQTT_ENABLED=true                              # MQTT有効化
MQTT_HOST=mqtt                                  # MQTTブローカーホスト
MQTT_PORT=1883                                  # MQTTポート
MQTT_TOPIC_FLOW_UPDATES=mmam/flows/events      # フロー更新トピック
MQTT_WS_URL=ws://localhost:9001                # WebSocket URL（UI用）
```

### HTTPS
```bash
HTTPS_ENABLED=true                # HTTPS有効化
HTTP_PORT=8080                    # HTTPポート
HTTPS_PORT=8443                   # HTTPSポート
UI_HTTP_PORT=4173                 # UI HTTPポート
UI_HTTPS_PORT=4174                # UI HTTPSポート

# 証明書パス（コンテナ内パス）
CERT_FILE=/certs/server.crt       # サーバー証明書
KEY_FILE=/certs/server.key        # 秘密鍵
CA_FILE=/certs/ca.crt             # CA証明書（オプション）

# 自己署名証明書設定
CERT_CN=localhost                                # Common Name
CERT_SANS=DNS:localhost,DNS:*.local,IP:127.0.0.1 # Subject Alternative Names
CERT_DAYS=3650                                   # 有効期限（日数）
```

### ログ
```bash
LOG_DIR=/log                      # ログディレクトリ
LOG_LEVEL=INFO                    # ログレベル
AUDIT_LOG_ENABLED=true            # 監査ログ有効化
```

## リポジトリレイアウト

| パス                | 説明                                   |
|---------------------|----------------------------------------|
| `src/app/`          | FastAPI コード（routers, auth, MQTT等）|
| `src/app/scheduler.py` | APScheduler スケジューラ管理        |
| `src/app/scheduler_jobs.py` | スケジュールされたジョブ実装   |
| `src/app/routers/automation.py` | 自動化API                  |
| `src/db_init.py`    | DB初期化とシードデータ                 |
| `frontend/`         | Vue 3 + Tailwind UI                    |
| `frontend/vendor/`  | オフライン用バンドルライブラリ         |
| `mosquitto/`        | Mosquitto設定（MQTT + WebSocket）      |
| `logs/`             | ホスト側ログ出力                       |
| `certs/`            | SSL/TLS証明書                          |
| `scripts/`          | エントリーポイントスクリプト           |

## トラブルシューティング

### HTTPS接続で証明書警告が表示される

自己署名証明書を使用している場合、これは正常な動作です。ブラウザで例外として許可してください。
社内CA証明書を使用する場合は、CAのルート証明書をクライアントにインストールしてください。

### 自動周回が実行されない

1. Checkerページでジョブが有効化されているか確認
2. スケジュール設定が正しいか確認（cron式の構文エラーなど）
3. コンテナログでエラーを確認: `docker compose logs -f mmam`
4. 次回実行予定時刻が表示されているか確認

### オフラインでスタイルが適用されない

1. `vendor/` ディレクトリが存在するか確認
2. ブラウザの開発者ツールで `vendor/` ファイルが正常にロードされているか確認
3. Nginxコンテナログを確認: `docker compose logs ui`

### MQTTリアルタイム更新が動作しない

1. `.env` で `MQTT_ENABLED=true` になっているか確認
2. `MQTT_WS_URL` がアクセス可能なホスト名・IPになっているか確認（`localhost` ではなく実際のIPアドレスを使用）
3. ファイアウォールでポート9001が開いているか確認

## ライセンス

MIT License. See `LICENSE`.

---

# mmam-docker (English)

Media Multicast Address Manager (MMAM) is a full-stack toolkit for managing ST 2110 / NMOS flows. It ships with a FastAPI backend, PostgreSQL schema, Vue 3 + Tailwind UI, and Mosquitto for MQTT notifications.

## Highlights

1. **Rich REST API** – Flexible schema (aliases ×8, user fields ×8) exposed via FastAPI, making system-to-system integration straightforward.
2. **Vue 3 UI** – Dashboard, Flows, Search, NMOS Wizard, Planner, Checker, Settings, and Flow JSON export/import.
3. **Planner workspace** – Tree view of /8 drives → parent folders → child views, grid-based explorer, inline edit forms, and one-click JSON backup/restore.
4. **Realtime MQTT** – Optional Mosquitto broker publishes flow diffs to `mmam/flows/events/...`, which both UI and external controllers can subscribe to.
5. **Automated Scheduling** – Periodic collision detection and NMOS difference checking with interval or cron-based scheduling. Latest alert counts displayed on dashboard.
6. **Fully Offline** – All frontend dependencies (Vue.js, MQTT.js, Tailwind CSS, Inter Font) are bundled locally. No CDN dependencies, works in air-gapped environments.
7. **HTTPS Support** – Simultaneous HTTP and HTTPS operation. Auto-generates self-signed certificates or uses corporate CA-issued certificates.

## Architecture & Setup

The stack is orchestrated via Docker Compose (FastAPI app, PostgreSQL, nginx static UI, Mosquitto).

### Access Ports

**HTTP**:
- API: `http://localhost:8080`
- UI: `http://localhost:4173`
- MQTT (WS): `ws://localhost:9001`

**HTTPS**:
- API: `https://localhost:8443`
- UI: `https://localhost:4174`

You can control which protocol to use via firewall port settings.

### Quick Start

1. Clone the repository
   ```bash
   git clone https://example.com/mmam-docker.git
   cd mmam-docker
   ```

2. Copy `.env.example` to `.env` and adjust secrets, MQTT URLs, and HTTPS settings
   ```bash
   cp .env.example .env
   # Edit POSTGRES_*, SECRET_KEY, MQTT_*, HTTPS_* settings
   ```

3. Start containers
   ```bash
   docker compose up --build
   ```
   On first startup, self-signed certificates will be auto-generated if not present.

4. Access UI at `http://localhost:4173` or `https://localhost:4174` and sign in with `admin / admin`

### HTTPS Certificate Setup

**Self-signed (Default)**:
Automatically generated on first startup. Browser will show a certificate warning, which is expected behavior.

**Corporate CA Certificate**:
```bash
# Place certificate files
cp your-company-cert.crt certs/server.crt
cp your-company-key.key certs/server.key
cp your-company-ca.crt certs/ca.crt  # optional

# Restart containers
docker compose restart
```

Certificate settings can be customized in `.env`:
```bash
# Certificate paths (container paths)
CERT_FILE=/certs/server.crt
KEY_FILE=/certs/server.key
CA_FILE=/certs/ca.crt

# Self-signed certificate settings
CERT_CN=localhost
CERT_SANS=DNS:localhost,DNS:*.local,IP:127.0.0.1
CERT_DAYS=3650
```

## Using the UI

### Dashboard

Shows flow summary and the latest check results from automated scheduling:
- Total alert count (collisions + NMOS differences)
- Collision detection count
- NMOS difference count
- Last updated timestamp

### Flows / Search

Manage flows, lock/unlock entries, and perform quick or advanced searches.

### NMOS Wizard

Discover IS-04/05 nodes, import selected flows, and run NMOS diff/apply operations.

### Checker

Inspect multicast collisions or NMOS vs MMAM differences. The latest run results are persisted server-side so the tab always shows the most recent report.

**Automated Scheduling** (Admin only):
- **Enable/Disable**: Toggle automatic execution
- **Schedule Configuration**:
  - Interval: "Every 30 minutes", "Every 2 hours", etc. (min: 1 minute, max: 30 days)
  - Cron expression: "Daily at 00:00", "Every Monday at 09:00", etc.
- **Next Run Time**: Shows when the next execution is scheduled
- **Last Run Result**: Status and detection count

The existing "Run Now" buttons remain available for manual execution.

### Settings

Control API base URL, anonymous settings, flow lock role, hard delete, and flow JSON export/import.
The same view also exposes API / audit logs (latest 200 lines + download buttons) for administrators.

**API Base URL Auto-detection**:
UI automatically sets the API base URL based on connection protocol:
- Access via `http://localhost:4173` → `http://localhost:8080`
- Access via `https://localhost:4174` → `https://localhost:8443`

### Planner

**Explorer**: Grid view (double-click cells to open flow detail), /24 boundary highlighting, /27 & /28 spacing.

**Manage**: Create/edit folders and views with inline forms.

**Backup**: Export/import the entire tree structure as JSON.

## Automated Scheduling

APScheduler-based automated execution for periodic checks.

### Configuration

1. Open Checker page
2. Configure in "Automation Settings" section for each check type
3. Admin role required

### Schedule Types

**Interval**:
- Units: minutes, hours, days, weeks, months
- Examples: Every 30 minutes, Every 2 hours, Daily, Weekly
- Min: 1 minute, Max: 30 days

**Cron Expression**:
- Standard 5-field cron format
- Examples:
  - `0 0 * * *` - Daily at 00:00
  - `0 */6 * * *` - Every 6 hours
  - `0 9 * * 1` - Every Monday at 09:00
  - `*/30 * * * *` - Every 30 minutes

### Execution Results

- Latest alert counts displayed on dashboard
- Last run time, status, and detection count shown for each check
- Results stored in `scheduled_jobs` table

## Offline Support

All frontend dependencies are bundled locally in `frontend/vendor/`:

```
vendor/
├── vue.global.prod.js     (Vue.js 3.4.21, 145 KB)
├── mqtt.min.js            (MQTT.js 5.3.5, 319 KB)
├── tailwind-cdn.js        (Tailwind CSS 3.4.1 JIT, 404 KB)
├── inter-font.css         (Inter Font CSS)
├── VERSION.txt            (Version info)
└── fonts/
    ├── inter-400.ttf      (318 KB)
    ├── inter-500.ttf      (318 KB)
    └── inter-600.ttf      (319 KB)
```

Total size: ~1.8 MB

### Updating Dependencies

```bash
cd frontend

# Edit version settings in update script
vim update-vendor.sh
# Change VUE_VERSION="3.5.0" etc.

# Run update
./update-vendor.sh all

# Or update individually
./update-vendor.sh vue      # Vue.js only
./update-vendor.sh mqtt     # MQTT.js only
./update-vendor.sh tailwind # Tailwind CSS only

# Test in browser, then commit
git add vendor/
git commit -m "chore: update vendor dependencies"
```

Check `vendor/VERSION.txt` for version information.

## API Summary

### Authentication
- `POST /api/login` – Obtain JWT token
- `GET /api/me` – Get current user info

### Flow Management
- `GET /api/flows` / `POST /api/flows` / `PATCH /api/flows/{id}` – Flow CRUD
- `POST /api/flows/{id}/lock` / `DELETE /api/flows/{id}/lock` – Lock/unlock flow
- `DELETE /api/flows/{id}/hard` – Hard delete flow (Admin only)
- `GET /api/flows/export` / `POST /api/flows/import` – Flow JSON export/import

### Planner (Address Book)
- `GET /api/address/buckets/privileged` – Get drive list
- `GET /api/address/buckets/{id}/children` – Get folder/view children
- `POST /api/address/buckets/parent` – Create folder
- `POST /api/address/buckets/child` – Create view
- `PATCH /api/address/buckets/{id}` / `DELETE /api/address/buckets/{id}` – Update/delete
- `GET /api/address/buckets/export` / `POST /api/address/buckets/import` – Planner backup
- `GET /api/address-map` – Get address map data (for Explorer)

### NMOS Integration
- `POST /api/nmos/discover` – Discover flows from NMOS node
- `GET /api/flows/{id}/nmos/check` – Check NMOS differences
- `POST /api/flows/{id}/nmos/apply` – Apply NMOS settings
- `POST /api/nmos/detect-is04-from-rds` – Detect IS-04 endpoint from RDS
- `POST /api/nmos/detect-is05` – Detect IS-05 endpoints

### Checker
- `GET /api/checker/latest?kind=collisions|nmos` – Get last check result
- `GET /api/checker/collisions` – Run collision detection
- `GET /api/checker/nmos?timeout=5` – Run NMOS difference detection

### Automation (Scheduler)
- `GET /api/automation/jobs` – List all jobs with status (Editor+)
- `GET /api/automation/jobs/{job_id}` – Get job details
- `PUT /api/automation/jobs/{job_id}` – Update job config (Admin)
- `POST /api/automation/jobs/{job_id}/enable` – Enable job (Admin)
- `POST /api/automation/jobs/{job_id}/disable` – Disable job (Admin)
- `GET /api/automation/summary` – Dashboard summary (Viewer+)

### User Management
- `GET /api/users` – List users (Editor+)
- `POST /api/users` – Create user (Admin)
- `PATCH /api/users/{username}` – Update user (Admin)
- `DELETE /api/users/{username}` – Delete user (Admin)

### Settings & Logs
- `GET /api/settings` / `PATCH /api/settings/{key}` – System settings
- `GET /api/logs?kind=api|audit&lines=200` – Get logs (Admin)
- `GET /api/logs/download?kind=api|audit` – Download logs (Admin)
- `GET /api/health` – Health check

Authentication uses JWT (Bearer), with `SECRET_KEY` from `.env`. Set `DISABLE_AUTH=true` for development to disable authentication.

## Environment Variables

### Database
```bash
POSTGRES_USER=mmam
POSTGRES_PASSWORD=secret
POSTGRES_DB=mmam
DB_HOST=db
DB_PORT=5432
```

### Application
```bash
SECRET_KEY=supersecret            # JWT signing key
INIT_ADMIN=true                   # Create initial admin user
DISABLE_AUTH=false                # Disable auth (development only)
```

### MQTT
```bash
MQTT_ENABLED=true                              # Enable MQTT
MQTT_HOST=mqtt                                  # MQTT broker host
MQTT_PORT=1883                                  # MQTT port
MQTT_TOPIC_FLOW_UPDATES=mmam/flows/events      # Flow update topic
MQTT_WS_URL=ws://localhost:9001                # WebSocket URL (for UI)
```

### HTTPS
```bash
HTTPS_ENABLED=true                # Enable HTTPS
HTTP_PORT=8080                    # HTTP port
HTTPS_PORT=8443                   # HTTPS port
UI_HTTP_PORT=4173                 # UI HTTP port
UI_HTTPS_PORT=4174                # UI HTTPS port

# Certificate paths (container paths)
CERT_FILE=/certs/server.crt       # Server certificate
KEY_FILE=/certs/server.key        # Private key
CA_FILE=/certs/ca.crt             # CA certificate (optional)

# Self-signed certificate settings
CERT_CN=localhost                                # Common Name
CERT_SANS=DNS:localhost,DNS:*.local,IP:127.0.0.1 # Subject Alternative Names
CERT_DAYS=3650                                   # Validity period (days)
```

### Logging
```bash
LOG_DIR=/log                      # Log directory
LOG_LEVEL=INFO                    # Log level
AUDIT_LOG_ENABLED=true            # Enable audit logging
```

## Repository Layout

| Path                | Description                                   |
|-------------------|-----------------------------------------------|
| `src/app`         | FastAPI code (routers, auth, settings, MQTT)  |
| `src/app/scheduler.py` | APScheduler management              |
| `src/app/scheduler_jobs.py` | Scheduled job implementations  |
| `src/app/routers/automation.py` | Automation API            |
| `src/db_init.py`  | DB bootstrap and seed data                    |
| `frontend/`       | Vue 3 + Tailwind single-page UI               |
| `frontend/vendor/` | Bundled libraries for offline use            |
| `mosquitto/`      | Mosquitto config (MQTT + WebSocket listeners) |
| `logs/`           | Host-side log output                          |
| `certs/`          | SSL/TLS certificates                          |
| `scripts/`        | Entrypoint scripts                            |

## Troubleshooting

### Certificate warning on HTTPS connection

This is expected behavior when using self-signed certificates. Accept the exception in your browser.
For corporate CA certificates, install the CA's root certificate on client machines.

### Automated scheduling not running

1. Check if job is enabled on Checker page
2. Verify schedule configuration (e.g., cron syntax errors)
3. Check container logs: `docker compose logs -f mmam`
4. Verify next run time is displayed

### Styles not applied in offline environment

1. Verify `vendor/` directory exists
2. Check browser dev tools to see if `vendor/` files load correctly
3. Check nginx container logs: `docker compose logs ui`

### MQTT realtime updates not working

1. Verify `MQTT_ENABLED=true` in `.env`
2. Check `MQTT_WS_URL` uses accessible hostname/IP (not `localhost`, use actual IP)
3. Verify firewall allows port 9001

## License

MIT License. See `LICENSE`.
