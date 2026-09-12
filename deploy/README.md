# Deploying

The app is a static bundle. It is served from a VPS behind nginx, with Vercel deploying the
same branch as a second target so a single box being down does not take the site with it.

Every push to `master` runs the checks, and the deploy job will not start unless they pass.

## One-time setup on the server

Run as a user with sudo. Substitute the domain if it differs from `nginx.conf`.

### 1. A user for the deploy to land as

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo mkdir -p /home/deploy/.ssh && sudo chmod 700 /home/deploy/.ssh
```

Generate a key pair **for this deployment only**, on your own machine:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/clinic-stock-deploy -C "clinic-stock-console deploy" -N ""
```

Put the public half on the server and keep the private half for GitHub:

```bash
# on the server
sudo tee /home/deploy/.ssh/authorized_keys < /path/to/clinic-stock-deploy.pub
sudo chmod 600 /home/deploy/.ssh/authorized_keys
sudo chown -R deploy:deploy /home/deploy/.ssh
```

### 2. Somewhere to publish to

```bash
sudo mkdir -p /var/www/clinic-stock-console/releases
sudo chown -R deploy:deploy /var/www/clinic-stock-console
```

Each deploy writes a new directory under `releases/` and then repoints the `current` symlink
at it. nginx serves `current`, so a request is never answered out of a directory that is
still being copied into, and rolling back is repointing the link at the previous release.

### 3. nginx

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/clinic-stock-console
sudo ln -s /etc/nginx/sites-available/clinic-stock-console /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

`nginx -t` before reloading: a bad config takes the site down on reload otherwise.

### 4. HTTPS

Point an A record at the box first, then:

```bash
sudo certbot --nginx -d stock-console.kiruiallan.me
```

certbot rewrites the server block in place to add the 443 listener, the certificate paths and
the redirect from 80. That is why `nginx.conf` here is HTTP-only — writing the TLS directives
by hand before the certificate exists stops nginx from starting.

### 5. Firewall

```bash
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable
```

## Secrets the workflow needs

Repository → Settings → Secrets and variables → Actions:

| Secret        | Value                                            |
| ------------- | ------------------------------------------------ |
| `VPS_HOST`    | hostname or IP of the box                        |
| `VPS_USER`    | `deploy`                                         |
| `VPS_SSH_KEY` | the **private** half of the key pair from step 1 |

## Checking it worked

The deploy job already does this and fails if either request does not return 200 — a green
deploy that leaves a broken site is worse than a red one. To check by hand:

```bash
curl -I https://stock-console.kiruiallan.me
curl -I https://stock-console.kiruiallan.me/items/5   # proves the SPA fallback
```

The second one is the one that matters. Without `try_files … /index.html`, a reload on a
deep link returns 404 in production while working perfectly in local development.

## Rolling back

```bash
ssh deploy@<host>
ls -1dt /var/www/clinic-stock-console/releases/*     # newest first
ln -sfn /var/www/clinic-stock-console/releases/<sha> /var/www/clinic-stock-console/current.next
mv -Tf /var/www/clinic-stock-console/current.next /var/www/clinic-stock-console/current
```

The five most recent releases are kept; older ones are pruned on each deploy.
