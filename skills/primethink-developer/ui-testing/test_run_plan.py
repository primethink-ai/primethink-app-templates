import contextlib
import importlib.util
import io
import json
import sys
import tempfile
import types
import unittest
from pathlib import Path


# Unit tests exercise the deterministic plan/step logic without requiring a
# browser binary. The real runner still imports Playwright in production.
playwright_module = types.ModuleType("playwright")
sync_api_module = types.ModuleType("playwright.sync_api")
sync_api_module.sync_playwright = lambda: None
sync_api_module.expect = lambda value: value
sync_api_module.Error = RuntimeError
playwright_module.sync_api = sync_api_module
sys.modules.setdefault("playwright", playwright_module)
sys.modules.setdefault("playwright.sync_api", sync_api_module)

RUNNER_PATH = Path(__file__).with_name("run_plan.py")
spec = importlib.util.spec_from_file_location("responsive_run_plan", RUNNER_PATH)
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


class FakeKeyboard:
    def __init__(self):
        self.keys = []

    def press(self, key):
        self.keys.append(key)


class FakeLocator:
    def __init__(self, box=None, overflow=0):
        self.box = box or {"x": 0, "y": 0, "width": 100, "height": 40}
        self.overflow = overflow
        self.scroll_positions = []

    def evaluate(self, script, arg=None):
        if "scrollTo" in script:
            self.scroll_positions.append(arg)
            return None
        return self.overflow

    def bounding_box(self, timeout=None):
        return self.box


class FakePage:
    def __init__(self):
        self.keyboard = FakeKeyboard()
        self.viewport_size = {"width": 390, "height": 844}
        self.viewport_updates = []
        self.page_scrolls = []
        self.document_overflow = 0
        self.locators = {}

    def set_viewport_size(self, viewport):
        self.viewport_size = viewport
        self.viewport_updates.append(viewport)

    def evaluate(self, script, arg=None):
        if "window.scrollTo" in script:
            self.page_scrolls.append(arg)
            return None
        if "document.documentElement" in script:
            return self.document_overflow
        if "window.innerWidth" in script:
            return self.viewport_size
        raise AssertionError(f"unexpected evaluate script: {script}")

    def get_by_test_id(self, testid):
        return self.locators[testid]


class ViewportPlanTests(unittest.TestCase):
    def test_existing_plan_uses_backward_compatible_default(self):
        self.assertEqual(
            runner.parse_viewports({"scenarios": []}),
            [{"name": "default", "width": None, "height": None}],
        )

    def test_matrix_and_scenario_filter_are_validated(self):
        viewports = runner.parse_viewports({
            "viewports": [
                {"name": "desktop", "width": 1280, "height": 800},
                {"name": "mobile", "width": 390, "height": 844},
            ]
        })
        self.assertEqual([item["name"] for item in viewports], ["desktop", "mobile"])
        self.assertEqual(
            runner.scenario_viewport_names(
                {"id": "nav", "viewports": ["mobile"]}, {"desktop", "mobile"}
            ),
            {"mobile"},
        )

    def test_invalid_and_duplicate_viewports_fail_before_browser_execution(self):
        with self.assertRaisesRegex(ValueError, "positive integer"):
            runner.parse_viewports({
                "viewports": [{"name": "mobile", "width": 0, "height": 844}]
            })
        with self.assertRaisesRegex(ValueError, "duplicate viewport"):
            runner.parse_viewports({
                "viewports": [
                    {"name": "mobile", "width": 390, "height": 844},
                    {"name": "mobile", "width": 320, "height": 700},
                ]
            })
        with self.assertRaisesRegex(ValueError, "unknown viewports"):
            runner.scenario_viewport_names(
                {"id": "nav", "viewports": ["watch"]}, {"mobile"}
            )
        with self.assertRaisesRegex(ValueError, "viewport names must be strings"):
            runner.scenario_viewport_names(
                {"id": "nav", "viewports": [{}]}, {"mobile"}
            )

    def test_snapshot_names_are_filesystem_safe_and_collision_resistant(self):
        first = runner.safe_artifact_name("mobile.navigation/open:drawer")
        second = runner.safe_artifact_name("mobile.navigation-open/drawer")
        self.assertRegex(first, r"^mobile.navigation-open-drawer-[0-9a-f]{10}$")
        self.assertNotEqual(first, second)

    def test_viewport_names_and_executed_step_ids_are_unambiguous(self):
        with self.assertRaisesRegex(ValueError, "may contain only"):
            runner.parse_viewports({
                "viewports": [{"name": "mobile.phone", "width": 390, "height": 844}]
            })

        scenario_a = {"id": "a", "steps": [{"id": "same", "action": "navigate"}]}
        scenario_b = {"id": "b", "steps": [{"id": "same", "action": "navigate"}]}
        plan = {"scenarios": [scenario_a, scenario_b]}
        viewports = [{"name": "default", "width": None, "height": None}]
        selected = {id(scenario_a): {"default"}, id(scenario_b): {"default"}}
        with self.assertRaisesRegex(ValueError, "duplicate executed step id"):
            runner.validate_execution_ids(plan, viewports, selected, False)

        self.assertEqual(
            runner.qualified_step_id("mobile", "navigation.open", True),
            "mobile::navigation.open",
        )

    def test_fatal_uses_documented_environment_error_status(self):
        with contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit) as raised:
                runner.fatal("bad plan")
        self.assertEqual(raised.exception.code, 2)

    def test_browser_launch_failure_uses_environment_error_status(self):
        class FailingChromium:
            def launch(self, **kwargs):
                raise RuntimeError("browser executable missing")

        class PlaywrightManager:
            def __enter__(self):
                return types.SimpleNamespace(chromium=FailingChromium())

            def __exit__(self, *args):
                return False

        original = runner.sync_playwright
        runner.sync_playwright = PlaywrightManager
        try:
            with contextlib.redirect_stderr(io.StringIO()):
                with self.assertRaises(SystemExit) as raised:
                    with runner.browser_session(False):
                        pass
            self.assertEqual(raised.exception.code, 2)
        finally:
            runner.sync_playwright = original

    def test_malformed_scenario_viewport_exits_two_before_browser_launch(self):
        launched = False

        def launch_sentinel():
            nonlocal launched
            launched = True
            raise AssertionError("browser must not launch for an invalid plan")

        original_argv = sys.argv
        original_playwright = runner.sync_playwright
        runner.sync_playwright = launch_sentinel
        try:
            with tempfile.TemporaryDirectory() as directory:
                plan_path = Path(directory) / "plan.yaml"
                plan_path.write_text(
                    """plan_version: 1
viewports:
  - {name: mobile, width: 390, height: 844}
scenarios:
  - id: invalid
    viewports:
      - {}
    steps: []
""",
                    encoding="utf-8",
                )
                sys.argv = ["run_plan.py", str(plan_path), "--storage-state", "state.json"]
                with contextlib.redirect_stderr(io.StringIO()):
                    with self.assertRaises(SystemExit) as raised:
                        runner.main()
                self.assertEqual(raised.exception.code, 2)
                self.assertFalse(launched)
        finally:
            sys.argv = original_argv
            runner.sync_playwright = original_playwright


class MainExecutionTests(unittest.TestCase):
    def test_ordinary_ui_failure_exits_one_writes_result_and_closes_resources(self):
        class FakeContext:
            def __init__(self):
                self.closed = False

            def new_page(self):
                return object()

            def close(self):
                self.closed = True

        class FakeBrowser:
            def __init__(self):
                self.context = FakeContext()
                self.closed = False

            def new_context(self, **kwargs):
                return self.context

            def close(self):
                self.closed = True

        browser = FakeBrowser()

        class FakeChromium:
            def launch(self, **kwargs):
                return browser

        class PlaywrightManager:
            def __enter__(self):
                return types.SimpleNamespace(chromium=FakeChromium())

            def __exit__(self, *args):
                return False

        original_argv = sys.argv
        original_playwright = runner.sync_playwright
        original_run_step = runner.run_step
        original_capture = runner.capture_snapshot
        runner.sync_playwright = PlaywrightManager
        runner.run_step = lambda *args, **kwargs: (_ for _ in ()).throw(
            AssertionError("responsive assertion failed")
        )
        runner.capture_snapshot = lambda page: "snapshot"
        try:
            with tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                plan_path = root / "plan.yaml"
                out_dir = root / "results"
                plan_path.write_text(
                    """plan_version: 1
app_name: failure-contract
scenarios:
  - id: shell
    steps:
      - {id: shell.check, action: expect_no_horizontal_overflow}
""",
                    encoding="utf-8",
                )
                sys.argv = [
                    "run_plan.py", str(plan_path),
                    "--storage-state", str(root / "state.json"),
                    "--output-dir", str(out_dir),
                ]
                with contextlib.redirect_stdout(io.StringIO()):
                    with self.assertRaises(SystemExit) as raised:
                        runner.main()
                self.assertEqual(raised.exception.code, 1)
                results = json.loads((out_dir / "results.json").read_text(encoding="utf-8"))
                self.assertEqual(results["failed"], 1)
                self.assertEqual(results["steps"][0]["id"], "shell.check")
                self.assertEqual(results["steps"][0]["status"], "fail")
                self.assertTrue(browser.context.closed)
                self.assertTrue(browser.closed)
        finally:
            sys.argv = original_argv
            runner.sync_playwright = original_playwright
            runner.run_step = original_run_step
            runner.capture_snapshot = original_capture


class ResponsiveStepTests(unittest.TestCase):
    def setUp(self):
        self.page = FakePage()
        self.page.locators["main-content"] = FakeLocator()
        self.page.locators["app-topbar"] = FakeLocator(
            {"x": 0, "y": 1, "width": 390, "height": 64}
        )
        self.page.locators["primary-action"] = FakeLocator(
            {"x": 20, "y": 100, "width": 120, "height": 44}
        )

    def run_step(self, step):
        runner.run_step(self.page, "https://example.test", step, 1000)

    def test_set_viewport_and_page_level_press(self):
        self.run_step({"action": "set_viewport", "width": 768, "height": 1024})
        self.run_step({"action": "press", "key": "Escape"})
        self.assertEqual(self.page.viewport_updates, [{"width": 768, "height": 1024}])
        self.assertEqual(self.page.keyboard.keys, ["Escape"])

    def test_matrix_viewport_is_restored_before_the_next_scenario(self):
        matrix_viewport = {"name": "mobile", "width": 390, "height": 844}
        runner.apply_matrix_viewport(self.page, matrix_viewport)
        self.run_step({"action": "set_viewport", "width": 600, "height": 700})
        runner.apply_matrix_viewport(self.page, matrix_viewport)
        self.assertEqual(
            self.page.viewport_updates,
            [
                {"width": 390, "height": 844},
                {"width": 600, "height": 700},
                {"width": 390, "height": 844},
            ],
        )

    def test_scroll_supports_page_and_named_scroll_region(self):
        self.run_step({"action": "scroll", "x": 4, "y": 500})
        self.run_step({
            "action": "scroll", "target": {"testid": "main-content"}, "y": 800
        })
        self.assertEqual(self.page.page_scrolls, [{"left": 4, "top": 500}])
        self.assertEqual(
            self.page.locators["main-content"].scroll_positions,
            [{"left": 0, "top": 800}],
        )

    def test_horizontal_overflow_assertion_reports_excess_pixels(self):
        self.run_step({"action": "expect_no_horizontal_overflow"})
        self.page.document_overflow = 12
        with self.assertRaisesRegex(AssertionError, "12.0px horizontal overflow"):
            self.run_step({"action": "expect_no_horizontal_overflow", "tolerance_px": 1})

    def test_sticky_and_in_viewport_assertions(self):
        self.run_step({
            "action": "expect_stuck_to_top",
            "target": {"testid": "app-topbar"},
            "tolerance_px": 2,
        })
        self.run_step({
            "action": "expect_in_viewport",
            "target": {"testid": "primary-action"},
        })
        self.page.locators["app-topbar"].box["y"] = 20
        with self.assertRaisesRegex(AssertionError, "expected 0.0px"):
            self.run_step({
                "action": "expect_stuck_to_top",
                "target": {"testid": "app-topbar"},
                "tolerance_px": 2,
            })

    def test_out_of_viewport_target_fails(self):
        self.page.locators["primary-action"].box["x"] = 400
        with self.assertRaisesRegex(AssertionError, "not fully in viewport"):
            self.run_step({
                "action": "expect_in_viewport",
                "target": {"testid": "primary-action"},
            })


if __name__ == "__main__":
    unittest.main()
