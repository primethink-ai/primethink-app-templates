# Developing Tool Plugins

This guide covers how to create tools for PrimeThink agents — both inside the main repository and as external plugin packages.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Capability Codes](#capability-codes)
- [Writing a Tool (LangChain)](#writing-a-tool-langchain)
- [Registering Tools in the Main Repo](#registering-tools-in-the-main-repo)
  - [Option 1: Central registration](#option-1-central-registration)
  - [Option 2: @capability decorator](#option-2-capability-decorator)
  - [Registering a toolkit (list of tools)](#registering-a-toolkit-list-of-tools)
  - [Multi-code registration](#multi-code-registration)
- [Creating an External Plugin Package](#creating-an-external-plugin-package)
  - [1. Scaffold the package](#1-scaffold-the-package)
  - [2. Write your tools](#2-write-your-tools)
  - [3. Export a register function](#3-export-a-register-function)
  - [4. Declare the entry point](#4-declare-the-entry-point)
  - [5. Install the plugin](#5-install-the-plugin)
  - [6. Verify discovery](#6-verify-discovery)
- [Plugin Context (PT Services Injection)](#plugin-context-pt-services-injection)
- [Full External Plugin Example](#full-external-plugin-example)
- [Creating DB Capabilities for Your Tools](#creating-db-capabilities-for-your-tools)
- [How Tool Resolution Works at Runtime](#how-tool-resolution-works-at-runtime)
- [Testing Your Plugin Locally](#testing-your-plugin-locally)
- [Deploying to Kubernetes](#deploying-to-kubernetes)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

PrimeThink agents get their tools from **capabilities** stored in the database. Tool plugins provide **internal** capabilities — Python tools registered in the tool registry, either built into the main repo or shipped as external packages.

> This guide covers Python tool plugins only. Capabilities that wrap an external MCP server or a REST endpoint are configured purely through the database with no Python code — see [MCP Capabilities](MCP-Capabilities.md) and [API Capabilities](API-Capabilities.md).

```text
┌─────────────────────────────────────────────────────────┐
│  Capabilities DB Table (type = "internal")              │
│  ┌──────────────────────────────────────────────┐       │
│  │ id │ code             │ type     │ options    │      │
│  │  1 │ base             │ internal │ null       │      │
│  │  2 │ rag              │ internal │ null       │      │
│  │  3 │ obviously_manage │ internal │ null       │      │
│  └──────────────────────────────────────────────┘       │
└─────────────┬───────────────────────────────────────────┘
              │ agent has capabilities
              ▼
┌─────────────────────────────────────────────────────────┐
│  Tool resolution (internal tools)                       │
│                                                         │
│     Collect active codes → resolve_tools(codes)         │
│     ↓                                                   │
│     tool_registry.py  ←── tool_registrations.py         │
│                        ←── external plugins (entry pts) │
│                        ←── @capability decorators        │
└─────────────────────────────────────────────────────────┘
```

**Key files:**

| File | Purpose |
|------|---------|
| `src/virtual_assistant_lc/tool_registry.py` | Core registry: `@capability` decorator, `register_tools()`, `resolve_tools()`, `discover_plugins()`, `get_capability_meta()` |
| `src/virtual_assistant_lc/tool_registrations.py` | Central registration of all built-in tools by capability code |
| `src/utils/capabilities_utils.py` | Orchestrates tool resolution at runtime |

---

## Capability Codes

A **capability code** is the string that links a DB capability row to a set of tools. When an agent has a capability with `code = "my_tools"`, any tools registered under `"my_tools"` are attached to that agent.

Rules:
- Codes are simple lowercase strings: `"base"`, `"rag"`, `"obviously_manage"`.
- A single DB capability row can reference multiple codes using comma separation: `"base,rag"` — this activates both groups of tools.
- A single tool can be registered under multiple codes — it will be deduplicated at runtime.

---

## Writing a Tool (LangChain)

Tools are standard LangChain tools. Use the `@tool` decorator:

```python
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool
from pydantic import BaseModel, Field


class MyToolInput(BaseModel):
    query: str = Field(description="The search query")
    limit: int = Field(default=10, description="Max results to return")


@tool("my_tool_name", args_schema=MyToolInput)
async def my_tool(query: str, limit: int, config: RunnableConfig) -> str:
    """
    Short description of what this tool does.

    The LLM reads this docstring to decide when to use the tool.
    Be specific and concise.
    """
    # Access user/chat context from the config
    user_id = config.get("configurable", {}).get("logged_user_id")
    group_id = config.get("configurable", {}).get("group_id")
    chat_id = config.get("configurable", {}).get("chat_id")

    # Your implementation
    result = f"Found results for '{query}' (limit={limit})"
    return result
```

**Important conventions:**

- Always use `async def` — the agent runtime is async.
- Always accept `config: RunnableConfig` as the last parameter — LangGraph injects it automatically.
- The docstring is the tool description the LLM sees. Make it clear and actionable.
- Return a string. The LLM reads this as the tool's output.
- Use `args_schema` with a Pydantic model for any tool with parameters.

### Available config values

The `RunnableConfig` object carries context about the current user and chat:

```python
config.get("configurable", {}).get("logged_user_id")   # int — current user ID
config.get("configurable", {}).get("group_id")          # int — current group ID
config.get("configurable", {}).get("chat_id")           # int — current chat ID
config.get("configurable", {}).get("chat_uuid")         # str — chat UUID
```

---

## Registering Tools in the Main Repo

### Option 1: Central registration

Add your tool to `tool_registrations.py`. This is the recommended approach for most tools:

```python
# In src/virtual_assistant_lc/tool_registrations.py

from src.virtual_assistant_lc.tools.my_module.my_tool import my_tool

register_tools("my_capability_code", [my_tool],
    name="My Tool Group",
    description="Short human-friendly description of this capability"
)
```

The `name` and `description` keyword arguments are optional (they default to empty strings) but **strongly recommended** for internal registrations. They provide capability-level metadata used by the Super Admin API to auto-fill fields when activating capabilities for a group.

### Option 2: @capability decorator

Apply the decorator directly in your tool file. The tool is registered when the module is imported:

```python
# In src/virtual_assistant_lc/tools/my_module/my_tool.py

from src.virtual_assistant_lc.tool_registry import capability
from langchain_core.tools import tool


@capability("my_capability_code")
@tool("my_tool_name")
async def my_tool(config: RunnableConfig) -> str:
    """Tool description."""
    return "result"
```

> **Note:** If you use `@capability` directly, the module must be imported at startup for the registration to take effect. Either import it in `tool_registrations.py` or ensure it's imported elsewhere during initialization.

### Registering a toolkit (list of tools)

Group related tools into a list and register them together:

```python
# At the bottom of your toolkit file
my_toolkit = [tool_a, tool_b, tool_c]
```

Then in `tool_registrations.py`:

```python
from src.virtual_assistant_lc.tools.my_module.my_toolkit import my_toolkit

register_tools("my_capability_code", my_toolkit,
    name="My Toolkit",
    description="Group of related tools for X"
)
```

Or using the decorator directly:

```python
from src.virtual_assistant_lc.tool_registry import capability

my_toolkit = capability("my_capability_code")([tool_a, tool_b, tool_c])
```

### Multi-code registration

A tool can belong to multiple capability groups:

```python
# Via decorator — the tool is available when EITHER code is active
@capability("base", "rag")
@tool("get_document_text")
async def get_document_text(...): ...
```

```python
# Via register_tools — register the same tool under multiple codes
register_tools("base", [shared_tool], name="Base Tools", description="Core agent tools")
register_tools("rag", [shared_tool], name="RAG", description="Retrieval-augmented generation")
```

In both cases, `resolve_tools()` deduplicates automatically — the tool appears only once even if multiple matching codes are active.

---

## Creating an External Plugin Package

External plugins are standard Python packages that register tools via the `primethink.tools` entry-point group. The main API discovers them automatically at startup — **no code changes needed in the main repo**.

### 1. Scaffold the package

```text
assist-manage-toolkit/
├── pyproject.toml
├── src/
│   └── assist_manage_toolkit/
│       ├── __init__.py          # register() function
│       ├── manage_toolkit.py    # Tool definitions
│       └── manage_utils.py      # Shared helpers
└── tests/
    └── test_registration.py
```

### 2. Write your tools

Tools follow the same LangChain patterns as in the main repo:

```python
# src/assist_manage_toolkit/manage_toolkit.py

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool
from pydantic import BaseModel, Field


class SearchMattersInput(BaseModel):
    query: str = Field(description="Search text for matters")
    limit: int = Field(default=20, description="Maximum results")


@tool("search_matters", args_schema=SearchMattersInput)
async def search_matters(query: str, limit: int, config: RunnableConfig) -> str:
    """
    Search for matters/cases by text query in the management system.
    Returns matching matters with their reference numbers and titles.
    """
    # Your implementation here
    return "results..."


class CreateTimerInput(BaseModel):
    matter_id: int = Field(description="The matter ID to log time against")
    description: str = Field(description="Description of the work performed")


@tool("create_timer", args_schema=CreateTimerInput)
async def create_timer(matter_id: int, description: str, config: RunnableConfig) -> str:
    """
    Create a new active timer for a matter in the management system.
    The timer starts immediately and can be stopped later.
    """
    # Your implementation here
    return "Timer created"


# Export as a toolkit list
manage_toolkit = [
    search_matters,
    create_timer,
]
```

### 3. Export a register function

The register function is called by the main API at startup. It receives `register_tools` as the first argument and an optional `context` as the second — use them to register your tools under capability codes:

```python
# src/assist_manage_toolkit/__init__.py


def register(registry_fn, context=None):
    """Called by PrimeThink API at startup via entry-point discovery.

    Args:
        registry_fn: The register_tools(code, tools_list, *, name, description)
                     function from the main API's tool_registry module.
        context: Optional object providing PT services (settings, document
                 storage, etc.). See "Plugin Context" section below.
    """
    from .manage_toolkit import manage_toolkit

    registry_fn("obviously_manage", manage_toolkit,
        name="Manage",
        description="Search and manage matters, timers, and billing"
    )
```

**Key points:**
- Use lazy imports (inside the function) to avoid import-time side effects.
- `registry_fn` is `register_tools(code: str, tools: list, *, name: str = "", description: str = "")` from `tool_registry.py`.
- The `name` and `description` kwargs provide human-friendly metadata for the Super Admin UI. They are optional for backward compatibility but **recommended**.
- `context` is an optional object providing PT services — plugins that accept a second parameter receive it automatically (backward compatible).
- You can call `registry_fn` multiple times for different codes.

To register tools under multiple codes:

```python
def register(registry_fn, context=None):
    from .manage_toolkit import manage_toolkit
    from .search_tools import search_table_tool

    registry_fn("obviously_manage", manage_toolkit,
        name="Manage", description="Full management toolkit")
    registry_fn("manage_search", [search_table_tool],
        name="Manage Search", description="Search tables in the management system")
```

### 4. Declare the entry point

In `pyproject.toml`, declare your package under the `primethink.tools` entry-point group:

```toml
[build-system]
requires = ["setuptools>=68.0"]
build-backend = "setuptools.build_meta"

[project]
name = "assist-manage-toolkit"
version = "1.0.0"
description = "Management system tools for PrimeThink agents"
requires-python = ">=3.11"
dependencies = [
    "langchain-core>=0.3.0",
    "httpx>=0.28.0",
    "pydantic>=2.0",
]

[project.entry-points."primethink.tools"]
manage = "assist_manage_toolkit:register"

[tool.setuptools.packages.find]
where = ["src"]
```

The entry-point format is:

```text
<plugin-name> = "<python_module_path>:<function_name>"
```

- `manage` — a unique name for your plugin (used in logs)
- `assist_manage_toolkit:register` — the `register()` function in `assist_manage_toolkit/__init__.py`

### 5. Install the plugin

Install from a private Git repository:

```bash
# Using SSH
pip install git+ssh://git@github.com/your-org/assist-manage-toolkit.git@v1.0.0

# Using HTTPS with a token
pip install git+https://${GITHUB_TOKEN}@github.com/your-org/assist-manage-toolkit.git@v1.0.0

# From a local directory (during development)
pip install -e /path/to/assist-manage-toolkit
```

### 6. Verify discovery

After installing, verify the entry point is registered:

```bash
python -c "
from importlib.metadata import entry_points
eps = entry_points().select(group='primethink.tools')
for ep in eps:
    print(f'{ep.name} -> {ep.value}')
"
```

Expected output:

```text
manage -> assist_manage_toolkit:register
```

---

## Plugin Context (PT Services Injection)

Some plugins need access to PrimeThink services (user settings, document storage, etc.) that live in the main API. Instead of importing from `src.*` directly (which would create a hard dependency), the API injects a **context object** into plugins at startup.

### How it works

1. At startup, `capabilities_utils.py` builds a `PTPluginContext` object that wraps real PT services.
2. `discover_plugins(context)` passes this context to each plugin's `register()` function.
3. The system uses `inspect.signature` to check if the plugin accepts a second parameter — if it does, the context is passed; if not, only `registry_fn` is passed. This ensures backward compatibility with simple plugins.

### The context object

The context provides these services:

| Attribute | Type | Description |
|-----------|------|-------------|
| `get_user_setting_value` | `async (value_name, user_id, group_id) -> str` | Reads per-user settings from the DB (e.g., API tokens, base URLs) |
| `document_service` | `DocumentServiceProtocol \| None` | Access to document storage (get by ID, fetch bytes, process content) |

### Using context in your plugin

Accept `context` as an optional second parameter in your `register()` function:

```python
# src/my_plugin/__init__.py

def register(registry_fn, context=None):
    from .my_toolkit import core_toolkit
    from .settings import set_settings_provider, PrimethinkSettingsProvider

    # Use context for per-user settings resolution
    if context is not None and hasattr(context, "get_user_setting_value"):
        set_settings_provider(PrimethinkSettingsProvider(context.get_user_setting_value))

    # Always register core tools
    registry_fn("my_code", core_toolkit,
        name="My Plugin", description="Core plugin tools")

    # Conditionally register tools that need PT services
    if context is not None and hasattr(context, "document_service") and context.document_service is not None:
        from .pt_tools import pt_toolkit, set_document_service
        set_document_service(context.document_service)
        registry_fn("my_code", pt_toolkit)
```

### DocumentServiceProtocol

Plugins that work with documents can define a Protocol for type safety:

```python
from typing import Protocol, Any, Tuple, Optional

class DocumentServiceProtocol(Protocol):
    async def get_document_by_id(self, document_id: int) -> Optional[Any]: ...
    async def fetch_document_bytes(self, document: Any) -> Tuple[str, bytes]: ...
    def process_content_by_format(self, content: str, format: Any) -> Tuple[str, str, bytes]: ...
```

The main API's `PTDocumentService` (built in `capabilities_utils.py`) satisfies this protocol by wrapping `DocumentDatastore` and `fetch_document_bytes`.

### Settings abstraction pattern

For plugins that need per-user settings (e.g., API tokens that differ per user), use a provider pattern:

```python
# settings.py in your plugin

class ToolkitSettings:
    manage_base_url: str
    manage_token: str

class SettingsProvider(Protocol):
    async def get_settings(self, config: dict) -> ToolkitSettings: ...

class PrimethinkSettingsProvider:
    """Reads settings from the PT DB via the injected context."""
    def __init__(self, get_user_setting_value):
        self._get_setting = get_user_setting_value

    async def get_settings(self, config):
        configurable = config.get("configurable", {})
        user_id = configurable.get("logged_user_id")
        group_id = configurable.get("group_id")
        base_url = await self._get_setting("manage_base_url", user_id, group_id)
        token = await self._get_setting("manage_token", user_id, group_id)
        return ToolkitSettings(manage_base_url=base_url, manage_token=token)

class StaticSettingsProvider:
    """Returns fixed settings — useful for MCP servers or testing."""
    def __init__(self, base_url, token):
        self._settings = ToolkitSettings(manage_base_url=base_url, manage_token=token)

    async def get_settings(self, config):
        return self._settings
```

This lets the same tools work in both plugin mode (per-user DB settings) and MCP/standalone mode (fixed env var settings).

### Plugins without context

Simple plugins that don't need PT services can ignore the context entirely:

```python
def register(registry_fn):
    from .my_toolkit import my_toolkit
    registry_fn("my_code", my_toolkit,
        name="My Plugin", description="What this plugin does")
```

The system detects the single-parameter signature and calls it without context.

---

## Full External Plugin Example

Here is a complete, minimal plugin package that provides a "CRM" toolkit with two tools:

### File structure

```text
primethink-crm-tools/
├── pyproject.toml
├── src/
│   └── primethink_crm_tools/
│       ├── __init__.py
│       └── crm_toolkit.py
└── tests/
    └── test_crm_toolkit.py
```

### `pyproject.toml`

```toml
[build-system]
requires = ["setuptools>=68.0"]
build-backend = "setuptools.build_meta"

[project]
name = "primethink-crm-tools"
version = "0.1.0"
description = "CRM integration tools for PrimeThink agents"
requires-python = ">=3.11"
dependencies = [
    "langchain-core>=0.3.0",
    "httpx>=0.28.0",
    "pydantic>=2.0",
]

[project.entry-points."primethink.tools"]
crm = "primethink_crm_tools:register"

[tool.setuptools.packages.find]
where = ["src"]
```

### `src/primethink_crm_tools/__init__.py`

```python
def register(registry_fn):
    """Entry point called by PrimeThink API at startup."""
    from .crm_toolkit import crm_toolkit

    registry_fn("crm", crm_toolkit,
        name="CRM Integration",
        description="Search and manage contacts in the CRM system"
    )
```

### `src/primethink_crm_tools/crm_toolkit.py`

```python
import httpx
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool
from pydantic import BaseModel, Field


CRM_BASE_URL = "https://api.example-crm.com/v2"


class SearchContactsInput(BaseModel):
    query: str = Field(description="Name, email, or phone number to search for")
    limit: int = Field(default=10, description="Maximum number of results")


@tool("crm_search_contacts", args_schema=SearchContactsInput)
async def crm_search_contacts(query: str, limit: int, config: RunnableConfig) -> str:
    """
    Search for contacts in the CRM by name, email, or phone number.
    Returns a list of matching contacts with their basic details.
    """
    user_id = config.get("configurable", {}).get("logged_user_id")

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{CRM_BASE_URL}/contacts/search",
            params={"q": query, "limit": limit},
            headers={"Authorization": f"Bearer {_get_api_key()}"},
        )
        resp.raise_for_status()
        return resp.text


class CreateContactInput(BaseModel):
    first_name: str = Field(description="Contact's first name")
    last_name: str = Field(description="Contact's last name")
    email: str = Field(description="Contact's email address")
    company: str = Field(default="", description="Company name (optional)")


@tool("crm_create_contact", args_schema=CreateContactInput)
async def crm_create_contact(
    first_name: str, last_name: str, email: str, company: str,
    config: RunnableConfig,
) -> str:
    """
    Create a new contact in the CRM system.
    Returns the created contact's ID and a confirmation message.
    """
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{CRM_BASE_URL}/contacts",
            json={
                "first_name": first_name,
                "last_name": last_name,
                "email": email,
                "company": company,
            },
            headers={"Authorization": f"Bearer {_get_api_key()}"},
        )
        resp.raise_for_status()
        return resp.text


def _get_api_key() -> str:
    """Read API key from environment. In production, prefer user settings."""
    import os
    return os.environ.get("CRM_API_KEY", "")


# Export as a toolkit list
crm_toolkit = [
    crm_search_contacts,
    crm_create_contact,
]
```

### `tests/test_crm_toolkit.py`

```python
"""Basic import and registration test."""


def test_register_function_exists():
    from primethink_crm_tools import register
    assert callable(register)


def test_register_calls_registry():
    """Verify register() calls registry_fn with the expected code and tools."""
    calls = []

    def mock_registry_fn(code, tools, **kwargs):
        calls.append((code, tools, kwargs))

    from primethink_crm_tools import register
    register(mock_registry_fn)

    assert len(calls) == 1
    code, tools, kwargs = calls[0]
    assert code == "crm"
    assert len(tools) == 2
    assert tools[0].name == "crm_search_contacts"
    assert tools[1].name == "crm_create_contact"
    assert kwargs["name"] == "CRM Integration"
```

### Using it

1. Install the plugin into the API environment:
   ```bash
   pip install git+https://github.com/your-org/primethink-crm-tools.git@v0.1.0
   ```

2. Create a capability in the DB. Since the plugin provides `name` and `description` via `register_tools(...)`, you can use the streamlined endpoint:
   ```text
   POST /api/super-admin/capabilities/from-registered-tool
   ```
   ```json
   {
     "code": "crm",
     "group_id": 5
   }
   ```
   This auto-fills name="CRM Integration" and description="Search and manage contacts in the CRM system" from the registry.

3. Assign the capability to an agent — the tools are now available.

---

## Creating DB Capabilities for Your Tools

Every tool group needs a matching `capabilities` row in the database. There are two approaches:

### Option A: From registered tool (recommended for internal tools)

If your tool is already registered in the tool registry, use the streamlined endpoint that auto-fills `name` and `description` from the registry metadata:

```text
POST /api/super-admin/capabilities/from-registered-tool
```

```json
{
  "code": "my_capability_code",
  "group_id": 5
}
```

This creates the capability row using the `name` and `description` you provided in `register_tools(...)`. You can optionally override them:

```json
{
  "code": "my_capability_code",
  "group_id": 5,
  "name": "Custom Display Name",
  "description": "Custom description override",
  "is_default": true,
  "ordering": 10
}
```

To see which codes are available and which are already activated for a group:

```text
GET /api/super-admin/capabilities/registered-tools?group_id=5
```

### Option B: Manual creation (for MCP/API types or custom configurations)

```text
POST /api/super-admin/capabilities
```

```json
{
  "name": "My Tool Group",
  "code": "my_capability_code",
  "type": "internal",
  "description": "Description shown in the UI",
  "is_default": false,
  "ordering": 10,
  "access_type": "user"
}
```

**Fields:**

| Field | Description |
|-------|-------------|
| `name` | Display name in the UI |
| `code` | Capability code(s) — must match what you registered. Comma-separated for multiple: `"code_a,code_b"` |
| `type` | `"internal"` for Python tools, `"mcp"` for MCP servers, `"api"` for REST APIs |
| `options` | JSON config — used by MCP and API types (see below) |
| `is_default` | If `true`, auto-attached to new agents |
| `access_type` | `"system"` (all groups), `"group"` (specific group), `"user"` (all users), `"private"` (single user) |

---

## MCP Capabilities (type: mcp)

MCP (Model Context Protocol) capabilities connect agents to external MCP servers. No Python code needed — just a DB row with the right options.

### Basic MCP capability

```json
{
  "name": "DeepWiki",
  "code": "deepwiki",
  "type": "mcp",
  "options": {
    "server_label": "deepwiki",
    "server_url": "https://mcp.deepwiki.com/mcp",
    "require_approval": "never"
  }
}
```

### MCP with authentication

Use `${SETTING_NAME}` placeholders in headers — they are resolved from user/group settings at runtime:

```json
{
  "name": "Home Assistant",
  "code": "ha_remote",
  "type": "mcp",
  "options": {
    "server_label": "ha-remote",
    "server_url": "https://your-instance.ui.nabu.casa/api/mcp",
    "require_approval": "never",
    "headers": {
      "Authorization": "Bearer ${HA_REMOTE_TOKEN}"
    }
  }
}
```

The user must have a setting `HA_REMOTE_TOKEN` configured in their user settings for the placeholder to resolve.

### MCP options reference

| Option | Required | Description |
|--------|----------|-------------|
| `server_label` | Yes | Unique label for the MCP server |
| `server_url` | Yes | MCP server endpoint URL |
| `require_approval` | No* | `"never"`, `"always"`, or an OpenAI approval-policy object; omit for the OpenAI default (approval required). ***Must be an explicit `"never"` for the server to attach on Anthropic models** — anything else skips the server, fail-closed |
| `headers` | No | HTTP headers dict, supports `${SETTING_NAME}` placeholders. On Anthropic only a Bearer `Authorization` header survives (sent as `authorization_token`); every other header is dropped with a warning |
| `allowed_tools` | No | Restricts which server tools are exposed — a list of tool names (empty list = allow none). Nested under `tool_configuration` for Anthropic automatically |

Any extra keys in `options` are passed through to the MCP config as-is on OpenAI; on Anthropic only the fields above are sent.

### Running MCP capabilities on Anthropic models

The same capability runs on both OpenAI and Anthropic — the stored options are
translated to each provider's wire format automatically. Anthropic's MCP
connector is more restrictive, so check four things before pointing an
MCP-equipped agent at a Claude model:

1. `require_approval` is an explicit `"never"` — Anthropic has no approval
   flow, so approval-gated servers are skipped rather than attached.
2. `server_url` and `server_label` are both set — an entry missing either
   would fail every request, so it's skipped instead.
3. Auth is a Bearer token in `Authorization` — Anthropic accepts a single
   OAuth bearer token only. Custom headers (e.g. `X-Api-Key`) and non-Bearer
   schemes are dropped with a warning.
4. `allowed_tools`, if set, is interpretable as a list of tool names — an
   uninterpretable value skips the server rather than widening the restriction.

If MCP tools disappear after swapping an agent to a Claude model, grep the API
logs for `skipped on Anthropic` — the warning states the reason and the fix.
See [MCP Capabilities](MCP-Capabilities.md#running-on-anthropic-claude-models)
for the full behavior reference.

---

## API Capabilities (type: api)

API capabilities turn any REST endpoint into a tool — no Python code needed. The system dynamically creates a LangChain `StructuredTool` from the options JSON.

### GET API example

```json
{
  "name": "Weather API",
  "code": "get_weather",
  "type": "api",
  "options": {
    "name": "get_weather",
    "description": "Get current weather for a city",
    "method": "GET",
    "url": "https://api.weather.com/v1/current",
    "params": {
      "location": {
        "type": "string",
        "description": "City name (e.g. 'London')",
        "required": true
      },
      "units": {
        "type": "string",
        "description": "Temperature units: 'celsius' or 'fahrenheit'",
        "required": false,
        "default": "celsius"
      }
    },
    "headers": {
      "Authorization": "Bearer ${WEATHER_API_KEY}"
    }
  }
}
```

### POST API example

```json
{
  "name": "Send SMS",
  "code": "send_sms",
  "type": "api",
  "options": {
    "name": "send_sms",
    "description": "Send an SMS message to a phone number",
    "method": "POST",
    "url": "https://api.sms-provider.com/v1/messages",
    "body": {
      "to": {
        "type": "string",
        "description": "Recipient phone number in E.164 format",
        "required": true
      },
      "message": {
        "type": "string",
        "description": "The SMS message text",
        "required": true
      }
    },
    "headers": {
      "Authorization": "Bearer ${SMS_API_KEY}",
      "Content-Type": "application/json"
    }
  }
}
```

### Path-templated API example

Many endpoints are path-scoped — the resource id lives in the URL, e.g.
`/chats/{chat_id}/messages`. Put a `{slot}` in the `url` and it becomes a
**call-time** tool argument: the LLM supplies a value on each invocation, which
is URL-encoded and substituted into the path before the request is sent.

```json
{
  "name": "Get Chat Messages",
  "code": "get_chat_messages",
  "type": "api",
  "options": {
    "name": "get_chat_messages",
    "description": "List the messages in a chat",
    "method": "GET",
    "url": "https://api.example.com/v1/chats/{chat_id}/messages",
    "path_params": {
      "chat_id": {
        "type": "string",
        "description": "The id of the chat to read",
        "required": true
      }
    },
    "params": {
      "limit": {
        "type": "integer",
        "description": "Max messages to return",
        "required": false,
        "default": 20
      }
    },
    "headers": {
      "Authorization": "Bearer ${API_TOKEN}"
    }
  }
}
```

Notes:

- Declaring `path_params` is optional — a bare `{chat_id}` slot with no
  `path_params` entry is auto-registered as a **required string** argument. Use
  `path_params` when you want a custom type or a description the LLM can read.
- `${SETTING_NAME}` (build-time, from user settings) and `{slot}` (call-time,
  from tool arguments) can coexist in the same URL, e.g.
  `https://${TENANT_HOST}/v1/chats/{chat_id}`.
- Path values are URL-encoded (including `/`), so a slot cannot break out of its
  path segment to swap the host or traverse the path. The fully-substituted URL
  is re-validated for SSRF before the request is made.
- A field name may map to exactly one of `path_params`, `params`, or `body` —
  overlaps are rejected at build time.

### Templated request body (`body_template`)

The `body` option is a flat schema of scalar fields — good for a simple JSON
object, but it can't express nested structure, arrays, fixed values, or a
non-JSON body. For those, use `body_template` instead (the two are mutually
exclusive). It's a full request body with the **same** `${SETTING_NAME}`
(build-time) and `{slot}` (call-time) interpolation as the URL.

**Nested JSON body with static + dynamic fields:**

```json
{
  "name": "Post Message",
  "code": "post_message",
  "type": "api",
  "options": {
    "name": "post_message",
    "description": "Post a message to a chat",
    "method": "POST",
    "url": "https://api.example.com/v1/chats/{chat_id}/messages",
    "headers": { "Authorization": "Bearer ${API_TOKEN}" },
    "body_template": {
      "source": "primethink",
      "message": {
        "text": "{text}",
        "pinned": "{pinned}"
      },
      "tags": ["inbound", "{tag}"]
    },
    "body_params": {
      "text": { "type": "string", "description": "Message text", "required": true },
      "pinned": { "type": "boolean", "description": "Pin the message", "required": true },
      "tag": { "type": "string", "description": "An extra tag", "required": true }
    }
  }
}
```

- `{chat_id}` is a URL path slot; `{text}`, `{pinned}`, `{tag}` are body slots.
  The same name may be used in **both** the URL and the body — it's one argument
  that fills both places.
- A JSON leaf that is **exactly** `"{slot}"` keeps the argument's native type
  (so `pinned` is emitted as a real boolean, not `"true"`). A slot inside
  surrounding text (`"Hello {name}"`) is interpolated as a string.
- `${SETTING_NAME}` is resolved anywhere in the template, e.g.
  `"api_key": "${SEARCH_KEY}"`.
- `body_params` is optional — undeclared body slots default to **required
  strings**, exactly like `path_params`.

**Raw / non-JSON body (form-urlencoded, text, XML):**

When `body_template` is a **string**, it's sent as the raw request body and the
`Content-Type` header decides how the server reads it:

```json
{
  "name": "Send SMS (form)",
  "code": "send_sms_form",
  "type": "api",
  "options": {
    "name": "send_sms_form",
    "description": "Send an SMS via a form-encoded endpoint",
    "method": "POST",
    "url": "https://api.sms-provider.com/v1/messages",
    "headers": {
      "Authorization": "Bearer ${SMS_API_KEY}",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    "body_template": "To={to}&Body={body}",
    "body_params": {
      "to": { "type": "string", "required": true },
      "body": { "type": "string", "required": true }
    }
  }
}
```

### File uploads (`multipart/form-data`)

Endpoints that accept file uploads use a `files` section. Because the model can't
emit raw bytes, each file field's argument is a **PrimeThink `document_id`** — a
document that already exists **in the current chat** (what the model can see).
The builder resolves the id to its bytes server-side and sends a multipart
request. A flat `body` alongside `files` becomes the multipart **text** fields.

```json
{
  "name": "Attach File to Chat",
  "code": "attach_file",
  "type": "api",
  "options": {
    "name": "attach_file",
    "description": "Upload a document from this chat as an attachment",
    "method": "POST",
    "url": "https://api.example.com/v1/chats/{chat_id}/attachments",
    "files": {
      "file": {
        "description": "The document to upload (a document_id from this chat)",
        "required": true,
        "multiple": false
      }
    },
    "body": {
      "caption": { "type": "string", "description": "Optional caption", "required": false }
    },
    "headers": { "Authorization": "Bearer ${API_TOKEN}" }
  }
}
```

Security & behavior:

- **Chat-scoped authorization.** A referenced document is uploaded only if it
  belongs to the current chat; any other id is refused (the tool returns an error
  and makes no request). This prevents an agent from exfiltrating documents it
  can't see.
- **`multiple: true`** makes the argument a list of document ids, each attached
  as its own part under the same field name (for endpoints that take several
  files at once). Defaults to `false` (a single id).
- File-bearing capabilities require a **chat context** — they're unavailable
  outside a chat, and a per-document **size cap** guards against oversized uploads.
- `files` cannot be combined with `body_template` (that implies a JSON/raw body);
  use a flat `body` for the accompanying text fields. `Content-Type` is set
  automatically for multipart — don't set it in `headers`.

### API options reference

| Option | Required | Description |
|--------|----------|-------------|
| `name` | No | Tool name (what the LLM sees). Falls back to a slug of the capability name |
| `description` | No | Tool description (LLM uses this to decide when to call it). Falls back to the capability description, then a generated string |
| `method` | No | HTTP method: `GET`, `POST`, `PUT`, `PATCH`. Default: `GET` |
| `url` | Yes | Endpoint URL, supports `${SETTING_NAME}` placeholders and `{slot}` call-time path params |
| `path_params` | No | Schema for `{slot}` path params in the URL. Undeclared slots default to required strings |
| `params` | No | Query parameters schema (for GET requests) |
| `body` | No | Flat scalar-field request body, sent as a JSON object (or as multipart text fields when `files` is set). Mutually exclusive with `body_template` |
| `body_template` | No | Templated body — a nested JSON structure or a raw string, with `${SETTING}` / `{slot}` interpolation. Mutually exclusive with `body` and `files` |
| `body_params` | No | Schema for `{slot}` fields used in `body_template`. Undeclared slots default to required strings |
| `files` | No | Multipart file fields; each argument is a chat document id (or a list when `multiple`). Switches the request to `multipart/form-data` |
| `headers` | No | HTTP headers dict, supports `${SETTING_NAME}` placeholders |

See [API Capabilities](API-Capabilities.md) for the full user-facing reference, including naming rules, error behavior, and security details.

### Parameter schema format

Each field in `params`, `body`, `path_params`, or `body_params` is defined as:

```json
{
  "param_name": {
    "type": "string",
    "description": "What this parameter does",
    "required": true,
    "default": "optional default value"
  }
}
```

Supported types: `"string"`, `"integer"`, `"number"`, `"boolean"`.

---

## Settings Placeholder Resolution

Both MCP and API capabilities support `${SETTING_NAME}` placeholders in URLs, headers, and other string values. These are resolved at runtime from the current user's settings.

**How it works:**

1. The system finds all `${...}` tokens in the capability options using `PLACEHOLDER_RE` in `tool_builder_utils.py`.
2. For each token, it calls `get_user_setting_value(name, user_id, group_id)`.
3. The returned value replaces the placeholder.
4. If any setting cannot be resolved (returns empty or `None`), an `UnresolvedPlaceholderError` is raised and the tool/MCP config is skipped with a logged error.

**Setting up user settings:**

Users configure settings via the Settings tool or the admin API. For example, to set up an API key:

```text
Setting name:  WEATHER_API_KEY
Setting value: sk-abc123...
```

This value is then available as `${WEATHER_API_KEY}` in any capability's options.

---

## How Tool Resolution Works at Runtime

When an agent is initialized, this is the flow:

```text
1. Agent loads its capabilities from the DB
   │
2. capabilities_utils.get_tools_from_capabilities() is called
   │
   ├─── Internal tools (type: internal):
   │    a. Extract all capability codes (comma-separated supported)
   │    b. Apply runtime conditions (canvas page type, subchat direction, etc.)
   │    c. Call resolve_tools(active_codes) → deduplicated tool list
   │    d. Handle special cases (GoogleSerper, generic API requests)
   │
   ├─── MCP tools (type: mcp):
   │    a. Build canonical MCP config dict from cap.options
   │    b. Resolve ${...} placeholders in headers
   │    c. Return config dicts (attached per-provider in get_graph)
   │
   └─── API tools (type: api):
        a. Build Pydantic input model from path_params/params/body/body_params/files schemas
        b. Resolve ${...} placeholders in url/headers/body_template
        c. Create StructuredTool that makes HTTP requests
        d. Added to the internal tools list
   │
3. Returns (internal_tools, mcp_tool_configs)
   │
4. Agent's get_graph():
   a. attach_mcp(llm, internal_tools, mcp_tool_configs) → (model, agent_tools)
        • OpenAI    → MCP dicts appended to agent_tools (Responses API)
        • Anthropic → MCP gated + translated to mcp_servers on a copy of the
                      model (approval-gated or malformed servers are skipped
                      fail-closed, with a warning)
        • other     → MCP skipped with a warning
   b. create_agent(model=model, tools=agent_tools)
```

> Hosted MCP works on both OpenAI and Anthropic from the same capability — only
> the model changes. See [MCP Capabilities](MCP-Capabilities.md) for the
> per-provider configuration differences.

---

## Testing Your Plugin Locally

### 1. Install in development mode

```bash
cd /path/to/assist-manage-toolkit
pip install -e .
```

### 2. Verify entry-point registration

```bash
python -c "
from importlib.metadata import entry_points
eps = entry_points().select(group='primethink.tools')
for ep in eps:
    print(f'{ep.name} -> {ep.value}')
"
```

### 3. Test the register function

```python
def test_plugin_registration():
    calls = []

    def mock_registry(code, tools, **kwargs):
        calls.append((code, tools, kwargs))

    from assist_manage_toolkit import register
    register(mock_registry)

    assert len(calls) >= 1
    for code, tools, kwargs in calls:
        print(f"Code: {code}, Tools: {[t.name for t in tools]}, Meta: {kwargs}")
        assert isinstance(code, str)
        assert isinstance(tools, list)
        assert len(tools) > 0
        # Verify metadata is provided
        assert kwargs.get("name"), f"Missing name for code '{code}'"
```

### 4. Test tools individually

```python
import asyncio
from unittest.mock import MagicMock


async def test_my_tool():
    from assist_manage_toolkit.manage_toolkit import search_matters

    config = {"configurable": {"logged_user_id": 1, "group_id": 1, "chat_id": 1}}
    result = await search_matters.ainvoke({"query": "test", "limit": 5}, config=config)
    print(result)

asyncio.run(test_my_tool())
```

---

## Deploying to Kubernetes

Add the plugin to your Dockerfile:

```dockerfile
# Install external tool plugins
RUN pip install git+https://${GITHUB_TOKEN}@github.com/your-org/assist-manage-toolkit.git@v1.0.0
RUN pip install git+https://${GITHUB_TOKEN}@github.com/your-org/primethink-crm-tools.git@v0.1.0
```

Or use a requirements file:

```text
# requirements-plugins.txt
git+https://github.com/your-org/assist-manage-toolkit.git@v1.0.0
git+https://github.com/your-org/primethink-crm-tools.git@v0.1.0
```

```dockerfile
COPY requirements-plugins.txt .
RUN pip install -r requirements-plugins.txt
```

The API discovers plugins automatically at startup — no configuration changes needed.

---

## Troubleshooting

### Plugin not discovered

- Verify the entry point is registered: `python -c "from importlib.metadata import entry_points; print(list(entry_points().select(group='primethink.tools')))"`
- Make sure the package is installed (`pip list | grep assist-manage` or `pip list | grep primethink`)
- Check that the entry-point group name is exactly `"primethink.tools"` in `pyproject.toml`

### Tools not appearing on the agent

- Check that a `capabilities` DB row exists with the correct `code` matching your registration
- Verify the capability is assigned to the agent (via the admin UI or API)
- Check the `type` field — use `"internal"` for Python tools, `"mcp"` for MCP, `"api"` for REST APIs

### ${SETTING_NAME} not resolving

- Verify the user has the setting configured (check `user_settings` table or the Settings UI)
- The setting name is case-sensitive — `${MY_KEY}` looks for a setting named exactly `MY_KEY`
- Check API logs for `"placeholder could not be resolved"` warnings

### Import errors in plugin

- The plugin should NOT import from `src.*` (the main API). It receives `register_tools` via injection.
- Use only `langchain-core`, `pydantic`, and standard library imports in your plugin.
- For shared utilities (DB access, etc.), pass them via config or environment variables.

---

## Related Topics

- [Capabilities](Capabilities.md) - Managing agent capabilities
- [Working with AI Agents](Working-with-AI-Agents.md) - Agent configuration
- [Sandbox Execution](Sandbox-Execution.md) - Ephemeral sandbox runtime
