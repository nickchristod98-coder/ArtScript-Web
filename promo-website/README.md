# ArtScript Web — Promotional Website

A one-page promotional site for **ArtScript Web**, the professional screenplay writing app.

## Contents

- **index.html** — Main landing page (hero, features, screenshots, CTA)
- **styles.css** — Layout and styling (matches app design: light theme, same fonts/colors)
- **script.js** — Smooth scroll for anchor links

## Screenshots

Screenshots are loaded from `../Photos_USE/` (SCR_1.png, SCR_2.png, SCR_3.png). Keep that folder in place when opening or serving the site from the Wormhole repo.

To deploy elsewhere, copy the images into an `images/` folder in this directory and update the `src` attributes in `index.html` to `images/SCR_1.png`, etc.

## Viewing locally

1. **From repo root (recommended):**  
   Serve the whole project (e.g. `npx serve .` from Wormhole root) and open  
   `http://localhost:3000/promo-website/`

2. **From this folder:**  
   Open `index.html` in a browser. Screenshots will load if the path `../Photos_USE/` is valid (i.e. you’re inside the Wormhole repo).

## Customization

- **Colors:** Edit CSS variables in `:root` in `styles.css` (e.g. `--accent`, `--bg`).
- **Copy:** Edit `index.html` for headlines, feature text, and CTA.
- **Download link:** Replace the `#` in the “Download” / “Get the app” links with your real app or store URL.
