# XOD Tracker — Public Tracking Website

This project is prepared for Vercel.

## What is real?
Aircraft data is requested from ADSB.lol through `/api/aircraft`.
The site should show provider + fetch time rather than pretending demo objects are real.

Ship tracking uses an AIS provider adapter at `/api/ships`. Add your AIS provider token as a Vercel Environment Variable:
`AISFRIENDS_TOKEN`

Never put private API tokens in browser JavaScript.

## Run
npm install
npm run dev

For the Vercel API functions locally, use the Vercel CLI (`vercel dev`) instead of only `vite`.

## Deploy
Import the folder into Vercel and deploy.
Then add `AISFRIENDS_TOKEN` in Project Settings → Environment Variables if live ship data is enabled.

## Accuracy
No tracking network can guarantee that every aircraft or vessel is visible everywhere.
Aircraft coverage depends on ADS-B/MLAT receivers and provider coverage.
AIS coverage depends on receiving stations and the selected provider.
The UI must display the last update time and provider so stale data is not presented as current.

## Data providers
Aircraft: ADSB.lol (ODbL)
Ships: AIS provider adapter (token required)
Map: OpenStreetMap
