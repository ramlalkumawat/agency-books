/**
 * AgencyBooks - Unified Documents Hub
 * Central repository for all business documents (Proposals, Quotations,
 * Invoices, Proforma, Work Orders, Credit/Debit Notes, Agreements).
 */

const DocumentsView = {
  typeFilter: 'all',
  statusFilter: 'all',
  searchQuery: '',

  async render(container) {
    const companyId = window.appState.currentCompanyId;
    const company = window.appState.currentCompany;
    const allDocs = await window.db.getDocumentsByCompany(companyId);
    const clients = await window.db.getClientsByCompany(companyId);

    let filtered = allDocs;
    if (this.typeFilter !== 'all') {
      filtered = filtered.filter(d => d.type.toLowerCase() === this.typeFilter.toLowerCase());
    }
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(d => d.status.toLowerCase() === this.statusFilter.toLowerCase());
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        (d.number || '').toLowerCase().includes(q) ||
        (d.type || '').toLowerCase().includes(q) ||
        (d.projectName || '').toLowerCase().includes(q) ||
        (d.clientName || '').toLowerCase().includes(q) ||
        (d.clientOrg || '').toLowerCase().includes(q)
      );
    }

    const currency = company?.currency || 'INR';

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h2>Documents Repository</h2>
          <p>Central management for proposals, quotes, invoices, agreements, and work orders.</p>
        </div>
        <div class="view-actions-group">
          <div style="position: relative;" class="dropdown-wrapper">
            <button class="btn btn-primary" id="btn-create-doc-menu">
              <i class="fa-solid fa-plus"></i> Create Document <i class="fa-solid fa-chevron-down" style="font-size: 11px;"></i>
            </button>
            <div id="doc-type-dropdown" class="card" style="display: none; position: absolute; right: 0; top: 105%; width: 220px; z-index: 50; box-shadow: var(--shadow-xl); padding: 6px;">
              <a href="javascript:void(0)" class="dropdown-item" data-type="Invoice" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: var(--radius-sm); color: var(--text-main);">
                <i class="fa-solid fa-file-invoice-dollar text-primary"></i> Tax Invoice
              </a>
              <a href="javascript:void(0)" class="dropdown-item" data-type="Quotation" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: var(--radius-sm); color: var(--text-main);">
                <i class="fa-solid fa-file-signature text-info"></i> Quotation
              </a>
              <a href="javascript:void(0)" class="dropdown-item" data-type="Proposal" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: var(--radius-sm); color: var(--text-main);">
                <i class="fa-solid fa-lightbulb text-warning"></i> Proposal
              </a>
              <a href="javascript:void(0)" class="dropdown-item" data-type="Proforma Invoice" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: var(--radius-sm); color: var(--text-main);">
                <i class="fa-solid fa-file-lines text-muted"></i> Proforma Invoice
              </a>
              <a href="javascript:void(0)" class="dropdown-item" data-type="Work Order" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: var(--radius-sm); color: var(--text-main);">
                <i class="fa-solid fa-briefcase text-muted"></i> Work Order
              </a>
              <a href="javascript:void(0)" class="dropdown-item" data-type="Purchase Order" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: var(--radius-sm); color: var(--text-main);">
                <i class="fa-solid fa-cart-shopping text-muted"></i> Purchase Order
              </a>
              <a href="javascript:void(0)" class="dropdown-item" data-type="Credit Note" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: var(--radius-sm); color: var(--text-main);">
                <i class="fa-solid fa-receipt text-danger"></i> Credit Note
              </a>
              <a href="javascript:void(0)" class="dropdown-item" data-type="Debit Note" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: var(--radius-sm); color: var(--text-main);">
                <i class="fa-solid fa-file-invoice text-orange"></i> Debit Note
              </a>
              <a href="javascript:void(0)" class="dropdown-item" data-type="Statement of Account" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: var(--radius-sm); color: var(--text-main);">
                <i class="fa-solid fa-table-list text-primary"></i> Statement of Account
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar">
        <div class="search-input-wrap">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" id="doc-search-input" value="${Utils.escapeHtml(this.searchQuery)}" placeholder="Search all documents by number, client, project, type..." />
        </div>

        <select class="select-filter" id="doc-type-filter">
          <option value="all" ${this.typeFilter === 'all' ? 'selected' : ''}>All Document Types</option>
          <option value="Invoice" ${this.typeFilter === 'Invoice' ? 'selected' : ''}>Invoice</option>
          <option value="Quotation" ${this.typeFilter === 'Quotation' ? 'selected' : ''}>Quotation</option>
          <option value="Proposal" ${this.typeFilter === 'Proposal' ? 'selected' : ''}>Proposal</option>
          <option value="Proforma Invoice" ${this.typeFilter === 'Proforma Invoice' ? 'selected' : ''}>Proforma Invoice</option>
          <option value="Work Order" ${this.typeFilter === 'Work Order' ? 'selected' : ''}>Work Order</option>
          <option value="Purchase Order" ${this.typeFilter === 'Purchase Order' ? 'selected' : ''}>Purchase Order</option>
          <option value="Credit Note" ${this.typeFilter === 'Credit Note' ? 'selected' : ''}>Credit Note</option>
          <option value="Debit Note" ${this.typeFilter === 'Debit Note' ? 'selected' : ''}>Debit Note</option>
          <option value="Statement of Account" ${this.typeFilter === 'Statement of Account' ? 'selected' : ''}>Statement of Account</option>
        </select>

        <select class="select-filter" id="doc-status-filter">
          <option value="all" ${this.statusFilter === 'all' ? 'selected' : ''}>All Statuses</option>
          <option value="Draft" ${this.statusFilter === 'Draft' ? 'selected' : ''}>Draft</option>
          <option value="Sent" ${this.statusFilter === 'Sent' ? 'selected' : ''}>Sent</option>
          <option value="Accepted" ${this.statusFilter === 'Accepted' ? 'selected' : ''}>Accepted</option>
          <option value="Paid" ${this.statusFilter === 'Paid' ? 'selected' : ''}>Paid</option>
          <option value="Partially Paid" ${this.statusFilter === 'Partially Paid' ? 'selected' : ''}>Partially Paid</option>
          <option value="Overdue" ${this.statusFilter === 'Overdue' ? 'selected' : ''}>Overdue</option>
          <option value="Unpaid" ${this.statusFilter === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
        </select>

        <span class="text-muted" style="font-size: 13px;">${filtered.length} document${filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <!-- Unified Documents Table -->
      ${filtered.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fa-solid fa-folder-open"></i></div>
          <div class="empty-state-title">No documents found</div>
          <div class="empty-state-desc">${this.searchQuery || this.typeFilter !== 'all' ? 'No records match the active filters.' : 'Begin issuing documents for this company profile.'}</div>
          <button class="btn btn-primary" onclick="window.app.openDocumentEditorModal('Invoice')">
            <i class="fa-solid fa-plus"></i> Create Document
          </button>
        </div>
      ` : `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Type & Number</th>
                <th>Client / Organization</th>
                <th>Project / Subject</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(d => `
                <tr>
                  <td>
                    <a href="javascript:void(0)" class="btn-preview-doc font-semibold" data-id="${d.id}" style="color: var(--primary);">
                      ${Utils.escapeHtml(d.number)}
                    </a>
                    <div style="font-size: 11px; color: var(--text-muted);">${d.type}</div>
                  </td>
                  <td>
                    <div class="font-semibold">${Utils.escapeHtml(d.clientOrg || d.clientName || '—')}</div>
                    ${d.clientOrg && d.clientName ? `<div style="font-size: 11.5px; color: var(--text-muted);">${Utils.escapeHtml(d.clientName)}</div>` : ''}
                  </td>
                  <td>
                    <div style="font-weight: 500; max-width: 240px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      ${Utils.escapeHtml(d.projectName || d.subject || '—')}
                    </div>
                  </td>
                  <td>${Utils.formatDate(d.date)}</td>
                  <td class="font-semibold" style="font-size: 13.5px;">
                    ${Utils.formatCurrency(d.total, d.currency || currency)}
                  </td>
                  <td>
                    <span class="badge ${Utils.getStatusBadgeClass(d.status)}">${Utils.escapeHtml(d.status)}</span>
                  </td>
                  <td style="text-align: right;">
                    <div style="display: flex; gap: 6px; justify-content: flex-end;">
                      <button class="btn btn-outline btn-sm btn-icon-only btn-preview-doc" data-id="${d.id}" title="Preview & Print">
                        <i class="fa-regular fa-eye"></i>
                      </button>
                      <button class="btn btn-secondary btn-sm btn-icon-only btn-edit-doc" data-id="${d.id}" data-type="${d.type}" title="Edit">
                        <i class="fa-solid fa-pen"></i>
                      </button>
                      <button class="btn btn-outline btn-sm btn-icon-only btn-duplicate-doc" data-id="${d.id}" title="Duplicate">
                        <i class="fa-regular fa-copy"></i>
                      </button>
                      <button class="btn btn-outline btn-sm btn-icon-only text-danger btn-delete-doc" data-id="${d.id}" data-num="${Utils.escapeHtml(d.number)}" title="Delete">
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
    const btnMenu = container.querySelector('#btn-create-doc-menu');
    const dropdown = container.querySelector('#doc-type-dropdown');

    if (btnMenu && dropdown) {
      btnMenu.onclick = (e) => {
        e.stopPropagation();
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
      };

      document.addEventListener('click', () => {
        dropdown.style.display = 'none';
      }, { once: true });
    }

    container.querySelectorAll('.dropdown-item').forEach(item => {
      item.onclick = () => {
        const type = item.dataset.type;
        if (dropdown) dropdown.style.display = 'none';
        window.app.openDocumentEditorModal(type);
      };
    });

    const searchInput = container.querySelector('#doc-search-input');
    if (searchInput) {
      searchInput.oninput = Utils.debounce((e) => {
        this.searchQuery = e.target.value;
        this.render(container);
      }, 250);
    }

    const typeFilter = container.querySelector('#doc-type-filter');
    if (typeFilter) {
      typeFilter.onchange = (e) => {
        this.typeFilter = e.target.value;
        this.render(container);
      };
    }

    const statusFilter = container.querySelector('#doc-status-filter');
    if (statusFilter) {
      statusFilter.onchange = (e) => {
        this.statusFilter = e.target.value;
        this.render(container);
      };
    }

    container.querySelectorAll('.btn-preview-doc').forEach(btn => {
      btn.onclick = () => window.app.openDocumentPreviewModal(btn.dataset.id);
    });

    container.querySelectorAll('.btn-edit-doc').forEach(btn => {
      btn.onclick = () => window.app.openDocumentEditorModal(btn.dataset.type, btn.dataset.id);
    });

    container.querySelectorAll('.btn-duplicate-doc').forEach(btn => {
      btn.onclick = async () => {
        await window.app.duplicateDocument(btn.dataset.id);
        this.render(container);
      };
    });

    container.querySelectorAll('.btn-delete-doc').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const num = btn.dataset.num;

        const confirmed = await Utils.showConfirmDialog({
          title: `Delete Document ${num}?`,
          message: 'Are you sure you want to permanently delete this document?',
          confirmText: 'Delete Document',
          isDanger: true
        });

        if (confirmed) {
          await window.db.deleteDocument(id);
          Utils.showToast(`Document ${num} deleted.`, 'info');
          this.render(container);
        }
      };
    });
  }
};

window.DocumentsView = DocumentsView;
