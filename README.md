# Grade 7 Vocabulary Quiz (Static)

Pure HTML/CSS/JS quiz. Questions live in `questions.json`.

## Run locally

Open `index.html` directly in your browser.  
If your browser blocks `fetch()` on `file://`, run a tiny local server:

    python -m http.server 8000

Then open http://localhost:8000

## Publish to GitHub Pages

1. Create a new GitHub repository (public).
2. Upload `index.html`, `style.css`, `app.js`, `questions.json`.
3. In the repo: **Settings → Pages**.
4. Under **Source**, choose **Deploy from a branch**.
5. Branch: **main**, folder: **/ (root)** → **Save**.
6. Wait ~1 minute, then open:
   `https://<your-username>.github.io/<repo-name>/`

## Update the question bank from anywhere

On GitHub, open `questions.json` → pencil icon → edit → **Commit changes**.  
GitHub Pages rebuilds automatically; refresh the quiz page after ~1 minute.

Tip: pressing `.` on the repo page opens **github.dev** (a full editor in the browser),
handy on a phone or tablet.