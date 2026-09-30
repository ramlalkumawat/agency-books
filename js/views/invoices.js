/**
 * AgencyBooks - Invoice Management View
 * Full lifecycle invoice tracking, payment recording, balance calculations,
 * overdue alerts, payment reminder generator, and PDF invoicing.
 */

const InvoicesView = {
  statusFilter: 'all',
  searchQuery: '',

  async render(container, params = null) {
    if (params && params.filterStatus) {
      this.statusFilter = params.filterStatus;
    }

    const companyId = window.appState.currentCompanyId;
    const company = window.appState.currentCompany;
    const allDocs = await window.db.getDocumentsByCompany(companyId, 'Invoice');

    // Auto update status if overdue
    const now = new Date();
    for (const inv of allDocs) {
      if (inv.status !== 'Paid' && inv.status !== 'Cancelled' && inv.dueDate) {
        const dueDate = new Date(inv.dueDate);
        if (dueDate < now && inv.status !== 'Overdue') {
          inv.status = 'Overdue';
          await window.db.put('documents', inv);
        }
      }
    }

    let filtered = allDocs;
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(d => d.status.toLowerCase() === this.statusFilter.toLowerCase());
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        (d.number || '').toLowerCase().includes(q) ||
        (d.projectName || '').toLowerCase().includes(q) ||
        (d.referenceNumber || '').toLowerCase().includes(q) ||
        (d.clientName || '').toLowerCase().includes(q) ||
        (d.clientOrg || '').toLowerCase().includes(q)
      );
    }

    const currency = company?.currency || 'INR';

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h2>Tax Invoices</h2>
          <p>Issue GST-compliant invoices, track partial payments, collect dues, and generate payment receipts.</p>
        </div>
        <div class="view-actions-group">
          <button class="btn btn-primary" id="btn-create-invoice">
            <i class="fa-solid fa-plus"></i> Create Invoice
          </button>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar">
        <div class="search-input-wrap">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" id="inv-search-input" value="${Utils.escapeHtml(this.searchQuery)}" placeholder="Search invoices by number, client, project, PO ref..." />
        </div>
        
        <select class="select-filter" id="inv-status-filter">
          <option value="all" ${this.statusFilter === 'all' ? 'selected' : ''}>All Statuses</option>
          <option value="Unpaid" ${this.statusFilter === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
          <option value="Partially Paid" ${this.statusFilter === 'Partially Paid' ? 'selected' : ''}>Partially Paid</option>
          <option value="Paid" ${this.statusFilter === 'Paid' ? 'selected' : ''}>Paid</option>
          <option value="Overdue" ${this.statusFilter === 'Overdue' ? 'selected' : ''}>Overdue</option>
          <option value="Draft" ${this.statusFilter === 'Draft' ? 'selected' : ''}>Draft</option>
          <option value="Cancelled" ${this.statusFilter === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
        <span class="text-muted" style="font-size: 13px;">${filtered.length} invoice${filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <!-- Invoices List -->
      ${filtered.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fa-solid fa-file-invoice-dollar"></i></div>
          <div class="empty-state-title">No invoices found</div>
          <div class="empty-state-desc">${this.searchQuery || this.statusFilter !== 'all' ? 'Try changing your filter settings.' : 'Generate your first billable invoice to start getting paid.'}</div>
          <button class="btn btn-primary" onclick="window.app.openDocumentEditorModal('Invoice')">
            <i class="fa-solid fa-plus"></i> Create First Invoice
          </button>
        </div>
      ` : `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client / Organization</th>
                <th>Due Date</th>
                <th>Total Amount</th>
                <th>Paid</th>
                <th>Balance Due</th>
                <th>Status</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(inv => {
                const isOverdue = inv.status === 'Overdue' || (inv.dueDate && new Date(inv.dueDate) < now && inv.status !== 'Paid');
                return `
                  <tr>
                    <td>
                      <a href="javascript:void(0)" class="btn-preview-inv font-semibold" data-id="${inv.id}" style="color: var(--primary);">
                        ${Utils.escapeHtml(inv.number)}
                      </a>
                      <div style="font-size: 11px; color: var(--text-muted);">${Utils.formatDate(inv.date)}</div>
                    </td>
                    <td>
                      <div class="font-semibold">${Utils.escapeHtml(inv.clientOrg || inv.clientName || '—')}</div>
                      ${inv.projectName ? `<div style="font-size: 11.5px; color: var(--text-muted);">${Utils.escapeHtml(inv.projectName)}</div>` : ''}
                    </td>
                    <td>
                      <div style="${isOverdue ? 'color: var(--danger); font-weight: 600;' : ''}">${Utils.formatDate(inv.dueDate)}</div>
                      ${isOverdue ? `<span style="font-size: 10px; color: var(--danger); font-weight: 700;">Overdue</span>` : ''}
                    </td>
                    <td class="font-semibold" style="font-size: 13.5px;">
                      ${Utils.formatCurrency(inv.total, inv.currency || currency)}
                    </td>
                    <td style="color: var(--success); font-weight: 600;">
                      ${Utils.formatCurrency(inv.paidAmount || 0, inv.currency || currency)}
                    </td>
                    <td style="font-weight: 700; color: ${(inv.balanceDue || 0) > 0 ? 'var(--danger)' : 'var(--text-muted)'};">
                      ${Utils.formatCurrency(inv.balanceDue !== undefined ? inv.balanceDue : inv.total, inv.currency || currency)}
                    </td>
                    <td>
                      <span class="badge ${Utils.getStatusBadgeClass(inv.status)}">${Utils.escapeHtml(inv.status)}</span>
                    </td>
                    <td style="text-align: right;">
                      <div style="display: flex; gap: 6px; justify-content: flex-end;">
                        <!-- Record Payment button if balance due -->
                        ${(inv.balanceDue || 0) > 0.01 && inv.status !== 'Cancelled' ? `
                          <button class="btn btn-success btn-sm btn-record-pay" data-id="${inv.id}" title="Record Payment">
                            <i class="fa-solid fa-receipt"></i> Pay
                          </button>
                        ` : ''}

                        <button class="btn btn-outline btn-sm btn-icon-only btn-preview-inv" data-id="${inv.id}" title="Preview & Print">
                          <i class="fa-regular fa-eye"></i>
                        </button>

                        <!-- Payment Reminder Button -->
                        ${(inv.balanceDue || 0) > 0.01 ? `
                          <button class="btn btn-outline btn-sm btn-icon-only btn-reminder-inv" data-id="${inv.id}" title="Send Payment Reminder (WhatsApp / Copy)">
                            <i class="fa-regular fa-bell"></i>
                          </button>
                        ` : ''}

                        <button class="btn btn-secondary btn-sm btn-icon-only btn-edit-inv" data-id="${inv.id}" title="Edit">
                          <i class="fa-solid fa-pen"></i>
                        </button>

                        <button class="btn btn-outline btn-sm btn-icon-only btn-duplicate-inv" data-id="${inv.id}" title="Duplicate">
                          <i class="fa-regular fa-copy"></i>
                        </button>

                        <button class="btn btn-outline btn-sm btn-icon-only text-danger btn-delete-inv" data-id="${inv.id}" data-num="${Utils.escapeHtml(inv.number)}" title="Delete">
                          <i class="fa-regular fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const btnCreate = container.querySelector('#btn-create-invoice');
    if (btnCreate) btnCreate.onclick = () => window.app.openDocumentEditorModal('Invoice');

    const searchInput = container.querySelector('#inv-search-input');
    if (searchInput) {
      searchInput.oninput = Utils.debounce((e) => {
        this.searchQuery = e.target.value;
        this.render(container);
      }, 250);
    }

    const statusFilter = container.querySelector('#inv-status-filter');
    if (statusFilter) {
      statusFilter.onchange = (e) => {
        this.statusFilter = e.target.value;
        this.render(container);
      };
    }

    container.querySelectorAll('.btn-preview-inv').forEach(btn => {
      btn.onclick = () => window.app.openDocumentPreviewModal(btn.dataset.id);
    });

    container.querySelectorAll('.btn-record-pay').forEach(btn => {
      btn.onclick = () => window.app.openRecordPaymentModal(btn.dataset.id);
    });

    container.querySelectorAll('.btn-reminder-inv').forEach(btn => {
      btn.onclick = () => this.openReminderModal(btn.dataset.id);
    });

    container.querySelectorAll('.btn-edit-inv').forEach(btn => {
      btn.onclick = () => window.app.openDocumentEditorModal('Invoice', btn.dataset.id);
    });

    container.querySelectorAll('.btn-duplicate-inv').forEach(btn => {
      btn.onclick = async () => {
        await window.app.duplicateDocument(btn.dataset.id);
        this.render(container);
      };
    });

    container.querySelectorAll('.btn-delete-inv').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const num = btn.dataset.num;

        const confirmed = await Utils.showConfirmDialog({
          title: `Delete Invoice ${num}?`,
          message: 'Are you sure you want to permanently delete this invoice and its recorded payment history? This cannot be undone.',
          confirmText: 'Delete Invoice',
          isDanger: true
        });

        if (confirmed) {
          await window.db.deleteDocument(id);
          Utils.showToast(`Invoice ${num} deleted.`, 'info');
          this.render(container);
        }
      };
    });
  },

  // Open Payment Reminder Generator Dialog
  async openReminderModal(invoiceId) {
    const inv = await window.db.getDocument(invoiceId);
    if (!inv) return;

    const company = await window.db.getCompany(inv.companyId);
    const client = await window.db.getClient(inv.clientId);
    const currency = inv.currency || company?.currency || 'INR';

    const clientContact = client?.name || inv.clientName || 'Valued Client';
    const balanceText = Utils.formatCurrency(inv.balanceDue, currency);
    const dueDateText = Utils.formatDate(inv.dueDate);

    // Formatted polite reminder message
    const reminderText = `Dear ${clientContact},\n\nHope you are having a wonderful week!\n\nThis is a friendly reminder regarding Invoice *${inv.number}* for *${inv.projectName || 'professional services'}*.\n\n• Invoice Date: ${Utils.formatDate(inv.date)}\n• Due Date: ${dueDateText}\n• Outstanding Balance: *${balanceText}*\n\nKindly arrange the payment to the following details at your earliest convenience:\nBank: ${company?.bankDetails?.bankName || ''}\nA/C No: ${company?.bankDetails?.accountNumber || ''}\nIFSC: ${company?.bankDetails?.ifscCode || ''}\n${company?.upiId ? `UPI ID: ${company.upiId}\n` : ''}\nThank you for your partnership!\n\nWarm regards,\n${company?.name || 'Accounts Team'}`;

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop animate-fade-in';
    modal.innerHTML = `
      <div class="modal-container animate-scale-up" style="max-width: 540px;">
        <div class="modal-header">
          <h3 class="modal-title"><i class="fa-regular fa-bell text-warning"></i> Send Payment Reminder</h3>
          <button class="modal-close-btn" id="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">
            A professional payment reminder for Invoice <strong>${Utils.escapeHtml(inv.number)}</strong> has been prepared. You can copy the message or send it directly via WhatsApp.
          </p>
          <textarea class="form-textarea" id="reminder-text-area" rows="12" style="font-family: inherit; font-size: 13px; line-height: 1.5;">${Utils.escapeHtml(reminderText)}</textarea>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" id="btn-copy-reminder"><i class="fa-regular fa-copy"></i> Copy Message</button>
          ${client?.phone || client?.whatsapp ? `
            <a href="https://wa.me/${(client.whatsapp || client.phone).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(reminderText)}" target="_blank" class="btn btn-success" id="btn-whatsapp-reminder">
              <i class="fa-brands fa-whatsapp"></i> Send on WhatsApp
            </a>
          ` : ''}
          <button class="btn btn-secondary" id="modal-done">Done</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => modal.remove();
    modal.querySelector('#modal-close').onclick = closeModal;
    modal.querySelector('#modal-done').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    modal.querySelector('#btn-copy-reminder').onclick = () => {
      const text = modal.querySelector('#reminder-text-area').value;
      navigator.clipboard.writeText(text);
      Utils.showToast('Reminder copied to clipboard!', 'success');
    };
  }
};

window.InvoicesView = InvoicesView;
