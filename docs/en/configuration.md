This file is translated by AI.

# Configuration Guide

This page explains the configuration items for Sakura AI Engine for VS Code. Settings can be changed via the **Settings UI** or directly in **settings.json**.

## 🎯 Recommended Settings by Purpose (Quick Reference)

Depending on what you want to achieve, please change the following settings.

| Goal | Setting | Recommended Value | Result |
| :--- | :--- | :--- | :--- |
| **Want more creative/diverse ideas** | `temperature` | `1.0` 〜 `1.5` | Increases response variation and makes original suggestions more likely. |
| **Want accurate and deterministic answers (e.g. code fixes)** | `temperature` | `0.0` 〜 `0.3` | Stabilizes responses, providing almost the same result for the same question. |
| **Stop AI from repeating the same words** | `frequencyPenalty` | `0.5` 〜 `1.0` | Suppresses repetition of the same phrases, making text more natural. |
| **Frequent connection errors due to unstable network** | `connectTimeoutMs` | `30000` (30s) | Extends server connection wait time, making it easier to connect on unstable lines. |
| **Wait for very long code generation or deep reasoning** | `requestTimeoutMs` | `600000` (10m) | Extends timeout, preventing large generation tasks from being cut off. |
| **Want answers considering the whole project code** | `enableRag` | `true` | Relevant local files are automatically loaded, providing context-based answers. |
| **Simplify the status bar (hide cost display)** | `showTokenUsage` | `false` | Hides token usage from the status bar for a cleaner look. |

---

## How to Open Settings

### Using Settings UI
1. Open VS Code settings with `Ctrl+,` (or `Cmd+,` on macOS).
2. Type `sakuraAiEngine` in the search box.
3. Change the items in the "Sakura AI Engine" section.

### Editing settings.json Directly
1. Open the Command Palette with `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS).
2. Select **Preferences: Open User Settings (JSON)**.
3. Add or edit properties starting with `sakuraAiEngine`.

```json
{
  "sakuraAiEngine.baseUrl": "https://api.ai.sakura.ad.jp",
  "sakuraAiEngine.enableRag": true
}
```

## Detailed Settings List

### API Connection

#### `sakuraAiEngine.baseUrl`
- **Type**: `string` / **Default**: `"https://api.ai.sakura.ad.jp"`
- **Description**: Base URL for the Sakura AI Engine API.
- **Details**: Changes the connection endpoint. Used for proxy usage or connecting to a local development server.

#### `sakuraAiEngine.defaultTransport`
- **Type**: `string` (only `chat-completions`) / **Default**: `"chat-completions"`
- **Description**: Transport method for the Chat API.
- **Details**: Reserved for future communication method expansions. Currently, changing it has no effect.

#### `sakuraAiEngine.requestTimeoutMs`
- **Type**: `number` / **Default**: `300000` (5 min)
- **Description**: Total timeout for a single request to complete (milliseconds).

#### `sakuraAiEngine.connectTimeoutMs`
- **Type**: `number` / **Default**: `10000` (10 sec)
- **Description**: Timeout for establishing a connection to the API server (milliseconds).

#### `sakuraAiEngine.readIdleTimeoutMs`
- **Type**: `number` / **Default**: `60000` (1 min)
- **Description**: Maximum time to wait when no data is arriving during streaming (milliseconds).

#### `sakuraAiEngine.maxConcurrentRequests`
- **Type**: `number` (1 to 16) / **Default**: `4`
- **Description**: Maximum number of API requests that can be executed simultaneously.

#### `sakuraAiEngine.allowInsecureHttpForLocalDev`
- **Type**: `boolean` / **Default**: `false`
- **Description**: Allow HTTP (non-TLS) connections for local development.
- **Warning**: **Never enable this in production environments.**

### Feature Toggles

#### `sakuraAiEngine.enableVision`
- **Type**: `boolean` / **Default**: `true`
- **Description**: Enable image input (Vision) feature.
- **Result**: If `false`, images in messages will be ignored.

#### `sakuraAiEngine.enableToolCalling`
- **Type**: `boolean` / **Default**: `true`
- **Description**: Enable tool calling feature.
- **Result**: If `false`, agent features like file operations will stop working, providing only text responses.

#### `sakuraAiEngine.enableRag`
- **Type**: `boolean` / **Default**: `false`
- **Description**: Automatically search workspace code and add to chat (RAG).
- **Result**: If `true`, relevant code is automatically added to the context based on the question. Requires indexing.

### Generation Parameters

#### `sakuraAiEngine.temperature`
- **Type**: `number` (0 to 2) / **Default**: `0.7`
- **Description**: Generation diversity (lower is more deterministic, higher is more diverse).

#### `sakuraAiEngine.frequencyPenalty`
- **Type**: `number` (-2 to 2) / **Default**: `0.3`
- **Description**: Penalty to suppress repetition of the same tokens.

#### `sakuraAiEngine.presencePenalty`
- **Type**: `number` (-2 to 2) / **Default**: `0.1`
- **Description**: Penalty to encourage the appearance of new tokens.

### Display & Logging

#### `sakuraAiEngine.showTokenUsage`
- **Type**: `boolean` / **Default**: `true`
- **Description**: Show token usage and estimated cost in the status bar.

#### `sakuraAiEngine.debugLogging`
- **Type**: `boolean` / **Default**: `false`
- **Description**: Enable debug logging.

### Advanced Settings

#### `sakuraAiEngine.models`
- **Type**: `object[]` / **Default**: `[]`
- **Description**: Override settings for custom model definitions.

## Setting Update Timing

- **API Connection**: Reflected immediately from the next request.
- **Feature Toggles**: Reflected from the next chat message.
- **Generation Parameters**: Reflected from the next request.
- **Model Overrides**: Reflected after restarting the extension or the next time the model list is fetched.