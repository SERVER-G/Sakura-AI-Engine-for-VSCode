# Sakura AI Engine for VS Code

さくらのAI Engine を VS Code Copilot Chat のモデルプロバイダーとして統合する拡張機能です。

## 機能

- **チャット統合**: さくらのAI Engine のモデルを VS Code の Copilot Chat モデルピッカーに追加
- **ストリーミング応答**: Server-Sent Events による逐次表示
- **ツール呼び出し**: VS Code エージェントのツール機能を完全サポート
- **画像入力 (Vision)**: 対応モデルでの画像付き質問をサポート
- **モデル自動検出**: `/v1/models` API から利用可能なモデルを動的に取得
- **トークン使用量・コスト追跡**: ステータスバーに推定コストをリアルタイム表示
- **ワークスペース RAG**: Embeddings API でコードベースをセマンティック検索し、関連コードを自動でチャットに追加
- **Responses API**: Kimi K2.6 / gemma-4-31B-it で Web 検索・推論機能をサポート
- **安全な認証**: VS Code の SecretStorage を使った API キー管理
- **日本語エラー**: エラーメッセージを日本語で表示

## 前提条件

- さくらのクラウドのアカウントと AI Engine の契約
- VS Code 1.103.0 以上

## セットアップ

1. 拡張機能をインストール
2. コマンドパレット (`Ctrl+Shift+P`) から「Sakura AI Engine: API キーを設定」を実行
3. さくらのクラウドコントロールパネルで発行したトークン (`UUID:シークレット` 形式) を入力
4. Copilot Chat のモデルピッカーから Sakura AI Engine のモデルを選択

## 利用可能なモデル

起動時に `/v1/models` API から自動的にモデル一覧を取得します。API が利用できない場合は組み込みリストをフォールバックとして使用します。

### チャットモデル

| モデル ID | 名前 | Vision | ツール呼び出し | Responses API | 入力料金 | 出力料金 |
|---|---|---|---|---|---|---|
| `Qwen3-Coder-30B-A3B-Instruct` | Qwen3 Coder 30B A3B Instruct | ❌ | ✅ | ❌ | ¥0.15/10K | ¥0.75/10K |
| `Qwen3-Coder-480B-A35B-Instruct-FP8` | Qwen3 Coder 480B A35B Instruct (FP8) | ❌ | ✅ | ❌ | ¥0.30/10K | ¥2.50/10K |
| `cotomi` | cotomi | ❌ | ❌ | ❌ | ¥5.00/10K | ¥18.00/10K |
| `gpt-oss-120b` | gpt-oss 120b | ❌ | ✅ | ❌ | ¥0.15/10K | ¥0.75/10K |
| `llm-jp-3.1-8x13b-instruct4` | LLM-jp 3.1 8x13B Instruct4 | ❌ | ❌ | ❌ | ¥0.15/10K | ¥0.75/10K |
| `plamo-2.0-31b` | PLaMo 2.0 31B | ❌ | ❌ | ❌ | ¥1.00/10K | ¥4.00/10K |
| `preview/Kimi-K2.6` | Kimi K2.6 (Preview) | ✅ | ✅ | ✅ | ¥0.60/10K | ¥3.00/10K |
| `preview/Phi-4-mini-instruct-cpu` | Phi-4 Mini Instruct (CPU, Preview) | ❌ | ❌ | ❌ | ¥0.01/10K | ¥0.03/10K |
| `preview/Phi-4-multimodal-instruct` | Phi-4 Multimodal Instruct (Preview) | ✅ | ❌ | ❌ | ¥0.10/10K | ¥0.30/10K |
| `preview/Qwen3-0.6B-cpu` | Qwen3 0.6B (CPU, Preview) | ❌ | ❌ | ❌ | ¥0.01/10K | ¥0.03/10K |
| `preview/Qwen3-VL-30B-A3B-Instruct` | Qwen3 VL 30B A3B Instruct (Preview) | ✅ | ❌ | ❌ | ¥0.10/10K | ¥0.30/10K |
| `preview/Qwen3.6-35B-A3B` | Qwen3.6 35B A3B (Preview) | ✅ | ✅ | ❌ | ¥0.30/10K | ¥1.50/10K |
| `preview/gemma-4-31B-it` | Gemma 4 31B IT (Preview) | ✅ | ✅ | ✅ | ¥0.24/10K | ¥0.96/10K |

### Embeddings モデル

| モデル ID | 名前 | 料金 |
|---|---|---|
| `multilingual-e5-large` | multilingual-e5-large | ¥2.00/10K |
| `preview/Qwen3-Embedding-4B-FP16` | Qwen3 Embedding 4B FP16 (Preview) | ¥3.00/10K |

## 設定

| 設定 | デフォルト | 説明 |
|---|---|---|
| `sakuraAiEngine.baseUrl` | `https://api.ai.sakura.ad.jp` | API エンドポイントの Base URL |
| `sakuraAiEngine.requestTimeoutMs` | `300000` | リクエスト総タイムアウト (ms) |
| `sakuraAiEngine.connectTimeoutMs` | `10000` | 接続タイムアウト (ms) |
| `sakuraAiEngine.enableVision` | `true` | Vision 機能の有効/無効 |
| `sakuraAiEngine.enableToolCalling` | `true` | ツール呼び出しの有効/無効 |
| `sakuraAiEngine.enableRag` | `false` | ワークスペース RAG の有効/無効 |
| `sakuraAiEngine.showTokenUsage` | `true` | ステータスバーにコスト表示 |
| `sakuraAiEngine.debugLogging` | `false` | デバッグログ (本文は秘匿) |

## コマンド

- **Sakura AI Engine: API キーを設定** — API キーを SecretStorage に保存
- **Sakura AI Engine: API キーを削除** — 保存された API キーを削除
- **Sakura AI Engine: 接続テスト** — API エンドポイントへの接続を診断
- **Sakura AI Engine: ワークスペースをインデックス化** — コードベースをベクトル化して RAG を有効化
- **Sakura AI Engine: インデックスをクリア** — ワークスペースインデックスを削除

## RAG（検索拡張生成）の使い方

1. コマンドパレットから「ワークスペースをインデックス化」を実行
2. 設定 `sakuraAiEngine.enableRag` を `true` に変更
3. Copilot Chat で質問すると、自動的にワークスペース内の関連コードがコンテキストに追加されます

## Responses API

`preview/Kimi-K2.6` と `preview/gemma-4-31B-it` は自動的に Responses API を使用します。Web 検索や推論（reasoning）機能が利用可能です。

## 制限事項

- Web Extension (vscode.dev) は非対応 (Desktop / Remote 環境が対象)
- モデルの自動検出は API キー設定後に実行されます

## ライセンス

MIT
