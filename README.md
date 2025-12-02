# mmam-docker

Media Multicast Address Manager (MMAM) は、ST 2110 / NMOS フローの名前やメタデータを一元管理するフルスタックパッケージです。FastAPI + PostgreSQL で REST API を公開し、Vue 3 + Tailwind 製のシングルページ UI と Mosquitto MQTT によるリアルタイム通知を同梱しています。

> English description is available in the second half of this document.  
> 本ドキュメント後半に英語版を記載しています。

## 主な特長

- **API + データベース** – 8 本の別名 / 8 本のユーザーフィールドなど放送運用向けスキーマを REST API 経由で読み書き可能。UUID (`flow_id`) を共通キーにして外部システムと連携できます。
- **Vue 3 管理 UI** – Dashboard、Flows、Search、NMOS Wizard、Planner、Checker、Settings を搭載。フロー編集・ロック操作・JSON イン/アウトをブラウザだけで完結。
- **Planner（アドレス帳）** – ドライブ (/8) → フォルダ (parent) → View (child) をツリー表示。Explorer でグリッド確認、Manage で即時編集、Backup で JSON Export/Import が可能。
- **MQTT 通知** – `.env` の `MQTT_ENABLED=true` で Mosquitto が立ち上がり、フロー更新イベントを `mmam/flows/events/...` へ publish。UI も WebSocket で購読して即時反映します。
- **バックアップと復元** – Planner の Backup タブからフォルダ/ビュー構成を JSON でエクスポートし、ボタン 1 つで復元できます。

## コンポーネント

```
docker-compose.yml
├─ mmam   : FastAPI (uvicorn --reload)
├─ db     : PostgreSQL 16
├─ ui     : nginx が frontend/ を配信
└─ mqtt   : Mosquitto (MQTT + WebSocket)
```

- API: `http://localhost:8080`
- UI: `http://localhost:4173`
- MQTT (WS): `ws://localhost:9001`

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
3. コンテナを起動
   ```bash
   docker compose up --build
   ```
4. ブラウザで `http://localhost:4173` にアクセスし、`admin / admin` でログインしてパスワードを変更。

### よく使うコマンド

```bash
docker compose down                 # 停止
docker compose logs -f mmam         # API ログを追跡
docker compose down -v              # DB を含めリセット
```

## UI の使い方

### Dashboard & Flows

Summary カードで総数/Active 数、Flows ウィジェットでページングとソートを操作できます。行の `Details` でモーダルが開き、`Edit` でフロー編集フォームへ遷移。ロックされたフローは `⚿` で表示されます。

### Search

- **Quick Search** – `q` と `limit` だけで横断検索。
- **Advanced Search** – UUID, IP, ポート範囲、日付レンジ、各種カラムフィルターを組み合わせて検索可能。

### NMOS Wizard

IS-04/05 のベースURLとバージョンを入力し `Discover` すると、ノード情報と取得したフロー候補が一覧化されます。選択したフローを `Import Selected` で flows テーブルに投入し、詳細画面から NMOS diff / apply を実行できます。

### Checker

`Checker` タブではマルチキャスト衝突や NMOS - MMAM 差分などをレポート表示。重複アドレスは赤字で表示されます。
直近に実行した結果はサーバーに保存され、タブを開くだけで最新のレポートが自動的に読み込まれます。

### Settings

API Base URL、匿名アクセス、flow lock role、Hard Delete などを制御できます。フローの JSON Export/Import もここから行います。
同じタブ内で API / Audit ログの最新 200 行を確認し、テキストファイルとしてダウンロードできます。

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

## API サマリ

- `POST /api/login` – JWT を取得。
- `GET /api/flows` / `POST /api/flows` / `PATCH /api/flows/{id}` – フロー CRUD。
- `GET /api/address/buckets/...` – Planner ツリー取得。
- `POST /api/address/buckets/parent|child` – フォルダ/ビュー作成。
- `PATCH /api/address/buckets/{id}` / `DELETE ...` – Planner エントリ更新・削除。
- `GET /api/address/buckets/export` / `POST /api/address/buckets/import` – Planner バックアップ入出力。
- `POST /api/nmos/discover` – NMOS ノードからフロー候補を取得。
- `GET /api/checker/latest?kind=collisions|nmos` – 最後に実行した Checker 結果を取得。
- `GET /api/logs` / `GET /api/logs/download` – API / Audit ログの参照とダウンロード（管理者のみ）。

認証は JWT (Bearer) で、`.env` の `SECRET_KEY` を共有キーにしています。`DISABLE_AUTH=true` で開発用に無効化することも可能です。

---

# mmam-docker (English)

Media Multicast Address Manager (MMAM) is a full-stack toolkit for managing ST 2110 / NMOS flows. It ships with a FastAPI backend, PostgreSQL schema, Vue 3 + Tailwind UI, and Mosquitto for MQTT notifications.

## Highlights

1. **Rich REST API** – Flexible schema (aliases ×8, user fields ×8) exposed via FastAPI, making system-to-system integration straightforward.
2. **Vue 3 UI** – Dashboard, Flows, Search, NMOS Wizard, Planner, Checker, Settings, and Flow JSON export/import.
3. **Planner workspace** – Tree view of /8 drives → parent folders → child views, grid-based explorer, inline edit forms, and one-click JSON backup/restore.
4. **Realtime MQTT** – Optional Mosquitto broker publishes flow diffs to `mmam/flows/events/...`, which both UI and external controllers can subscribe to.

## Architecture & Setup

The stack is orchestrated via Docker Compose (FastAPI app, PostgreSQL, nginx static UI, Mosquitto). Copy `.env.example` to `.env`, adjust secrets and MQTT URLs, then run `docker compose up --build`. Access the UI at `http://localhost:4173` and sign in with `admin / admin`.

## Using the UI

- **Flows / Search** – Manage flows, lock/unlock entries, and perform quick or advanced searches.
- **NMOS Wizard** – Discover IS-04/05 nodes, import selected flows, and run NMOS diff/apply operations.
- **Checker** – Inspect multicast collisions or NMOS vs MMAM differences. The latest run results are persisted server-side so the tab always shows the most recent report.
- **Settings** – Control API base URL, anonymous settings, flow lock role, hard delete, and flow JSON export/import.
  The same view also exposes API / audit logs (latest 200 lines + download buttons) for administrators.
- **Planner** – Explorer grid (double-click cells to open flow detail), Manage panel for creating/editing folders/views, Backup tab to export/import the entire tree.

## Planner Backup Format

`GET /api/address/buckets/export` returns:

```json
{
  "buckets": [
    {
      "id": 22,
      "kind": "parent",
      "privilege_id": 16,
      "parent_id": 17,
      "start_ip": "239.10.0.0",
      "end_ip": "239.10.127.255",
      "description": "test2",
      "memo": "",
      "color": "#888888",
      "cidr": "239.10.0.0/17",
      "is_reserved": false
    }
  ],
  "count": 23
}
```

Save the JSON and later feed it to `POST /api/address/buckets/import` to restore the exact structure.

## MQTT

Set `MQTT_ENABLED=true` and ensure `MQTT_WS_URL` points to a reachable host (e.g., `ws://192.168.x.x:9001`). The UI subscribes to `mmam/flows/events/all` and `.../flow/<flow_id>` for realtime updates. External controllers can use the same topics.

## Repository layout

| Path              | Description                                   |
|-------------------|-----------------------------------------------|
| `src/app`         | FastAPI code (routers, auth, settings, MQTT)  |
| `src/db_init.py`  | DB bootstrap and seed data                    |
| `frontend/`       | Vue 3 + Tailwind single-page UI               |
| `mosquitto/`      | Mosquitto config (MQTT + WebSocket listeners) |
| `logs/`           | Host-side log output                          |

## License

MIT License. See `LICENSE`.
