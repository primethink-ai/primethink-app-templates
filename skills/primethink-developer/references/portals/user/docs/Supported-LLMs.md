# Supported LLM Providers and Models

Our platform integrates with multiple Large Language Model (LLM) providers to offer you flexibility and choice in selecting the most suitable AI models for your needs. Each provider offers unique capabilities and model variations, allowing you to leverage state-of-the-art AI technology through a unified interface. This document outlines the currently supported providers, their available models, and the requirements for using them.

| Provider | Prefix | Required setting | Available Models | Model names URL |
|----------|--------|------------------|------------------|-----------------|
| OpenAI | `openai` | `OPENAI_API_KEY` | gpt-5.6-sol, gpt-5.6-terra, gpt-5.6-luna, gpt-5.5, gpt-5.4, gpt-5.4-mini, gpt-5.4-nano, gpt-4.1, gpt-4.1-mini, gpt-4.1-nano | [https://platform.openai.com/docs/models](https://platform.openai.com/docs/models) |
| Anthropic | `anthropic` | `ANTHROPIC_API_KEY` | claude-fable-5, claude-opus-5, claude-sonnet-5, claude-haiku-4-5, claude-opus-4-8, claude-opus-4-7, claude-opus-4-6, claude-sonnet-4-6, claude-sonnet-4-5, claude-opus-4-5 | [https://docs.anthropic.com/en/docs/about-claude/models/all-models](https://docs.anthropic.com/en/docs/about-claude/models/all-models) |
| AWS Bedrock (Claude) | `bedrock` | `AWS_BEDROCK_CREDENTIALS` | claude-fable-5, claude-opus-5, claude-sonnet-5, claude-haiku-4-5, claude-opus-4-8, claude-opus-4-7, claude-opus-4-6, claude-sonnet-4-6, claude-sonnet-4-5, claude-opus-4-5 | [https://docs.aws.amazon.com/bedrock/latest/userguide/model-cards.html](https://docs.aws.amazon.com/bedrock/latest/userguide/model-cards.html) |
| Google | `google_genai` | `GOOGLE_API_KEY` | gemini-3.6-flash, gemini-3.5-flash, gemini-3.5-flash-lite, gemini-3.1-pro-preview, gemini-3.1-flash-lite, gemini-3-flash-preview, gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-lite | [https://ai.google.dev/gemini-api/docs/models](https://ai.google.dev/gemini-api/docs/models) |
| Groq | `groq` | `GROQ_API_KEY` | groq/compound, groq/compound-mini, openai/gpt-oss-120b, openai/gpt-oss-20b, llama-3.3-70b-versatile, llama-3.1-8b-instant, meta-llama/llama-4-scout-17b-16e-instruct, qwen/qwen3-32b | [https://console.groq.com/docs/models](https://console.groq.com/docs/models) |
| DeepSeek | `deepseek` | `DEEPSEEK_API_KEY` | deepseek-v4-pro, deepseek-v4-flash | [https://api-docs.deepseek.com/quick_start/pricing](https://api-docs.deepseek.com/quick_start/pricing) |
| Mistral AI | `mistralai` | `MISTRAL_API_KEY` | mistral-medium-3-5-2604, mistral-small-4-0-2603, mistral-large-2512, mistral-medium-2508, magistral-medium-2509, devstral-2-25-12, ministral-3-14b-25-12, ministral-8b-2512, ministral-3-3b-25-12 | [https://docs.mistral.ai/getting-started/models/models_overview/](https://docs.mistral.ai/getting-started/models/models_overview/) |

The list above reflects the platform's model catalog at the time of writing; the authoritative list is the model selector inside the app, which is generated from the same catalog.

## How it works

When using these models in your application:

1. Each model requires its corresponding credential setting to be set in your user or group settings
2. The model name must be prefixed with the provider's prefix, separated by a colon (`provider:model`). Examples:
    - Google: `google_genai:gemini-3.5-flash`
    - Anthropic: `anthropic:claude-sonnet-5`
    - AWS Bedrock: `bedrock:claude-sonnet-5`
    - OpenAI: `openai:gpt-5.5`
3. The system will automatically:
    - Validate the presence of the required credential setting
    - Strip the provider prefix when needed (for providers like Anthropic and Groq)
    - Initialize the appropriate client with the correct endpoints and configurations

## AWS Bedrock Setup

AWS Bedrock models run the same Claude families through your AWS account rather than a direct Anthropic API key. Before selecting one:

1. Enable access to the required Claude model in your AWS Bedrock account.
2. Create AWS credentials with permission to invoke that model.
3. Add `AWS_BEDROCK_CREDENTIALS` as a User Variable or Group Variable using this exact pipe-delimited format:

```text
region|access_key_id|secret_access_key[|session_token]
```

For example:

```text
us-east-1|AKIAEXAMPLE|secret-access-key
```

The optional fourth field is required for temporary credentials that use an AWS session token. Use a Bedrock region in a supported cross-region inference geography: US/Canada, Europe, Japan, or Australia/New Zealand.

Bedrock Claude supports vision, reasoning, and native PDF input. It does **not** provide Anthropic's hosted MCP connector or provider-side web search, web fetch, and code-execution tools. PrimeThink can still use separately configured external web-search tools and its sandbox capabilities.

!!! warning "Protect the compound credential"
    The setting contains an AWS access key and secret key. Store it only in User or Group Variables, grant the minimum Bedrock permissions required, and never place it in prompts, documents, or capability configuration.

## Future Updates

We are actively working on expanding our supported providers and models. Future updates will include:
- Additional language model providers
- New model versions as they become available
- Enhanced capabilities and specialized models
- Support for more regional endpoints and deployment options

Please check our documentation regularly for updates on newly supported models and providers.
