# The Study Room — WinSCP upload + existing Nginx

Use the **new `Study_Room_Website_VPS.zip`**, not the older revision-content ZIP and not GitHub's source-code ZIP. The website is already built. **No Node, npm, Python, database or background application process is needed on the VPS.**

The Bash installer checks dependencies, downloads missing system packages, checks the upload, handles a conflicting TCP listener with permission, and configures **Nginx to serve the website privately on `127.0.0.1:9001`**. Your existing subdomain proxies to that address. Other sites and certificates are not overwritten.

## 1. Unzip locally, then upload with WinSCP

1. Unzip the new website ZIP on your computer.
2. Create a separate upload folder on your VPS, for example `/home/YOUR_LINUX_USER/study-room-upload`. Do **not** use `/var/www/study-room` as the upload folder; the installer manages that live tree.
3. In WinSCP, select **Binary transfer mode**. Upload all the extracted contents, including `downloads/`, into that folder. Do not open/save the compiled files in an editor that changes line endings.
4. Check the folder structure:

```text
study-room-upload/
  deploy-study-room.sh
  DEPLOY.md
  WEBSITE_AUDIT.md
  SHA256SUMS
  index.html
  app.js
  study-core.js
  styles.css
  favicon.svg
  content.json
  downloads/                 (9 files)
```

Keep `deploy-study-room.sh` beside `index.html`. Upload the entire updated package, **not only the Bash file**; the old website ZIP has no checksum manifest or new state module.

## 2. Run the installer over SSH

Use a normal interactive SSH terminal, your VPS console, or PuTTY. WinSCP's simple command window may not support interactive confirmations.

Replace the upload path and `revise.example.com` with **your actual folder and subdomain**:

```bash
cd /home/YOUR_LINUX_USER/study-room-upload

# Optional: validate the upload and see the plan without changing the VPS.
sudo bash deploy-study-room.sh --domain revise.example.com --dry-run

# Install/update the backend and review any existing owner of TCP 9001.
sudo bash deploy-study-room.sh --domain revise.example.com --free-port
```

If an ordinary app owns 9001, the script shows the listener and asks you to type **`STOP-9001`**. It sends TERM only to the inspected PID, or stops its owning application systemd unit. It does not send SIGKILL or stop an entire process group. Stopped services are **not disabled**: decide separately whether they should start again on reboot. A supervisor that reclaims the port causes the installer to stop with an error, rather than chase new PIDs.

If you have already reviewed the owner and need non-interactive execution:

```bash
sudo ss -ltnp 'sport = :9001'
sudo bash deploy-study-room.sh --domain revise.example.com --free-port --yes
```

**Only use `--yes` if you intend to interrupt that app.** Without `--free-port`, conflicts are reported and nothing is stopped.

### Shared/essential listener protection

The script deliberately refuses to kill unrelated Nginx, SSH, Apache/Caddy, Docker/container services, system services or known shared supervisors. It also refuses to stop PID 1, its own shell or its parent. This remains true with `--yes`.

If Nginx itself has an old `listen 9001` directive, remove **that specific old listener** from its original site configuration, test with `sudo nginx -t`, then gracefully reload Nginx before rerunning. Do not stop all Nginx just to free one port. For a container or shared supervisor, stop/reconfigure the particular app or published mapping yourself. An already-managed Study Room Nginx listener is updated by graceful reload, not killed.

## 3. Point your existing subdomain at the backend

If your existing subdomain **already proxies to `http://127.0.0.1:9001`**, no upstream change is needed.

Otherwise, the script prints and saves this block. In the **existing HTTPS `server {}` block for your subdomain**, replace its old `location / { ... }` block with this one. Back up that site file first. **Do not add a second `location /` block. Keep the existing certificate settings and HTTP-to-HTTPS redirect.**

```nginx
location / {
    proxy_pass http://127.0.0.1:9001;
    proxy_http_version 1.1;
    proxy_cache off;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Then:

```bash
sudo nginx -t && sudo systemctl reload nginx
curl -I https://revise.example.com/
```

Use your normal Nginx reload procedure if it is not managed by systemd. If your subdomain has no HTTPS certificate yet, finish its usual TLS setup separately; the installer does not guess DNS or modify certificate automation.

**Do not open firewall port 9001.** This backend is private, not a public `http://VPS-IP:9001` website. Use your subdomain through Nginx on 443. On the VPS, `curl http://127.0.0.1:9001/` should return the website.

## What the script changes

- Supports standard Debian/Ubuntu (`apt-get`) and Fedora/Rocky/Alma (`dnf`) layouts, Bash 4+, root/sudo and ordinary Linux base utilities.
- Maps **missing commands** to packages: Nginx, curl, lsof, iproute, procps, coreutils and util-linux. Does not request an upgrade of existing Nginx merely because another tool is missing. A working package repository/network and sufficient disk space are required.
- Validates SHA-256 checksums for **all 15 public files**, including the nine downloads. Rejects missing files, unsafe manifest paths and symlinked downloads. Checksums detect transfer damage; they are not a signature of publisher identity.
- Copies only those public files into an immutable-by-convention, root-owned release under `/var/www/study-room/releases/`. Installer, deployment docs and Git/source files are **not** published.
- Atomically switches `/var/www/study-room/current`; writes only its marked `/etc/nginx/conf.d/study-room-9001.conf`.
- Tests the existing Nginx configuration first; refuses unknown configuration files or a real directory at `current`. Requires the normal `conf.d/*.conf` include inside Nginx's `http {}`. Custom Nginx paths/configuration arguments need manual adaptation.
- Tests the generated configuration and confirms it is actually included; reloads gracefully; checks that both deployed HTML and JSON are returned from 9001.
- Keeps previous releases, its previous managed configuration and the previous symlink target. Backups and the subdomain snippet are under `/var/backups/study-room/<deployment>/`. Any stopped listener's process/unit details are recorded there.
- Restores its previous config/link if activation or health checks fail. **Package installation, SELinux changes and intentionally stopped apps are not undone automatically.** Your manual subdomain edits are outside that rollback.
- On SELinux Enforcing hosts, attempts to install missing `semanage` via dnf, label the content and register 9001 for HTTP. It refuses to steal a port label from another service. The public proxy may also need the global `httpd_can_network_connect` policy; inspect your established SELinux policy before enabling it. This environment-specific path is not integration-tested here.

No filesystem or firewall changes are made by `--dry-run`. There is no automatic DNS, TLS renewal setup or modification of other virtual hosts.

## Troubleshooting and updates

- **Checksum failure:** re-upload the complete new package in Binary mode. Do not edit `content.json`, JS or CSS on the VPS after packaging.
- **502 from the domain:** check `curl http://127.0.0.1:9001/`, the subdomain's upstream, Nginx logs and (where applicable) SELinux proxy permission. A successful local health check does not prove your public DNS/TLS/proxy setup.
- **Old content:** disable any additional proxy/CDN cache, reload the page and verify that all files came from the same new package.
- **Nginx cannot include the managed config:** review your main `http {}` includes rather than replacing your whole Nginx configuration.
- **Another deployment is running:** the script takes a lock; wait for it rather than starting overlapping installs.
- **Updates:** upload the next complete package to the separate upload folder and rerun the same command. No recompilation on the VPS is required.
- **Manual rollback after a successful but unwanted update:** rerun the installer using your previous complete upload/package. Or, as an administrator, restore the backed-up managed config and previous symlink target, run `nginx -t`, and gracefully reload. Keep paths/backups until verified. Unused release/backup directories are retained deliberately; clean up old, unreferenced ones manually when safe.

After public deployment, test notes, mobile navigation, review/checklist persistence, both practice drafts/timers, PDF downloads and original source links. Export important drafts **before changing domains, HTTP/HTTPS origins or browser profiles**: browser storage does not migrate between them.

## Building and testing from the repository (build machine only)

```bash
npm ci                     # Node.js 22+
npm run build              # dist/ includes SHA256SUMS
python scripts/package_site.py
npm start                  # optional preview on 0.0.0.0:3000
npm test                   # builds, unit tests and browser tests; manages/reuses preview
python -m unittest discover -s tests -p 'test_deploy.py' -v
bash -n deploy-study-room.sh
shellcheck deploy-study-room.sh
```

The bundled browser tests target a modern Linux x64 build environment with `tar`. Test-only Chromium/NSS libraries are unpacked into ignored temporary/cache directories, not shipped to visitors. Other development environments can set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to a suitable installed Chromium/Chrome executable. Python is used for packaging/test tooling only; it is **not** a VPS runtime dependency. The ready website ZIP already contains everything you upload.

See `WEBSITE_AUDIT.md` for changes, test results and the remaining research/environment limitations. No original Cambridge past-paper PDFs are included; the site links to the indexed originals. Search covers Paper 3/4 revision chapters and question summaries, not hidden practice answers. Timers are independent per paper, persist across reloads when storage works, and pause on paper switch. Saving failures and cross-tab changes are made visible; export drafts you want to keep.
