#!/bin/sh

# Typescript compile
tsc

# Patch the output file to add back headers
rm headers.js temp.js sephiOGameBeta.user.js 2> /dev/null
cat sephiOGame.user.js | grep -v '^(//)' > temp.js
cat sephiOGame.user.ts | grep '^//' > headers.js
sed '/^(\/\/)/ d' sephiOGame.user.js > sephiOGame.user.js
cat headers.js temp.js > sephiOGame.user.js
cp sephiOGame.user.js sephiOGameBeta.user.js
if [ -d "/z/userscripts/" ]; then
	cp sephiOGame.user.js /z/userscripts/sephiOGame.user.js
	cp sephiOGameBeta.user.js /z/userscripts/sephiOGameBeta.user.js
fi
