#!/bin/sh
# Local work only: copies this package's source into an app's node_modules, because npm does not
# recopy a file: dependency whose version has not changed. Usage: npm run sync -- ../buildframe_ecomm
set -e
app="${1:?usage: npm run sync -- <path to app>}"
dest="$app/node_modules/@buildframe/ui"
[ -d "$dest" ] || { echo "not installed in $app; run there: npm install ../buildframe-ui --install-links"; exit 1; }
rsync -a --delete src/ "$dest/src/"
cp package.json "$dest/package.json"
echo "synced to $dest"
