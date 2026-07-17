# 設定ガイド

このページでは、Sakura AI Engine for VS Code の設定項目を説明します。設定は **設定 UI** または **settings.json** のどちらからでも変更できます。

## 🎯 目的別・おすすめ設定（クイックリファレンス）

「こうしたい」という目的に合わせて、以下の設定を変更してください。

| 実現したいこと | 変更する項目 | 推奨値 | 結果（どうなるか） |
| :--- | :--- | :--- | :--- |
| **より創造的・多様なアイデアが欲しい** | `temperature` | `1.0` 〜 `1.5` | 回答のバリエーションが増え、独創的な提案が出やすくなります。 |
| **正確で決定的な回答（コード修正など）が欲しい** | `temperature` | `0.0` 〜 `0.3` | 回答が安定し、同じ質問に対してほぼ同じ結果が得られるようになります。 |
| **AI が同じ言葉を何度も繰り返すのを止めたい** | `frequencyPenalty` | `0.5` 〜 `1.0` | 同じフレーズの繰り返しが抑制され、より自然な文章になります。 |
| **ネットワークが不安定で接続エラーが多発する** | `connectTimeoutMs` | `30000` (30秒) | サーバーへの接続待機時間が伸び、不安定な回線でも接続しやすくなります。 |
| **非常に長いコード生成や深い推論を待機したい** | `requestTimeoutMs` | `600000` (10分) | タイムアウトまでの時間が伸び、大規模な生成タスクが途中で切れるのを防ぎます。 |
| **プロジェクト全体のコードを考慮して回答させたい** | `enableRag` | `true` | 質問に関連するローカルファイルが自動的に読み込まれ、コンテキストに基づいた回答が得られます。 |
| **ステータスバーをシンプルにしたい（コスト表示を消す）** | `showTokenUsage` | `false` | ステータスバーからトークン使用量表示が消え、画面がスッキリします。 |

---

## 設定の開き方

### 設定 UI で開く
1. `Ctrl+,`（macOS は `Cmd+,`）で VS Code の設定を開く
2. 検索ボックスに `sakuraAiEngine` と入力
3. 「Sakura AI Engine」セクションの項目を変更

### settings.json で直接編集する
1. `Ctrl+Shift+P`（macOS は `Cmd+Shift+P`）でコマンドパレットを開く
2. **設定: settings.json を開く (JSON)** を選択
3. `sakuraAiEngine` で始まるプロパティを追加・編集

```json
{
  "sakuraAiEngine.baseUrl": "https://api.ai.sakura.ad.jp",
  "sakuraAiEngine.enableRag": true
}
```

## 詳細設定項目一覧

### API 接続

#### `sakuraAiEngine.baseUrl`
- **型**: `string` / **デフォルト**: `"https://api.ai.sakura.ad.jp"`
- **説明**: さくらのAI Engine API のベース URL
- **詳細**: 接続先エンドポイントを変更します。プロキシ経由の利用や、ローカルの開発サーバーへ接続する場合に使用します。

#### `sakuraAiEngine.defaultTransport`
- **型**: `string`（`chat-completions` のみ） / **デフォルト**: `"chat-completions"`
- **説明**: チャット API のトランスポート方式
- **詳細**: 将来的な通信方式の拡張用に予約されています。現在は変更による影響はありません。

#### `sakuraAiEngine.requestTimeoutMs`
- **型**: `number` / **デフォルト**: `300000`（5 分）
- **説明**: 1 回のリクエストが完了するまでの総タイムアウト（ミリ秒）

#### `sakuraAiEngine.connectTimeoutMs`
- **型**: `number` / **デフォルト**: `10000`（10 秒）
- **説明**: API サーバーへの接続確立までのタイムアウト（ミリ秒）

#### `sakuraAiEngine.readIdleTimeoutMs`
- **型**: `number` / **デフォルト**: `60000`（1 分）
- **説明**: ストリーミング中にデータが到着しない状態が続く最大時間（ミリ秒）

#### `sakuraAiEngine.maxConcurrentRequests`
- **型**: `number`（1 ～ 16） / **デフォルト**: `4`
- **説明**: 同時に実行できる API リクエストの最大数

#### `sakuraAiEngine.allowInsecureHttpForLocalDev`
- **型**: `boolean` / **デフォルト**: `false`
- **説明**: ローカル開発用に HTTP（非 TLS）接続を許可する
- **警告**: **本番環境では絶対に有効にしないでください。**

### 機能の有効/無効

#### `sakuraAiEngine.enableVision`
- **型**: `boolean` / **デフォルト**: `true`
- **説明**: 画像入力（Vision）機能を有効にする
- **結果**: `false` にすると、画像付きメッセージを送っても画像が無視されます。

#### `sakuraAiEngine.enableToolCalling`
- **型**: `boolean` / **デフォルト**: `true`
- **説明**: ツール呼び出し機能を有効にする
- **結果**: `false` にすると、ファイル操作などのエージェント機能が動作しなくなり、テキスト応答のみになります。

#### `sakuraAiEngine.enableRag`
- **型**: `boolean` / **デフォルト**: `false`
- **説明**: ワークスペースのコードを自動検索してチャットに追加する（RAG）
- **結果**: `true` にすると、質問に応じて関連コードが自動的にコンテキストに追加されます。要インデックス化。

### 生成パラメータ

#### `sakuraAiEngine.temperature`
- **型**: `number`（0 ～ 2） / **デフォルト**: `0.7`
- **説明**: 生成の多様性（低いほど決定的、高いほど多様）

#### `sakuraAiEngine.frequencyPenalty`
- **型**: `number`（-2 ～ 2） / **デフォルト**: `0.3`
- **説明**: 同じトークンの繰り返しを抑制するペナルティ

#### `sakuraAiEngine.presencePenalty`
- **型**: `number`（-2 ～ 2） / **デフォルト**: `0.1`
- **説明**: 新しいトークンの出現を促進するペナルティ

### 表示・ログ

#### `sakuraAiEngine.showTokenUsage`
- **型**: `boolean` / **デフォルト**: `true`
- **説明**: ステータスバーにトークン使用量と推定コストを表示する

#### `sakuraAiEngine.debugLogging`
- **型**: `boolean` / **デフォルト**: `false`
- **説明**: デバッグログを有効にする

### 高度な設定

#### `sakuraAiEngine.models`
- **型**: `object[]` / **デフォルト**: `[]`
- **説明**: カスタムモデル定義の上書き設定

## 設定変更の反映タイミング

- **API 接続系**: 次のリクエストから即座に反映されます。
- **機能スイッチ系**: 次のチャットメッセージから反映されます。
- **生成パラメータ系**: 次のリクエストから反映されます。
- **モデル上書き**: 拡張機能の再起動後、または次回モデル一覧取得時に反映されます。