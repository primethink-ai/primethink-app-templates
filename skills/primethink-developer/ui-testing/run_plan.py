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
import hashlib
import json
import os
import re
import sys
from contextlib import contextmanager
from pathlib import Path


def fatal(message):
    """Report a usage/plan/environment error with the documented exit code 2."""
    print(message, file=sys.stderr)
    raise SystemExit(2)


try:
    import yaml
except ImportError:
    fatal("PyYAML is required: pip install pyyaml")

try:
    from playwright.sync_api import sync_playwright, expect, Error as PWError
except ImportError:
    fatal("Playwright is required: pip install playwright && playwright install chromium")


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
# Viewport matrix
# --------------------------------------------------------------------------- #
def parse_viewports(plan):
    """Validate and normalize the optional plan-level viewport matrix.

    Existing plans get one unnamed/default browser context, preserving their
    current result ids and execution behavior.
    """
    raw = plan.get("viewports")
    if raw is None:
        return [{"name": "default", "width": None, "height": None}]
    if not isinstance(raw, list) or not raw:
        raise ValueError("viewports must be a non-empty list")

    viewports = []
    names = set()
    for index, item in enumerate(raw):
        if not isinstance(item, dict):
            raise ValueError(f"viewports[{index}] must be a mapping")
        name = item.get("name")
        width = item.get("width")
        height = item.get("height")
        if not isinstance(name, str) or not name.strip():
            raise ValueError(f"viewports[{index}].name must be a non-empty string")
        name = name.strip()
        if not re.fullmatch(r"[A-Za-z0-9_-]+", name):
            raise ValueError(
                f"viewport name {name!r} may contain only letters, numbers, '_' and '-'"
            )
        if name in names:
            raise ValueError(f"duplicate viewport name: {name!r}")
        if isinstance(width, bool) or not isinstance(width, int) or width <= 0:
            raise ValueError(f"viewport {name!r} width must be a positive integer")
        if isinstance(height, bool) or not isinstance(height, int) or height <= 0:
            raise ValueError(f"viewport {name!r} height must be a positive integer")
        names.add(name)
        viewports.append({"name": name, "width": width, "height": height})
    return viewports


def scenario_viewport_names(scenario, known_names):
    """Return selected viewport names, validating any scenario-level filter."""
    if not isinstance(scenario, dict):
        raise ValueError("each scenario must be a mapping")
    selected = scenario.get("viewports")
    if selected is None:
        return set(known_names)
    if not isinstance(selected, list) or not selected:
        raise ValueError(
            f"scenario {scenario.get('id', 'scenario')!r} viewports must be a non-empty list"
        )
    if any(not isinstance(name, str) for name in selected):
        raise ValueError(
            f"scenario {scenario.get('id', 'scenario')!r} viewport names must be strings"
        )
    unknown = [name for name in selected if name not in known_names]
    if unknown:
        raise ValueError(
            f"scenario {scenario.get('id', 'scenario')!r} references unknown viewports: "
            + ", ".join(map(str, unknown))
        )
    return set(selected)


def qualified_step_id(viewport_name, raw_step_id, matrix_enabled):
    """Return an unambiguous result id for one viewport/step execution."""
    return f"{viewport_name}::{raw_step_id}" if matrix_enabled else raw_step_id


def safe_artifact_name(value):
    """Make stable step ids safe and collision-resistant for snapshot filenames."""
    raw = str(value)
    stem = re.sub(r"[^A-Za-z0-9_.-]+", "-", raw).strip("-") or "step"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:10]
    return f"{stem}-{digest}"


def validate_execution_ids(plan, viewports, selected_viewports, matrix_enabled):
    """Reject duplicate/invalid final step ids before launching a browser."""
    seen = set()
    for viewport in viewports:
        for scenario in plan["scenarios"]:
            if viewport["name"] not in selected_viewports[id(scenario)]:
                continue
            sid = scenario.get("id", "scenario")
            steps = scenario.get("steps", [])
            if not isinstance(steps, list):
                raise ValueError(f"scenario {sid!r} steps must be a list")
            for step in steps:
                if not isinstance(step, dict):
                    raise ValueError(f"scenario {sid!r} contains a non-mapping step")
                raw_step_id = step.get("id", f"{sid}.{step.get('action')}")
                if not isinstance(raw_step_id, str) or not raw_step_id.strip():
                    raise ValueError(f"scenario {sid!r} has an empty/non-string step id")
                result_id = qualified_step_id(
                    viewport["name"], raw_step_id, matrix_enabled
                )
                if result_id in seen:
                    raise ValueError(f"duplicate executed step id: {result_id!r}")
                seen.add(result_id)


def apply_matrix_viewport(page, viewport):
    """Restore a matrix viewport before each scenario after any live resize step."""
    if viewport["width"] is not None:
        page.set_viewport_size({
            "width": viewport["width"],
            "height": viewport["height"],
        })


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
    elif action == "set_viewport":
        width = step.get("width")
        height = step.get("height")
        if isinstance(width, bool) or not isinstance(width, int) or width <= 0:
            raise ValueError("set_viewport width must be a positive integer")
        if isinstance(height, bool) or not isinstance(height, int) or height <= 0:
            raise ValueError("set_viewport height must be a positive integer")
        page.set_viewport_size({"width": width, "height": height})
    elif action == "click":
        locator_for(page, target).click(timeout=timeout)
    elif action == "fill":
        locator_for(page, target).fill(str(step.get("value", "")), timeout=timeout)
    elif action == "select":
        locator_for(page, target).select_option(step.get("value"), timeout=timeout)
    elif action == "press":
        if target is None:
            page.keyboard.press(step["key"])
        else:
            locator_for(page, target).press(step["key"], timeout=timeout)
    elif action == "hover":
        locator_for(page, target).hover(timeout=timeout)
    elif action == "upload":
        locator_for(page, target).set_input_files(step["files"], timeout=timeout)
    elif action == "wait_for":
        locator_for(page, target).wait_for(timeout=timeout)
    elif action == "scroll":
        x = int(step.get("x", 0))
        y = int(step.get("y", 0))
        position = {"left": x, "top": y}
        if target is None:
            page.evaluate("position => window.scrollTo(position)", position)
        else:
            locator_for(page, target).evaluate("(element, position) => element.scrollTo(position)", position)

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
    elif action == "expect_attribute":
        expect(locator_for(page, target)).to_have_attribute(
            step["attribute"], str(step.get("value", "")), timeout=timeout
        )
    elif action == "expect_url":
        if "equals" in step:
            expect(page).to_have_url(step["equals"], timeout=timeout)
        else:
            pattern = re.compile(f".*{re.escape(step.get('contains', ''))}.*")
            expect(page).to_have_url(pattern, timeout=timeout)
    elif action == "expect_no_horizontal_overflow":
        tolerance = float(step.get("tolerance_px", 1))
        if target is None:
            overflow = page.evaluate(
                """() => {
                    const root = document.documentElement;
                    const body = document.body;
                    return Math.max(root.scrollWidth, body ? body.scrollWidth : 0) - root.clientWidth;
                }"""
            )
            subject = "document"
        else:
            overflow = locator_for(page, target).evaluate(
                "element => element.scrollWidth - element.clientWidth"
            )
            subject = f"target {target!r}"
        if float(overflow) > tolerance:
            raise AssertionError(
                f"{subject} has {float(overflow):.1f}px horizontal overflow "
                f"(tolerance {tolerance:.1f}px)"
            )
    elif action == "expect_stuck_to_top":
        box = locator_for(page, target).bounding_box(timeout=timeout)
        if box is None:
            raise AssertionError(f"target {target!r} has no bounding box")
        expected_y = float(step.get("offset_px", 0))
        tolerance = float(step.get("tolerance_px", 2))
        if abs(float(box["y"]) - expected_y) > tolerance:
            raise AssertionError(
                f"target {target!r} y={float(box['y']):.1f}px, expected "
                f"{expected_y:.1f}px ± {tolerance:.1f}px"
            )
    elif action == "expect_in_viewport":
        box = locator_for(page, target).bounding_box(timeout=timeout)
        if box is None:
            raise AssertionError(f"target {target!r} has no bounding box")
        viewport = page.viewport_size or page.evaluate(
            "() => ({width: window.innerWidth, height: window.innerHeight})"
        )
        tolerance = float(step.get("tolerance_px", 0))
        fully = bool(step.get("fully", True))
        left = float(box["x"])
        top = float(box["y"])
        right = left + float(box["width"])
        bottom = top + float(box["height"])
        if fully:
            inside = (
                left >= -tolerance and top >= -tolerance
                and right <= float(viewport["width"]) + tolerance
                and bottom <= float(viewport["height"]) + tolerance
            )
        else:
            inside = (
                right > -tolerance and bottom > -tolerance
                and left < float(viewport["width"]) + tolerance
                and top < float(viewport["height"]) + tolerance
            )
        if not inside:
            mode = "fully" if fully else "partly"
            raise AssertionError(
                f"target {target!r} is not {mode} in viewport {viewport}; box={box}"
            )
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


@contextmanager
def browser_session(headed):
    """Launch Chromium or report a documented environment error (exit 2)."""
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=not headed)
            try:
                yield browser
            finally:
                browser.close()
    except SystemExit:
        raise
    except Exception as error:
        fatal(f"could not start or run Playwright: {error}")


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
        fatal(f"could not read plan {plan_path}: {e}")
    if not isinstance(plan, dict) or "scenarios" not in plan:
        fatal("plan must be a mapping with a 'scenarios' list")
    if not isinstance(plan["scenarios"], list):
        fatal("plan 'scenarios' must be a list")

    try:
        viewports = parse_viewports(plan)
        matrix_enabled = not (
            len(viewports) == 1 and viewports[0]["name"] == "default"
        )
        known_viewport_names = {viewport["name"] for viewport in viewports}
        selected_viewports = {
            id(scenario): scenario_viewport_names(scenario, known_viewport_names)
            for scenario in plan["scenarios"]
        }
        validate_execution_ids(
            plan, viewports, selected_viewports, matrix_enabled
        )
    except ValueError as e:
        fatal(f"invalid plan: {e}")

    base_url = args.base_url or plan.get("base_url") or DEFAULT_BASE_URL
    out_dir = Path(args.output_dir) if args.output_dir else plan_path.parent / "results"
    out_dir.mkdir(parents=True, exist_ok=True)

    token = None
    if not args.storage_state:
        token = resolve_token()
        if not token:
            fatal(
                "no pt API token found (set PRIMETHINK_TOKEN or run `pt profile add`), "
                "or pass --storage-state to use a saved session"
            )

    results = []
    with browser_session(args.headed) as browser:
        for viewport in viewports:
            context_options = {"storage_state": args.storage_state or None}
            if viewport["width"] is not None:
                context_options["viewport"] = {
                    "width": viewport["width"],
                    "height": viewport["height"],
                }
            context = browser.new_context(**context_options)
            if token:
                context.add_init_script(seed_auth_script(plan.get("auth"), token))
            page = context.new_page()

            for scenario in plan["scenarios"]:
                if viewport["name"] not in selected_viewports[id(scenario)]:
                    continue
                apply_matrix_viewport(page, viewport)
                sid = scenario.get("id", "scenario")
                for step in scenario.get("steps", []):
                    raw_step_id = step.get("id", f"{sid}.{step.get('action')}")
                    step_id = qualified_step_id(
                        viewport["name"], raw_step_id, matrix_enabled
                    )
                    try:
                        run_step(page, base_url, step, args.timeout_ms)
                        results.append({
                            "id": step_id,
                            "step_id": raw_step_id,
                            "viewport": viewport["name"],
                            "status": "pass",
                        })
                    except (PWError, ValueError, KeyError, AssertionError) as e:
                        snap_file = out_dir / f"{safe_artifact_name(step_id)}.snapshot.txt"
                        snap_file.write_text(capture_snapshot(page), encoding="utf-8")
                        results.append({
                            "id": step_id,
                            "step_id": raw_step_id,
                            "viewport": viewport["name"],
                            "status": "fail",
                            "action": step.get("action"),
                            "target": step.get("target"),
                            "error": str(e).splitlines()[0] if str(e) else e.__class__.__name__,
                            "snapshot": str(snap_file),
                        })
                        break  # stop this scenario at the first failure for this viewport
            context.close()

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
