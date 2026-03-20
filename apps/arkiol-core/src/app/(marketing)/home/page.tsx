// src/app/(marketing)/home/page.tsx
// Route handler for /home — renders the LandingPage component.
// The component lives in src/components/marketing/LandingPage.tsx
// so it can be shared with the root page (app/page.tsx) without
// creating an import-from-page dependency.
export { default } from "../../../components/marketing/LandingPage";
