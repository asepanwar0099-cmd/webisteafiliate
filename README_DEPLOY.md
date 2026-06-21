Deploying to Render (recommended)

1. Go to https://render.com and sign in / sign up.
2. Connect your GitHub account and grant access to the repository `asepanwar0099-cmd/webisteafiliate`.
3. Click "New" → "Web Service".
4. Select the repository and branch `main` (or `gh-pages` if preferred).
5. Choose "Docker" as the Environment since this repo includes a `Dockerfile`.
6. Set the port to `80` (Render will map it automatically).
7. Click Create and wait for the first deploy to finish. The site URL will be provided by Render.

Alternative: Deploy to any Docker-ready host (DigitalOcean App Platform, Railway, Fly.io) using the included `Dockerfile`.

Notes:
- The app requires write access to `products.json` when using API endpoints. For persistent data on Render, consider using an external DB or object storage. For a simple setup, `products.json` will be writable on the container's ephemeral filesystem but will reset on redeploy.
- If you prefer shared hosting (cPanel/FTP), upload the project files to document root and ensure PHP 8+ is enabled.
