import importlib.util
import json
import pathlib
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("retention", pathlib.Path(__file__).with_name("retain-pages-assets.py"))
retention = importlib.util.module_from_spec(spec)
spec.loader.exec_module(retention)


class RetentionTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = pathlib.Path(self.temporary.name)
        self.dist = self.root / "dist"
        (self.dist / "assets").mkdir(parents=True)
        (self.dist / "assets/new.js").write_bytes(b"new build")
        self.legacy = self.root / "legacy.json"
        self.legacy.write_text(json.dumps({"assets": ["assets/legacy.js", "assets/unpublished.js"]}))

    def run_retention(self, files):
        return retention.retain_assets(self.dist, lambda path: files.get(path), self.legacy)

    def test_expired_archives_are_unnecessary_when_live_site_has_an_inventory(self):
        paths = self.run_retention({"asset-manifest.json": b'{"assets":["assets/old.js","assets/new.js"]}', "assets/old.js": b"previous build", "assets/new.js": b"must not replace"})
        self.assertEqual((self.dist / "assets/new.js").read_bytes(), b"new build")
        self.assertEqual((self.dist / "assets/old.js").read_bytes(), b"previous build")
        self.assertEqual(set(paths), {"assets/new.js", "assets/old.js"})
        self.assertEqual(json.loads((self.dist / "asset-manifest.json").read_text())["assets"], paths)

    def test_bootstrap_keeps_live_historical_files_but_ignores_unpublished_candidates(self):
        paths = self.run_retention({"sw.js": b'const FILES = ["index.html", "assets/current.js", "assets/current.css"];', "": b'<script src="./assets/current.js"></script>', "assets/current.js": b"current JS", "assets/current.css": b"current CSS", "assets/legacy.js": b"older JS"})
        self.assertEqual(set(paths), {"assets/new.js", "assets/current.js", "assets/current.css", "assets/legacy.js"})

    def test_missing_required_asset_blocks_publication(self):
        with self.assertRaisesRegex(RuntimeError, "missing"):
            self.run_retention({"asset-manifest.json": b'{"assets":["assets/missing.js"]}'})
        self.assertFalse((self.dist / "asset-manifest.json").exists())

    def test_traversal_and_unexpected_html_are_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "Invalid asset inventory"):
            self.run_retention({"asset-manifest.json": b'{"assets":["assets/../../escape.js"]}'})
        with self.assertRaisesRegex(RuntimeError, "Invalid response"):
            self.run_retention({"asset-manifest.json": b'{"assets":["assets/broken.js"]}', "assets/broken.js": b"<!doctype html><html>error</html>"})
        self.assertFalse((self.root / "escape.js").exists())

    def test_first_deployment_writes_inventory_without_old_artifacts(self):
        self.assertEqual(self.run_retention({}), ["assets/new.js"])

    def test_network_failures_propagate_instead_of_deleting_previous_files(self):
        def failed(path):
            raise OSError("network unavailable")
        with self.assertRaises(OSError):
            retention.retain_assets(self.dist, failed, self.legacy)
        self.assertFalse((self.dist / "asset-manifest.json").exists())


if __name__ == "__main__":
    unittest.main()
