#!/bin/bash
echo "🚀 Starting CabGo E2E Postman Tests via Newman..."

# Ensure reports directory exists
mkdir -p tests/reports

# Initialize exit status
FINAL_STATUS=0

# Define explicitly the order of test suites to run
COLLECTIONS=(
  "tests/Level1_Tests.postman_collection.json"
  "tests/Level2_Tests.postman_collection.json"
  "tests/Level3_Tests.postman_collection.json"
  "tests/Level4_Tests.postman_collection.json"
  "tests/Level5_Tests.postman_collection.json"
  "tests/Level6_Tests.postman_collection.json"
  "tests/Level7_Tests.postman_collection.json"
  "tests/Level8_Tests.postman_collection.json"
  "tests/Level9_Tests_Complete.postman_collection.json"
  "tests/Level10_ZeroTrust.postman_collection.json"
  "tests/Level11_Deployment.postman_collection.json"
  "tests/Level12_Monitoring.postman_collection.json"
)

# Run each collection
for COLLECTION in "${COLLECTIONS[@]}"; do
  echo "=========================================================="
  echo "🏃‍♂️ Running $COLLECTION"
  echo "=========================================================="
  
  if [ -f "$COLLECTION" ]; then
    # Extract base name for report file
    BASENAME=$(basename "$COLLECTION" .postman_collection.json)
    
    # Run Newman with HTML Extra and JUnit reporters
    # We don't fail immediately, we want to run all test suites
    npx newman run "$COLLECTION" \
      --reporters cli,junit,htmlextra \
      --reporter-junit-export "tests/reports/${BASENAME}_report.xml" \
      --reporter-htmlextra-export "tests/reports/${BASENAME}_dashboard.html" \
      --reporter-htmlextra-title "CabGo API Report: $BASENAME" \
      --reporter-htmlextra-darkTheme \
      --timeout-request 10000
      
    # Capture exit code of newman process
    NEWMAN_EXIT_CODE=$?
    if [ $NEWMAN_EXIT_CODE -ne 0 ]; then
       echo "❌ $COLLECTION FAILED."
       FINAL_STATUS=1
    else
       echo "✅ $COLLECTION PASSED."
    fi
  else
    echo "⚠️  File not found: $COLLECTION - Skipping..."
  fi
done

echo ""
echo "=========================================================="
if [ $FINAL_STATUS -eq 0 ]; then
  echo "🎉 ALL POSTMAN TESTS PASSED SUCCESSFULLY! (Mathematical Proof)"
else
  echo "💀 SOME POSTMAN TESTS FAILED. CHECK PIPELINE LOGS OR ARTIFACTS."
fi
echo "=========================================================="

# Exit with the final aggregated status so GitHub Actions fails correctly
exit $FINAL_STATUS
