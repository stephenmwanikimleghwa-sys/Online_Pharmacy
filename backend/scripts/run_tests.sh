#!/bin/bash
# Test Runner Script - Runs all critical tests before deployment
# Usage: bash scripts/run_tests.sh

set -e

echo "========================================"
echo "PHARMACY AGGREGATOR - TEST SUITE"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
PASSED=0
FAILED=0

# Function to run test and track result
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -e "${YELLOW}Running: $test_name${NC}"
    if eval "$test_command" > /tmp/test_output.log 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}: $test_name"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}: $test_name"
        cat /tmp/test_output.log
        ((FAILED++))
    fi
    echo ""
}

# 1. User Authentication Tests
echo -e "${YELLOW}=== USER AUTHENTICATION TESTS ===${NC}"
run_test "User Auth Tests" \
    "python manage.py test users.tests.test_user_auth -v 2"

# 2. User Views Tests
echo -e "${YELLOW}=== USER VIEWS TESTS ===${NC}"
run_test "User Views Tests" \
    "python manage.py test users.tests.test_views -v 2"

# 3. Product Model Tests
echo -e "${YELLOW}=== PRODUCT MODEL TESTS ===${NC}"
run_test "Product Model Tests" \
    "python manage.py test products.tests.test_models -v 2"

# 4. Product Views Tests
echo -e "${YELLOW}=== PRODUCT VIEWS TESTS ===${NC}"
run_test "Product Views Tests" \
    "python manage.py test products.tests.test_views -v 2"

# 5. Order Model Tests
echo -e "${YELLOW}=== ORDER MODEL TESTS ===${NC}"
run_test "Order Model Tests" \
    "python manage.py test orders.tests.test_models -v 2"

# 6. Order Views Tests
echo -e "${YELLOW}=== ORDER VIEWS TESTS ===${NC}"
run_test "Order Views Tests" \
    "python manage.py test orders.tests.test_views -v 2"

# 7. Inventory Tests
echo -e "${YELLOW}=== INVENTORY TESTS ===${NC}"
run_test "Inventory Tests" \
    "python manage.py test inventory.tests -v 2"

# 8. Reports Tests
echo -e "${YELLOW}=== REPORTS TESTS ===${NC}"
run_test "Reports Tests" \
    "python manage.py test reports.tests -v 2"

# 9. End-to-End Flow Test
echo -e "${YELLOW}=== END-TO-END TESTS ===${NC}"
run_test "End-to-End Flow" \
    "python manage.py test users.tests.test_end_to_end_flow -v 2"

# 10. Health Check
echo -e "${YELLOW}=== HEALTH CHECK ===${NC}"
run_test "Health Check" \
    "python manage.py test health -v 2"

# Summary
echo ""
echo "========================================"
echo "TEST SUMMARY"
echo "========================================"
echo -e "${GREEN}✓ Passed: $PASSED${NC}"
echo -e "${RED}✗ Failed: $FAILED${NC}"
echo "========================================"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}ALL TESTS PASSED - Ready for deployment!${NC}"
    exit 0
else
    echo -e "${RED}SOME TESTS FAILED - Fix issues before deployment${NC}"
    exit 1
fi
