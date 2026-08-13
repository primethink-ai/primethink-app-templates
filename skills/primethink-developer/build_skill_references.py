#!/usr/bin/env python3
"""
Build script for regenerating primethink-developer skill references from source docs.

Usage:
    python build_skill_references.py                    # Regenerate all references
    python build_skill_references.py --diff             # Show what changed
    python build_skill_references.py --review           # Regenerate + invoke Claude Code to review
    python build_skill_references.py --sync             # Sync exact copies without Claude review

The script reads source markdown files from docs/, extracts and reorganizes content
into curated reference files under primethink-developer/references/.

Directory Structure (mirrors mkdocs nav):
    references/
    ├── index.md                         # PrimeThink overview
    ├── getting-started/
    │   └── summary.md                   # Condensed getting started
    ├── core-features/
    │   └── summary.md                   # Condensed core features
    ├── ai-automation/
    │   └── summary.md                   # Tasks, Agents (condensed)
    ├── advanced-topics/
    │   └── live-apps/
    │       ├── index.md                 # Summary of Live Apps/Pages
    │       └── docs/                    # Exact copies of source docs
    │           ├── Live-Apps.md
    │           ├── Data-Management-API.md
    │           └── ... (all Live Pages docs)
    ├── developer-guide/
    │   └── summary.md                   # APIs, integrations (condensed)
    └── resources/
        └── summary.md                   # Use cases, troubleshooting

IMPORTANT: This file generates auto-generated output. See AGENTS.md for details.
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
DEFAULT_DOCS_DIR = SCRIPT_DIR.parents[2] / 'primethink-documentation' / 'docs'
DOCS_DIR = Path(os.environ.get('PRIMETHINK_DOCS_DIR', DEFAULT_DOCS_DIR)).expanduser().resolve()
REFERENCES_DIR = SCRIPT_DIR / 'references'

# Hash file to track source changes
HASH_FILE = SCRIPT_DIR / '.source_hashes.json'

# =============================================================================
# REFERENCE STRUCTURE CONFIGURATION
# =============================================================================

# Sections that get summarized (condensed by Claude)
SUMMARIZED_SECTIONS = {
    'getting-started/summary.md': {
        'sources': [
            'index.md',
            'Download-PrimeThink.md',
            'Quick-Start.md',
            'Introduction.md',
            'User-Interface-Guide-a-quick-look.md',
            'Keyboard-Shortcuts.md',
        ],
        'description': 'Getting started with PrimeThink - download, installation, quick start, UI basics',
    },
    'core-features/summary.md': {
        'sources': [
            'Documents-and-Collections-in-Chats.md',
            'Supported-Document-Formats.md',
            'Document-Actions.md',
            'Managing-Document-Visibility.md',
            'File-Storage-Hierarchy.md',
            'Collections.md',
            'Group-Management.md',
            'Best-Practices-for-Group-Management.md',
            'Collaboration.md',
            'Notifications.md',
            'App-Settings.md',
            'UI-Settings.md',
        ],
        'description': 'Core features - documents, collections, groups, users, collaboration, settings',
    },
    'ai-automation/summary.md': {
        'sources': [
            'Tasks.md',
            'Task-Library.md',
            'Agents.md',
            'Agents-Library.md',
            'What-is-an-Agent.md',
            'Working-with-AI-Agents.md',
            'What-is-an-LLM.md',
            'Supported-LLMs.md',
            'Capabilities.md',
            'AI-Assistant-Tools.md',
            'AI-Assistant-Tools-Part-II.md',
            'Memory.md',
            'Scheduled-Tasks.md',
        ],
        'description': 'AI & Automation - tasks, agents, LLMs, capabilities, tools, memory, scheduled jobs',
    },
    'developer-guide/summary.md': {
        'sources': [
            'Integration-and-APIs.md',
            'Email-Integration.md',
            'PrimeThink-CLI.md',
            'Third-party-Integrations.md',
            'API-Reference.md',
            'Image-Generation-API.md',
            'Audio-Generation-API.md',
            'API-Examples.md',
            'API-Auth.md',
            'API-Use-metadata-in-collections.md',
        ],
        'description': 'Developer guide - integrations, CLI, APIs, authentication',
    },
}

# Sections that get exact copies (full docs preserved)
EXACT_COPY_SECTIONS = {
    'advanced-topics/live-apps': {
        'sources': [
            'Live-Apps.md',
            'Live-Apps-State-Management.md',
            'Creating-Live-Pages.md',
            'Data-Management-API.md',
            'primethink_js_message_received.md',
            'primethink_js_document_events.md',
            'primethink_js_send_notifications.md',
            'primethink_js_call_tool_direct.md',
            'Real-Time-Data-Sync.md',
            'File-Download-API.md',
            'Filtering-and-Querying.md',
            'Pagination.md',
            'Working-with-Chat-Members.md',
            'Live-Pages-Media-Generation.md',
            'Audio-Diarization-API.md',
            'Video-Analysis-API.md',
            'Sandbox-Execution.md',
            'Tool-Plugins.md',
            'Styling-with-Tailwind.md',
            'Live-Apps-Tailwind-v4.md',
            'Live-Apps-Flowbite-Components.md',
            'Live-Apps-Quill-Editor.md',
            'Live-Pages-Basic-Examples.md',
            'Live-Pages-Examples.md',
            'Live-Pages-Best-Practices.md',
            'primethink_manage.md',
            'primethink_manage_ui.md',
        ],
        'index_description': 'Live Apps and Live Pages - interactive web applications with real-time data sync',
    },
}

# Main index file sources
INDEX_SOURCES = [
    'index.md',
    'Introduction.md',
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
        filepath = DOCS_DIR / source
        if compute_file_hash(filepath) != old_hashes.get(source, ''):
            changes['index'].append(source)

    # Check summarized sections
    for ref_name, config in SUMMARIZED_SECTIONS.items():
        changed = []
        for source in config['sources']:
            filepath = DOCS_DIR / source
            if compute_file_hash(filepath) != old_hashes.get(source, ''):
                changed.append(source)
        if changed:
            changes['summarized'][ref_name] = changed

    # Check exact copy sections
    for ref_name, config in EXACT_COPY_SECTIONS.items():
        changed = []
        for source in config['sources']:
            filepath = DOCS_DIR / source
            if compute_file_hash(filepath) != old_hashes.get(source, ''):
                changed.append(source)
        if changed:
            changes['exact_copy'][ref_name] = changed

    return changes


def update_all_hashes():
    """Save hashes for all current source files."""
    hashes = {}
    for source in get_all_source_files():
        filepath = DOCS_DIR / source
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
        filepath = DOCS_DIR / source
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
                print(f"    - docs/{f}")

    if changes['exact_copy']:
        has_changes = True
        print("\nExact copy sections with changes:")
        for ref_name, files in changes['exact_copy'].items():
            print(f"  references/{ref_name}/docs/:")
            for f in files:
                print(f"    - docs/{f}")

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
            src = DOCS_DIR / source
            dst = docs_dir / source
            if src.exists():
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
        # Create a readable title from filename
        title = source.replace('.md', '').replace('-', ' ').replace('_', ' ')
        title = title.replace('primethink js', 'JS API:').replace('primethink manage', 'Manage API')
        lines.append(f"- [{title}](docs/{source})")

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
                print(f"    changed: docs/{f}")

        for ref_name in changes['exact_copy']:
            print(f"\n  {ref_name}/docs/ (exact copies):")
            for f in changes['exact_copy'][ref_name]:
                print(f"    changed: docs/{f}")

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
