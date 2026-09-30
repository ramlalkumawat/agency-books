/**
 * AgencyBooks - Quotation Management View
 * Manage pricing estimates, quotations, validity terms,
 * PDF generation, and one-click conversion to Invoice.
 */

const QuotationsView = {
  statusFilter: 'all',
  searchQuery: '',

  async render(container) {
    const companyId = window.appState.currentCompanyId;
    const company = window.appState.currentCompany;
    const allDocs = await window.db.getDocumentsByCompany(companyId, 'Quotation');

    let filtered = allDocs;
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(d => d.status.toLowerCase() === this.statusFilter.toLowerCase());
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        (d.number || '').toLowerCase().includes(q) ||
        (d.projectName || '').toLowerCase().includes(q) ||
        (d.clientName || '').toLowerCase().includes(q) ||
        (d.clientOrg || '').toLowerCase().includes(q)
      );
    }

    const currency = company?.currency || 'INR';

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h2>Quotations & Estimates</h2>
          <p>Create accurate commercial estimates, calculate GST, and convert to invoices when approved.</p>
        </div>
        <div class="view-actions-group">
          <button class="btn btn-primary" id="btn-create-quotation">
            <i class="fa-solid fa-plus"></i> Create Quotation
          </button>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar">
        <div class="search-input-wrap">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" id="quo-search-input" value="${Utils.escapeHtml(this.searchQuery)}" placeholder="Search quotations by number, subject, client..." />
        </div>
        
        <select class="select-filter" id="quo-status-filter">
          <option value="all" ${this.statusFilter === 'all' ? 'selected' : ''}>All Statuses</option>
          <option value="Draft" ${this.statusFilter === 'Draft' ? 'selected' : ''}>Draft</option>
          <option value="Sent" ${this.statusFilter === 'Sent' ? 'selected' : ''}>Sent</option>
          <option value="Accepted" ${this.statusFilter === 'Accepted' ? 'selected' : ''}>Accepted</option>
          <option value="Converted" ${this.statusFilter === 'Converted' ? 'selected' : ''}>Converted</option>
          <option value="Rejected" ${this.statusFilter === 'Rejected' ? 'selected' : ''}>Rejected</option>
          <option value="Expired" ${this.statusFilter === 'Expired' ? 'selected' : ''}>Expired</option>
        </select>
        <span class="text-muted" style="font-size: 13px;">${filtered.length} quotation${filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <!-- Quotations List -->
      ${filtered.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fa-solid fa-file-signature"></i></div>
          <div class="empty-state-title">No quotations found</div>
          <div class="empty-state-desc">${this.searchQuery || this.statusFilter !== 'all' ? 'Try changing your filter settings.' : 'Generate your first commercial quotation for a client.'}</div>
          <button class="btn btn-primary" onclick="window.app.openDocumentEditorModal('Quotation')">
            <i class="fa-solid fa-plus"></i> Create First Quotation
          </button>
        </div>
      ` : `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Quotation #</th>
                <th>Client / Organization</th>
                <th>Subject / Project</th>
                <th>Valid Until</th>
                <th>Total (Incl. Tax)</th>
                <th>Status</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(q => `
                <tr>
                  <td>
                    <a href="javascript:void(0)" class="btn-preview-quo font-semibold" data-id="${q.id}" style="color: var(--primary);">
                      ${Utils.escapeHtml(q.number)}
                    </a>
                    <div style="font-size: 11px; color: var(--text-muted);">${Utils.formatDate(q.date)}</div>
                  </td>
                  <td>
                    <div class="font-semibold">${Utils.escapeHtml(q.clientOrg || q.clientName || '—')}</div>
                    ${q.clientOrg && q.clientName ? `<div style="font-size: 11.5px; color: var(--text-muted);">${Utils.escapeHtml(q.clientName)}</div>` : ''}
                  </td>
                  <td>
                    <div style="font-weight: 500; max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      ${Utils.escapeHtml(q.subject || q.projectName || '—')}
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted);">${(q.items || []).length} line item${(q.items || []).length !== 1 ? 's' : ''}</div>
                  </td>
                  <td>
                    <div>${Utils.formatDate(q.validUntil)}</div>
                  </td>
                  <td class="font-semibold" style="font-size: 14px;">
                    ${Utils.formatCurrency(q.total, q.currency || currency)}
                  </td>
                  <td>
                    <span class="badge ${Utils.getStatusBadgeClass(q.status)}">${Utils.escapeHtml(q.status)}</span>
                  </td>
                  <td style="text-align: right;">
                    <div style="display: flex; gap: 6px; justify-content: flex-end;">
                      <button class="btn btn-outline btn-sm btn-icon-only btn-preview-quo" data-id="${q.id}" title="Preview & Print">
                        <i class="fa-regular fa-eye"></i>
                      </button>

                      <button class="btn btn-primary btn-sm btn-convert-invoice" data-id="${q.id}" title="Convert directly to Invoice">
                        <i class="fa-solid fa-file-invoice-dollar"></i> To Invoice
                      </button>

                      <button class="btn btn-secondary btn-sm btn-icon-only btn-edit-quo" data-id="${q.id}" title="Edit">
                        <i class="fa-solid fa-pen"></i>
                      </button>

                      <button class="btn btn-outline btn-sm btn-icon-only btn-duplicate-quo" data-id="${q.id}" title="Duplicate">
                        <i class="fa-regular fa-copy"></i>
                      </button>

                      <button class="btn btn-outline btn-sm btn-icon-only text-danger btn-delete-quo" data-id="${q.id}" data-num="${Utils.escapeHtml(q.number)}" title="Delete">
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
    const btnCreate = container.querySelector('#btn-create-quotation');
    if (btnCreate) btnCreate.onclick = () => window.app.openDocumentEditorModal('Quotation');

    const searchInput = container.querySelector('#quo-search-input');
    if (searchInput) {
      searchInput.oninput = Utils.debounce((e) => {
        this.searchQuery = e.target.value;
        this.render(container);
      }, 250);
    }

    const statusFilter = container.querySelector('#quo-status-filter');
    if (statusFilter) {
      statusFilter.onchange = (e) => {
        this.statusFilter = e.target.value;
        this.render(container);
      };
    }

    container.querySelectorAll('.btn-preview-quo').forEach(btn => {
      btn.onclick = () => window.app.openDocumentPreviewModal(btn.dataset.id);
    });

    container.querySelectorAll('.btn-edit-quo').forEach(btn => {
      btn.onclick = () => window.app.openDocumentEditorModal('Quotation', btn.dataset.id);
    });

    container.querySelectorAll('.btn-duplicate-quo').forEach(btn => {
      btn.onclick = async () => {
        await window.app.duplicateDocument(btn.dataset.id);
        this.render(container);
      };
    });

    container.querySelectorAll('.btn-convert-invoice').forEach(btn => {
      btn.onclick = async () => {
        await window.app.convertDocument(btn.dataset.id, 'Invoice');
      };
    });

    container.querySelectorAll('.btn-delete-quo').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const num = btn.dataset.num;

        const confirmed = await Utils.showConfirmDialog({
          title: `Delete Quotation ${num}?`,
          message: 'Are you sure you want to permanently delete this quotation? This cannot be undone.',
          confirmText: 'Delete Quotation',
          isDanger: true
        });

        if (confirmed) {
          await window.db.deleteDocument(id);
          Utils.showToast(`Quotation ${num} deleted.`, 'info');
          this.render(container);
        }
      };
    });
  }
};

window.QuotationsView = QuotationsView;
