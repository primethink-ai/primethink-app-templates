#!/usr/bin/env python3
"""
Build the repository-owned ``primethink-developer`` skill references.

Sources:
- ``primethink-documentation/docs/{user,admin,developer}`` from documentation PR #1
- ``primethink-cli`` reference, user guide, and bundled agent skill

The builder creates portal-qualified curated summaries, exact full portal mirrors,
focused Live App copies, and exact CLI copies. It also supports the documentation
repository's legacy flat ``docs/`` layout while PR #1 is pending.

Usage:
    python build_skill_references.py --diff
    python build_skill_references.py --sync
    python build_skill_references.py --review
    python build_skill_references.py --sync --force
"""

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from datetime import datetime, timezone

# =============================================================================
# CONFIGURATION
# =============================================================================

SCRIPT_DIR = Path(__file__).resolve().parent
OFFICIAL_REPOS_DIR = SCRIPT_DIR.parents[2]
DEFAULT_DOCS_DIR = OFFICIAL_REPOS_DIR / 'primethink-documentation' / 'docs'
DEFAULT_CLI_DIR = OFFICIAL_REPOS_DIR / 'primethink-cli'
DOCS_DIR = Path(os.environ.get('PRIMETHINK_DOCS_DIR', DEFAULT_DOCS_DIR)).expanduser().resolve()
CLI_DIR = Path(os.environ.get('PRIMETHINK_CLI_DIR', DEFAULT_CLI_DIR)).expanduser().resolve()
REFERENCES_DIR = SCRIPT_DIR / 'references'
PORTALS = {
    'user': 'PrimeThink user documentation',
    'admin': 'Group administration, agents, tasks, Live Apps, and Live Pages',
    'developer': 'APIs, CLI, integrations, how-to guides, and architecture',
}


def resolve_doc(source: str) -> Path:
    """Resolve a portal-qualified docs source or a ``cli:`` source."""
    if source.startswith('cli:'):
        return CLI_DIR / source.removeprefix('cli:')

    relative = Path(source)
    direct = DOCS_DIR / relative
    if direct.exists():
        return direct

    # Before PR #1 is merged the docs checkout may still use the legacy flat
    # layout. Portal-qualified IDs remain stable while this fallback keeps the
    # builder usable on either side of the migration.
    if relative.parts and relative.parts[0] in PORTALS:
        return DOCS_DIR / relative.name

    # Compatibility for callers that still pass a bare filename.
    for portal in PORTALS:
        candidate = DOCS_DIR / portal / relative
        if candidate.exists():
            return candidate
    return direct


def exact_copy_relative_path(section_path: str, source: str) -> Path:
    """Return the destination path for an exact-copy source."""
    raw = source.removeprefix('cli:')
    relative = Path(raw)
    if section_path.startswith('portals/'):
        portal = section_path.split('/', 1)[1]
        if relative.parts and relative.parts[0] == portal:
            return Path(*relative.parts[1:])
    return Path(relative.name)


# Hash file to track source changes. Keys are source IDs such as
# ``user/index.md`` or ``cli:docs/cli-reference.md`` so duplicate basenames in
# different portals cannot collide.
HASH_FILE = SCRIPT_DIR / '.source_hashes.json'

# =============================================================================
# REFERENCE STRUCTURE CONFIGURATION
# =============================================================================

# Sections that get summarized (condensed by Claude). Documentation source
# IDs are always portal-qualified; this avoids ambiguous basename resolution.
SUMMARIZED_SECTIONS = {
    'getting-started/summary.md': {
        'sources': [
            'user/index.md',
            'user/Download-PrimeThink.md',
            'user/Quick-Start.md',
            'user/Introduction.md',
            'user/User-Interface-Guide-a-quick-look.md',
            'user/Keyboard-Shortcuts.md',
        ],
        'description': 'User portal - installation, quick start, and interface basics',
    },
    'core-features/summary.md': {
        'sources': [
            'user/Documents-and-Collections-in-Chats.md',
            'user/Supported-Document-Formats.md',
            'user/Document-Actions.md',
            'user/Managing-Document-Visibility.md',
            'user/File-Storage-Hierarchy.md',
            'user/Collections.md',
            'user/Collaboration.md',
            'user/Notifications.md',
            'user/App-Settings.md',
            'user/UI-Settings.md',
            'admin/Group-Management.md',
            'admin/Roles-and-Permissions.md',
            'admin/Best-Practices-for-Group-Management.md',
        ],
        'description': 'User and admin portals - documents, collections, collaboration, settings, groups, and permissions',
    },
    'ai-automation/summary.md': {
        'sources': [
            'admin/Tasks.md',
            'admin/Creating-Tasks.md',
            'admin/Task-Library.md',
            'admin/Agents.md',
            'admin/Agents-Library.md',
            'admin/Capabilities.md',
            'admin/Internal-Capabilities.md',
            'admin/API-Capabilities.md',
            'admin/MCP-Capabilities.md',
            'admin/Computer-Use-Capabilities.md',
            'admin/Sandbox-Capabilities.md',
            'admin/AI-Assistant-Tools.md',
            'admin/AI-Assistant-Tools-Part-II.md',
            'admin/Scheduled-Tasks.md',
            'user/What-is-an-Agent.md',
            'user/Working-with-AI-Agents.md',
            'user/What-is-an-LLM.md',
            'user/Supported-LLMs.md',
            'user/Memory.md',
        ],
        'description': 'Admin and user portals - tasks, agents, LLMs, capabilities, tools, memory, and scheduled jobs',
    },
    'developer-guide/summary.md': {
        'sources': [
            'developer/index.md',
            'developer/Integration-and-APIs.md',
            'developer/Email-Integration.md',
            'developer/PrimeThink-CLI.md',
            'developer/Third-party-Integrations.md',
            'developer/API-Reference.md',
            'developer/Image-Generation-API.md',
            'developer/Audio-Generation-API.md',
            'developer/API-Examples.md',
            'developer/API-Auth.md',
            'developer/API-Use-metadata-in-collections.md',
            'developer/How-To.md',
            'developer/Workspace-Memory-Architecture.md',
        ],
        'description': 'Developer portal - APIs, CLI, integrations, how-to guides, and architecture',
    },
}

# Sections that get exact copies (full docs preserved).
EXACT_COPY_SECTIONS = {
    'advanced-topics/live-apps': {
        'sources': [
            'admin/Live-Apps.md',
            'admin/Live-Apps-State-Management.md',
            'admin/Creating-Live-Pages.md',
            'admin/Data-Management-API.md',
            'admin/primethink_js_message_received.md',
            'admin/primethink_js_document_events.md',
            'admin/primethink_js_send_notifications.md',
            'admin/primethink_js_call_tool_direct.md',
            'admin/Real-Time-Data-Sync.md',
            'admin/File-Download-API.md',
            'admin/Filtering-and-Querying.md',
            'admin/Pagination.md',
            'admin/Working-with-Chat-Members.md',
            'admin/Live-Pages-Media-Generation.md',
            'developer/Audio-Diarization-API.md',
            'developer/Video-Analysis-API.md',
            'admin/Sandbox-Execution.md',
            'admin/Tool-Plugins.md',
            'admin/Styling-with-Tailwind.md',
            'admin/Live-Apps-Tailwind-v4.md',
            'admin/Live-Apps-Flowbite-Components.md',
            'admin/Live-Apps-Quill-Editor.md',
            'admin/Live-Pages-Basic-Examples.md',
            'admin/Live-Pages-Examples.md',
            'admin/Live-Pages-Best-Practices.md',
            'admin/primethink_manage.md',
            'admin/primethink_manage_ui.md',
        ],
        'index_description': 'Live Apps and Live Pages - focused full documentation from the admin and developer portals',
    },
    'developer-guide/cli': {
        'sources': [
            'cli:docs/cli-reference.md',
            'cli:USER_GUIDE.md',
            'cli:skills/primethink-cli/SKILL.md',
        ],
        'index_description': 'PrimeThink CLI - exact upstream reference, user guide, and bundled agent skill',
    },
}

# Mirror every Markdown page in each PR #1 portal. This gives the skill complete,
# deterministic coverage while curated summaries and focused sections remain the
# fast progressive-disclosure entry points.
for portal, description in PORTALS.items():
    portal_dir = DOCS_DIR / portal
    if portal_dir.is_dir():
        sources = [
            f"{portal}/{doc.relative_to(portal_dir).as_posix()}"
            for doc in sorted(portal_dir.rglob('*.md'))
        ]
        EXACT_COPY_SECTIONS[f'portals/{portal}'] = {
            'sources': sources,
            'index_description': description,
        }

# Main index sources represent all three portals.
INDEX_SOURCES = [
    'user/index.md',
    'admin/index.md',
    'developer/index.md',
    'user/Introduction.md',
]


# =============================================================================
# HASH TRACKING
# =============================================================================

def compute_file_hash(filepath: Path) -> str:
    """Compute SHA-256 hash of a file's contents."""
    if not filepath.exists():
        return ''
    return hashlib.sha256(filepath.read_bytes()).hexdigest()


def load_hashes() -> dict:
    """Load previously saved source file hashes."""
    if HASH_FILE.exists():
        return json.loads(HASH_FILE.read_text())
    return {}


def save_hashes(hashes: dict):
    """Save current source file hashes."""
    HASH_FILE.write_text(json.dumps(hashes, indent=2) + '\n')


def get_all_source_files() -> set:
    """Get all source files tracked by this build system."""
    sources = set(INDEX_SOURCES)
    for section in SUMMARIZED_SECTIONS.values():
        sources.update(section['sources'])
    for section in EXACT_COPY_SECTIONS.values():
        sources.update(section['sources'])
    return sources


def get_changed_sources() -> dict:
    """
    Check which source files have changed since last build.
    Returns {'summarized': {ref: [files]}, 'exact_copy': {ref: [files]}, 'index': [files]}
    """
    old_hashes = load_hashes()
    changes = {'summarized': {}, 'exact_copy': {}, 'index': []}

    # Check index sources
    for source in INDEX_SOURCES:
        filepath = resolve_doc(source)
        if compute_file_hash(filepath) != old_hashes.get(source, ''):
            changes['index'].append(source)

    # Check summarized sections
    for ref_name, config in SUMMARIZED_SECTIONS.items():
        changed = []
        for source in config['sources']:
            filepath = resolve_doc(source)
            if compute_file_hash(filepath) != old_hashes.get(source, ''):
                changed.append(source)
        if changed:
            changes['summarized'][ref_name] = changed

    # Check exact copy sections
    for ref_name, config in EXACT_COPY_SECTIONS.items():
        changed = []
        for source in config['sources']:
            filepath = resolve_doc(source)
            if compute_file_hash(filepath) != old_hashes.get(source, ''):
                changed.append(source)
        if changed:
            changes['exact_copy'][ref_name] = changed

    return changes


def update_all_hashes():
    """Save hashes for all current source files."""
    hashes = {}
    for source in get_all_source_files():
        filepath = resolve_doc(source)
        hashes[source] = compute_file_hash(filepath)
    save_hashes(hashes)


# =============================================================================
# SOURCE CONCATENATION
# =============================================================================

def concatenate_sources(sources: list) -> str:
    """
    Concatenate source docs into a single string for Claude review.
    """
    parts = []
    for source in sources:
        filepath = resolve_doc(source)
        if filepath.exists():
            content = filepath.read_text(encoding='utf-8')
            parts.append(f"{'=' * 60}\nSOURCE: {source}\n{'=' * 60}\n\n{content}")
        else:
            parts.append(f"{'=' * 60}\nSOURCE: {source} [NOT FOUND]\n{'=' * 60}\n")
    return '\n\n'.join(parts)


# =============================================================================
# DIFF DISPLAY
# =============================================================================

def show_diff():
    """Show which source files have changed since last build."""
    changes = get_changed_sources()
    has_changes = False

    if changes['index']:
        has_changes = True
        print("Index sources changed:")
        for f in changes['index']:
            print(f"  - docs/{f}")

    if changes['summarized']:
        has_changes = True
        print("\nSummarized sections with changes:")
        for ref_name, files in changes['summarized'].items():
            print(f"  references/{ref_name}:")
            for f in files:
                print(f"    - {f}")

    if changes['exact_copy']:
        has_changes = True
        print("\nExact copy sections with changes:")
        for ref_name, files in changes['exact_copy'].items():
            print(f"  references/{ref_name}/docs/:")
            for f in files:
                print(f"    - {f}")

    if not has_changes:
        print("No source files have changed since last build.")
    else:
        total = len(changes['index']) + sum(len(f) for f in changes['summarized'].values()) + sum(len(f) for f in changes['exact_copy'].values())
        print(f"\n{total} file(s) changed.")


# =============================================================================
# SYNC EXACT COPIES
# =============================================================================

def sync_exact_copies(changed_only: bool = True):
    """
    Copy source docs to exact copy sections.
    """
    changes = get_changed_sources() if changed_only else None

    for section_path, config in EXACT_COPY_SECTIONS.items():
        docs_dir = REFERENCES_DIR / section_path / 'docs'
        docs_dir.mkdir(parents=True, exist_ok=True)

        sources_to_copy = config['sources']
        if changed_only and changes:
            sources_to_copy = changes['exact_copy'].get(section_path, [])
            if not sources_to_copy:
                continue

        print(f"\nSyncing {section_path}/docs/:")
        for source in sources_to_copy:
            src = resolve_doc(source)
            dst = docs_dir / exact_copy_relative_path(section_path, source)
            if src.exists():
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dst)
                print(f"  ✓ {source}")
            else:
                print(f"  ✗ {source} [NOT FOUND]")


def generate_section_index(section_path: str, config: dict):
    """
    Generate an index.md file for an exact copy section.
    """
    index_path = REFERENCES_DIR / section_path / 'index.md'
    index_path.parent.mkdir(parents=True, exist_ok=True)

    lines = [
        f"# {config['index_description'].split(' - ')[0]}",
        "",
        config['index_description'],
        "",
        "## Available Documentation",
        "",
    ]

    for source in config['sources']:
        relative = exact_copy_relative_path(section_path, source)
        title = relative.stem.replace('-', ' ').replace('_', ' ')
        title = title.replace('primethink js', 'JS API:').replace('primethink manage', 'Manage API')
        lines.append(f"- [{title}](docs/{relative.as_posix()})")

    lines.extend([
        "",
        "---",
        f"*Auto-generated index. Source docs in `docs/` subdirectory.*",
    ])

    index_path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f"  ✓ Generated {section_path}/index.md")


# =============================================================================
# REVIEW WITH CLAUDE CODE
# =============================================================================

def review_with_claude(ref_path: str, sources: list, description: str):
    """
    Invoke Claude Code to review and update a summarized reference file.
    """
    full_path = REFERENCES_DIR / ref_path
    full_path.parent.mkdir(parents=True, exist_ok=True)
    current_reference = full_path.read_text(encoding='utf-8') if full_path.exists() else ''
    source_content = concatenate_sources(sources)

    prompt = f"""You are updating a curated developer reference file for the PrimeThink skill.

The reference file is: primethink-developer/references/{ref_path}

This section covers: {description}

Below is the CURRENT curated reference (if any), followed by ALL source docs.

Your job:
1. Read the current reference and all sources
2. Create a condensed, LLM-optimized reference that covers the key information
3. Focus on: API signatures, code examples, configuration options, common patterns
4. Keep the same structure and style — concise, code-heavy, practical
5. Do NOT add navigation hints, screenshots references, or website-specific content
6. Do NOT include lengthy explanations - prefer code examples
7. Write the updated file to: {full_path}

CURRENT REFERENCE:
{'=' * 60}
{current_reference if current_reference else '[No existing reference]'}

SOURCE DOCUMENTATION:
{source_content}
"""

    print(f"\n  Invoking Claude Code to review {ref_path}...")

    try:
        result = subprocess.run(
            ['claude', '-p', prompt, '--allowedTools', 'Read,Write,Edit'],
            capture_output=True,
            text=True,
            timeout=300
        )
        if result.returncode == 0:
            print(f"  ✓ {ref_path} updated by Claude Code")
        else:
            print(f"  ✗ Claude Code failed for {ref_path}: {result.stderr[:200]}")
    except FileNotFoundError:
        print("  ✗ 'claude' CLI not found. Install Claude Code or update references manually.")
    except subprocess.TimeoutExpired:
        print(f"  ✗ Claude Code timed out for {ref_path}")


def review_index_with_claude():
    """
    Generate the main index.md overview file.
    """
    full_path = REFERENCES_DIR / 'index.md'
    current_reference = full_path.read_text(encoding='utf-8') if full_path.exists() else ''
    source_content = concatenate_sources(INDEX_SOURCES)

    prompt = f"""You are creating the main overview reference file for the PrimeThink skill.

The reference file is: primethink-developer/references/index.md

This should be a high-level overview of PrimeThink that helps an LLM understand:
- What PrimeThink is
- Its main capabilities
- How the documentation is organized

Your job:
1. Create a concise overview (not exhaustive documentation)
2. Include a brief description of each main section
3. Point to subdirectories for detailed documentation
4. Keep it under 200 lines
5. Write to: {full_path}

Reference structure to document:
- getting-started/summary.md - Installation, setup, UI basics
- core-features/summary.md - Documents, collections, groups, settings
- ai-automation/summary.md - Tasks, agents, LLMs, automation
- advanced-topics/live-apps/ - Live Apps and Pages (full docs in docs/ subdir)
- developer-guide/summary.md - APIs, integrations, CLI
- resources/summary.md - Use cases, troubleshooting, support

CURRENT REFERENCE:
{'=' * 60}
{current_reference if current_reference else '[No existing reference]'}

SOURCE DOCUMENTATION:
{source_content}
"""

    print(f"\n  Invoking Claude Code to review index.md...")

    try:
        result = subprocess.run(
            ['claude', '-p', prompt, '--allowedTools', 'Read,Write,Edit'],
            capture_output=True,
            text=True,
            timeout=300
        )
        if result.returncode == 0:
            print(f"  ✓ index.md updated by Claude Code")
        else:
            print(f"  ✗ Claude Code failed for index.md: {result.stderr[:200]}")
    except FileNotFoundError:
        print("  ✗ 'claude' CLI not found. Install Claude Code or update references manually.")
    except subprocess.TimeoutExpired:
        print(f"  ✗ Claude Code timed out for index.md")


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description='Build skill references from source docs')
    parser.add_argument('--diff', action='store_true', help='Show what changed since last build')
    parser.add_argument('--review', action='store_true', help='Invoke Claude Code to review and update summaries')
    parser.add_argument('--sync', action='store_true', help='Sync exact copies without Claude review')
    parser.add_argument('--force', action='store_true', help='Force regeneration even if no changes detected')
    args = parser.parse_args()

    if args.diff:
        show_diff()
        return 0

    changes = get_changed_sources()
    has_changes = changes['index'] or changes['summarized'] or changes['exact_copy']

    if not has_changes and not args.force:
        print("No source files have changed since last build. Use --force to regenerate anyway.")
        return 0

    print(f"PrimeThink Skill Reference Builder")
    print(f"{'=' * 60}")
    print(f"Docs directory: {DOCS_DIR}")
    print(f"CLI directory: {CLI_DIR}")
    print(f"References directory: {REFERENCES_DIR}")
    print(f"Timestamp: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"{'=' * 60}")

    # Always sync exact copies if there are changes
    if args.sync or args.review or args.force:
        print("\n--- Syncing Exact Copies ---")
        sync_exact_copies(changed_only=not args.force)

        # Generate index files for exact copy sections
        for section_path, config in EXACT_COPY_SECTIONS.items():
            generate_section_index(section_path, config)

    if args.review:
        print("\n--- Reviewing Summaries with Claude Code ---")

        # Review main index if changed
        if changes['index'] or args.force:
            review_index_with_claude()

        # Review summarized sections
        sections_to_review = SUMMARIZED_SECTIONS.items() if args.force else [
            (ref, config) for ref, config in SUMMARIZED_SECTIONS.items()
            if ref in changes['summarized']
        ]

        for ref_name, config in sections_to_review:
            review_with_claude(ref_name, config['sources'], config['description'])

    elif not args.sync:
        # Just report what needs updating
        print("\nReferences that need updating:")

        if changes['index']:
            print("\n  index.md (main overview)")

        for ref_name in changes['summarized']:
            print(f"\n  {ref_name} (summarized):")
            for f in changes['summarized'][ref_name]:
                print(f"    changed: {f}")

        for ref_name in changes['exact_copy']:
            print(f"\n  {ref_name}/docs/ (exact copies):")
            for f in changes['exact_copy'][ref_name]:
                print(f"    changed: {f}")

        print(f"\nTo sync exact copies:")
        print(f"  python {Path(__file__).name} --sync")
        print(f"\nTo auto-update summaries with Claude Code:")
        print(f"  python {Path(__file__).name} --review")

    # Update hashes after processing
    update_all_hashes()
    print(f"\n✓ Source hashes updated.")

    return 0


if __name__ == '__main__':
    sys.exit(main())
