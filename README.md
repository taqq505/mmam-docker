# mmam-docker
media multicast address manager

## Frontend (experimental)

シンプルなコントロールパネルUIを `frontend/` 以下に追加しました。Vue 3 を CDN で読み込む静的サイト構成なのでビルド不要です。`docker compose up` を実行すると以下が起動します。

- FastAPI API: http://localhost:8080
- UI (nginx 提供): http://localhost:4173

UI では API ベースURLやログイン情報をブラウザに保存し、手動フロー入力・一覧表示ができます。Token がない状態でも匿名アクセスが許可されていればフロー参照のみ可能です。
