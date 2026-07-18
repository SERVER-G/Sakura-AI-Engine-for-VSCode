This file is translated by AI.

# RAG (Workspace Search) Guide

Using RAG (Retrieval-Augmented Generation), you can automatically search for relevant code within your workspace and add it to the chat context when asking questions in Copilot Chat.

## Overview of How It Works

1. **Indexing**: Source code in the workspace is split into small chunks, vectorized using the Embedding API, and saved locally.
2. **Search**: When you ask a question in the chat, the system finds code chunks with a similar meaning to the question using vector search.
3. **Context Addition**: The found code is added to the prompt and sent to the model.

## Prerequisites

To use RAG, the following are required:

- API key must be configured.
- The workspace must be on a local disk (Web extensions are not supported).
- Target files must be small enough to be processed by the Embedding API.

## Setup Procedure

### 1. Index the Workspace

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
2. Execute **Sakura AI Engine: Index Workspace**.
3. A progress notification will appear, and the steps of "reading files" $\rightarrow$ "chunking" $\rightarrow$ "fetching embeddings" $\rightarrow$ "saving" will be performed sequentially.
4. Completion is reached when "Indexing completed" is displayed.

> Depending on the size of the workspace, the initial indexing may take from a few seconds to a few minutes.

### 2. Enable RAG

1. Open VS Code settings (`Ctrl+,` / `Cmd+,`).
2. Search for `sakuraAiEngine.enableRag`.
3. Check **Sakura AI Engine: Enable Rag**.

Alternatively, add the following to `settings.json`:

```json
{
  "sakuraAiEngine.enableRag": true
}
```

## Using in Chat

Once RAG is enabled, relevant code is automatically added just by asking questions as usual.

```text
Where is the authentication logic written in this project?
```

Then, functions or classes related to authentication are searched from the workspace and included in the model's input. The model answers by referring to that code.

## Updating the Index

If you make significant changes to the source code or add new files, it is recommended to re-index.

1. Re-execute **Sakura AI Engine: Index Workspace** from the Command Palette.
2. The old index will be overwritten and rebuilt with the latest code.

## Clearing the Index

If you stop using RAG or want to rebuild the index from scratch, execute **Sakura AI Engine: Clear Index** from the Command Palette. This will delete the vector data saved locally.

## Notes

- Even if RAG is enabled, it will behave like a normal chat if indexing has not been completed.
- For very large workspaces, indexing may take time and increase Embedding API costs.
- To exclude files from the search, it is effective to exclude them via `.gitignore` or VS Code's `files.exclude` settings.