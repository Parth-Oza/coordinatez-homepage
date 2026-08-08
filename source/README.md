# COORDINATEZ source

This folder contains the editable storefront application and the database
migration used by the live GitHub Pages build.

Run `npm install` and `npm run dev` from this folder for local development.
The browser-safe database publishable key is intentionally included; access is
restricted by row-level security policies in `supabase/migrations/`.
