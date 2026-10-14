#!/bin/bash
# Interleaved A/B on the emulator. A = production a6bcc9fc5, B = new build.
R=${REPLICA:?set REPLICA to the replica directory}
OUT=${OUT_DIR:-/tmp/android-perf}/bench-results.jsonl
: > $OUT
for round in 1 2 3 4 5; do
  for build in web-a6bcc9fc5 web-ui; do
    ln -sfn $build $R/web-current
    upd=$(node freshsw.mjs 2>&1 | grep -o '^ok [0-9]*' | awk '{print $2}')
    sleep 3
    cold=$(NOPROF=1 node profile-cold.mjs ${OUT_DIR:-/tmp/android-perf}/x 2>&1 | grep -o '"loadMs":[0-9]*,"pageLoad":[0-9]*,"clickAt":[0-9]*,"tapToReady":[0-9]*')
    sleep 2
    warm=$(node first-category.mjs 2>&1 | grep -o '"tapToReady":[0-9]*')
    echo "{\"round\":$round,\"build\":\"$build\",\"updateLoadMs\":${upd:-null},${cold:-\"cold\":null},\"warm\":{${warm:-}}}" >> $OUT
    echo "round $round $build done"
    sleep 3
  done
done
