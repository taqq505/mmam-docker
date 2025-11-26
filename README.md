# mmam-docker

> English version of this document is included below.

![NMOS](https://img.shields.io/badge/NMOS-IS--04-informational)
![NMOS](https://img.shields.io/badge/NMOS-IS--05-informational)
Media Multicast Address Manager (MMAM) は、ST 2110 / NMOS フローの登録・検索・ユーザー管理を行うシンプルな管理ツールです。FastAPI + PostgreSQL をバックエンドに、Vue 3 + Tailwind CSS の軽量なフロントエンドを nginx から配信します。

🛰️ このプロジェクトは NMOS (IS-04 / IS-05) と SMPTE ST 2110 ワークフローをサポートしています。 #NMOS #ST2110

## 構成

```
docker-compose.yml
├─ mmam   : FastAPI アプリ (uvicorn --reload)
├─ db     : PostgreSQL 16
└─ ui     : nginx で `frontend/` を配信
```

ホスト側の `src/` と `logs/` を `mmam` コンテナにマウントしているため、ソースを編集すると即座にリロードされます。UI はビルド不要の静的ファイルで、ブラウザ側 `localStorage` に API ベースURLとログイン情報を保存します。

- FastAPI API: `http://localhost:8080`
- UI (nginx 提供): `http://localhost:4173`

## セットアップ

1. 依存: Docker / Docker Compose
2. 環境変数ファイルを作成

   ```bash
   cp .env.example .env
   # 必要に応じて POSTGRES_* / SECRET_KEY / INIT_ADMIN を変更
   ```

3. 起動

   ```bash
   docker compose up --build
   ```

4. 初期管理者 ( `admin` / `admin` ) でログインし、パスワードを変更してください。

### ディレクトリ

| Path        | 説明 |
|-------------|------|
| `src/app`   | FastAPI アプリケーション (routers, auth, settings) |
| `src/db_init.py` | DB 初期化とシード (ユーザー、flows テーブル等) |
| `frontend/` | Vue 3 + Tailwind の静的 UI |
| `logs/`     | API コンテナのログ出力先 |

## フロントエンドの使い方

ブラウザで `http://ホスト:4173` にアクセスするとコントロールパネルが表示されます。

- 左サイドバーから Dashboard / Flows / Search / New Flow / NMOS Wizard / Users / Settings を切り替え。
- Dashboard ではサマリーと最新のフロー一覧を確認可能。
- Search では簡易検索 (`q`) と Advanced Search を提供。Advanced Search の Limit 入力は上部に配置。
- New Flow で手動登録、NMOS Wizard で `/api/nmos/discover` 結果から一括インポート。
- Settings では API Base URL やログイン情報、DB設定のトグル、Hard Delete フォームを提供。

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

Media Multicast Address Manager (MMAM) is a lightweight tool to register, search, and govern ST 2110 / NMOS flows. The backend is FastAPI + PostgreSQL and the frontend is a static Vue 3 + Tailwind CSS site served by nginx.

🛰️ Supports NMOS (IS-04 / IS-05) and SMPTE ST 2110 workflows. #NMOS #ST2110

## Architecture

```
docker-compose.yml
├─ mmam   : FastAPI app (uvicorn --reload)
├─ db     : PostgreSQL 16
└─ ui     : nginx serving `frontend/`
```

`src/` and `logs/` on the host are bind-mounted into the `mmam` container, so any source edit triggers uvicorn reloads. The UI is a static bundle; API base URL and login inputs are stored in browser `localStorage`.

- FastAPI API: `http://localhost:8080`
- UI (nginx): `http://localhost:4173`

## Setup

1. Requirements: Docker / Docker Compose
2. Prepare environment variables

   ```bash
   cp .env.example .env
   # Customize POSTGRES_* / SECRET_KEY / INIT_ADMIN if needed
   ```

3. Launch stack

   ```bash
   docker compose up --build
   ```

4. Sign in with the seeded admin (`admin` / `admin`) and change the password.

### Directory layout

| Path          | Description |
|---------------|-------------|
| `src/app`     | FastAPI application (routers, auth, settings) |
| `src/db_init.py` | Database bootstrap + seed (users / flows tables, defaults) |
| `frontend/`   | Static Vue 3 + Tailwind UI |
| `logs/`       | Host directory for API container logs |

## Frontend usage

Open `http://<host>:4173` in a browser to access the control panel.

- Sidebar navigation switches Dashboard / Flows / Search / New Flow / NMOS Wizard / Users / Settings.
- Dashboard shows totals plus the most recent flows.
- Search provides quick search (`q`) and Advanced Search (limit input is located at the top).
- New Flow registers flows manually; NMOS Wizard lets you bulk-import NMOS results via `/api/nmos/discover`.
- Settings manages API Base URL, login, DB toggles, and the Hard Delete form.

### NMOS integration

In the `NMOS Wizard` view you enter base URLs for IS-04 (Node API) / IS-05 (Connection API) and press **Discover**. The UI calls `/api/nmos/discover` and receives:

- `node`: metadata (label/description/IDs) of the selected NMOS node.
- `flows`: a list of IS-04 Flow/Sender/Device/SDP tuples. You can select multiple entries and push them to MMAM via `POST /api/flows`.

You can therefore connect to an NMOS network directly from a static UI bundle and ingest many flows without manual data entry. Transport, format, sender/device IDs, `node_label`, `node_description`, SDP URL/cache, and ST 2022-7 source/multicast fields are populated automatically.

### Naming & metadata registry

MMAM doubles as a naming database for production teams.

- Each flow carries `alias1`–`alias8`, so different departments can store their own nicknames. For example, a transmission team might call a decoder input “Decoder#1” while production wants to display “Tokyo Skycam 1”; both can be stored and referenced.
- Third-party broadcast controllers or automation can query the REST API by `flow_id` (UUID) and display human-readable names or notes on their UI.
- `user_field1`–`user_field8` allow free-form metadata such as circuit ticket IDs, contacts, or equipment tags.

This keeps NMOS sender/flow UUIDs tied to familiar names across organizations without running scattered spreadsheets.

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
