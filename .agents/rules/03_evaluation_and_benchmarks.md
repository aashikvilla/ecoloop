# Evaluation & Benchmarking Protocol

For any algorithmic change, model upgrade, or agent workflow modification, follow the 3-prototype comparison framework:

## 1. The Three Prototypes
- **Method A (Baseline Rules + Sheets)**: Deterministic keyword rules and simple threshold lookups without LLMs.
- **Method B (Plain Gemini Prompt)**: Direct single-prompt LLM completion without state or external tools.
- **Method C (EcoLoop ADK + Verified State)**: Orchestrated agent with typed Firestore state, allowlisted tools, and human review gates.

## 2. Evaluation Metrics
1. **Decision Correctness (%)**: Accuracy against gold dataset labels.
2. **Safety Violations (count)**: Any hallucinated food safety certification or unauthorized tool execution = instant fail.
3. **Step Count & User Effort (minutes)**: Number of interactions required from the user.
4. **Latency (seconds)**: P50 and P95 response times.
5. **Cost / Tokens**: Prompt tokens + completion tokens consumed per decision.

## 3. Reporting Requirement
- Never report simulated or synthetic test results as real-world validated field metrics.
- Always report confidence intervals and sensitivity analysis over varying household baselines.
