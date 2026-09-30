# AgencyBooks 📚
### Professional Multi-Company Quotation, Invoice & Proposal Management Suite

**AgencyBooks** is a responsive, privacy-focused, multi-company business document and billing application built for agency owners, freelancers, studios, and consultants who manage multiple business entities.

AgencyBooks runs **entirely client-side** using browser **IndexedDB** storage. It requires **no server, no backend, and no account signup**. All your data, client lists, invoices, proposals, receipts, and brand assets stay strictly on your local machine.

---

## 🌟 Key Features

### 🏢 1. Multi-Company Management
- **Unlimited Agency Profiles**: Manage distinct studios, consulting firms, and SaaS entities independently.
- **Dedicated Entity Profiles**:
  - Company Name, Logo (Base64 upload), Address, Email, Phone, Website
  - Indian GSTIN and PAN registration numbers
  - Bank Account Details (Bank Name, Account Number, IFSC, Branch) and UPI ID / VPA
  - Document prefixes (`INV-`, `QUO-`, `PROP-`, `REC-`)
  - Primary Brand Accent Color (dynamically updates entire UI theme to match company brand)
  - Authorized Signature & Corporate Seal upload
  - Default payment terms, legal terms & conditions, and footer notices
- **1-Click Agency Switching**: Seamlessly toggle between agencies. The dashboard, client directories, document lists, and reports update instantly to show only the selected company's records.
- **Consolidated Overview Mode**: Toggle "All Companies" mode to review company-wide financial performance across all your entities.

### 📊 2. Dynamic Financial Dashboard
- **Real-Time KPI Cards**: Total Revenue, Paid Amount, Unpaid Balance, Overdue Invoices.
- **Secondary Metrics**: Active Client counts, Proposals, Quotations, and Invoices.
- **Interactive SVG Monthly Revenue Chart**: Visual comparison of monthly invoiced vs. collected funds.
- **Invoice Health & Collection Progress**: Visual progress bars for Paid, Partially Paid, Unpaid, and Overdue statuses.
- **Overdue Invoices Warning Banner**: Highlights overdue invoices with direct follow-up action.
- **Recent Document Stream**: Quick preview, edit, and PDF export for recent orders.

### 👥 3. Comprehensive Client Management
- **Rich Client Profiles**: Name, Organization, Email, Phone, WhatsApp with direct chat link, Billing Address, City, State, PIN Code, GSTIN, PAN, and internal notes.
- **Client Ledger & Audit Drawer**: View historical proposals, quotations, invoices, total invoiced, total paid, and outstanding balance in one click.
- **Company-Scoped**: Each client belongs to a specific agency, ensuring strict financial separation.

### 💡 4. Proposal Management
- **Full Scope of Work Editor**: Project Objectives, Scope of Work, Deliverables, Timeline, and Services.
- **Dynamic Line Items**: Services, Description, Quantity, Unit, Unit Rate, Discount, Tax Rate %, and Line Totals.
- **Proposal Lifecycle**: Draft → Sent → Viewed → Accepted → Rejected → Expired.
- **One-Click Conversion**: Convert accepted proposals into commercial Quotations or Tax Invoices with line items and pricing automatically copied.

### 📝 5. Quotation Management
- **Detailed Commercial Estimates**: Subject, Description, Itemized Services, Taxes, Discounts, and Validity Date.
- **Statuses**: Draft, Sent, Accepted, Converted, Rejected, Expired.
- **Conversion to Invoice**: Automatically generate a Tax Invoice upon quotation acceptance.

### 💰 6. Invoice & Payment Management
- **GST-Compliant Invoices**: Subtotal, line-item discounts, taxable amount, automated CGST/SGST (intra-state) or IGST (inter-state) calculation, and grand total.
- **Automated Amount in Words**: Indian numbering system (Lakhs and Crores, e.g. *"One Lakh Eighteen Thousand Rupees Only"*).
- **Payment Collection Ledger**: Record full or partial payments against invoices with receipt number, payment date, method (UPI, Bank Transfer, Cheque, Cash, Card), and transaction reference (UTR).
- **Auto Balance Due**: Real-time balance calculations; updates status automatically to *Paid*, *Partially Paid*, or *Overdue*.
- **Automated Payment Receipts**: Generates and prints official payment vouchers for all settlements.
- **1-Click WhatsApp Payment Reminder**: Generates polite, formatted payment reminders with bank/UPI details ready to copy or send directly via WhatsApp.

### 📑 7. Unified Document Hub
- Central repository supporting 14 business document types:
  - *Proposal, Quotation, Tax Invoice, Payment Receipt, Proforma Invoice, Purchase Order, Work Order, Service Agreement, Credit Note, Debit Note, Delivery Note, Statement of Account, Project Completion Certificate, Payment Reminder*.
- Filter by document type, status, and client.

### 🖨️ 8. Pixel-Perfect A4 PDF & Print Engine
- **Dedicated A4 Letterhead Layout**:
  - Company logo and brand color bar
  - GSTIN, PAN, contact info, and bill-to address
  - Crisp table borders and itemized breakdown
  - Bank account and UPI QR payment box
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

### 🛡️ 10. Backup, Restore & Data Safety
- **Full System Backup**: Export all registered companies, clients, invoices, receipts, and settings as a verified JSON file.
- **Single Agency Archive**: Export individual agency records.
- **Integrity Validation**: Schema validation before importing, with options to **Merge** or **Replace**.
- **Browser Storage Advisory**: Built-in diagnostics showing current IndexedDB storage utilization and reminders to export regular backups.

---

## 🛠️ Technology Stack

- **Frontend Core**: HTML5, Vanilla JavaScript (ES6+ Modules & Classes)
- **Styling**: Vanilla CSS3 with CSS Variables, Flexbox, CSS Grid, and Dark/Light mode tokens
- **Local Storage Engine**: IndexedDB (`AgencyBooksDB`) with automated LocalStorage fallback
- **Typography & Icons**: Inter (Google Fonts) & Font Awesome 6.5.1
- **Document Export**: jsPDF 2.5.1, html2canvas 1.4.1, and Native Browser Print Engine
- **Progressive Web App**: W3C Web App Manifest (`manifest.json`) and Service Worker (`sw.js`)

---

## 🚀 How to Run the Application

Because AgencyBooks is built using web standards, **no build step, compilers, or npm install commands are required**.

### Method 1: Using any Local HTTP Server (Recommended)
You can run it with any lightweight local server:

```bash
# Using Python 3
python -m http.server 8080

# Or using Node npx serve / http-server
npx -y serve .
```
Then open your browser at `http://localhost:8080`.

### Method 2: Direct File Open
You can also double-click `index.html` to open it directly in modern browsers (Chrome, Edge, Firefox, Safari). Note that PWA Service Worker caching requires `http://` or `https://` protocol.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + K` or `/` | Open Global Search (documents, clients, projects) |
| `Escape` | Close any active modal dialog or preview sheet |

---

## 🔒 Privacy & Data Storage Architecture

1. **Zero External Tracking**: No telemetry, analytics, or third-party tracking scripts.
2. **100% Offline Capable**: Once loaded, all calculations, document previews, and storage operations function without an active internet connection.
3. **Data Loss Prevention**: IndexedDB stores your data in the browser profile. Always use the **Backup & Restore** module to download a `.json` backup file regularly.

---

*Crafted with precision for modern agencies and independent creators.*
