# The Study Room — simple VPS deployment

This is a **static website**. Visitors need no account. Your VPS needs no Python, Node process, database, paid service or API key to serve the finished site.

## Easiest: use the ready-made website ZIP

`Study_Room_Website_VPS.zip` contains the **finished website**, including the authored PDF downloads. It is different from the older revision-content ZIP.

1. Create a dedicated document-root directory on your VPS, e.g. `/var/www/study-room`.
2. Upload `Study_Room_Website_VPS.zip` there and extract it. `index.html`, `styles.css`, `app.js`, `content.json` and `downloads/` should be directly inside that directory, not one level deeper.
3. Point your chosen domain to your VPS in DNS.
4. Configure your existing web server to serve that directory, using either example below. Replace `revise.example.com` with your domain. Do not overwrite an existing server configuration without backing it up.
5. Enable HTTPS. Caddy normally obtains the certificate automatically when DNS is correct and ports 80/443 are accessible; with Nginx use your established certificate setup or Certbot.

The `.py` scripts are **not** web pages. Do not point the public document root at the entire Git checkout; serve only the extracted website or the built `dist/` directory.

## Caddy example

Add a separate site block to your existing Caddyfile:

```caddyfile
revise.example.com {
    root * /var/www/study-room
    encode zstd gzip
    file_server
    header {
        X-Content-Type-Options nosniff
        Referrer-Policy strict-origin-when-cross-origin
        Cache-Control "no-cache"
    }
}
```

Validate and reload using your installation's normal procedure, e.g. `caddy validate --config /etc/caddy/Caddyfile` followed by `systemctl reload caddy` with the required privileges.

## Nginx example

Use a separate server block. This is an HTTP starting point; add your HTTPS configuration before sharing the site publicly.

```nginx
server {
    listen 80;
    server_name revise.example.com;
    root /var/www/study-room;
    index index.html;
    include /etc/nginx/mime.types;

    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header Cache-Control "no-cache" always;

    gzip on;
    gzip_vary on;
    gzip_types text/css application/javascript application/json text/plain;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

Check with `nginx -t` before reloading. Routes use `#/…`, so no SPA fallback rewrite is needed. Relative asset links also allow hosting beneath an existing subdirectory, as long as the directory URL ends with `/`.

## Build from the repository instead

Requires Node.js 22+ **on the build machine only**:

```sh
npm ci
npm run build
```

Upload **the contents of `dist/`**, not `website/` alone. The build converts the existing Markdown notes, copies PDFs/CSV/ZIP downloads and produces `content.json`. There are no browser-side package dependencies, remote fonts, analytics, external scripts or external API requests.

For a local preview:

```sh
npm start
```

Open port 3000. This small development server binds to `0.0.0.0`; use Nginx or Caddy for production, not the preview server.

## Features and data behaviour

- Paper 3 / Paper 4 topic maps and readable notes, with original source references retained.
- Search across all notes and 70 audited past-paper question groups.
- Past-paper filters by paper, year and topic, with links to the original files.
- Practice papers, reveal-on-demand guidance, a pause/reset 90-minute timer and exportable answer drafts.
- Review markers, checklists and drafts stored in the current browser's `localStorage` only. There is no syncing between devices or users. Clearing browser data removes them. Export important drafts.
- The timer continues while navigating within the page, but resets on a full reload. It is a practice aid, not an official exam clock.
- PDF and print access, mobile navigation and keyboard-accessible search.

No original Cambridge past-paper PDFs are included. The site links to the indexed originals and explicitly records incomplete review coverage, missing sessions and selected optional cases. External hosts may change or remove their files. Predictions remain cautious priorities, not unseen-paper claims.

## Verify after deploying

1. Open the domain on a phone and desktop.
2. Open each paper, read a topic, mark it and reload to check persistence.
3. Search for `women` or `Abbasids`; filter the archive by paper/year.
4. Start/pause/reset the practice timer; type a draft and export it.
5. Reveal an answer plan, download a PDF and download the complete revision ZIP.
6. Open an original source link and confirm external access from your own network.

The repository includes browser tests for these flows, the 19 note sections, narrow layouts, unavailable storage, download signatures, loading errors and automated WCAG A/AA checks. To run them on a normal development machine with Chrome dependencies installed, use `npm test` while `npm start` is running. The packaged headless Chromium is for tests only, never sent to students. Automated testing cannot guarantee zero bugs, perfect accessibility or flawless scholarship; keep teacher review and normal maintenance in the loop.

## Updates

Edit the source Markdown/CSV, rebuild, then replace the generated public files together. `content.json` is derived data: do not maintain a separate handwritten copy. No-cache response headers keep updated notes visible without leaving stale scripts paired with new content. Retain backups of previous deployments, and only publish original papers when their reuse permissions allow it.
