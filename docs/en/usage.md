This file is translated by AI.

# Usage Guide

This page explains the flow from initial setup to chatting with Copilot Chat using Sakura AI Engine for VS Code.

## Initial Setup

This is the flow for configuring your API key and verifying the connection.

### Step 1: Obtain an API Key
Issue an AI Engine API token from the Sakura Cloud Control Panel.
- **Format**: `UUID:secret` (e.g., `12345678-1234...:abcdef...`)

### Step 2: Configure the API Key in VS Code
1. **Operation**: Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) $\rightarrow$ Execute **Sakura AI Engine: Set API Key**.
2. **Input**: Paste the obtained token and press Enter.
3. **Result**: A notification "Sakura AI Engine: API key has been set" will appear, and the API key will be saved encrypted.

### Step 3: Perform a Connection Test (Recommended)
1. **Operation**: Open the Command Palette $\rightarrow$ Execute **Sakura AI Engine: Connection Test**.
2. **Result**: If successful, a notification "Connection successful" will appear.
   - *If it fails, please re-verify the correctness of the API key and the `sakuraAiEngine.baseUrl` setting.*

---

## Using in Chat

### Selecting a Model and Asking Questions
1. **Operation**: Open the Copilot Chat panel and select a **Sakura AI Engine** model (e.g., `preview/Kimi-K2.6`) from the model picker.
2. **Input**: Type your question in the chat box and send it.
3. **Result**: The response is delivered from the server in streaming format and displayed incrementally.

### Consulting with Image Attachments (Vision)
1. **Preparation**: Select a Vision-compatible model (e.g., `preview/Kimi-K2.6`).
2. **Operation**: Drag and drop an image file into the chat box, or paste it.
3. **Input**: Enter instructions such as "Point out mistakes in the code in this image" and send.
4. **Result**: The AI analyzes the image and provides a response based on visual information.

---

## Using Advanced Features

### Requesting Tasks as an Agent (Tool Use)
1. **Operation**: Switch the Copilot Chat mode to **Agent**.
2. **Input**: Request a specific task such as "Find duplicate functions in the `src` folder and merge them into one."
3. **Result**: The AI automatically calls tools like "read file" or "rewrite file." The user can choose to approve or reject each operation, and the code is automatically corrected in the end.

### Utilizing Latest Information and Deep Reasoning (Responses API)
1. **Preparation**: Select `preview/Kimi-K2.6` or `preview/gemma-4-31B-it`.
2. **Input**: Enter "Summarize today's major news in the AI industry" or a "complex math puzzle."
3. **Result**: 
   - **Web Search**: The AI automatically searches for the latest web information and generates a response with sources.
   - **Reasoning**: By going through a thinking process, it derives a more logically correct answer.

---

## Usage and Cost Management

### Real-time Verification
- **Result**: After a chat response is completed, the number of tokens used and the estimated cost (¥) are displayed in the status bar.

### Displaying Detailed Reports
1. **Operation**: Open the Command Palette $\rightarrow$ Execute **Sakura AI Engine: Show Usage Details**.
2. **Result**: A usage panel for the current session and cumulative totals is displayed, which is useful for budget management.

## API Key Management
- **Deletion**: Open the Command Palette $\rightarrow$ Execute **Sakura AI Engine: Delete API Key**.
- **Result**: The saved API key is completely deleted, and subsequent API requests will no longer be possible.