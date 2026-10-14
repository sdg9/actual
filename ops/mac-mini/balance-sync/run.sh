#!/bin/sh
set -eu
umask 077
export PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
cd /Users/steven/services/actual/balance-sync
exec /opt/homebrew/bin/node ./run.cjs --apply > ./scheduled.log 2>&1
