# Manual debug / verification scripts

One-off scripts used during earlier development sessions to debug or
manually verify a feature against a running server or the live `crm.db`.
None of them are part of the automated test suite (see `app/tests/` for
that) — pytest does not collect any tests from this folder.

Kept for reference only. Run from `CRM-System/backend/` if needed, e.g.:

```
python scripts/manual-debug/verify_login.py
```
