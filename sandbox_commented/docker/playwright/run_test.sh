# #!/bin/bash
# set -euo pipefail
# 
# # Allow overriding the test path via env var
# TEST_PATH=${TEST_PATH:-e2e/admin_pharmacist.spec.js}
# 
# echo "Starting Playwright test: $TEST_PATH"
# 
# # Ensure deps (in case image didn't install)
# npm install || true
# npx playwright install --with-deps || true
# 
# npx playwright test "$TEST_PATH" --reporter=list "$@"
