# Client feedback UI regressions

The tests render the real CRM and lead-detail components in Chromium. An Axios
adapter supplies synthetic records from `fixtures.json`. All actual network
requests are blocked. No tenant address, login or production credentials are used.

The suite covers label filters (including older leads and summary query parity),
backdated attendance and notes, next-return validation, independent response
deadlines, direct losses from the ficha and the Kanban, failed writes preserving
input, read-only permissions, missing loss-stage configuration and mobile overflow.
It uses the existing `index.html` Tailwind theme rather than a replacement design.

## Run

Use Node 22, Python 3.12+, and the project's installed dependencies:

```sh
npm ci
python -m pip install playwright==1.57.0
python -m playwright install chromium
npm install --prefix /tmp/feedback-ui-tools --ignore-scripts --no-audit --no-fund tailwindcss@3.4.17
TAILWIND_CLI=/tmp/feedback-ui-tools/node_modules/tailwindcss/lib/cli.js node tests/browser/build.mjs
python tests/browser/test_feedback.py
```

`CHROMIUM_PATH` optionally selects an already installed Chromium executable.
Generated files and screenshots are under `node_modules/.cache/feedback-browser`.
The frontend CI executes these tests automatically, without deployment.

This is an offline UI suite, not an authenticated end-to-end tenant test. The
backend PR separately verifies transactions, migrations and concurrency against
an isolated PostgreSQL database. A passing build is not a passing typecheck: the
baseline currently contains unrelated TypeScript diagnostics.
