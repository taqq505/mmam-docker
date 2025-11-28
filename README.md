# mmam-docker

> English version of this document is included below.

![NMOS](https://img.shields.io/badge/NMOS-IS--04-informational)
![NMOS](https://img.shields.io/badge/NMOS-IS--05-informational)


Media Multicast Address Manager (MMAM) は、ST 2110 / NMOS フローの登録・検索・ユーザー管理を行う軽量ツールです。FastAPI + PostgreSQL をバックエンドに、Vue 3 + Tailwind CSS の静的 UI を nginx から配信します。

🛰️ このプロジェクトは NMOS (IS-04 / IS-05) と SMPTE ST 2110 ワークフローをサポートしています。 #NMOS #ST2110

## 主な機能

- ST 2110 / 2022-7 フロー情報のデータベース化（エイリアス 8 本＋ユーザーフィールド 8 本）
- NMOS Node/Connection API からのウィザード型インポート・差分チェック＆反映
- クイック検索・詳細検索・JSON Import/Export
- フローごとのロック機構とロール制御、ハード削除フォーム
- Checker（マルチキャスト衝突など）のタブ表示
- MQTT によるリアルタイム更新通知（変更差分を含む）

## 前提条件

- Docker と Docker Compose が利用できる環境（Linux / macOS / WSL2 等）
- 4GB 以上の空きメモリと 2GB 以上のディスク
- ブラウザ: 最新版の Chrome / Edge / Firefox

## 構成

```
docker-compose.yml
├─ mmam   : FastAPI アプリ (uvicorn --reload)
├─ db     : PostgreSQL 16
├─ ui     : nginx で `frontend/` を配信
└─ mqtt   : Mosquitto (MQTT + WebSocket リスナー)
```

- FastAPI API: `http://localhost:8080`
- UI: `http://localhost:4173`
- MQTT (WebSocket): `ws://localhost:9001`

## インストール / セットアップ

1. リポジトリを取得（任意の方法で OK）
   ```bash
   git clone https://example.com/mmam-docker.git
   cd mmam-docker
   ```
2. 環境変数をセット
   ```bash
   cp .env.example .env
   # POSTGRES_*, SECRET_KEY, INIT_ADMIN, MQTT_* などを用途に合わせて調整
   ```
   - `INIT_ADMIN=true` で `admin / admin` ユーザーを作成。
   - `MQTT_ENABLED=true` にすると Mosquitto コンテナとリアルタイム通知が有効化。
3. コンテナを起動
   ```bash
   docker compose up --build
   ```
   初回は依存パッケージをインストールするため数分かかります。バックエンドは `--reload` で起動するので `src/` 編集後は自動的に再読み込みされます。
4. ブラウザで `http://localhost:4173` にアクセスし、初期管理者 (`admin / admin`) でログイン → Settings からパスワード変更。

### 運用時のコマンド例

```bash
# 停止
docker compose down

# ログを追跡
docker compose logs -f mmam

# Postgres データをクリアしたい場合
docker compose down -v    # ボリュームを削除
```

### ディレクトリ

| Path        | 説明 |
|-------------|------|
| `src/app`   | FastAPI アプリケーション (routers, auth, settings, MQTT) |
| `src/db_init.py` | DB 初期化とシード (ユーザー、flows テーブル等) |
| `frontend/` | Vue 3 + Tailwind の静的 UI |
| `logs/`     | API コンテナのログ出力先 |
| `mosquitto/`| WebSocket 対応の Mosquitto 設定 |

## 使い方（UI）

ブラウザで `http://ホスト:4173` を開くとダッシュボードが表示され、左サイドバーから各ビューへ遷移できます。

### ダッシュボード / フロー一覧

- Summary カードに全件数・Active 件数を表示。
- 「Flows」ウィジェットでページング・ソート（`updated_at` など）を制御し、詳細ダイアログや編集フォームへ遷移。
- Flow がロックされている場合は `⚿` アイコンを表示。

### 検索

- Quick Search: `q` と `limit` だけで横断検索。結果はテーブル表示、Flow ID コピーもワンクリック。
- Advanced Search: UUID / IP / ポート範囲 / 日付レンジなど細かい条件で絞り込み。Limit フィールドは上部に固定しています。

### フロー編集とロック

- `New Flow` で手動登録。ST2022-7 Path A/B、NMOSメタデータ、Alias、User Fields などを入力。
- 既存フローの `Edit` ではロックトグル（灰色の `⚿`）を利用可。ロールにより（Settingsの `flow_lock_role` ）操作権限を制御。
- `Hard Delete` は Settings 画面のフォームで Flow ID を指定して実行。

### JSON Import / Export

- Settings の `Export Flows` ボタンで全件を pretty JSON としてダウンロード。
- `Import` は JSON ファイルを選択して投げるだけ。ロック済みフローはスキップされ、結果サマリが通知されます。

### NMOS ウィザード & チェック

- `NMOS Wizard` で IS-04/05 の Base URL・バージョンを入力し Discover。リストに表示された Flow を複数選択して `Import Selected`。
- NMOS Check / Apply ボタンは Details と Edit ビューに表示され、NMOS との差分を赤枠で表示。Apply では更新したいフィールドにチェックを入れて反映します。

### Checker

- 左メニューの `Checker` ではタブ（Collision など）ごとにレポートを表示。マルチキャストの重複を赤字で示し、Flow ID＋Display Name＋Node Label を確認できます。

### 設定

- API Base URL 入力、ログイン管理、DB 設定トグル（匿名許可）、Hard Delete、flow lock role のラジオボタンなどを備えています。

### リアルタイム通知 (MQTT)

`docker-compose.yml` には Mosquitto ブローカーが含まれており、`.env` の `MQTT_ENABLED=true` でリアルタイム通知が有効になります。

| 変数 | 説明 |
|------|------|
| `MQTT_HOST` / `MQTT_PORT` | FastAPI が TCP で接続するブローカー (デフォルト: `mqtt:1883`) |
| `MQTT_WS_URL` | ブラウザが WebSocket で接続する URL。例: `ws://localhost:9001` |
| `MQTT_TOPIC_FLOW_UPDATES` | トピックの基底 (`mmam/flows/events`)。`/all` と `/flow/<flow_id>` に階層化して publish |
| `MQTT_USERNAME/PASSWORD` / `MQTT_WS_USERNAME/PASSWORD` | 必要に応じて認証情報を設定 |

フローを `PATCH /api/flows/{id}` や NMOS反映で更新すると、FastAPI が軽量サマリ＋変更差分 (`diff`) を MQTT へ publish します（新規・削除は対象外）。

#### 使い方

1. `.env` で `MQTT_ENABLED=true` を指定し、`docker compose up`。
2. ブラウザ UI はログイン後、自動で WebSocket (`MQTT_WS_URL`) に接続して全件 (`.../all`) を購読します。
3. 外部ツール（MQTTX 等）で購読する場合は以下のトピックを使用:
   - `mmam/flows/events/all`: すべての更新を取得。
   - `mmam/flows/events/flow/<flow_id>`: 特定フローのみ。ワイルドカード `.../flow/#` も可。
4. ペイロード例:

```json
{
  "event": "updated",
  "flow_id": "35f0c2d7-db37-4972-b53e-4e7424276085",
  "flow": {
    "display_name": "Cam Video1",
    "flow_status": "active",
    "updated_at": "2025-11-27T07:45:12.871925"
  },
  "diff": {
    "alias1": { "old": "Tokyo Cam1", "new": "Tokyo Cam1 (HDR)" },
    "locked": { "old": false, "new": true }
  }
}
```

`diff` には更新されたフィールドのみ `{old,new}` 形式で格納されるため、フロー一覧を取得し直さなくても変更内容を把握できます。

### NMOS 連携

`NMOS Wizard` ビューでは、IS-04 (Node API) / IS-05 (Connection API) のベースURLを入力し `Discover` を実行すると `/api/nmos/discover` が呼び出されます。レスポンスは以下を含みます。

- `node`: 選択した NMOS ノードのラベル、説明、ID など。
- `flows`: IS-04 の Flow / Sender / Device / SDP 情報を束ねた一覧。UI ではチェックボックスで複数選択でき、まとめて MMAM の `flows` テーブルへ `POST /api/flows` します。

CDNベースのUIのみで NMOS ネットワークに接続し、複数フローのメタデータを手動入力なしに取り込める点が最大の特徴です。Transport, Format, Sender/Device IDs だけでなく `node_label`, `node_description`, SDP URL/Cache、ST 2022-7 のソース・マルチキャスト情報も自動セットされます。

### 名前付け・メタデータDBとしての活用

MMAM は単なるアドレス帳以上に、番組・中継現場での「名称レジストリ」として機能します。

- フロー1件につき `alias1`〜`alias8` を持ち、別部署・用途ごとの通称を保存できます。例: 伝送部が「Decoder#1」で受信する信号は日々変更されます。例えば「東京天カメ1番」を受信していることを、受信している各セクションのBCCに受け渡すことが可能です。
- サードパーティのブロードキャストコントローラやオートメーションは REST API 経由で `flow_id` (UUID) をキーに参照し、表示用の名称や補足情報を取得可能。
- さらに `user_field1`〜`user_field8` を備えており、回線手配番号・担当者・設備IDなど自由なメタデータを管理できます。

この仕組みにより、NMOS Sender / Flow の UUID と部署内で使われる別名を紐付け、散逸しがちな命名情報を一元管理・共有できます。

### リアルタイム通知 (MQTT)

`docker-compose.yml` には Mosquitto ブローカーが含まれており、`.env` の `MQTT_ENABLED=true` でリアルタイム通知が有効になります。

| 変数 | 説明 |
|------|------|
| `MQTT_HOST` / `MQTT_PORT` | FastAPI が TCP で接続するブローカー (デフォルト: `mqtt:1883`) |
| `MQTT_WS_URL` | ブラウザが WebSocket で接続する URL。例: `ws://localhost:9001` |
| `MQTT_TOPIC_FLOW_UPDATES` | トピックの基底 (`mmam/flows/events`)。`/all` と `/flow/<flow_id>` に階層化して publish |
| `MQTT_USERNAME/PASSWORD` / `MQTT_WS_USERNAME/PASSWORD` | 必要に応じて認証情報を設定 |

フローを `PATCH /api/flows/{id}` や NMOS反映で更新すると、FastAPI が軽量サマリ＋変更差分 (`diff`) を MQTT へ publish します（新規・削除は対象外）。

#### 使い方

1. `.env` で `MQTT_ENABLED=true` を指定し、`docker compose up`。
2. ブラウザ UI はログイン後、自動で WebSocket (`MQTT_WS_URL`) に接続して全件 (`.../all`) を購読します。
3. 外部ツール（MQTTX 等）で購読する場合は以下のトピックを使用:
   - `mmam/flows/events/all`: すべての更新を取得。
   - `mmam/flows/events/flow/<flow_id>`: 特定フローのみ。ワイルドカード `.../flow/#` も可。
4. ペイロード例:

```json
{
  "event": "updated",
  "flow_id": "35f0c2d7-db37-4972-b53e-4e7424276085",
  "flow": {
    "display_name": "Cam Video1",
    "flow_status": "active",
    "updated_at": "2025-11-27T07:45:12.871925"
  },
  "diff": {
    "alias1": { "old": "Tokyo Cam1", "new": "Tokyo Cam1 (HDR)" },
    "locked": { "old": false, "new": true }
  }
}
```

`diff` には更新されたフィールドのみ `{old,new}` 形式で格納されるため、フロー一覧を取得し直さなくても変更内容を把握できます。

### NMOS 連携

`NMOS Wizard` ビューでは、IS-04 (Node API) / IS-05 (Connection API) のベースURLを入力し `Discover` を実行すると `/api/nmos/discover` が呼び出されます。レスポンスは以下を含みます。

- `node`: 選択した NMOS ノードのラベル、説明、ID など。
- `flows`: IS-04 の Flow / Sender / Device / SDP 情報を束ねた一覧。UI ではチェックボックスで複数選択でき、まとめて MMAM の `flows` テーブルへ `POST /api/flows` します。

CDNベースのUIのみで NMOS ネットワークに接続し、複数フローのメタデータを手動入力なしに取り込める点が最大の特徴です。Transport, Format, Sender/Device IDs だけでなく `node_label`, `node_description`, SDP URL/Cache、ST 2022-7 のソース・マルチキャスト情報も自動セットされます。

### 名前付け・メタデータDBとしての活用

MMAM は単なるアドレス帳以上に、番組・中継現場での「名称レジストリ」として機能します。

- フロー1件につき `alias1`〜`alias8` を持ち、別部署・用途ごとの通称を保存できます。例: 伝送部が「Decoder#1」で受信する信号は日々変更されます。例えば「東京天カメ1番」を受信していることを、受信している各セクションのBCCに受け渡すことが可能です。
- サードパーティのブロードキャストコントローラやオートメーションは REST API 経由で `flow_id` (UUID) をキーに参照し、表示用の名称や補足情報を取得可能。
- さらに `user_field1`〜`user_field8` を備えており、回線手配番号・担当者・設備IDなど自由なメタデータを管理できます。

この仕組みにより、NMOS Sender / Flow の UUID と部署内で使われる別名を紐付け、散逸しがちな命名情報を一元管理・共有できます。

## REST API

ベースURLは `http://HOST:8080/api`。JWT を利用した Bearer 認証です。`/api/login` で取得したトークンを `Authorization: Bearer <token>` で送信してください。`DISABLE_AUTH=true` など設定で匿名アクセスを許可することも可能です。

### 認証と JWT

- トークン発行先: `POST /api/login`
  - `application/x-www-form-urlencoded` で `username`, `password` を送信。
  - 成功すると `{ "access_token": "<JWT>", "token_type": "bearer" }` を返却。
- JWT 仕様
  - `HS256` (共有鍵は `.env` の `SECRET_KEY`)。
  - ペイロード: `{"sub": "<username>", "role": "<viewer|editor|admin>", "exp": <1時間後>}`
  - トークンは 1 時間で期限切れ。更新は再ログインで行う。
- クライアント送信: すべての保護エンドポイントで `Authorization: Bearer <token>` ヘッダーを付与。
- 匿名アクセス
  - `.env`: `DISABLE_AUTH=true` で全面無効化 (開発用)。
  - DB 設定: `allow_anonymous_flows`, `allow_anonymous_user_lookup` が `true` の場合、該当エンドポイントのみトークンなしで閲覧可能。
- UI 側ではログイン成功時に token をメモリ保持し、`localStorage` には保存しません。必要に応じてブラウザタブを閉じると無効化されます。

### 認証 / ユーザー

| Method & Path         | 説明 |
|-----------------------|------|
| `POST /login`         | `username`, `password` (form-encoded)。成功すると `{ "access_token": "...", "token_type": "bearer" }` を返却。 |
| `GET /me`             | トークンからユーザー情報を取得。 |
| `GET /users`          | Admin のみ。 `{username, role, created_at}` の一覧。 |
| `POST /users`         | Admin のみ。`{username, password, role}`。重複すると 409。 |
| `PATCH /users/{username}` | Admin のみ。`password` と `role` を部分更新。 |
| `DELETE /users/{username}` | Admin のみ。自分自身は削除不可。 |

### Flows

#### `GET /flows`

フローの一覧・検索 API。共通クエリ:

| パラメータ | デフォルト | 説明 |
|------------|-------------|------|
| `limit` (1-500)  | 50 | 取得件数 |
| `offset`         | 0 | ページネーション offset |
| `sort_by`        | `updated_at` | 並び替え対象 (カラム名) |
| `sort_order`     | `desc`       | `asc` / `desc` |
| `include_unused` | false | `flow_status='active'` フィルタを無効化 |
| `fields`         | なし | 追加で返してほしいカラムをカンマ区切りで指定 (例: `fields=source_addr_a,nmos_node_label`) |
| `q`              | なし | テキスト系カラムへの部分一致横断検索 |
| `updated_at_min/max`, `created_at_min/max` |  | ISO8601 で期間検索 |
| `<column>`       |  | `TEXT_FILTER_FIELDS` / `INT_FILTER_FIELDS` に含まれるカラムへ条件を指定可能。整数カラムは `field_min` / `field_max` も利用できます。 |

レスポンスは各カラム名をキーに持つ配列。`flow_id`, `display_name`, `nmos_node_label`, `flow_status`, `availability`, `created_at`, `updated_at` は常に含まれます。

#### `GET /flows/{flow_id}`

単一フローの詳細を返します。

#### `POST /flows`

`Flow` モデル (ST 2022-7, NMOS, alias, user fields など全フィールド) を JSON で受け取り、新規登録。`flow_id` が未指定かつ `nmos_flow_id` が存在する場合は自動生成できます。成功時は挿入した `flow_id` を返します。

#### `PATCH /flows/{flow_id}`

部分更新。指定されたフィールドのみ更新します。

#### `DELETE /flows/{flow_id}`

論理削除。`flow_status='unused'`, `availability='lost'` に更新します。

#### `DELETE /flows/{flow_id}/hard`

完全削除。DB から行を削除します。UI 設定ページの「Hard Delete Flow」からも呼び出せます。

#### `GET /flows/summary`

`{ "total": <count>, "active": <count> }` を返し、Dashboard の Summary で利用されます。

### Settings

| Method & Path | 説明 |
|---------------|------|
| `GET /settings` | Admin のみ。`allow_anonymous_flows`, `allow_anonymous_user_lookup` など設定を返す。 |
| `GET /settings/{key}` | 単一設定。存在しないキーは 404。 |
| `PUT /settings/{key}` | 値を更新。型はスキーマ (`app/settings_store.py`) に準拠。 |

### NMOS

| Method & Path            | 説明 |
|--------------------------|------|
| `POST /nmos/discover`    | `{"is04_base_url", "is05_base_url", "is04_version", "is05_version"}` を受け取り、登録候補 (`flows`) とノード情報 (`node`) を返す。UI の NMOS Wizard で利用されます。 |

### Health Check

`GET /health` → `{ "status": "ok", "service": "MMAM" }`

## データベース

- `db_init.py` が起動時に以下を実行します:
  - `users`, `flows`, `settings` テーブル作成。
  - `INIT_ADMIN=true` の場合は `admin / admin` を作成。
  - `INIT_SAMPLE_FLOW=true` ならサンプルフローを1件投入。
  - `SETTINGS_DEFAULTS` を `settings` に投入 (`allow_anonymous_flows`, `allow_anonymous_user_lookup`)。

PostgreSQL は `db_data` ボリュームに永続化されます。

## ローカル開発メモ

- `frontend/` は静的ファイルなので、編集後にブラウザをリロードすれば反映されます。
- API 変更後は `docker compose restart mmam` か、uvicorn の自動リロードを待つだけです。
- ハード削除など危険操作を行う場合は、UI 設定ページから Flow ID を入力して `/api/flows/{flow_id}/hard` を呼び出せます。

## ライセンス

MIT License ( `LICENSE` を参照 )。

---

# mmam-docker (English)

Media Multicast Address Manager (MMAM) is a lightweight registry for ST 2110 / NMOS flows. FastAPI + PostgreSQL powers the backend while a static Vue 3 + Tailwind UI runs behind nginx.

🛰️ Supports NMOS (IS-04 / IS-05) and SMPTE ST 2110 workflows. #NMOS #ST2110

## Highlights

- Rich flow schema with 2022-7 paths, aliases, custom fields, and metadata
- NMOS wizard to discover/import flows, plus NMOS diff/apply buttons
- Quick / Advanced search, JSON import/export, hard delete
- Flow lock toggle with role control, user/setting management
- Checker tabs (e.g., multicast collision report)
- MQTT notifications with per-field diff so external systems stay in sync

## Requirements

- Docker + Docker Compose
- Modern browser (Chrome/Edge/Firefox)
- At least 4 GB free RAM / 2 GB disk for the containers

## Architecture

```
docker-compose.yml
├─ mmam   : FastAPI app (uvicorn --reload)
├─ db     : PostgreSQL 16
├─ ui     : nginx serving `frontend/`
└─ mqtt   : Mosquitto broker (MQTT + WebSocket)
```

- FastAPI API: `http://localhost:8080`
- UI: `http://localhost:4173`
- MQTT WebSocket: `ws://localhost:9001`

## Installation / Setup

1. Clone or download the repository.
   ```bash
   git clone https://example.com/mmam-docker.git
   cd mmam-docker
   ```
2. Prepare environment variables.
   ```bash
   cp .env.example .env
   # update POSTGRES_*, SECRET_KEY, INIT_ADMIN, MQTT_* as needed
   ```
   - `INIT_ADMIN=true` seeds `admin / admin`.
   - Enable `MQTT_ENABLED=true` to start Mosquitto and realtime updates.
3. Start the stack.
   ```bash
   docker compose up --build
   ```
4. Open `http://localhost:4173`, sign in with `admin / admin`, and change the password.

### Common commands

```bash
docker compose down            # stop
docker compose logs -f mmam    # follow API logs
docker compose down -v         # drop DB volume
```

### Directory layout

| Path            | Description |
|-----------------|-------------|
| `src/app`       | FastAPI app (routers, auth, settings, MQTT helper) |
| `src/db_init.py`| DB bootstrap and seeding |
| `frontend/`     | Static Vue 3 + Tailwind UI |
| `logs/`         | Uvicorn logs on the host |
| `mosquitto/`    | Mosquitto config (MQTT + WebSocket listeners) |

## Using the UI

Open `http://<host>:4173` to access the dashboard. The sidebar switches between Dashboard / Flows / Search / New Flow / NMOS Wizard / Checker / Users / Settings.

### Dashboard & Flows

- Summary cards show total vs. active flows.
- The Flows widget provides paging, sorting, quick access to Details and Edit, and a lock indicator (`⚿`).

### Search

- Quick Search accepts a keyword and limit for cross-field lookup.
- Advanced Search exposes every relevant field, including UUID/IP filters, numeric ranges, and date ranges.

### Flow editing & lock

- `New Flow` captures all ST 2022-7 / NMOS fields plus aliases and custom fields.
- Editing allows toggling the lock (gray `⚿`). Permissions depend on `flow_lock_role`.
- Hard delete is exposed in Settings, requiring a Flow ID and admin role.

### JSON Import / Export

- Export downloads all flows as pretty JSON.
- Import accepts a JSON array; locked flows are skipped and the result summary is notified.

### NMOS wizard & diff

- Enter IS-04 / IS-05 base URLs and versions, click Discover, then select flows to import.
- Detail/Edit views expose **Check** (diff vs. NMOS) and **Apply** (choose fields to overwrite) buttons.

### Checker

- The Checker view groups diagnostics in tabs. The initial Collision tab highlights duplicate multicast addresses and lists `flow_id`, display name, and node label for each collision.

### Settings

- Manage API base URL, login form defaults, anonymous access toggles, flow lock role radios, JSON import/export, and the Hard Delete form.

### Realtime notifications (MQTT)

`docker-compose.yml` ships with Mosquitto so the MQTT stack becomes available as soon as `.env` sets `MQTT_ENABLED=true`.

| Variable | Purpose |
|----------|---------|
| `MQTT_HOST` / `MQTT_PORT` | Backend TCP endpoint (`mqtt:1883` by default) |
| `MQTT_WS_URL` | Browser WebSocket URL (e.g. `ws://localhost:9001`) |
| `MQTT_TOPIC_FLOW_UPDATES` | Topic base (`mmam/flows/events`). The API publishes to `<base>/all` and `<base>/flow/<flow_id>` |
| `MQTT_USERNAME/PASSWORD`, `MQTT_WS_USERNAME/PASSWORD` | Optional credentials if Mosquitto requires auth |

Whenever `PATCH /api/flows/{id}` (or NMOS apply) succeeds, the API publishes an “updated” event that contains a lightweight summary plus a `diff` object (creation/deletion events are not published).

#### Usage

1. Enable MQTT in `.env` and run `docker compose up`.
2. The browser UI automatically connects to the WebSocket URL and subscribes to `<base>/all`.
3. External clients can subscribe to:
   - `mmam/flows/events/all` for every update.
   - `mmam/flows/events/flow/<flow_id>` (or `…/flow/#`) for a subset.
4. Payload example:

```json
{
  "event": "updated",
  "flow_id": "35f0c2d7-db37-4972-b53e-4e7424276085",
  "flow": {
    "display_name": "Cam Video1",
    "flow_status": "active",
    "updated_at": "2025-11-27T07:45:12.871925"
  },
  "diff": {
    "alias1": { "old": "Tokyo Cam1", "new": "Tokyo Cam1 (HDR)" },
    "locked": { "old": false, "new": true }
  }
}
```

Consumers can inspect the `diff` to see exactly which fields changed without re-fetching the entire list.

### NMOS integration

In the NMOS Wizard you enter base URLs for IS-04 (Node API) / IS-05 (Connection API) and press **Discover**. The UI calls `/api/nmos/discover` and receives:

- `node`: metadata (label/description/IDs) of the selected NMOS node.
- `flows`: IS-04 Flow/Sender/Device/SDP tuples. Select multiple entries and post them to MMAM via `POST /api/flows`.

Transport, format, sender/device IDs, `node_label`, `node_description`, SDP URL/cache, and ST 2022-7 source/multicast fields are populated automatically so you can ingest many flows without manual typing.

### Naming & metadata registry

- Each flow carries `alias1`–`alias8`, so different departments can store their own nicknames (“Decoder#1”, “Tokyo Skycam 1”, etc.).
- External controllers query the REST API by `flow_id` to fetch displayable names or notes.
- Eight `user_field*` slots are available for ticket IDs, owners, device tags, and more—turning MMAM into a centralized naming database instead of scattered spreadsheets.

## REST API

Base URL: `http://HOST:8080/api`. Authentication uses JWT bearer tokens. Fetch a token via `/api/login` and send `Authorization: Bearer <token>`. You can relax restrictions with `DISABLE_AUTH=true` or the `allow_anonymous_*` settings if necessary.

### Authentication & JWT

- Token issuance: `POST /api/login`
  - Send `username`, `password` as `application/x-www-form-urlencoded`.
  - Response: `{ "access_token": "<JWT>", "token_type": "bearer" }`.
- JWT details:
  - Algorithm `HS256`, shared secret from `.env` (`SECRET_KEY`).
  - Payload contains `sub` (username), `role` (`viewer|editor|admin`), `exp` (issued +1 hour).
  - Tokens expire after one hour; re-login to refresh.
- Clients: include `Authorization: Bearer <token>` on protected endpoints.
- Anonymous access:
  - `.env` `DISABLE_AUTH=true` disables auth entirely (development only).
  - DB settings `allow_anonymous_flows` / `allow_anonymous_user_lookup` allow view-only anonymous calls per endpoint.
- The UI keeps the token only in memory; closing the browser tab removes it. Nothing is persisted to `localStorage`.

### Auth / Users

| Method & Path             | Description |
|---------------------------|-------------|
| `POST /login`             | Authenticate and receive a JWT. |
| `GET /me`                 | Return user info extracted from the token. |
| `GET /users`              | Admin only. List `{username, role, created_at}`. |
| `POST /users`             | Admin only. Create `{username, password, role}` (409 if duplicate). |
| `PATCH /users/{username}` | Admin only. Update `password` and/or `role`. |
| `DELETE /users/{username}`| Admin only. Cannot delete yourself. |

### Flows

#### `GET /flows`

List/search flows. Query parameters include:

| Param            | Default | Description |
|------------------|---------|-------------|
| `limit` (1–500)  | 50      | Number of records |
| `offset`         | 0       | Pagination offset |
| `sort_by`        | `updated_at` | Column to sort |
| `sort_order`     | `desc`  | `asc` / `desc` |
| `include_unused` | false   | Include logically deleted flows |
| `fields`         | (none)  | Comma-separated extra columns (e.g. `fields=source_addr_a,nmos_node_label`) |
| `q`              | (none)  | Keyword search across text fields |
| `updated_at_min/max`, `created_at_min/max` |  | ISO8601 date filters |
| `<column>`       |         | Filters for each text/int column defined in `TEXT_FILTER_FIELDS` / `INT_FILTER_FIELDS`. Integer fields also support `_min` / `_max`. |

Response is an array of objects; `flow_id`, `display_name`, `nmos_node_label`, `flow_status`, `availability`, `created_at`, `updated_at` are always included.

#### `GET /flows/{flow_id}`

Return full detail for one flow.

#### `POST /flows`

Create a flow from the JSON schema (`Flow` model) covering ST 2022-7, NMOS metadata, alias/user fields, etc. If `flow_id` is omitted but `nmos_flow_id` exists, the service can reuse it. Returns the inserted `flow_id`.

#### `PATCH /flows/{flow_id}`

Partial update; only the provided fields are modified.

#### `DELETE /flows/{flow_id}`

Logical delete by setting `flow_status='unused'` and `availability='lost'`.

#### `DELETE /flows/{flow_id}/hard`

Physical delete from the database. The UI “Hard Delete Flow” form calls this endpoint.

#### `GET /flows/summary`

Returns `{ "total": <count>, "active": <count> }` for the dashboard.

### Settings

| Method & Path | Description |
|---------------|-------------|
| `GET /settings`        | Admin only. Return the current settings map. |
| `GET /settings/{key}`  | Admin only. Fetch one key (404 if missing). |
| `PUT /settings/{key}`  | Admin only. Update and type-validate the value (`app/settings_store.py`). |

### NMOS

| Method & Path         | Description |
|-----------------------|-------------|
| `POST /nmos/discover` | Accepts `{is04_base_url, is05_base_url, is04_version, is05_version}` and returns candidate flows + node metadata. Used by the NMOS Wizard. |

### Health check

`GET /health` → `{ "status": "ok", "service": "MMAM" }`

## Database

- `db_init.py` runs at startup to:
  - Create `users`, `flows`, `settings`.
  - Seed `admin / admin` when `INIT_ADMIN=true`.
  - Insert a sample flow when `INIT_SAMPLE_FLOW=true`.
  - Insert default settings (`allow_anonymous_flows`, `allow_anonymous_user_lookup`).

PostgreSQL data persists in the `db_data` volume.

## Local development notes

- `frontend/` is static; refresh the browser after editing.
- After backend changes, either wait for uvicorn reload or run `docker compose restart mmam`.
- Dangerous operations (hard delete) can be triggered via the Settings view by entering a `flow_id`, which calls `/api/flows/{flow_id}/hard`.

## License

MIT License (see `LICENSE`).
