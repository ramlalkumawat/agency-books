/**
 * AgencyBooks - Payment Management View
 * Track collected payments, partial payments against invoices,
 * generate official payment receipts, and print payment vouchers.
 */

const PaymentsView = {
  searchQuery: '',

  async render(container) {
    const companyId = window.appState.currentCompanyId;
    const company = window.appState.currentCompany;
    const payments = await window.db.getPaymentsByCompany(companyId);
    const clients = await window.db.getClientsByCompany(companyId);

    let filtered = payments;
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        (p.receiptNumber || '').toLowerCase().includes(q) ||
        (p.invoiceNumber || '').toLowerCase().includes(q) ||
        (p.reference || '').toLowerCase().includes(q) ||
        (p.method || '').toLowerCase().includes(q)
      );
    }

    const totalCollected = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const currency = company?.currency || 'INR';

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h2>Payment Ledger & Receipts</h2>
          <p>Record full and partial client settlements, link to invoices, and issue official payment vouchers.</p>
        </div>
        <div class="view-actions-group">
          <button class="btn btn-primary" id="btn-record-new-payment">
            <i class="fa-solid fa-plus"></i> Record Payment
          </button>
        </div>
      </div>

      <!-- KPI Summary Row -->
      <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom: 20px;">
        <div class="kpi-card">
          <div>
            <div class="kpi-title">Total Collected</div>
            <div class="kpi-value text-success">${Utils.formatCurrency(totalCollected, currency)}</div>
            <div class="kpi-subtext">Across ${payments.length} transactions</div>
          </div>
          <div class="kpi-icon-box kpi-icon-success"><i class="fa-solid fa-hand-holding-dollar"></i></div>
        </div>

        <div class="kpi-card">
          <div>
            <div class="kpi-title">Bank Transfers</div>
            <div class="kpi-value">${payments.filter(p => p.method === 'Bank Transfer').length}</div>
            <div class="kpi-subtext">Direct Wire / NEFT / IMPS</div>
          </div>
          <div class="kpi-icon-box kpi-icon-primary"><i class="fa-solid fa-building-columns"></i></div>
        </div>

        <div class="kpi-card">
          <div>
            <div class="kpi-title">UPI & Instant</div>
            <div class="kpi-value">${payments.filter(p => p.method === 'UPI').length}</div>
            <div class="kpi-subtext">Real-time settlement</div>
          </div>
          <div class="kpi-icon-box kpi-icon-info"><i class="fa-solid fa-qrcode"></i></div>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar">
        <div class="search-input-wrap">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" id="pay-search-input" value="${Utils.escapeHtml(this.searchQuery)}" placeholder="Search by receipt #, invoice #, transaction ref, method..." />
        </div>
        <span class="text-muted" style="font-size: 13px;">${filtered.length} transaction${filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <!-- Payments Table -->
      ${filtered.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fa-solid fa-receipt"></i></div>
          <div class="empty-state-title">No payment records found</div>
          <div class="empty-state-desc">${this.searchQuery ? 'No transactions matched your search query.' : 'Record a payment received for an invoice to populate this ledger.'}</div>
          <button class="btn btn-primary" onclick="window.app.openRecordPaymentModal()">
            <i class="fa-solid fa-plus"></i> Record First Payment
          </button>
        </div>
      ` : `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Date</th>
                <th>Linked Invoice</th>
                <th>Payment Mode</th>
                <th>Transaction Ref</th>
                <th>Amount Paid</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(p => `
                <tr>
                  <td>
                    <strong style="color: var(--primary);">${Utils.escapeHtml(p.receiptNumber || 'REC')}</strong>
                  </td>
                  <td>${Utils.formatDate(p.date)}</td>
                  <td>
                    <a href="javascript:void(0)" class="btn-goto-inv font-semibold" data-invid="${p.invoiceId}">
                      ${Utils.escapeHtml(p.invoiceNumber || 'Invoice')}
                    </a>
                  </td>
                  <td>
                    <span class="badge badge-neutral">
                      <i class="fa-solid ${p.method === 'UPI' ? 'fa-qrcode' : p.method === 'Bank Transfer' ? 'fa-building-columns' : p.method === 'Cash' ? 'fa-money-bill' : 'fa-credit-card'}"></i>
                      ${Utils.escapeHtml(p.method || 'Other')}
                    </span>
                  </td>
                  <td style="font-family: monospace; font-size: 12px; color: var(--text-muted);">
                    ${Utils.escapeHtml(p.reference || '—')}
                  </td>
                  <td class="font-semibold text-success" style="font-size: 14px;">
                    ${Utils.formatCurrency(p.amount, currency)}
                  </td>
                  <td style="text-align: right;">
                    <div style="display: flex; gap: 6px; justify-content: flex-end;">
                      <button class="btn btn-outline btn-sm btn-receipt-print" data-id="${p.id}" title="Print Payment Receipt">
                        <i class="fa-solid fa-print"></i> Receipt
                      </button>
                      <button class="btn btn-outline btn-sm btn-icon-only text-danger btn-delete-pay" data-id="${p.id}" title="Delete Record">
                        <i class="fa-regular fa-trash-can"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const btnRecord = container.querySelector('#btn-record-new-payment');
    if (btnRecord) btnRecord.onclick = () => window.app.openRecordPaymentModal();

    const searchInput = container.querySelector('#pay-search-input');
    if (searchInput) {
      searchInput.oninput = Utils.debounce((e) => {
        this.searchQuery = e.target.value;
        this.render(container);
      }, 250);
    }

    container.querySelectorAll('.btn-goto-inv').forEach(btn => {
      btn.onclick = () => window.app.openDocumentPreviewModal(btn.dataset.invid);
    });

    container.querySelectorAll('.btn-receipt-print').forEach(btn => {
      btn.onclick = () => this.openReceiptPreview(btn.dataset.id);
    });

    container.querySelectorAll('.btn-delete-pay').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const confirmed = await Utils.showConfirmDialog({
          title: 'Delete Payment Entry?',
          message: 'Deleting this payment will recalculate and increase the unpaid balance of the linked invoice.',
          confirmText: 'Delete Payment',
          isDanger: true
        });

        if (confirmed) {
          await window.db.deletePayment(id);
          Utils.showToast('Payment record removed and invoice balance updated.', 'info');
          this.render(container);
        }
      };
    });
  },

  // Open & Print Official Payment Receipt
  async openReceiptPreview(paymentId) {
    const payment = await window.db.getById('payments', paymentId);
    if (!payment) return;

    const company = await window.db.getCompany(payment.companyId);
    const invoice = await window.db.getDocument(payment.invoiceId);
    const client = invoice?.clientId ? await window.db.getClient(invoice.clientId) : null;
    const currency = invoice?.currency || company?.currency || 'INR';

    // Construct formal receipt document object for PDF Engine
    const receiptDoc = {
      type: 'Payment Receipt',
      number: payment.receiptNumber || `REC-${new Date().getFullYear()}-001`,
      date: payment.date,
      clientName: client?.name || invoice?.clientName || 'Valued Client',
      clientOrg: client?.organization || invoice?.clientOrg,
      projectName: `Payment acknowledgment for Invoice ${payment.invoiceNumber}`,
      items: [
        {
          name: `Payment Received against Invoice #${payment.invoiceNumber}`,
          description: `Settlement via ${payment.method}. Reference: ${payment.reference || 'N/A'}${payment.notes ? ` • Note: ${payment.notes}` : ''}`,
          quantity: 1,
          unit: 'transaction',
          unitPrice: payment.amount,
          taxRate: 0,
          discount: 0,
          total: payment.amount
        }
      ],
      subtotal: payment.amount,
      discount: 0,
      taxableAmount: payment.amount,
      tax: 0,
      total: payment.amount,
      paidAmount: payment.amount,
      balanceDue: 0,
      status: 'Paid',
      paymentTerms: 'Official Receipt of Funds Received',
      terms: 'This document acts as valid proof of financial payment acknowledged by the agency.',
      notes: `Original Invoice Total: ${Utils.formatCurrency(invoice?.total || 0, currency)} | Current Invoice Balance: ${Utils.formatCurrency(invoice?.balanceDue || 0, currency)}`,
      currency
    };

    window.app.openDocumentPreviewModal(null, receiptDoc, company, client);
  }
};

window.PaymentsView = PaymentsView;
