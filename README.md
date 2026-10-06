# Daywell

Daywell is a responsive, accessible day planner built with React, TypeScript, and Vite. Add your energy, working hours, priorities and fixed commitments to build a practical schedule. Your schedule is saved in this browser.

## Run locally

```sh
npm install
npm run dev
```

Build and preview the production site:

```sh
npm run build
npm run preview
```

## GitHub Pages deployment

The workflow in `.github/workflows/deploy.yml` builds and deploys the site when changes are pushed to `main` (or when run manually). In the repository, open **Settings → Pages** and select **GitHub Actions** as the build and deployment source. The first deployment will publish the site at `https://<owner>.github.io/<repository>/`.

## Privacy and security boundary

This is a static, browser-only application. Planner data is stored in `localStorage` on the current device and is not sent to a server. It does **not** provide user accounts, secure password storage, server-managed sessions, role-based access control, or a database. Browser-side validation improves usability but is not a security boundary. Do not enter sensitive information. Implementing real authentication and authorization requires a trusted backend or identity provider; GitHub Pages cannot host that backend. GitHub Pages serves sites over HTTPS.

The sign-in screen is a visual preview only. It never sends or stores the password entered there. Use **Continue without an account** to open the planner. Real sign in, account creation and password recovery are unavailable until an authentication service is connected.
