/**
 * AgencyBooks - PDF & Print Generation Engine
 * Generates beautiful, pixel-perfect A4 documents with letterhead,
 * company branding, tax breakdowns, bank details, and signature.
 * Supports direct Browser Print as well as jsPDF + html2canvas download.
 */

const PDFEngine = {
  // Render full A4 HTML template for any document
  generateDocumentHTML(doc, company, client) {
    if (!doc || !company) return '<div class="p-4">Document or Company data not found</div>';

    const brandColor = company.brandColor || '#2563eb';
    const currency = doc.currency || company.currency || 'INR';

    // Format items table rows
    const itemsRows = (doc.items || []).map((item, idx) => {
      const lineTotal = (parseFloat(item.quantity) || 1) * (parseFloat(item.unitPrice) || 0) - (parseFloat(item.discount) || 0);
      return `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td>
            <div class="item-title">${Utils.escapeHtml(item.name || '')}</div>
            ${item.description ? `<div class="item-desc">${Utils.escapeHtml(item.description)}</div>` : ''}
          </td>
          <td class="text-center">${item.quantity || 1} ${item.unit || ''}</td>
          <td class="text-right">${Utils.formatCurrency(item.unitPrice, currency)}</td>
          ${item.discount > 0 ? `<td class="text-right text-muted">-${Utils.formatCurrency(item.discount, currency)}</td>` : ''}
          <td class="text-center">${item.taxRate || 0}%</td>
          <td class="text-right font-semibold">${Utils.formatCurrency(lineTotal, currency)}</td>
        </tr>
      `;
    }).join('');

    const hasItemDiscount = (doc.items || []).some(i => (i.discount || 0) > 0);

    // Calculate tax breakdown (e.g. CGST + SGST if intra-state or IGST)
    const isInterState = client?.state && company?.address && !company.address.toLowerCase().includes(client.state.toLowerCase());
    const taxAmount = parseFloat(doc.tax) || 0;

    let taxBreakdownHTML = '';
    if (taxAmount > 0) {
      if (currency === 'INR') {
        if (isInterState) {
          taxBreakdownHTML = `
            <div class="summary-row">
              <span>Integrated GST (IGST):</span>
              <span>${Utils.formatCurrency(taxAmount, currency)}</span>
            </div>
          `;
        } else {
          const halfTax = taxAmount / 2;
          taxBreakdownHTML = `
            <div class="summary-row">
              <span>Central GST (CGST):</span>
              <span>${Utils.formatCurrency(halfTax, currency)}</span>
            </div>
            <div class="summary-row">
              <span>State GST (SGST):</span>
              <span>${Utils.formatCurrency(halfTax, currency)}</span>
            </div>
          `;
        }
      } else {
        taxBreakdownHTML = `
          <div class="summary-row">
            <span>Tax / VAT:</span>
            <span>${Utils.formatCurrency(taxAmount, currency)}</span>
          </div>
        `;
      }
    }

    // Amount in words
    const amountInWords = currency === 'INR' ? Utils.numberToWordsINR(doc.total) : '';

    return `
      <div class="a4-document-sheet" id="printable-doc-root" style="--doc-brand: ${brandColor};">
        <!-- Top Header & Letterhead -->
        <header class="doc-header">
          <div class="doc-company-brand">
            ${company.logo ? `<img src="${company.logo}" class="doc-company-logo" alt="${Utils.escapeHtml(company.name)}" />` : `
              <div class="doc-company-placeholder-logo" style="background: ${brandColor};">
                ${Utils.escapeHtml((company.name || 'AB').substring(0, 2).toUpperCase())}
              </div>
            `}
            <div class="doc-company-info">
              <h1 class="doc-company-name">${Utils.escapeHtml(company.name)}</h1>
              <p class="doc-company-address">${Utils.escapeHtml(company.address || '')}</p>
              <div class="doc-company-contacts">
                ${company.email ? `<span><i class="fa-solid fa-envelope"></i> ${Utils.escapeHtml(company.email)}</span>` : ''}
                ${company.phone ? `<span><i class="fa-solid fa-phone"></i> ${Utils.escapeHtml(company.phone)}</span>` : ''}
                ${company.website ? `<span><i class="fa-solid fa-globe"></i> ${Utils.escapeHtml(company.website)}</span>` : ''}
              </div>
              <div class="doc-company-tax-ids">
                ${company.gstin ? `<span><strong>GSTIN:</strong> ${Utils.escapeHtml(company.gstin)}</span>` : ''}
                ${company.pan ? `<span><strong>PAN:</strong> ${Utils.escapeHtml(company.pan)}</span>` : ''}
              </div>
            </div>
          </div>

          <div class="doc-badge-section">
            <div class="doc-type-badge">${Utils.escapeHtml(doc.type).toUpperCase()}</div>
            <div class="doc-meta-table">
              <div class="doc-meta-row">
                <span class="meta-label">${doc.type} No:</span>
                <span class="meta-val highlight">${Utils.escapeHtml(doc.number)}</span>
              </div>
              <div class="doc-meta-row">
                <span class="meta-label">Date:</span>
                <span class="meta-val">${Utils.formatDate(doc.date)}</span>
              </div>
              ${doc.dueDate ? `
                <div class="doc-meta-row">
                  <span class="meta-label">Due Date:</span>
                  <span class="meta-val">${Utils.formatDate(doc.dueDate)}</span>
                </div>
              ` : ''}
              ${doc.validUntil ? `
                <div class="doc-meta-row">
                  <span class="meta-label">Valid Until:</span>
                  <span class="meta-val">${Utils.formatDate(doc.validUntil)}</span>
                </div>
              ` : ''}
              ${doc.referenceNumber ? `
                <div class="doc-meta-row">
                  <span class="meta-label">Ref / PO #:</span>
                  <span class="meta-val">${Utils.escapeHtml(doc.referenceNumber)}</span>
                </div>
              ` : ''}
              <div class="doc-meta-row">
                <span class="meta-label">Status:</span>
                <span class="meta-val status-tag ${Utils.getStatusBadgeClass(doc.status)}">${Utils.escapeHtml(doc.status)}</span>
              </div>
            </div>
          </div>
        </header>

        <div class="doc-divider"></div>

        <!-- Bill To / Client Details Section -->
        <section class="doc-client-section">
          <div class="doc-bill-to">
            <h3 class="section-title">BILL TO:</h3>
            <h4 class="client-name">${Utils.escapeHtml(doc.clientOrg || doc.clientName || 'Valued Client')}</h4>
            ${doc.clientOrg && doc.clientName ? `<p class="client-contact-person">Attn: ${Utils.escapeHtml(doc.clientName)}</p>` : ''}
            <p class="client-address">${Utils.escapeHtml(client?.billingAddress || '')}</p>
            <div class="client-contact-details">
              ${client?.email ? `<span><i class="fa-solid fa-envelope"></i> ${Utils.escapeHtml(client.email)}</span>` : ''}
              ${client?.phone ? `<span><i class="fa-solid fa-phone"></i> ${Utils.escapeHtml(client.phone)}</span>` : ''}
            </div>
            ${client?.gstin ? `<p class="client-tax-id"><strong>GSTIN:</strong> ${Utils.escapeHtml(client.gstin)}</p>` : ''}
            ${client?.pan ? `<p class="client-tax-id"><strong>PAN:</strong> ${Utils.escapeHtml(client.pan)}</p>` : ''}
          </div>

          ${doc.projectName ? `
            <div class="doc-project-box">
              <h3 class="section-title">PROJECT / SUBJECT:</h3>
              <p class="project-title">${Utils.escapeHtml(doc.projectName)}</p>
              ${doc.subject ? `<p class="project-desc">${Utils.escapeHtml(doc.subject)}</p>` : ''}
              ${doc.projectDescription ? `<p class="project-desc">${Utils.escapeHtml(doc.projectDescription)}</p>` : ''}
            </div>
          ` : ''}
        </section>

        <!-- Proposals extra details (Objectives, Scope, Timeline, Deliverables) -->
        ${doc.type === 'Proposal' && (doc.projectObjectives || doc.scopeOfWork || doc.timeline || doc.deliverables) ? `
          <div class="proposal-extra-details">
            ${doc.projectObjectives ? `
              <div class="proposal-block">
                <h4><i class="fa-solid fa-bullseye"></i> Project Objectives</h4>
                <p>${Utils.escapeHtml(doc.projectObjectives).replace(/\n/g, '<br/>')}</p>
              </div>
            ` : ''}
            ${doc.scopeOfWork ? `
              <div class="proposal-block">
                <h4><i class="fa-solid fa-layer-group"></i> Scope of Work</h4>
                <p>${Utils.escapeHtml(doc.scopeOfWork).replace(/\n/g, '<br/>')}</p>
              </div>
            ` : ''}
            ${doc.timeline ? `
              <div class="proposal-block">
                <h4><i class="fa-regular fa-clock"></i> Project Timeline</h4>
                <p>${Utils.escapeHtml(doc.timeline).replace(/\n/g, '<br/>')}</p>
              </div>
            ` : ''}
            ${doc.deliverables ? `
              <div class="proposal-block">
                <h4><i class="fa-solid fa-box-archive"></i> Key Deliverables</h4>
                <p>${Utils.escapeHtml(doc.deliverables).replace(/\n/g, '<br/>')}</p>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Line Items Table -->
        <table class="doc-items-table">
          <thead>
            <tr>
              <th style="width: 5%;" class="text-center">#</th>
              <th style="width: 45%;">Service / Item Description</th>
              <th style="width: 12%;" class="text-center">Qty</th>
              <th style="width: 13%;" class="text-right">Rate</th>
              ${hasItemDiscount ? '<th style="width: 10%;" class="text-right">Disc</th>' : ''}
              <th style="width: 10%;" class="text-center">Tax %</th>
              <th style="width: 15%;" class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <!-- Totals & Payment Summary Section -->
        <div class="doc-totals-section">
          <div class="doc-words-and-banking">
            ${amountInWords ? `
              <div class="amount-words-box">
                <span class="label">Amount in Words:</span>
                <span class="words">${amountInWords}</span>
              </div>
            ` : ''}

            <!-- Bank / UPI Details -->
            ${company.bankDetails || company.upiId ? `
              <div class="bank-details-box">
                <div class="bank-box-header"><i class="fa-solid fa-building-columns"></i> Bank & Payment Details</div>
                <div class="bank-grid">
                  ${company.bankDetails?.bankName ? `<div><strong>Bank:</strong> ${Utils.escapeHtml(company.bankDetails.bankName)}</div>` : ''}
                  ${company.bankDetails?.accountNumber ? `<div><strong>A/C No:</strong> ${Utils.escapeHtml(company.bankDetails.accountNumber)}</div>` : ''}
                  ${company.bankDetails?.ifscCode ? `<div><strong>IFSC:</strong> ${Utils.escapeHtml(company.bankDetails.ifscCode)}</div>` : ''}
                  ${company.bankDetails?.branch ? `<div><strong>Branch:</strong> ${Utils.escapeHtml(company.bankDetails.branch)}</div>` : ''}
                  ${company.upiId ? `<div class="upi-row"><strong>UPI ID:</strong> <span>${Utils.escapeHtml(company.upiId)}</span></div>` : ''}
                </div>
              </div>
            ` : ''}
          </div>

          <div class="doc-totals-box">
            <div class="summary-row">
              <span>Subtotal:</span>
              <span class="font-semibold">${Utils.formatCurrency(doc.subtotal, currency)}</span>
            </div>
            ${doc.discount > 0 ? `
              <div class="summary-row text-success">
                <span>Discount:</span>
                <span>-${Utils.formatCurrency(doc.discount, currency)}</span>
              </div>
            ` : ''}
            ${doc.taxableAmount && doc.taxableAmount !== doc.subtotal ? `
              <div class="summary-row text-muted">
                <span>Taxable Amount:</span>
                <span>${Utils.formatCurrency(doc.taxableAmount, currency)}</span>
              </div>
            ` : ''}
            ${taxBreakdownHTML}
            <div class="doc-grand-total-row">
              <span>Grand Total:</span>
              <span class="total-amount">${Utils.formatCurrency(doc.total, currency)}</span>
            </div>

            ${doc.paidAmount > 0 ? `
              <div class="summary-row text-success font-semibold pt-1">
                <span>Amount Paid:</span>
                <span>${Utils.formatCurrency(doc.paidAmount, currency)}</span>
              </div>
              <div class="summary-row text-danger font-semibold highlight-balance">
                <span>Balance Due:</span>
                <span>${Utils.formatCurrency(doc.balanceDue, currency)}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Terms and Conditions & Signature Box -->
        <div class="doc-bottom-section">
          <div class="doc-terms-box">
            ${doc.paymentTerms ? `
              <div class="mb-2">
                <h5>Payment Terms</h5>
                <p>${Utils.escapeHtml(doc.paymentTerms)}</p>
              </div>
            ` : ''}
            ${doc.terms ? `
              <div>
                <h5>Terms & Conditions</h5>
                <p>${Utils.escapeHtml(doc.terms).replace(/\n/g, '<br/>')}</p>
              </div>
            ` : ''}
            ${doc.notes ? `
              <div class="mt-2 doc-notes">
                <h5>Notes:</h5>
                <p>${Utils.escapeHtml(doc.notes)}</p>
              </div>
            ` : ''}
          </div>

          <div class="doc-signature-box">
            <p class="sign-for">For <strong>${Utils.escapeHtml(company.name)}</strong></p>
            <div class="sign-area">
              ${company.signature ? `
                <img src="${company.signature}" class="company-sign-img" alt="Authorized Signature" />
              ` : `
                <div class="signature-line"></div>
              `}
            </div>
            <p class="sign-title">Authorized Signatory</p>
          </div>
        </div>

        <!-- Document Footer -->
        <footer class="doc-footer">
          <p>${Utils.escapeHtml(company.footerText || `Thank you for your business! Generated via AgencyBooks.`)}</p>
        </footer>
      </div>
    `;
  },

  // Open direct print dialog
  printDocument(doc, company, client) {
    const html = this.generateDocumentHTML(doc, company, client);
    
    // Create print iframe
    let printFrame = document.getElementById('print-iframe');
    if (!printFrame) {
      printFrame = document.createElement('iframe');
      printFrame.id = 'print-iframe';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);
    }

    const docFrame = printFrame.contentWindow.document;
    docFrame.open();
    docFrame.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${doc.type} - ${doc.number}</title>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
          <link rel="stylesheet" href="css/document-preview.css">
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              margin: 0;
              padding: 0;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          </style>
        </head>
        <body>
          ${html}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `);
    docFrame.close();
  },

  // Download PDF file using jsPDF and html2canvas
  async downloadPDF(doc, company, client) {
    Utils.showToast('Preparing PDF download...', 'info');

    // Create a temporary off-screen container with full A4 pixel dimensions
    const container = document.createElement('div');
    container.id = 'pdf-render-temp-container';
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.left = '0';
    container.style.width = '800px';
    container.style.background = '#ffffff';
    container.innerHTML = this.generateDocumentHTML(doc, company, client);
    document.body.appendChild(container);

    try {
      // Check if html2canvas and jspdf are loaded
      if (typeof html2canvas === 'undefined' || (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined')) {
        // Fallback to print
        Utils.showToast('PDF generator library loading, opening browser print...', 'warning');
        this.printDocument(doc, company, client);
        container.remove();
        return;
      }

      const target = container.querySelector('#printable-doc-root') || container;

      const canvas = await html2canvas(target, {
        scale: 2, // 2x for retina crisp text & borders
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const { jsPDF } = window.jspdf || window;
      const pdf = new jsPDF('p', 'mm', 'a4');

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, '', 'FAST');
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, '', 'FAST');
        heightLeft -= pageHeight;
      }

      const cleanFileName = `${company.name.replace(/[^a-zA-Z0-9]/g, '_')}_${doc.type}_${doc.number}.pdf`;
      pdf.save(cleanFileName);
      Utils.showToast('PDF downloaded successfully!', 'success');
    } catch (err) {
      console.error('Error generating PDF:', err);
      Utils.showToast('PDF generation encountered an issue, launching browser print.', 'warning');
      this.printDocument(doc, company, client);
    } finally {
      container.remove();
    }
  }
};

window.PDFEngine = PDFEngine;
