# Vertex AI Model Garden & Agent Selection

## Supported Models in Model Garden for EcoLoop

| Model Name | Garden Identifier | Recommended Role |
|---|---|---|
| **Gemini 2.5 Flash** | `gemini-2.5-flash` | Real-time intake parsing, fast multimodal OCR, low latency tool calling |
| **Gemini 1.5 Pro** | `gemini-1.5-pro` | Complex multi-source policy reconciliation, red-teaming benchmark evaluation |
| **Codey / Codex Models** | `code-bison` / `code-gecko` | Code generation assistance, schema validation script synthesis |

## Model Garden Deployment Best Practices
- **Region Placement**: Keep Cloud Run backend and Vertex AI endpoints in the same region (e.g. `us-central1`) to minimize cross-region latency.
- **Safety Settings**: Explicitly configure BLOCK_LOW_AND_ABOVE for hate speech, harassment, and dangerous content, with contextual allowance for food waste/compost terminology.
