# GemStay — local redesign

A responsive, English-language redesign focused on property owners, with holiday-home discovery for guests. Built with semantic HTML, CSS and JavaScript, without framework or package dependencies. Photos and fonts are served locally.

The visual direction incorporates the client's references, The Ocean Holiday Homes and Monty Holiday Home: a panoramic photo hero, teal and gold accents, distinct owner and guest actions, and more prominent service and property cards. GemStay branding, photos, content and calculator remain independent of the reference companies.

The layout uses Manrope with larger text and controls designed for 100% browser zoom. Desktop section navigation is a compact list of labels and square markers fixed to the right viewport edge, with no enclosing panel. It overlays the page without reserving space or shifting the centered content. The links follow the sections' document order, appear once the header scrolls out of view, and highlight the current section. Labels switch to light text over the dark full-width sections. Below 1180px, the existing bottom action bar and native navigation dialog replace that list. All navigation destinations are derived from the header in `app.js`.

Phones use a nearly full-screen photo hero and a compact calculator: location has its own row, with property type and bedrooms side by side. The form retains 16px input text and 50px touch controls. Service cards and onboarding steps stay in a single column, with safe-area spacing and a scrollable menu sheet. The page respects reduced-motion preferences.

## Run locally

Requires Node.js 18 or newer. No installation needed.

```powershell
npm run dev
```

Open http://localhost:3001. To use another port: `$env:PORT=3002; npm run dev`.

`npm test` checks the calculator. `npm run build` copies the static website into `dist/` for deployment to a static host.

## What works

- Responsive navigation, anchor links and native FAQ disclosures.
- Revenue calculator for six Dubai neighbourhoods, apartments and villas, studio through five bedrooms; compatible bedroom choices for villas.
- A full revenue planner in a native dialog, with identical Property, Income, Costs and Results sections on desktop and mobile. On phones it fills the screen, keeps the current income visible at the bottom, and opens directly from the mobile income action.
- Editable nightly rate, occupancy (number and slider), owner stays, average booking length, management/platform percentages, utilities, maintenance, owner-paid cleaning, other annual costs and optional property value.
- Yearly/monthly gross revenue, itemised operating costs, income after entered costs, annual operating yield and break-even occupancy. Losses and zero occupancy are supported, without hiding negative results.
- Cautious/base/upside scenarios, one saved scenario for comparison within the current page session, CSV download and complete formula disclosure. Changing panels, closing the planner and reopening it preserves edits. Reset restores examples for the selected property; changing property loads its sample rate and occupancy while retaining expense inputs.
- Consultation dialog with required-field validation. Generates an email draft in the visitor's email app; the visitor must send it. No submission is stored or represented as sent.
- Real GemStay email, phone, WhatsApp and property listing links.

## Before production

The calculator uses **illustrative assumptions**, not GemStay historical figures or live market data. Example estimates are retained for this preview as requested. Rates and cost presets in `revenue.js` must be validated or replaced before presenting results as market estimates or actual GemStay fees. Income subtracts the entered operating costs from booking revenue, excluding financing, acquisition costs and taxes. Monthly figures are annual averages, with no seasonality model. Scenario comparisons change the nightly rate by ±10% and occupancy by ±10 percentage points, clamped to the input limits; they are planning scenarios, not confidence intervals. Management and platform percentages each apply to gross booking revenue, and fixed expenses apply for all 12 months.

For automatic lead collection, integrate the contact form with an approved backend or CRM, including required consent and privacy treatment. This local version deliberately opens an email draft instead of claiming to send a request.

## Content and assets

Source: https://gemstay.ae/, https://gemstay.ae/landlords/, https://gemstay.ae/about-us/. Services and public contact details were reviewed on 4 October 2026. Copy is adapted for clarity; no testimonials or performance statistics are invented.

The existing GemStay wordmark and photos come from the company's public website and its linked property image host, for this requested redesign. Listings: 324346, 324347, 324349. `hero.webp` is a Jumeirah/Burj Al Arab coast photograph from the GemStay website. Confirm image rights for public reuse.

Active font: locally served variable Manrope from Google Fonts, under the SIL Open Font License; see `assets/OFL-Manrope.txt`. The earlier DM Sans and Instrument Serif assets remain in the source folder but are no longer requested by the page.
