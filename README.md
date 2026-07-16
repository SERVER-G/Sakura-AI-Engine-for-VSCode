# Sakura AI Engine for VS Code

さくらのAI Engine を VS Code Copilot Chat のモデルプロバイダーとして統合する拡張機能です。

## 機能

- **チャット統合**: さくらのAI Engine のモデルを VS Code の Copilot Chat モデルピッカーに追加
- **ストリーミング応答**: Server-Sent Events による逐次表示
- **ツール呼び出し**: VS Code エージェントのツール機能を完全サポート
- **画像入力 (Vision)**: 対応モデルでの画像付き質問をサポート
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

利用可能なモデルはさくらのクラウドコントロールパネルの「利用可能なモデル」でご確認ください。

初期設定では以下のモデルが登録されています:

| モデル ID | 名前 | Vision | ツール呼び出し |
|---|---|---|---|
| `Qwen3-Coder-30B-A3B-Instruct` | Qwen3 Coder 30B A3B Instruct | ❌ | ✅ |
| `Qwen3-Coder-480B-A35B-Instruct-FP8` | Qwen3 Coder 480B A35B Instruct (FP8) | ❌ | ✅ |
| `cotomi` | cotomi | ❌ | ❌ |
| `gpt-oss-120b` | gpt-oss 120b | ❌ | ✅ |
| `llm-jp-3.1-8x13b-instruct4` | LLM-jp 3.1 8x13B Instruct4 | ❌ | ❌ |
| `plamo-2.0-31b` | PLaMo 2.0 31B | ❌ | ❌ |
| `preview/Kimi-K2.6` | Kimi K2.6 (Preview) | ✅ | ✅ |
| `preview/Phi-4-mini-instruct-cpu` | Phi-4 Mini Instruct (CPU, Preview) | ❌ | ❌ |
| `preview/Phi-4-multimodal-instruct` | Phi-4 Multimodal Instruct (Preview) | ✅ | ❌ |
| `preview/Qwen3-0.6B-cpu` | Qwen3 0.6B (CPU, Preview) | ❌ | ❌ |
| `preview/Qwen3-VL-30B-A3B-Instruct` | Qwen3 VL 30B A3B Instruct (Preview) | ✅ | ❌ |
| `preview/Qwen3.6-35B-A3B` | Qwen3.6 35B A3B (Preview) | ✅ | ✅ |
| `preview/gemma-4-31B-it` | Gemma 4 31B IT (Preview) | ✅ | ✅ |

## 設定

| 設定 | デフォルト | 説明 |
|---|---|---|
| `sakuraAiEngine.baseUrl` | `https://api.ai.sakura.ad.jp` | API エンドポイントの Base URL |
| `sakuraAiEngine.requestTimeoutMs` | `300000` | リクエスト総タイムアウト (ms) |
| `sakuraAiEngine.connectTimeoutMs` | `10000` | 接続タイムアウト (ms) |
| `sakuraAiEngine.enableVision` | `true` | Vision 機能の有効/無効 |
| `sakuraAiEngine.enableToolCalling` | `true` | ツール呼び出しの有効/無効 |
| `sakuraAiEngine.debugLogging` | `false` | デバッグログ (本文は秘匿) |

## コマンド

- **Sakura AI Engine: API キーを設定** - API キーを SecretStorage に保存
- **Sakura AI Engine: API キーを削除** - 保存された API キーを削除
- **Sakura AI Engine: 接続テスト** - API エンドポイントへの接続を診断

## 制限事項

- 現時点では `/v1/chat/completions` (Chat Completions API) のみ対応
- Web Extension (vscode.dev) は非対応 (Desktop / Remote 環境が対象)
- モデルの自動検出は未対応 (コントロールパネルで確認して手動設定)

## ライセンス

MIT
