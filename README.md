# AgencyBooks 📚
### Production-Ready Multi-Company Quotation, Invoice & Proposal Management Suite

**AgencyBooks** is a responsive, privacy-first, multi-company business document and billing application designed for agency owners, consultants, studios, and businesses managing multiple commercial entities.

AgencyBooks runs **entirely client-side** using browser **IndexedDB** storage with automated LocalStorage fallback. It requires **no external server, no backend, and no account signup**. All your data, client lists, invoices, proposals, receipts, and brand assets stay strictly on your local machine.

---

## 🌟 Production Features & Capabilities

### 🏢 1. Multi-Company Management & Data Isolation
- **Completely Clean State**: Zero demo records, zero fake analytics, and zero dummy transactions. First launch opens with a completely empty database ready for your genuine business records.
- **Strict Data Isolation**: Each company operates with its own:
  - Clients directory
  - Proposals, Quotations, and Invoices
  - Payments and Payment Receipts
  - Document numbering sequences (`INV-0001`, `QUO-0001`, etc.)
  - Financial reports and cash-flow analytics
  - Branding, Logos, Bank Details, and UPI IDs
- **Dedicated Entity Profiles**:
  - Company Name, Logo (Base64), Address, Email, Phone, Website
  - Indian GSTIN and PAN registration numbers
  - Bank Account Details (Bank Name, Account Number, IFSC, Branch) and UPI ID / VPA
  - Document prefixes (`INV-`, `QUO-`, `PROP-`, `REC-`, `SOA-`)
  - Primary Brand Accent Color (dynamically adapts entire UI theme to match company brand)
  - Authorized Signature & Corporate Seal upload
  - Default payment terms, legal terms & conditions, and footer notices
- **1-Click Agency Switching**: Seamlessly toggle between agencies. The dashboard, client directories, document lists, and reports update instantly to show only the selected company's records.
- **Consolidated Overview Mode**: Toggle "All Companies" mode to review overall financial performance across all your entities.

### 📊 2. Dynamic Financial Dashboard
- **Clean Empty States**: Clear onboarding guidance ("Add Your First Company") with zero hardcoded statistics.
- **Real-Time KPI Cards**: Total Revenue, Paid Amount, Unpaid Balance, Overdue Invoices computed dynamically from actual entries.
- **Secondary Metrics**: Active Client counts, Proposals, Quotations, and Invoices.
- **Dynamic SVG Monthly Revenue Chart**: Visual comparison of monthly invoiced vs. collected funds.
- **Invoice Health & Collection Progress**: Visual progress bars for Paid, Partially Paid, Unpaid, and Overdue statuses.
- **Overdue Invoices Warning Banner**: Highlights overdue invoices with direct follow-up action.
- **Recent Document Stream**: Quick preview, edit, and PDF export for recent orders.

### 👥 3. Comprehensive Client Management
- **Rich Client Profiles**: Name, Organization, Email, Phone, WhatsApp with direct chat link, Billing Address, City, State, PIN Code, GSTIN, PAN, and internal notes.
- **Client Ledger & Audit Drawer**: View historical proposals, quotations, invoices, total invoiced, total paid, and outstanding balance in one click.
- **Statement of Account Generation**: 1-click generation of itemized Statements of Account listing all billings, receipts, and net balance with printable A4 PDF export.
- **Company-Scoped**: Each client belongs strictly to a specific agency, ensuring complete financial separation.

### 💡 4. Proposal Management
- **Full Scope of Work Editor**: Project Objectives, Scope of Work, Deliverables, Timeline, and Services.
- **Dynamic Line Items**: Services, Description, Quantity, Unit, Unit Rate, Discount, Tax Rate %, and Line Totals.
- **Proposal Lifecycle**: Draft → Sent → Viewed → Accepted → Rejected → Expired.
- **One-Click Conversion**: Convert accepted proposals into commercial Quotations or Tax Invoices with line items and pricing automatically copied.

### 📝 5. Quotation Management
- **Detailed Commercial Estimates**: Subject, Description, Itemized Services, Taxes, Discounts, and Validity Date.
- **Statuses**: Draft, Sent, Accepted, Converted, Rejected, Expired.
- **Conversion to Invoice**: Automatically generate a Tax Invoice upon quotation acceptance.

### 💰 6. Accurate Financial Calculations & Payments
- **No Floating-Point Errors**: Calculations use explicit 2-decimal precision rounding (`Math.round(val * 100) / 100`) across all subtotal, discount, taxable amounts, GST, and balance due calculations.
- **GST-Compliant Invoices**: Subtotal, line-item discounts, taxable amount, automated CGST/SGST (intra-state) or IGST (inter-state) calculation, and grand total.
- **Automated Amount in Words**: Indian numbering system (Lakhs and Crores, e.g. *"One Lakh Eighteen Thousand Rupees Only"*).
- **Payment Collection Ledger**: Record full or partial payments against invoices with receipt number, payment date, method (UPI, Bank Transfer, Cheque, Cash, Card), and transaction reference (UTR).
- **Auto Balance Due**: Real-time balance calculations; updates status automatically to *Paid*, *Partially Paid*, or *Overdue*.
- **Automated Payment Receipts**: Generates and prints official payment vouchers for all settlements.
- **1-Click WhatsApp Payment Reminder**: Generates polite, formatted payment reminders with bank/UPI details ready to copy or send directly via WhatsApp.

### 📑 7. Complete Document Suite (8+ Document Types)
Full creation, editing, preview, and A4 PDF generation for:
1. **Proposal**
2. **Quotation**
3. **Invoice (Tax Invoice)**
4. **Proforma Invoice**
5. **Payment Receipt**
6. **Credit Note**
7. **Debit Note**
8. **Statement of Account**

### 🖨️ 8. Pixel-Perfect A4 PDF & Print Engine
- **Standard A4 Layout**: Explicit 4-sided crisp border with branded header accent bar.
- **Vector Company Letterhead**:
  - Company logo and brand color accents
  - GSTIN, PAN, contact info, and bill-to address
  - Crisp table borders and itemized breakdown
  - Bank account and UPI payment box
  - Terms & conditions, notes, and authorized signatory signature
- **Download PDF**: High-resolution vector/retina PDF generation via `jsPDF` and `html2canvas`.
- **Browser Print**: Dedicated `@media print` stylesheet optimized for standard A4 paper (`210mm x 297mm`) with zero margins clipping.

### 📈 9. Reports & Analytics
- Monthly & Yearly Revenue comparisons.
- Client-wise revenue ranking.
- Multi-company financial comparison table.
- Conversion funnel analysis (Proposals → Quotes → Invoices).
- **CSV Export**: Download reports for accountant filing.
- Direct printable financial reports.

### 🛡️ 10. Backup, Restore & Data Reset
- **Full System Backup**: Export all registered companies, clients, invoices, receipts, and settings as a verified JSON file.
- **Single Agency Archive**: Export individual agency records.
- **Integrity Validation**: Schema validation before importing, with options to **Merge** or **Replace**.
- **Danger Zone / Database Reset**: Safe cleanup mechanism allowing users to purge all local records and return to a clean slate.

---

## 🛠️ Technology Stack

- **Frontend Core**: HTML5, Vanilla JavaScript (ES6+ Modules & Single-Page Architecture)
- **Styling**: Vanilla CSS3 with CSS Variables, Flexbox, CSS Grid, and responsive breakpoints
- **Local Storage Engine**: IndexedDB (`AgencyBooksDB`) with automated LocalStorage fallback
- **Typography & Icons**: Inter (Google Fonts) & Font Awesome 6.5.1
- **Document Export**: jsPDF 2.5.1, html2canvas 1.4.1, and Native Browser Print Engine
- **Progressive Web App**: W3C Web App Manifest (`manifest.json`) and Service Worker (`sw.js`)

---

## 🚀 Deployment Guide

Because AgencyBooks is built using modern standard web technologies, it requires **no build step or server runtime**. It is instantly deployable to any static hosting service.

### 1. Deploying to Vercel
Configuration file [`vercel.json`](file:///c:/Users/ramla/OneDrive/Desktop/agencybooks/vercel.json) is already included.
```bash
# Using Vercel CLI
npx vercel --prod
```
Or import the GitHub repository into your Vercel dashboard. Root directory is `./` and no build command is required.

### 2. Deploying to Netlify
Configuration file [`netlify.toml`](file:///c:/Users/ramla/OneDrive/Desktop/agencybooks/netlify.toml) is already included.
```bash
# Using Netlify CLI
npx netlify deploy --prod --dir=.
```
Or connect your GitHub repository in the Netlify dashboard with publish directory set to `.`.

### 3. Deploying to GitHub Pages
The automated GitHub Actions workflow [`.github/workflows/deploy.yml`](file:///c:/Users/ramla/OneDrive/Desktop/agencybooks/.github/workflows/deploy.yml) deploys automatically on every push to the `main` branch.
To enable:
1. In your GitHub repository, navigate to **Settings** > **Pages**.
2. Under **Build and deployment** > **Source**, choose **GitHub Actions**.

### 4. Running Locally
```bash
# Using Python 3
python -m http.server 3000

# Or using Node
npx -y serve .
```
Then navigate to `http://localhost:3000`.

---

## 🔒 Security & Data Privacy

1. **Client-Side Isolation**: All data is stored in the browser's private IndexedDB storage. No financial records are transmitted to third-party servers.
2. **XSS Protection**: All user inputs (names, descriptions, addresses, notes) are sanitized and escaped with `Utils.escapeHtml()` before rendering into DOM elements or PDF templates.
3. **No Hardcoded Credentials**: No API keys, passwords, or service-role tokens are embedded in the application source code.
4. **Security Headers**: Standard security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`) are pre-configured in `vercel.json` and `netlify.toml`.

---

## ⚠️ Storage Limitations & Best Practices

- **Browser Profile Scope**: IndexedDB storage is bound to your specific browser profile and device. Clearing browser cookies/cache or using Incognito/Private browsing may clear local storage.
- **Regular Backups**: Use the **Backup & Restore** section to download regular JSON backups of your data.

---

*AgencyBooks is engineered for reliability, accuracy, and clean accounting workflows.*
