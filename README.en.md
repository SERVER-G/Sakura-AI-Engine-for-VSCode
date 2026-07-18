This file is translated by AI.

# Sakura AI Engine for VS Code

**Sakura AI Engine in VS Code Copilot Chat.**

This extension is an unofficial extension developed by the community. Please use this extension at your own risk.

This extension integrates [Sakura AI Engine](https://ai.sakura.ad.jp/sakura-ai/ai-engine/) as a Copilot Chat model provider in VS Code. By simply configuring your API key, you can use Sakura AI Engine models within Copilot Chat.

## Features

- **Use Sakura AI Engine models in Copilot Chat**: Select a model from the model picker to request code generation or refactoring.
- **Compatible with Copilot Chat features**: 
  - **Image Recognition (Vision)**: Paste screenshots or diagrams into the chat for consultation.
  - **Tool Use**: Agent functionality where the AI automatically performs file operations or terminal execution.
  - **Web Search & Reasoning (Responses API)**: Answers based on web information and advanced reasoning.
- **Leverage Workspace as Context (RAG)**: Index local code to obtain answers that consider the project context.
- **Usage Visualization**: Displays used token count and estimated cost in the status bar.

## Quick Start

1. **Installation**: Install from the VS Code Marketplace.
2. **API Key Setup**: Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) $\rightarrow$ Run **Sakura AI Engine: Set API Key** and enter your token.
3. **Model Selection**: Select a `Sakura AI Engine` model from the Copilot Chat model picker.
4. **Start Using**: Enter your questions or instructions in the chat.

## Documentation

For detailed configuration and feature guides, please refer to the guides in the [docs/](docs/) folder.

- [**Configuration Guide**](docs/configuration.md) — Recommended settings by purpose and their impacts.
- [**Usage Guide**](docs/usage.md) — From setup to image input and how to use agent features.
- [**RAG Guide**](docs/rag.md) — Setup and optimization of workspace search.

## License

MIT