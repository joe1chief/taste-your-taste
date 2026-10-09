import json
from pathlib import Path
import tempfile
import unittest

from scripts.build_catalog import END, GITHUB, START, build_catalog, generate


class CatalogTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "data").mkdir()
        (self.root / "docs").mkdir()
        (self.root / "chosen").mkdir()
        (self.root / "chosen/AGENTS.md").write_text("Reviewed rules\n")
        (self.root / "README.md").write_text(f"Manual introduction\n{START}\nOld feed\n{END}\nManual Hall of Fame\n")
        self.data = {
            "team/chosen": {"dir": "chosen", "status": "curated", "stars": 500, "files": ["AGENTS.md"]},
            "alice/new": {
                "status": "pending_review", "stars": 2000, "language": "Python",
                "files": [".agents/AGENTS.md"], "discovered_at": "2026-10-09T10:00:00+08:00",
                "issue_url": f"{GITHUB}/issues/12", "vibe": '<img src=x onerror="alert(1)"> | [fake](javascript:alert(1))',
            },
        }
        self.save_data()
        archive = self.root / "discovered/alice/new"
        (archive / ".agents").mkdir(parents=True)
        (archive / ".agents/AGENTS.md").write_text("New rules")
        (archive / "META.json").write_text(json.dumps({"repo": "Alice/New", "highlights": ["Specific rules"]}))

    def save_data(self):
        (self.root / "data/seen_repos.json").write_text(json.dumps(self.data))

    def test_all_projects_visible_without_promoting_pending_review(self):
        original = (self.root / "data/seen_repos.json").read_bytes()
        catalog = generate(self.root)
        self.assertEqual(catalog["counts"], {"total": 2, "curated": 1, "pending_review": 1})
        self.assertEqual(catalog["projects"][0]["repo"], "alice/new")
        self.assertEqual(catalog["projects"][0]["updated_at"], "2026-10-09T02:00:00Z")
        self.assertEqual(catalog["projects"][0]["status"], "pending_review")
        self.assertEqual(catalog["projects"][0]["archive_url"], f"{GITHUB}/tree/main/discovered/alice/new")
        self.assertEqual((self.root / "data/seen_repos.json").read_bytes(), original)
        self.assertEqual((self.root / "chosen/AGENTS.md").read_text(), "Reviewed rules\n")
        readme = (self.root / "README.md").read_text()
        self.assertTrue(readme.startswith("Manual introduction\n"))
        self.assertTrue(readme.endswith("Manual Hall of Fame\n"))
        self.assertIn("Pending review", readme)
        self.assertNotIn("<img", readme)
        self.assertEqual(json.loads((self.root / "docs/catalog.json").read_text()), catalog)

    def test_evolution_and_new_discoveries_share_a_recent_activity_order(self):
        self.data["team/chosen"]["evolution_history"] = [
            {"timestamp": "2026-10-10T01:00:00Z", "file": "AGENTS.md"},
            {"timestamp": "2026-10-08T01:00:00Z", "file": "AGENTS.md"},
        ]
        self.save_data()
        catalog = generate(self.root)
        self.assertEqual(catalog["projects"][0]["repo"], "team/chosen")
        self.assertEqual(catalog["projects"][0]["latest_change"], "Rules updated")
        self.assertEqual(catalog["latest_update"], "2026-10-10T01:00:00Z")

    def test_rebuild_is_deterministic_and_check_writes_nothing(self):
        first = generate(self.root)
        outputs = [self.root / "README.md", self.root / "docs/catalog.json"]
        before = [(p.read_bytes(), p.stat().st_mtime_ns) for p in outputs]
        self.assertEqual(generate(self.root), first)
        self.assertEqual(generate(self.root, check=True), first)
        self.assertEqual([(p.read_bytes(), p.stat().st_mtime_ns) for p in outputs], before)
        self.data["alice/new"]["stars"] += 1
        self.save_data()
        with self.assertRaisesRegex(ValueError, "stale"):
            generate(self.root, check=True)
        self.assertEqual([(p.read_bytes(), p.stat().st_mtime_ns) for p in outputs], before)

    def test_successful_scan_is_visible_without_new_content(self):
        first = generate(self.root)
        run_url = f"{GITHUB}/actions/runs/123"
        updated = generate(self.root, record_scan=True, run_url=run_url)
        self.assertEqual(first["projects"], updated["projects"])
        self.assertEqual(first["latest_update"], updated["latest_update"])
        self.assertEqual(updated["last_scan"]["run_url"], run_url)
        self.assertIn(run_url, (self.root / "README.md").read_text())
        self.assertEqual(generate(self.root, check=True), updated)
        self.assertEqual(generate(self.root), updated)

    def test_scan_evidence_and_read_only_mode_are_enforced(self):
        for options in ({"record_scan": True}, {"record_scan": True, "run_url": "javascript:alert(1)"},
                        {"record_scan": True, "run_url": f"{GITHUB}/actions/runs/123", "check": True}):
            with self.subTest(options=options), self.assertRaises(ValueError):
                generate(self.root, **options)
        self.assertFalse((self.root / "data/radar_status.json").exists())

    def test_missing_archive_uses_source_link_and_no_invented_folder(self):
        self.data["bob/absent"] = {"status": "pending_review", "discovered_at": "2026-10-10T00:00:00Z"}
        self.save_data()
        entry = generate(self.root)["projects"][0]
        self.assertIsNone(entry["archive_url"])
        self.assertEqual(entry["source_url"], "https://github.com/bob/absent")
        self.assertIn("[Source](https://github.com/bob/absent)", (self.root / "README.md").read_text())

    def test_archive_identity_mismatch_fails_before_writing_outputs(self):
        (self.root / "discovered/alice/new/META.json").write_text('{"repo":"bob/new"}')
        with self.assertRaisesRegex(ValueError, "ownership mismatch"):
            generate(self.root)
        self.assertFalse((self.root / "docs/catalog.json").exists())

    def test_missing_markers_prevent_partial_output_and_scan_record(self):
        (self.root / "README.md").write_text("Manual README without markers")
        with self.assertRaisesRegex(ValueError, "marker pair"):
            generate(self.root, record_scan=True, run_url=f"{GITHUB}/actions/runs/123")
        self.assertFalse((self.root / "docs/catalog.json").exists())
        self.assertFalse((self.root / "data/radar_status.json").exists())

    def test_duplicate_identity_and_unsafe_directories_are_rejected(self):
        self.data["Alice/New"] = self.data["alice/new"].copy()
        self.save_data()
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            build_catalog(self.root)
        del self.data["Alice/New"]
        self.data["team/chosen"]["dir"] = "../outside"
        self.save_data()
        with self.assertRaisesRegex(ValueError, "Invalid archive"):
            build_catalog(self.root)

    def test_empty_database_and_absent_timestamps_are_supported(self):
        self.data = {}
        self.save_data()
        catalog = generate(self.root)
        self.assertEqual(catalog["counts"]["total"], 0)
        self.assertIsNone(catalog["latest_update"])
        self.assertIn("No discoveries", (self.root / "README.md").read_text())


if __name__ == "__main__":
    unittest.main()
