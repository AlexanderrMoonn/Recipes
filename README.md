# Recipe Box

A small self-hosted site for your own recipes. No login. Anyone who can
reach the site can add a recipe (name, ingredients, instructions, optional
notes and photo) and search the collection. Once a recipe is added, there
is **no edit or delete button on the site** — that's on purpose, per the
spec. To change or remove a recipe, you edit or delete its file on the
server directly.

## How it's stored

```
data/
  recipes/
    grandmas-sunday-sauce-a1b2c3.json   <- one file per recipe
    weeknight-tacos-9f8e7d.json
  photos/
    grandmas-sunday-sauce-a1b2c3.jpg    <- matching photo, if one was added
```

Each recipe file is plain, readable JSON:

```json
{
  "id": "grandmas-sunday-sauce-a1b2c3",
  "name": "Grandma's Sunday Sauce",
  "ingredients": "2 lbs ground beef\n1 onion, diced\n...",
  "instructions": "1. Brown the beef...\n2. ...",
  "notes": "Freezes well.",
  "photo": "grandmas-sunday-sauce-a1b2c3.jpg",
  "createdAt": "2026-08-25T20:00:00.000Z"
}
```

To **edit** a recipe: open its `.json` file in `data/recipes/` in any text
editor, change the text, save it. Changes show up on the site immediately
(no restart needed).

To **delete** a recipe: delete its `.json` file from `data/recipes/`, and
its photo (same filename base) from `data/photos/` if there is one.

To **add a recipe from the backend** instead of the web form: drop a new
`.json` file with the same shape into `data/recipes/` (any unique filename
ending in `.json` works — the `id` field controls the recipe's URL) and,
if you have a photo, put it in `data/photos/` and reference its filename
in `"photo"`.

## Running it locally (to try it out)

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
cd recipe-site
npm install
npm start
```

Then visit **http://localhost:3000** in a browser.

## Putting it on recipes.moonlanding.app

This app is a plain Node/Express server — it doesn't know or care about
domains itself. To get it onto `recipes.moonlanding.app` you point a
reverse proxy (nginx, in the example below) at it and give that proxy the
subdomain. Rough outline, assuming a Linux server (Ubuntu/Debian) you
already SSH into for `moonlanding.app`:

1. **Copy this folder to the server**, e.g. with `scp` or `rsync`, into
   something like `/opt/recipe-box`.

2. **Install Node.js** on the server if it isn't already there (Ubuntu
   example):
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Install dependencies** inside the app folder:
   ```bash
   cd /opt/recipe-box
   npm install --omit=dev
   ```

4. **Point DNS** for `recipes.moonlanding.app` at your server (an A/AAAA
   record to the server's IP, in whatever DNS panel manages
   `moonlanding.app`).

5. **Keep the app running** with systemd so it survives reboots and
   crashes. A ready-to-edit unit file is in
   `deploy/recipe-box.service.example` — copy it to
   `/etc/systemd/system/recipe-box.service`, adjust the `WorkingDirectory`
   if needed, then:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now recipe-box
   ```
   This runs the app on `127.0.0.1:3000` (not exposed to the internet
   directly).

6. **Reverse proxy the subdomain to it** with nginx. An example config is
   in `deploy/nginx.conf.example` — copy it to
   `/etc/nginx/sites-available/recipes.moonlanding.app`, symlink it into
   `sites-enabled`, test, and reload:
   ```bash
   sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/recipes.moonlanding.app
   sudo ln -s /etc/nginx/sites-available/recipes.moonlanding.app /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

7. **Add HTTPS** with Certbot (recommended, and needed for it to work
   nicely on phones over cellular data too):
   ```bash
   sudo certbot --nginx -d recipes.moonlanding.app
   ```

After that, `https://recipes.moonlanding.app` works from your PC or your
phone identically — it's just a normal website at that point.

If you already run a different reverse proxy (Caddy, Traefik, a Docker
setup, Cloudflare Tunnel, etc.) instead of nginx, the same idea applies:
route `recipes.moonlanding.app` to whatever port the Node app is listening
on (`3000` by default, or set the `PORT` environment variable to change
it).

### Running with Docker instead, if you prefer

There's no Dockerfile included since you didn't mention Docker, but if
your `moonlanding.app` setup is container-based, it's a five-line
Dockerfile: base `node:20-alpine`, `COPY` the app in, `RUN npm ci
--omit=dev`, `EXPOSE 3000`, `CMD ["node", "server.js"]` — with `data/`
mounted as a volume so recipes survive container rebuilds. Ask if you'd
like this written out.

## Backing up your recipes

Since everything lives as plain files in `data/`, backing up is just
copying that folder (e.g. `rsync -a data/ backup-location/`, or including
it in whatever backup routine you already run on the server).

## Notes on the "no edit/delete" behavior

This is enforced by *absence*: the server only exposes routes to list,
search, view, and create recipes — there's no update or delete route at
all, and the frontend has no such buttons. Someone would need shell access
to the server (i.e. the ability to edit files in `data/recipes/`) to
change anything after the fact, which matches "no login on the site, but
I control edits from the backend."
