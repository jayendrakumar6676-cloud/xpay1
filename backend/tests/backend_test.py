"""
XPay Exam Portal backend tests.
Covers: /api/health, /api/submit (MCQ + Coding), /api/submissions list,
/api/submissions/{file} fetch, and path traversal protection.
"""
import json
import os
import time
import requests
import pytest

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://c8e03c25-228e-4ef7-a645-acd5febc2b61.preview.emergentagent.com",
).rstrip("/")


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- /api/health ----------
class TestHealth:
    def test_health_ok(self, api):
        r = api.get(f"{BASE_URL}/api/health", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "dir" in data and isinstance(data["dir"], str)
        assert "submissions" in data["dir"]


# ---------- /api/submit ----------
class TestSubmit:
    def test_submit_mcq(self, api):
        ts = int(time.time() * 1000)
        payload = {
            "kind": "mcq",
            "examId": "aptitude",
            "candidateEmail": "TEST_mcq_user@xpay.local",
            "candidateName": "TEST MCQ User",
            "submittedAt": ts,
            "totalMarks": 8,
            "totalPossible": 10,
            "violations": 0,
            "answers": [{"q": 1, "selected": 2, "correct": 2}],
        }
        r = api.post(f"{BASE_URL}/api/submit", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True
        assert "file" in data and data["file"].startswith("aptitude/")
        # store path on the class for next test
        TestSubmit.mcq_file = data["file"]

    def test_submit_coding(self, api):
        ts = int(time.time() * 1000)
        payload = {
            "kind": "coding",
            "examId": "coding",
            "candidateEmail": "TEST_coding_user@xpay.local",
            "candidateName": "TEST Coding User",
            "submittedAt": ts,
            "score": 2,
            "total": 3,
            "violations": 0,
            "solutions": [
                {"problemId": "p1", "language": "python", "code": "print('hi')"}
            ],
        }
        r = api.post(f"{BASE_URL}/api/submit", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True
        assert data["file"].startswith("coding/")
        TestSubmit.coding_file = data["file"]

    def test_submit_empty_body(self, api):
        # Backend should not crash even with empty body
        r = api.post(
            f"{BASE_URL}/api/submit",
            data="",
            headers={"Content-Type": "application/json"},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ---------- /api/submissions ----------
class TestSubmissionsList:
    def test_list_includes_recent(self, api):
        r = api.get(f"{BASE_URL}/api/submissions", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # find our test entries
        files = [item.get("file") for item in data]
        assert any("aptitude/TEST_mcq_user_xpay.local" in (f or "") for f in files), (
            f"MCQ submission not found in list. files head: {files[:5]}"
        )
        assert any("coding/TEST_coding_user_xpay.local" in (f or "") for f in files), (
            f"Coding submission not found in list. files head: {files[:5]}"
        )

    def test_list_sorted_desc(self, api):
        r = api.get(f"{BASE_URL}/api/submissions", timeout=15)
        assert r.status_code == 200
        data = r.json()
        timestamps = [item.get("submittedAt") for item in data if item.get("submittedAt")]
        if len(timestamps) >= 2:
            assert timestamps == sorted(timestamps, reverse=True), (
                "submissions are not sorted by submittedAt desc"
            )


# ---------- /api/submissions/{file_path} ----------
class TestSubmissionFetch:
    def test_fetch_known_file(self, api):
        # Use the file produced in TestSubmit
        file_path = getattr(TestSubmit, "mcq_file", None)
        assert file_path, "mcq submission file missing — earlier test must have failed"
        r = api.get(f"{BASE_URL}/api/submissions/{file_path}", timeout=15)
        assert r.status_code == 200
        body = json.loads(r.text)
        assert body.get("examId") == "aptitude"
        # body retains the raw email (only the file *name* is sanitized)
        assert body.get("candidateEmail") == "TEST_mcq_user@xpay.local"

    def test_traversal_dotdot(self, api):
        # Using URL-encoded ../ (%2e%2e%2f) — the raw form is normalized by the
        # HTTP client/ingress, so we test the server-side `..` guard via encoding.
        r = api.get(
            f"{BASE_URL}/api/submissions/%2e%2e%2fetc%2fpasswd", timeout=15
        )
        assert r.status_code == 400, f"expected 400 for traversal, got {r.status_code}"

    def test_traversal_encoded(self, api):
        # Even if the path normalizes outside the submissions dir, we expect 400
        r = api.get(
            f"{BASE_URL}/api/submissions/aptitude/..%2F..%2Fetc%2Fpasswd", timeout=15
        )
        # depending on URL decoding, server may return 400 or 404, but never 200
        assert r.status_code in (400, 404)

    def test_fetch_nonexistent(self, api):
        r = api.get(
            f"{BASE_URL}/api/submissions/aptitude/no_such_file__never.json", timeout=15
        )
        assert r.status_code == 404
