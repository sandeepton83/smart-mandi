# Smart Mandi

Smart Mandi helps farmers find where their crop sells for the most. Compare mandi prices, see candlestick price trends, subtract transport costs by vehicle and distance, and see the real take-home amount.
## The problem
Farmers often sell at the nearest mandi without knowing whether a farther one would pay more after transport costs. Price information is scattered and hard to compare.

## The solution
Pick a crop and quantity, and Smart Mandi ranks mandis by what you actually take home, after transport.

## Features
- Glassmorphism dashboard with market cards and trend lines
- Candlestick price chart with 2W / 1M / 2M / 3M ranges
- Sell panel: quantity, vehicle (tractor, mini truck, lorry), max distance, minimum price
- Hold-or-sell advice based on the recent price average
- Assistant with quick questions and voice input (Chrome / Edge)
- Copy summary and share the result on WhatsApp
- Farmer registration, login and search history

## Tech stack
HTML, CSS and vanilla JavaScript. Hosted on Netlify. A Flask + SQLite backend version is also available.

## Important notes
- Prices and charts are **demo data**, not live government prices.
- Accounts are stored in the browser for demo purposes only.

## Roadmap
- Live prices from Agmarknet / data.gov.in
- Telugu and Hindi language support
- Real weather forecasts
- Server-side accounts and an AI-powered assistant

## Run locally
Open `index.html` in Chrome.
