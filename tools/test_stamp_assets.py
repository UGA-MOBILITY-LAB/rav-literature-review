"""Regression tests for content-only edits and generated cache versions."""

import contextlib
import hashlib
import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import stamp_assets


class StampAssetsTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.root_patch = patch.object(stamp_assets, "ROOT", self.root)
        self.root_patch.start()
        self.addCleanup(self.root_patch.stop)
        self.targets_patch = patch.object(
            stamp_assets, "TARGETS", ["index.html", "presentation/stage.html"]
        )
        self.targets_patch.start()
        self.addCleanup(self.targets_patch.stop)
        self.write("app.js", "console.log('home');\n")
        self.write("style.css", "body { color: black; }\n")
        self.write("presentation/beats.js", "var beats = ['Updated text'];\n")
        self.write(
            "index.html",
            '<link href="style.css?v=old"><script src="app.js?v=old"></script>\n',
        )
        self.write(
            "presentation/stage.html",
            '<script src="../app.js?v=old"></script>'
            '<script src="beats.js?v=old"></script>\n',
        )

    def write(self, name, text):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8", newline="\n")
        return path

    def run_stamp(self, check=False):
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            return stamp_assets.main(["--check"] if check else [])

    def test_check_detects_stale_urls_without_changing_files(self):
        before = (self.root / "presentation/stage.html").read_bytes()
        self.assertEqual(self.run_stamp(check=True), 1)
        self.assertEqual((self.root / "presentation/stage.html").read_bytes(), before)

    def test_generation_covers_homepage_and_presentation_assets(self):
        self.assertEqual(self.run_stamp(), 0)
        self.assertEqual(self.run_stamp(check=True), 0)
        for document, refs in {
            "index.html": ["app.js", "style.css"],
            "presentation/stage.html": ["../app.js", "beats.js"],
        }.items():
            page = self.root / document
            for ref in refs:
                digest = hashlib.sha256((page.parent / ref).read_bytes()).hexdigest()[:8]
                self.assertIn(ref + "?v=" + digest, page.read_text(encoding="utf-8"))

    def test_content_only_edit_is_regenerated_and_verified(self):
        self.run_stamp()
        homepage = (self.root / "index.html").read_bytes()
        stage_before = (self.root / "presentation/stage.html").read_bytes()
        self.write("presentation/beats.js", "var beats = ['Handong edits the wording'];\n")
        self.assertEqual(self.run_stamp(check=True), 1)
        self.assertEqual(self.run_stamp(), 0)
        self.assertEqual(self.run_stamp(check=True), 0)
        self.assertEqual((self.root / "index.html").read_bytes(), homepage)
        self.assertNotEqual((self.root / "presentation/stage.html").read_bytes(), stage_before)

    def test_generation_is_idempotent_and_preserves_asset_contents(self):
        asset_before = (self.root / "app.js").read_bytes()
        self.run_stamp()
        generated = (self.root / "index.html").read_bytes()
        self.run_stamp()
        self.assertEqual((self.root / "index.html").read_bytes(), generated)
        self.assertEqual((self.root / "app.js").read_bytes(), asset_before)
        self.assertNotIn(b"\r\n", generated)

    def test_remote_urls_are_untouched(self):
        remote = '<script src="https://example.com/app.js?v=vendor"></script>\n'
        self.write("index.html", remote)
        self.run_stamp()
        self.assertEqual((self.root / "index.html").read_text(encoding="utf-8"), remote)


if __name__ == "__main__":
    unittest.main()
