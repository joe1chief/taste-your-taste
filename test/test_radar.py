"""Offline regression coverage for radar archive ownership and write boundaries."""
import contextlib
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import Mock, patch

from scripts.llm_client import analyze_evolution_deterministic
from scripts.radar import TasteRadar, extract_issue_number, resolve_archive_dir, write_archive


class RadarArchivesTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.previous = Path.cwd()
        os.chdir(self.temp.name)
        self.addCleanup(self.temp.cleanup)
        self.addCleanup(os.chdir, self.previous)
        self.api = Mock()
        self.api.get_repo.return_value = {
            "stargazers_count": 2000, "language": "Python", "html_url": "https://github.com/alice/skills"
        }
        self.api.create_issue.return_value = "https://example.com/issue"
        self.api.get_file_content.return_value = "New instructions " * 10
        with patch("scripts.radar.LLMTasteClient"):
            self.radar = TasteRadar(self.api, target_repo="test/archive")
        self.radar.llm.analyze_taste.return_value = {}
        self.radar.llm.analyze_evolution.return_value = {"evolution_summary": "Updated"}
        self.git = patch("scripts.radar.subprocess.run", return_value=subprocess.CompletedProcess([], 0, "https://example.com/pr", ""))
        self.run_command = self.git.start()
        self.addCleanup(self.git.stop)
        self.quiet = contextlib.redirect_stdout(io.StringIO())
        self.quiet.__enter__()
        self.addCleanup(self.quiet.__exit__, None, None, None)

    def write_via(self, entry, repo="alice/skills"):
        if entry == "intake":
            return self.radar.process_candidate({"repo": repo, "files": ["AGENTS.md"], "file_shas": {"AGENTS.md": "new"}})
        if entry == "evolution":
            self.radar.db[repo] = {"file_shas": {"AGENTS.md": "old"}}
            return self.radar.check_and_handle_evolution(repo, {"AGENTS.md": "new"})
        return self.radar.create_pull_request(repo, "Python", {"AGENTS.md": "New instructions " * 10}, {}, 2000)

    def test_all_entries_preserve_curated_skills(self):
        for entry in ("intake", "evolution", "pr"):
            with self.subTest(entry=entry):
                Path("skills/karpathy-guidelines").mkdir(parents=True, exist_ok=True)
                Path("skills/README.md").write_text("Curated index")
                Path("skills/karpathy-guidelines/SKILL.md").write_text("Curated skill")
                self.assertTrue(self.write_via(entry))
                target = Path("discovered/alice/skills")
                self.assertEqual(json.loads((target / "META.json").read_text())["repo"], "alice/skills")
                self.assertEqual((target / "AGENTS.md").read_text(), "New instructions " * 10)
                self.assertEqual(Path("skills/README.md").read_text(), "Curated index")
                self.assertEqual(Path("skills/karpathy-guidelines/SKILL.md").read_text(), "Curated skill")
                self.assertFalse(Path("skills/AGENTS.md").exists())
        commands = [call.args[0] for call in self.run_command.call_args_list]
        self.assertIn(["git", "add", "discovered/alice/skills"], commands)
        self.assertTrue(any(cmd[:3] == ["gh", "pr", "create"] and "--draft" in cmd for cmd in commands))
        self.assertIn("discovered/alice/skills/AGENTS.md", self.api.create_issue.call_args_list[1].args[2])

    def test_intake_with_pr_preserves_discovery_metadata(self):
        self.radar.create_pr = True
        self.assertTrue(self.write_via("intake"))
        meta = json.loads(Path("discovered/alice/skills/META.json").read_text())
        self.assertEqual(meta["files"], ["AGENTS.md"])
        self.assertEqual(meta["file_shas"], {"AGENTS.md": "new"})
        self.assertIn("curated_at", meta)

    def test_pr_branches_include_separate_identity_components(self):
        self.write_via("pr", "alice-team/shared")
        self.write_via("pr", "alice/team-shared")
        commands = [call.args[0] for call in self.run_command.call_args_list]
        self.assertIn(["git", "checkout", "-B", "taste-radar/alice-team/shared"], commands)
        self.assertIn(["git", "checkout", "-B", "taste-radar/alice/team-shared"], commands)

    def test_same_basename_different_owners_for_all_entries(self):
        for entry in ("intake", "evolution", "pr"):
            with self.subTest(entry=entry):
                for owner in ("alice", "bob"):
                    self.assertTrue(self.write_via(entry, f"{owner}/shared"))
                self.assertEqual(resolve_archive_dir("alice/shared"), Path("discovered/alice/shared"))
                self.assertEqual(json.loads(Path("discovered/bob/shared/META.json").read_text())["repo"], "bob/shared")
                self.assertFalse(Path("shared").exists())

    def test_all_entries_refuse_mismatched_or_unverified_targets(self):
        target = Path("discovered/alice/skills")
        target.mkdir(parents=True)
        (target / "AGENTS.md").write_text("Keep me")
        for metadata in (None, '{"repo": "bob/skills"}', "invalid", "[]"):
            if metadata is not None:
                (target / "META.json").write_text(metadata)
            for entry in ("intake", "evolution", "pr"):
                with self.subTest(metadata=metadata, entry=entry):
                    with self.assertRaises(ValueError):
                        self.write_via(entry)
                    self.assertEqual((target / "AGENTS.md").read_text(), "Keep me")
        self.run_command.assert_not_called()
        self.api.create_issue.assert_not_called()

    def test_legacy_evolution_requires_matching_ownership(self):
        Path("shared").mkdir()
        Path("shared/AGENTS.md").write_text("Old legacy instructions")
        for owner, expected in (("bob", ""), ("alice", "Old legacy instructions")):
            Path("shared/META.json").write_text(json.dumps({"repo": f"{owner}/shared"}))
            self.write_via("evolution", "alice/shared")
            self.assertEqual(self.radar.llm.analyze_evolution.call_args.args[2], expected)
            self.assertEqual(Path("shared/AGENTS.md").read_text(), "Old legacy instructions")
            # Reset the new archive so the next iteration tests the legacy reader.
            for path in Path("discovered/alice/shared").iterdir():
                path.unlink()
            Path("discovered/alice/shared").rmdir()

    def test_evolution_reads_new_archive_and_preserves_metadata(self):
        write_archive("alice/skills", {"AGENTS.md": "Previous"}, {"stars": 123})
        self.write_via("evolution")
        self.assertEqual(self.radar.llm.analyze_evolution.call_args.args[2], "Previous")
        self.assertEqual(json.loads(Path("discovered/alice/skills/META.json").read_text())["stars"], 123)

    def test_nested_source_paths_and_identity_case(self):
        target = write_archive("Alice/Skills", {"AGENTS.md": "Root", ".agents/AGENTS.md": "Nested"}, {})
        self.assertEqual(target, resolve_archive_dir("alice/skills"))
        self.assertEqual((target / "AGENTS.md").read_text(), "Root")
        self.assertEqual((target / ".agents/AGENTS.md").read_text(), "Nested")

    def test_unsafe_paths_and_symlinks_are_refused(self):
        for repo in ("../skills", "alice/..", "alice/skills/extra", "/skills"):
            with self.assertRaises(ValueError):
                resolve_archive_dir(repo)
        for fpath in ("../README.md", "/AGENTS.md", "META.json", ".agents/../META.json"):
            with self.assertRaises(ValueError):
                write_archive("alice/skills", {fpath: "Bad"}, {})
        self.assertFalse(Path("discovered").exists())
        Path("outside").mkdir()
        Path("discovered").symlink_to(Path("outside"), target_is_directory=True)
        with self.assertRaises(ValueError):
            self.write_via("intake")
        Path("discovered").unlink()
        target = write_archive("alice/skills", {}, {})
        (target / "AGENTS.md").symlink_to(Path.cwd() / "outside/instructions")
        with self.assertRaises(ValueError):
            self.write_via("evolution")
        self.assertFalse(Path("outside/instructions").exists())

    def test_dry_run_and_no_save_do_not_create_archives(self):
        self.radar.dry_run = True
        self.write_via("intake")
        self.write_via("evolution")
        self.assertFalse(Path("discovered").exists())
        self.api.create_issue.assert_not_called()
        self.run_command.assert_not_called()
        self.radar.dry_run = False
        self.radar.save_tastes = False
        self.write_via("intake")
        self.write_via("evolution")
        self.assertFalse(Path("discovered").exists())

    def test_evolution_reuses_existing_issue_via_comment_and_skips_curated_issues(self):
        self.api.create_issue_comment.return_value = "https://github.com/test/archive/issues/42#issuecomment-1"
        write_archive("alice/skills", {"AGENTS.md": "Old rule line one\n"}, {"stars": 2000})
        self.radar.db["alice/skills"] = {
            "status": "pending_review",
            "issue_url": "https://github.com/test/archive/issues/42",
            "file_shas": {"AGENTS.md": "old"},
        }
        self.assertTrue(self.radar.check_and_handle_evolution("alice/skills", {"AGENTS.md": "new"}))
        self.api.create_issue_comment.assert_called_once()
        self.assertEqual(self.api.create_issue_comment.call_args.args[1], 42)
        self.api.create_issue.assert_not_called()

        # Curated repositories still refresh local archives and history without issue noise
        self.api.create_issue_comment.reset_mock()
        write_archive("bob/curated", {"AGENTS.md": "Initial curated rule\n"}, {"stars": 5000})
        self.radar.db["bob/curated"] = {
            "status": "curated",
            "dir": "curated-bob",
            "file_shas": {"AGENTS.md": "old"},
        }
        self.assertTrue(self.radar.check_and_handle_evolution("bob/curated", {"AGENTS.md": "new"}))
        self.api.create_issue.assert_not_called()
        self.api.create_issue_comment.assert_not_called()
        self.assertEqual(len(self.radar.db["bob/curated"]["evolution_history"]), 1)

    def test_deterministic_evolution_diff_and_trivial_whitespace_skip(self):
        trivial = analyze_evolution_deterministic("AGENTS.md", "# Rules\n- Run pytest  \n", "# Rules\n\n- Run pytest\n")
        self.assertTrue(trivial["trivial"])

        meaningful = analyze_evolution_deterministic(
            "AGENTS.md",
            "# Rules\n- Old lint rule\n",
            "# Rules\n## Token economy\n- Never include conversational preamble; run pytest -q before commit.\n",
        )
        self.assertFalse(meaningful["trivial"])
        self.assertIn("Added", " ".join(meaningful["key_changes"]))
        self.assertIn("token", meaningful["vibe_shift"].lower())
        self.assertEqual(extract_issue_number("https://github.com/joe1chief/taste-your-taste/issues/1"), 1)
        self.assertIsNone(extract_issue_number("https://github.com/joe1chief/taste-your-taste/pull/7"))


if __name__ == "__main__":
    unittest.main()
