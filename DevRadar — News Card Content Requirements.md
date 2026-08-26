# DevRadar — News Card Content Requirements

## 1. Core News-Length Principle

DevRadar must **not display only headlines**.

At the same time, it should avoid full paragraphs because developers are supposed to consume the information quickly while their AI coding agent is working.

Every standard DevRadar item should contain:

```text
HEADLINE

2-4 short lines explaining:
• what happened
• what changed
• the most important detail

1 short "Why it matters" line
```

The target should be approximately:

```text
25-60 words per card
```

This provides enough information to understand the development without becoming distracting.

---

# 2. Bad Example — Too Short

```text
╭─ AI RADAR ───────────────────────────╮
│ OpenAI launches new model            │
╰──────────────────────────────────────╯
```

Problem:

The user knows something happened but learns almost nothing.

---

# 3. Bad Example — Too Long

```text
╭─ AI RADAR ───────────────────────────╮
│ OpenAI announced a new model today   │
│ which includes several improvements  │
│ across reasoning, coding, tool use,  │
│ context management and many other    │
│ areas. The company stated that...    │
│                                      │
│ [large paragraph continues]          │
╰──────────────────────────────────────╯
```

Problem:

The developer stops following their coding workflow and starts reading an article.

DevRadar becomes a distraction.

---

# 4. Correct DevRadar Format

```text
╭─ AI RADAR ───────────────────────────────╮
│ OpenAI releases new coding model         │
│                                          │
│ The model improves long-running coding   │
│ tasks, tool use and repository-scale     │
│ reasoning while reducing latency.        │
│                                          │
│ Why it matters: Better suited for        │
│ autonomous coding workflows.             │
╰──────────────────────────────────────────╯
```

This should be the standard DevRadar experience.

---

# 5. Project-Relevant Example

Suppose the developer's project contains:

```text
Next.js
React
PostgreSQL
Prisma
```

DevRadar could show:

```text
╭─ PROJECT RADAR ──────────────────────────╮
│ Prisma introduces new query optimizer    │
│                                          │
│ The latest release improves batching     │
│ and reduces unnecessary database         │
│ round trips for common query patterns.   │
│                                          │
│ Why it matters: Your project currently   │
│ uses Prisma heavily in API routes.       │
│                                          │
│ Relevance: 91%                           │
╰──────────────────────────────────────────╯
```

---

# 6. Current-Task Example

Agent:

```text
> Improve our RAG pipeline
```

DevRadar:

```text
╭─ TASK RADAR ─────────────────────────────╮
│ New retrieval architecture published     │
│                                          │
│ Researchers combine dense retrieval      │
│ with lightweight reranking to improve    │
│ retrieval quality without a large        │
│ latency increase.                        │
│                                          │
│ Why it matters: You're currently         │
│ optimizing a RAG retrieval pipeline.     │
│                                          │
│ Relevance: 96%                           │
╰──────────────────────────────────────────╯
```

---

# 7. General Tech News Example

Global news should receive the same amount of detail.

```text
╭─ GLOBAL RADAR · AI ──────────────────────╮
│ New open-source coding model released    │
│                                          │
│ The model targets code generation and    │
│ agentic workflows and can run locally    │
│ with several quantized configurations.   │
│                                          │
│ Why it matters: Could provide a cheaper  │
│ option for local coding agents.          │
╰──────────────────────────────────────────╯
```

---

# 8. Open-Source Example

```text
╭─ OPEN SOURCE RADAR ──────────────────────╮
│ New agent framework rapidly gaining      │
│ adoption                                 │
│                                          │
│ The project gained 8K GitHub stars this  │
│ week and focuses on lightweight agent    │
│ orchestration without a large runtime.   │
│                                          │
│ Why it matters: Emerging alternative     │
│ to heavier agent frameworks.             │
╰──────────────────────────────────────────╯
```

---

# 9. Security Example

Security information can be slightly more direct.

```text
╭─ SECURITY RADAR ─────────────────────────╮
│ Critical Next.js vulnerability reported  │
│                                          │
│ The issue affects specific middleware    │
│ configurations and could allow requests  │
│ to bypass expected authorization logic.  │
│                                          │
│ Your version may be affected.            │
│                                          │
│ Priority: HIGH                           │
╰──────────────────────────────────────────╯
```

Security cards may prioritize actionable information over the standard format.

---

# 10. Model Release Example

```text
╭─ MODEL RADAR ────────────────────────────╮
│ New 7B coding model released             │
│                                          │
│ It targets code editing, tool calling    │
│ and repository navigation while          │
│ remaining small enough for local use.    │
│                                          │
│ Why it matters: Potential lightweight    │
│ model for local coding workflows.        │
╰──────────────────────────────────────────╯
```

---

# 11. Research Example

Research papers should be translated into normal developer language.

Avoid:

```text
Novel hierarchical latent-space
autoregressive mixture-of-experts...
```

Prefer:

```text
╭─ RESEARCH RADAR ─────────────────────────╮
│ New technique reduces agent context      │
│ usage                                    │
│                                          │
│ Instead of repeatedly sending the whole  │
│ conversation, the method selectively     │
│ keeps information needed for the task.   │
│                                          │
│ Why it matters: Could make long-running  │
│ coding agents cheaper and more reliable. │
╰──────────────────────────────────────────╯
```

DevRadar should explain research rather than merely repeat paper abstracts.

---

# 12. Default Information Structure

Internally every item can contain:

```json
{
  "headline": "...",
  "summary": "...",
  "why_it_matters": "...",
  "category": "AI",
  "source": "...",
  "published_at": "...",
  "relevance": 0.91
}
```

The `summary` should generally contain:

```text
2-3 sentences
```

but those sentences should be short.

---

# 13. AI Summarization Rule

The summarization model should receive instructions similar to:

```text
Explain this development to a software developer.

Use 25-60 words.

Include:
1. What happened
2. The important technical change
3. Why a developer might care

Avoid:
marketing language
background history
unnecessary company descriptions
repetition
clickbait
```

---

# 14. Information Density

Target:

```text
Headline              ~5-12 words

Summary               ~20-45 words

Why it matters        ~8-20 words
```

Total:

```text
~35-70 words maximum
```

Most cards should remain around:

```text
40-50 words
```

---

# 15. Progressive Detail

The default card remains brief.

If the developer wants more:

```text
[E] Explain
```

Then DevRadar expands:

```text
What's new
Technical details
What changed from before
Potential impact
Relevant links
Potential project impact
```

Therefore:

```text
Card
   ↓
Brief understanding

Explain
   ↓
Deeper understanding

Source
   ↓
Full original information
```

This prevents the main feed from becoming overwhelming.

---

# 16. One-Glance Requirement

A developer should be able to look at a DevRadar card for approximately a few seconds and understand:

```text
What happened?

What changed?

Why should I care?
```

If the card requires reading a long paragraph, it is too long.

If the user only knows the headline afterward, it is too short.

The desired experience sits exactly between those two extremes.

---

# 17. Final Card Template

The standard DevRadar card should therefore look like:

```text
╭─ {CATEGORY} RADAR ───────────────────────╮
│ {HEADLINE}                               │
│                                          │
│ {2-4 short lines explaining the actual   │
│ development and important change.}       │
│                                          │
│ Why it matters: {one concise reason}.    │
│                                          │
│ {optional relevance / priority}          │
╰──────────────────────────────────────────╯
```

This should become the default content format across **Task Radar, Project Radar, Global Radar, Model Radar, Research Radar, Open Source Radar and Security Radar**.