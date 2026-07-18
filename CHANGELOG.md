# Changelog

All notable changes to this project will be documented in this file.

## [0.1.1] - 2026-07-18

### Changed
- Updated package metadata: renamed to `sakura-ai-engine-for-vscode` with proper repository, bugs, and homepage links.
- Changed output directory from `out/` to `dist/` for better convention alignment.
- Updated categories to `Machine Learning` and `Other` (removed deprecated `AI` and `Chat` categories).
- Removed `private: true` from package.json to allow VSCE publishing.
- Added `serialize-javascript` override for security patch.
- Simplified activation events (removed explicit `onLanguageModelChat` event).

### Added
- English README (`README.en.md`) and English documentation (`docs/en/`).

### Fixed
- Documentation updates for clarity and consistency across all markdown files.

## [0.1.0] - 2026-07-18

### Added
- Initial release of Sakura AI Engine for VS Code.
- Integration of Sakura AI Engine models as custom endpoints for GitHub Copilot Chat.
- Automatic model discovery.
- Token usage tracking and cost estimation display in the status bar.
- Workspace RAG (Retrieval-Augmented Generation) for automatically searching and adding workspace code to chat context.
- Support for Responses API.
- Support for Vision (image input) and Tool Calling.
- Configuration options for API base URL, timeouts, and model settings.