#!/usr/bin/env python3
"""Deterministic, plan-driven Live App UI test runner.

This is the *execution* half of the plan-driven UI-testing workflow. It reads a
`test_plan.yaml` authored by the agent and drives a real browser with Playwright,
step by step, with NO LLM in the loop. The same plan produces the same steps on
every run, so it is safe to re-run and to gate a publish on.

Authoring and healing are the agent's job (see README.md): when this runner
reports a failed step, it also writes a fresh accessibility snapshot next to the
report so the agent can correct that one selector and re-run.

Usage:
    python run_plan.py PLAN.yaml [options]

Options:
    --base-url URL        Override the plan's base_url.
    --output-dir DIR      Where to write results (default: <plan dir>/results).
    --headed              Run with a visible browser (default: headless).
    --storage-state FILE  Use a saved Playwright storage state instead of seeding
                          the pt API token (auth fallback — see README.md).
    --timeout-ms N        Default per-step timeout (default: 10000).

Requires:  pip install playwright pyyaml  &&  playwright install chromium

Exit codes:  0 = all steps passed, 1 = one or more steps failed,
             2 = usage / plan / environment error (nothing ran).
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.exit("PyYAML is required: pip install pyyaml")

try:
    from playwright.sync_api import sync_playwright, expect, Error as PWError
except ImportError:
    sys.exit("Playwright is required: pip install playwright && playwright install chromium")


DEFAULT_BASE_URL = "https://app.primethink.ai"
# Web-session assumption: the app reads the API token from localStorage.
# CONFIRM these keys against the real web app; override per plan via the
# `auth:` header, or use --storage-state to bypass token seeding entirely.
DEFAULT_TOKEN_LOCALSTORAGE_KEYS = ("token", "authToken")


# --------------------------------------------------------------------------- #
# Auth
# --------------------------------------------------------------------------- #
def resolve_token():
    """Resolve the pt API token from env or the pt config file, mirroring the CLI."""
    token = os.environ.get("PRIMETHINK_TOKEN")
    if token:
        return token
    cfg_path = os.environ.get("PRIMETHINK_CONFIG_PATH") or str(
        Path.home() / ".primethink" / "config.json"
    )
    try:
        config = json.loads(Path(cfg_path).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    profile = os.environ.get("PRIMETHINK_PROFILE") or config.get("active_profile")
    return (config.get("profiles", {}).get(profile) or {}).get("token")


def seed_auth_script(auth, token):
    """Build a JS init script that seeds the token into localStorage before the
    app's own scripts run. `auth` is the optional plan `auth:` header."""
    keys = list(DEFAULT_TOKEN_LOCALSTORAGE_KEYS)
    extra = {}
    if isinstance(auth, dict):
        ls = auth.get("localStorage") or {}
        if isinstance(ls, dict):
            if ls.get("key"):
                keys = [ls["key"]]
            extra = {k: v for k, v in ls.items() if k not in ("key", "value_from")}
    assignments = "".join(
        f"localStorage.setItem({json.dumps(k)}, {json.dumps(token)});" for k in keys
    )
    assignments += "".join(
        f"localStorage.setItem({json.dumps(k)}, {json.dumps(v)});" for k, v in extra.items()
    )
    return f"try {{ {assignments} }} catch (e) {{}}"


# --------------------------------------------------------------------------- #
# Target resolution — semantic locators first, raw selectors as fallback
# --------------------------------------------------------------------------- #
def locator_for(page, target):
    if not isinstance(target, dict):
        raise ValueError(f"target must be a mapping, got {target!r}")
    exact = bool(target.get("exact", False))
    if "role" in target:
        loc = page.get_by_role(target["role"], name=target.get("name"), exact=exact)
    elif "text" in target:
        loc = page.get_by_text(target["text"], exact=exact)
    elif "label" in target:
        loc = page.get_by_label(target["label"], exact=exact)
    elif "placeholder" in target:
        loc = page.get_by_placeholder(target["placeholder"], exact=exact)
    elif "testid" in target:
        loc = page.get_by_test_id(target["testid"])
    elif "css" in target:
        loc = page.locator(target["css"])
    elif "xpath" in target:
        loc = page.locator("xpath=" + target["xpath"])
    else:
        raise ValueError(f"target has no recognised key: {target!r}")
    if "nth" in target:
        loc = loc.nth(int(target["nth"]))
    return loc


# --------------------------------------------------------------------------- #
# Step execution
# --------------------------------------------------------------------------- #
def run_step(page, base_url, step, default_timeout):
    """Execute one step. Raises on failure; returns None on success."""
    action = step.get("action")
    timeout = step.get("timeout_ms", default_timeout)
    target = step.get("target")

    if action == "navigate":
        url = step["url"]
        if url.startswith("/"):
            url = base_url.rstrip("/") + url
        page.goto(url, timeout=timeout, wait_until="load")
    elif action == "click":
        locator_for(page, target).click(timeout=timeout)
    elif action == "fill":
        locator_for(page, target).fill(str(step.get("value", "")), timeout=timeout)
    elif action == "select":
        locator_for(page, target).select_option(step.get("value"), timeout=timeout)
    elif action == "press":
        locator_for(page, target).press(step["key"], timeout=timeout)
    elif action == "hover":
        locator_for(page, target).hover(timeout=timeout)
    elif action == "upload":
        locator_for(page, target).set_input_files(step["files"], timeout=timeout)
    elif action == "wait_for":
        locator_for(page, target).wait_for(timeout=timeout)

    # ---- assertions ----
    elif action == "expect_visible":
        expect(locator_for(page, target)).to_be_visible(timeout=timeout)
    elif action == "expect_hidden":
        expect(locator_for(page, target)).to_be_hidden(timeout=timeout)
    elif action == "expect_text":
        loc = locator_for(page, target)
        if "equals" in step:
            expect(loc).to_have_text(step["equals"], timeout=timeout)
        else:
            expect(loc).to_contain_text(step.get("contains", ""), timeout=timeout)
    elif action == "expect_value":
        expect(locator_for(page, target)).to_have_value(step.get("value", ""), timeout=timeout)
    elif action == "expect_count":
        expect(locator_for(page, target)).to_have_count(int(step["count"]), timeout=timeout)
    elif action == "expect_url":
        if "equals" in step:
            expect(page).to_have_url(step["equals"], timeout=timeout)
        else:
            pattern = re.compile(f".*{re.escape(step.get('contains', ''))}.*")
            expect(page).to_have_url(pattern, timeout=timeout)
    else:
        raise ValueError(f"unknown action: {action!r}")


def capture_snapshot(page):
    """Best-effort accessibility snapshot for the agent's healing step."""
    try:
        return page.locator("body").aria_snapshot()
    except Exception:
        try:
            return json.dumps(page.accessibility.snapshot(), indent=2)
        except Exception:
            return page.content()


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def main():
    parser = argparse.ArgumentParser(description="Deterministic Live App UI test runner")
    parser.add_argument("plan", help="Path to test_plan.yaml")
    parser.add_argument("--base-url")
    parser.add_argument("--output-dir")
    parser.add_argument("--headed", action="store_true")
    parser.add_argument("--storage-state")
    parser.add_argument("--timeout-ms", type=int, default=10000)
    args = parser.parse_args()

    plan_path = Path(args.plan)
    try:
        plan = yaml.safe_load(plan_path.read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError) as e:
        sys.exit(f"could not read plan {plan_path}: {e}")
    if not isinstance(plan, dict) or "scenarios" not in plan:
        sys.exit("plan must be a mapping with a 'scenarios' list")

    base_url = args.base_url or plan.get("base_url") or DEFAULT_BASE_URL
    out_dir = Path(args.output_dir) if args.output_dir else plan_path.parent / "results"
    out_dir.mkdir(parents=True, exist_ok=True)

    token = None
    if not args.storage_state:
        token = resolve_token()
        if not token:
            sys.exit(
                "no pt API token found (set PRIMETHINK_TOKEN or run `pt profile add`), "
                "or pass --storage-state to use a saved session"
            )

    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not args.headed)
        context = browser.new_context(storage_state=args.storage_state or None)
        if token:
            context.add_init_script(seed_auth_script(plan.get("auth"), token))
        page = context.new_page()

        for scenario in plan["scenarios"]:
            sid = scenario.get("id", "scenario")
            for step in scenario.get("steps", []):
                step_id = step.get("id", f"{sid}.{step.get('action')}")
                try:
                    run_step(page, base_url, step, args.timeout_ms)
                    results.append({"id": step_id, "status": "pass"})
                except (PWError, ValueError, KeyError, AssertionError) as e:
                    snap_file = out_dir / f"{step_id}.snapshot.txt"
                    snap_file.write_text(capture_snapshot(page), encoding="utf-8")
                    results.append({
                        "id": step_id,
                        "status": "fail",
                        "action": step.get("action"),
                        "target": step.get("target"),
                        "error": str(e).splitlines()[0] if str(e) else e.__class__.__name__,
                        "snapshot": str(snap_file),
                    })
                    break  # stop this scenario at the first failure
        context.close()
        browser.close()

    passed = [r for r in results if r["status"] == "pass"]
    failed = [r for r in results if r["status"] == "fail"]

    # Machine-readable results for the agent's heal loop.
    (out_dir / "results.json").write_text(
        json.dumps({"passed": len(passed), "failed": len(failed), "steps": results}, indent=2),
        encoding="utf-8",
    )

    # Human-readable report (same filename contract as before: test_results.md).
    lines = [
        f"# UI Test Results — {plan.get('app_name', plan_path.parent.name)}",
        "",
        f"- Passed: {len(passed)}",
        f"- Failed: {len(failed)}",
        "",
    ]
    for r in results:
        mark = "✅" if r["status"] == "pass" else "❌"
        lines.append(f"- {mark} `{r['id']}`" + (f" — {r['error']}" if r.get("error") else ""))
        if r.get("snapshot"):
            lines.append(f"  - snapshot: `{r['snapshot']}`")
    (out_dir / "test_results.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"Report: {out_dir / 'test_results.md'}")
    print(f"Passed: {len(passed)}  Failed: {len(failed)}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
