/**
 * AgencyBooks - Proposal Management View
 * Full lifecycle proposal creation, scope/objectives editor,
 * preview, PDF download, and one-click conversion to Quotation or Invoice.
 */

const ProposalsView = {
  statusFilter: 'all',
  searchQuery: '',

  async render(container) {
    const companyId = window.appState.currentCompanyId;
    const company = window.appState.currentCompany;
    const allDocs = await window.db.getDocumentsByCompany(companyId, 'Proposal');

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
          <h2>Proposals</h2>
          <p>Present services, project scope, pricing, and deliverables to prospective clients.</p>
        </div>
        <div class="view-actions-group">
          <button class="btn btn-primary" id="btn-create-proposal">
            <i class="fa-solid fa-plus"></i> Create Proposal
          </button>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar">
        <div class="search-input-wrap">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" id="prop-search-input" value="${Utils.escapeHtml(this.searchQuery)}" placeholder="Search proposals by number, project, client..." />
        </div>
        
        <select class="select-filter" id="prop-status-filter">
          <option value="all" ${this.statusFilter === 'all' ? 'selected' : ''}>All Statuses</option>
          <option value="Draft" ${this.statusFilter === 'Draft' ? 'selected' : ''}>Draft</option>
          <option value="Sent" ${this.statusFilter === 'Sent' ? 'selected' : ''}>Sent</option>
          <option value="Viewed" ${this.statusFilter === 'Viewed' ? 'selected' : ''}>Viewed</option>
          <option value="Accepted" ${this.statusFilter === 'Accepted' ? 'selected' : ''}>Accepted</option>
          <option value="Rejected" ${this.statusFilter === 'Rejected' ? 'selected' : ''}>Rejected</option>
          <option value="Expired" ${this.statusFilter === 'Expired' ? 'selected' : ''}>Expired</option>
        </select>
        <span class="text-muted" style="font-size: 13px;">${filtered.length} proposal${filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <!-- Proposals List -->
      ${filtered.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fa-solid fa-lightbulb"></i></div>
          <div class="empty-state-title">No proposals found</div>
          <div class="empty-state-desc">${this.searchQuery || this.statusFilter !== 'all' ? 'Try changing your filter options.' : 'Draft your first comprehensive client proposal.'}</div>
          <button class="btn btn-primary" onclick="window.app.openDocumentEditorModal('Proposal')">
            <i class="fa-solid fa-plus"></i> Create First Proposal
          </button>
        </div>
      ` : `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Proposal #</th>
                <th>Client / Organization</th>
                <th>Project Scope</th>
                <th>Valid Until</th>
                <th>Total Value</th>
                <th>Status</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(p => `
                <tr>
                  <td>
                    <a href="javascript:void(0)" class="btn-preview-prop font-semibold" data-id="${p.id}" style="color: var(--primary);">
                      ${Utils.escapeHtml(p.number)}
                    </a>
                    <div style="font-size: 11px; color: var(--text-muted);">${Utils.formatDate(p.date)}</div>
                  </td>
                  <td>
                    <div class="font-semibold">${Utils.escapeHtml(p.clientOrg || p.clientName || '—')}</div>
                    ${p.clientOrg && p.clientName ? `<div style="font-size: 11.5px; color: var(--text-muted);">${Utils.escapeHtml(p.clientName)}</div>` : ''}
                  </td>
                  <td>
                    <div style="font-weight: 500; max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      ${Utils.escapeHtml(p.projectName || 'General Project Scope')}
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted);">${(p.items || []).length} scope item${(p.items || []).length !== 1 ? 's' : ''}</div>
                  </td>
                  <td>
                    <div>${Utils.formatDate(p.validUntil)}</div>
                    ${p.validUntil && new Date(p.validUntil) < new Date() && p.status !== 'Accepted' ? `
                      <span style="font-size: 10px; color: var(--danger); font-weight: 600;">Expired</span>
                    ` : ''}
                  </td>
                  <td class="font-semibold" style="font-size: 14px;">
                    ${Utils.formatCurrency(p.total, p.currency || currency)}
                  </td>
                  <td>
                    <span class="badge ${Utils.getStatusBadgeClass(p.status)}">${Utils.escapeHtml(p.status)}</span>
                  </td>
                  <td style="text-align: right;">
                    <div style="display: flex; gap: 6px; justify-content: flex-end;">
                      <button class="btn btn-outline btn-sm btn-icon-only btn-preview-prop" data-id="${p.id}" title="Preview & Print">
                        <i class="fa-regular fa-eye"></i>
                      </button>
                      
                      <!-- Convert Dropdown/Button -->
                      <button class="btn btn-outline btn-sm btn-convert-quote" data-id="${p.id}" title="Convert to Quotation">
                        <i class="fa-solid fa-file-signature"></i> To Quote
                      </button>

                      <button class="btn btn-secondary btn-sm btn-icon-only btn-edit-prop" data-id="${p.id}" title="Edit">
                        <i class="fa-solid fa-pen"></i>
                      </button>

                      <button class="btn btn-outline btn-sm btn-icon-only btn-duplicate-prop" data-id="${p.id}" title="Duplicate">
                        <i class="fa-regular fa-copy"></i>
                      </button>

                      <button class="btn btn-outline btn-sm btn-icon-only text-danger btn-delete-prop" data-id="${p.id}" data-num="${Utils.escapeHtml(p.number)}" title="Delete">
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
    const btnCreate = container.querySelector('#btn-create-proposal');
    if (btnCreate) btnCreate.onclick = () => window.app.openDocumentEditorModal('Proposal');

    const searchInput = container.querySelector('#prop-search-input');
    if (searchInput) {
      searchInput.oninput = Utils.debounce((e) => {
        this.searchQuery = e.target.value;
        this.render(container);
      }, 250);
    }

    const statusFilter = container.querySelector('#prop-status-filter');
    if (statusFilter) {
      statusFilter.onchange = (e) => {
        this.statusFilter = e.target.value;
        this.render(container);
      };
    }

    container.querySelectorAll('.btn-preview-prop').forEach(btn => {
      btn.onclick = () => window.app.openDocumentPreviewModal(btn.dataset.id);
    });

    container.querySelectorAll('.btn-edit-prop').forEach(btn => {
      btn.onclick = () => window.app.openDocumentEditorModal('Proposal', btn.dataset.id);
    });

    container.querySelectorAll('.btn-duplicate-prop').forEach(btn => {
      btn.onclick = async () => {
        await window.app.duplicateDocument(btn.dataset.id);
        this.render(container);
      };
    });

    container.querySelectorAll('.btn-convert-quote').forEach(btn => {
      btn.onclick = async () => {
        await window.app.convertDocument(btn.dataset.id, 'Quotation');
      };
    });

    container.querySelectorAll('.btn-delete-prop').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const num = btn.dataset.num;

        const confirmed = await Utils.showConfirmDialog({
          title: `Delete Proposal ${num}?`,
          message: 'Are you sure you want to permanently delete this proposal? This cannot be undone.',
          confirmText: 'Delete Proposal',
          isDanger: true
        });

        if (confirmed) {
          await window.db.deleteDocument(id);
          Utils.showToast(`Proposal ${num} deleted.`, 'info');
          this.render(container);
        }
      };
    });
  }
};

window.ProposalsView = ProposalsView;
