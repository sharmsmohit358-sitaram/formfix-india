# End-to-end checks — NOT yet automated in this environment
Playwright was not installed or run here (no browser binary in this VM), so no Playwright result is claimed.
Manual checklist to run before public launch, on a real Android phone and desktop:
1. Each of the six tools: upload a real JPEG/PNG and a real PDF, complete upload → process → download, reopen the download.
2. Signature: a scan below 10 KB, one in range, one over 20 KB.
3. PDF: single-page, multi-page, corrupted, password-protected, and a form PDF.
4. Checker: archived SSC profile with a matching, oversized and wrong-format file.
5. Keyboard-only upload → process → download journey; 320px viewport; no horizontal scroll.
6. axe-core run on homepage and one tool page.
Record results here; do not mark this checklist complete until it is actually run.
