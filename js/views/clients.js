/**
 * AgencyBooks - Clients View & Management
 * Client directory, ledger tracking, address management,
 * outstanding balance summary, and document history drawer.
 */

const ClientsView = {
  searchQuery: '',

  async render(container) {
    const companyId = window.appState.currentCompanyId;
    const company = window.appState.currentCompany;
    const clients = await window.db.getClientsByCompany(companyId);
    const docs = await window.db.getDocumentsByCompany(companyId);

    // Calculate financials for each client
    const enrichedClients = clients.map(c => {
      const clientDocs = docs.filter(d => d.clientId === c.id);
      const invoices = clientDocs.filter(d => d.type === 'Invoice');
      const totalInvoiced = invoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
      const totalPaid = invoices.reduce((sum, inv) => sum + (parseFloat(inv.paidAmount) || 0), 0);
      const outstandingBalance = invoices.reduce((sum, inv) => sum + (parseFloat(inv.balanceDue) || 0), 0);

      return {
        ...c,
        totalInvoiced,
        totalPaid,
        outstandingBalance,
        docsCount: clientDocs.length
      };
    });

    // Filter by search query
    let filtered = enrichedClients;
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        (c.name || '').toLowerCase().includes(q) ||
        (c.organization || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q)
      );
    }

    const currency = company?.currency || 'INR';

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h2>Client Directory</h2>
          <p>Manage customer contacts, billing addresses, tax registrations, and ledger balances.</p>
        </div>
        <div class="view-actions-group">
          <button class="btn btn-primary" id="btn-add-client">
            <i class="fa-solid fa-user-plus"></i> Add New Client
          </button>
        </div>
      </div>

      <!-- Filter / Search Bar -->
      <div class="filter-bar">
        <div class="search-input-wrap">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" id="client-search-input" value="${Utils.escapeHtml(this.searchQuery)}" placeholder="Search clients by name, company, email, phone, city..." />
        </div>
        <span class="text-muted" style="font-size: 13px;">${filtered.length} client${filtered.length !== 1 ? 's' : ''} found</span>
      </div>

      <!-- Clients Table / Cards -->
      ${filtered.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fa-solid fa-users"></i></div>
          <div class="empty-state-title">No clients found</div>
          <div class="empty-state-desc">${this.searchQuery ? 'Try adjusting your search criteria.' : 'Add your first client to start creating proposals and invoices.'}</div>
          <button class="btn btn-primary" onclick="ClientsView.openClientModal()">
            <i class="fa-solid fa-user-plus"></i> Add First Client
          </button>
        </div>
      ` : `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Client / Organization</th>
                <th>Contact Details</th>
                <th>Location / GST</th>
                <th>Invoiced</th>
                <th>Outstanding</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(c => `
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px;">
                        ${Utils.escapeHtml((c.organization || c.name || 'C').substring(0, 1).toUpperCase())}
                      </div>
                      <div>
                        <a href="javascript:void(0)" class="client-detail-link font-semibold" data-id="${c.id}" style="color: var(--text-main); font-size: 13.5px;">
                          ${Utils.escapeHtml(c.organization || c.name)}
                        </a>
                        ${c.organization && c.name ? `<div style="font-size: 11.5px; color: var(--text-muted);">${Utils.escapeHtml(c.name)}</div>` : ''}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style="font-size: 12.5px;">${Utils.escapeHtml(c.email || '—')}</div>
                    <div style="font-size: 11.5px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                      ${c.phone ? `<span><i class="fa-solid fa-phone"></i> ${Utils.escapeHtml(c.phone)}</span>` : ''}
                      ${c.whatsapp ? `<a href="https://wa.me/${c.whatsapp.replace(/[^0-9]/g, '')}" target="_blank" style="color: #25D366;" title="Chat on WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>` : ''}
                    </div>
                  </td>
                  <td>
                    <div style="font-size: 12.5px;">${Utils.escapeHtml([c.city, c.state].filter(Boolean).join(', ') || '—')}</div>
                    ${c.gstin ? `<div style="font-size: 11px; color: var(--text-muted);">GST: ${Utils.escapeHtml(c.gstin)}</div>` : ''}
                  </td>
                  <td>
                    <div class="font-semibold">${Utils.formatCurrency(c.totalInvoiced, currency)}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">${c.docsCount} documents</div>
                  </td>
                  <td>
                    ${c.outstandingBalance > 0 ? `
                      <span class="badge badge-danger">${Utils.formatCurrency(c.outstandingBalance, currency)}</span>
                    ` : `
                      <span class="badge badge-success">Clear</span>
                    `}
                  </td>
                  <td style="text-align: right;">
                    <div style="display: flex; gap: 6px; justify-content: flex-end;">
                      <button class="btn btn-outline btn-sm btn-icon-only btn-view-client" data-id="${c.id}" title="Client History & Documents">
                        <i class="fa-solid fa-folder-open"></i>
                      </button>
                      <button class="btn btn-secondary btn-sm btn-icon-only btn-edit-client" data-id="${c.id}" title="Edit Profile">
                        <i class="fa-solid fa-pen"></i>
                      </button>
                      <button class="btn btn-outline btn-sm btn-icon-only text-danger btn-delete-client" data-id="${c.id}" data-name="${Utils.escapeHtml(c.name)}" title="Delete Client">
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
    const btnAdd = container.querySelector('#btn-add-client');
    if (btnAdd) btnAdd.onclick = () => this.openClientModal();

    const searchInput = container.querySelector('#client-search-input');
    if (searchInput) {
      searchInput.oninput = Utils.debounce((e) => {
        this.searchQuery = e.target.value;
        this.render(container);
      }, 250);
    }

    container.querySelectorAll('.btn-view-client, .client-detail-link').forEach(btn => {
      btn.onclick = () => this.openClientDetailModal(btn.dataset.id);
    });

    container.querySelectorAll('.btn-edit-client').forEach(btn => {
      btn.onclick = async () => {
        const client = await window.db.getClient(btn.dataset.id);
        if (client) this.openClientModal(client);
      };
    });

    container.querySelectorAll('.btn-delete-client').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const name = btn.dataset.name;

        const confirmed = await Utils.showConfirmDialog({
          title: `Delete Client "${name}"?`,
          message: 'Are you sure you want to delete this client? Documents linked to this client will retain their historical records.',
          confirmText: 'Delete Client',
          isDanger: true
        });

        if (confirmed) {
          await window.db.deleteClient(id);
          Utils.showToast(`Client "${name}" removed.`, 'info');
          ClientsView.render(document.getElementById('view-container'));
        }
      };
    });
  },

  // Client Create/Edit Modal
  openClientModal(client = null, onSavedCallback = null) {
    if (!window.appState.currentCompanyId) {
      Utils.showToast('Please add a company first before creating clients.', 'warning');
      window.app.navigateTo('companies');
      return;
    }
    const isEdit = !!client;
    const c = client || {
      companyId: window.appState.currentCompanyId,
      name: '',
      organization: '',
      email: '',
      phone: '',
      whatsapp: '',
      billingAddress: '',
      shippingAddress: '',
      gstin: '',
      pan: '',
      state: '',
      city: '',
      pinCode: '',
      notes: ''
    };

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop animate-fade-in';
    modal.innerHTML = `
      <div class="modal-container modal-lg animate-scale-up">
        <div class="modal-header">
          <h3 class="modal-title">
            <i class="fa-solid ${isEdit ? 'fa-user-pen' : 'fa-user-plus'} text-primary"></i>
            ${isEdit ? 'Edit Client Profile' : 'Add New Client'}
          </h3>
          <button class="modal-close-btn" id="modal-close">&times;</button>
        </div>

        <form id="client-form" class="modal-body">
          <div class="form-grid">
            <div class="col-6 form-group">
              <label class="form-label">Client / Contact Person Name <span class="required">*</span></label>
              <input type="text" class="form-input" id="cli-name" required value="${Utils.escapeHtml(c.name)}" placeholder="e.g. Rahul Sharma" />
            </div>

            <div class="col-6 form-group">
              <label class="form-label">Company / Organization Name</label>
              <input type="text" class="form-input" id="cli-org" value="${Utils.escapeHtml(c.organization || '')}" placeholder="e.g. Nexus Retail Ventures Pvt Ltd" />
            </div>

            <div class="col-4 form-group">
              <label class="form-label">Email Address</label>
              <input type="email" class="form-input" id="cli-email" value="${Utils.escapeHtml(c.email || '')}" placeholder="client@company.com" />
            </div>

            <div class="col-4 form-group">
              <label class="form-label">Phone Number</label>
              <input type="text" class="form-input" id="cli-phone" value="${Utils.escapeHtml(c.phone || '')}" placeholder="+91 98765 43210" />
            </div>

            <div class="col-4 form-group">
              <label class="form-label">WhatsApp Number</label>
              <input type="text" class="form-input" id="cli-whatsapp" value="${Utils.escapeHtml(c.whatsapp || '')}" placeholder="+91 98765 43210" />
            </div>

            <!-- Tax IDs -->
            <div class="col-6 form-group">
              <label class="form-label">GSTIN</label>
              <input type="text" class="form-input" id="cli-gstin" value="${Utils.escapeHtml(c.gstin || '')}" placeholder="29ABCDE1234F1Z5" />
            </div>

            <div class="col-6 form-group">
              <label class="form-label">PAN</label>
              <input type="text" class="form-input" id="cli-pan" value="${Utils.escapeHtml(c.pan || '')}" placeholder="ABCDE1234F" />
            </div>

            <!-- Address -->
            <div class="col-12 form-group">
              <label class="form-label">Billing Address (Included on Invoices & Quotations)</label>
              <textarea class="form-textarea" id="cli-billing" rows="2" placeholder="Building, Street, Landmark">${Utils.escapeHtml(c.billingAddress || '')}</textarea>
            </div>

            <div class="col-4 form-group">
              <label class="form-label">City</label>
              <input type="text" class="form-input" id="cli-city" value="${Utils.escapeHtml(c.city || '')}" placeholder="e.g. Bengaluru" />
            </div>

            <div class="col-4 form-group">
              <label class="form-label">State</label>
              <input type="text" class="form-input" id="cli-state" value="${Utils.escapeHtml(c.state || '')}" placeholder="e.g. Karnataka" />
            </div>

            <div class="col-4 form-group">
              <label class="form-label">PIN / Postal Code</label>
              <input type="text" class="form-input" id="cli-pincode" value="${Utils.escapeHtml(c.pinCode || '')}" placeholder="560038" />
            </div>

            <div class="col-12 form-group">
              <label class="form-label">Internal Client Notes</label>
              <textarea class="form-textarea" id="cli-notes" rows="2" placeholder="Private internal notes regarding this client...">${Utils.escapeHtml(c.notes || '')}</textarea>
            </div>
          </div>
        </form>

        <div class="modal-footer">
          <button type="button" class="btn btn-outline" id="modal-cancel">Cancel</button>
          <button type="submit" form="client-form" class="btn btn-primary">
            <i class="fa-solid fa-check"></i> ${isEdit ? 'Save Changes' : 'Create Client'}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => modal.remove();
    modal.querySelector('#modal-close').onclick = closeModal;
    modal.querySelector('#modal-cancel').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    const form = modal.querySelector('#client-form');
    form.onsubmit = async (e) => {
      e.preventDefault();

      const name = modal.querySelector('#cli-name').value.trim();
      if (!name) {
        Utils.showToast('Client name is required', 'error');
        return;
      }

      const updated = {
        ...c,
        companyId: c.companyId || window.appState.currentCompanyId,
        name,
        organization: modal.querySelector('#cli-org').value.trim(),
        email: modal.querySelector('#cli-email').value.trim(),
        phone: modal.querySelector('#cli-phone').value.trim(),
        whatsapp: modal.querySelector('#cli-whatsapp').value.trim(),
        billingAddress: modal.querySelector('#cli-billing').value.trim(),
        city: modal.querySelector('#cli-city').value.trim(),
        state: modal.querySelector('#cli-state').value.trim(),
        pinCode: modal.querySelector('#cli-pincode').value.trim(),
        gstin: modal.querySelector('#cli-gstin').value.trim(),
        pan: modal.querySelector('#cli-pan').value.trim(),
        notes: modal.querySelector('#cli-notes').value.trim()
      };

      const saved = await window.db.saveClient(updated);
      closeModal();
      Utils.showToast(`Client "${saved.name}" saved!`, 'success');

      if (onSavedCallback) {
        onSavedCallback(saved);
      } else if (window.appState.currentView === 'clients') {
        ClientsView.render(document.getElementById('view-container'));
      }
    };
  },

  // Open Client Detail Drawer / History Modal
  async openClientDetailModal(clientId) {
    const client = await window.db.getClient(clientId);
    if (!client) return;

    const companyId = client.companyId || window.appState.currentCompanyId;
    const company = await window.db.getCompany(companyId);
    const docs = await window.db.getDocumentsByCompany(companyId);
    const clientDocs = docs.filter(d => d.clientId === clientId);
    const invoices = clientDocs.filter(d => d.type === 'Invoice');

    const totalInvoiced = invoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + (parseFloat(inv.paidAmount) || 0), 0);
    const balanceDue = invoices.reduce((sum, inv) => sum + (parseFloat(inv.balanceDue) || 0), 0);
    const currency = company?.currency || 'INR';

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop animate-fade-in';
    modal.innerHTML = `
      <div class="modal-container modal-xl animate-scale-up">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px;">
              ${Utils.escapeHtml((client.organization || client.name).substring(0, 1).toUpperCase())}
            </div>
            <div>
              <h3 class="modal-title" style="margin: 0;">${Utils.escapeHtml(client.organization || client.name)}</h3>
              <p style="font-size: 12px; color: var(--text-muted); margin: 0;">${Utils.escapeHtml(client.name)} • ${Utils.escapeHtml(client.email || 'No email')}</p>
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-outline btn-sm" id="btn-edit-from-drawer"><i class="fa-solid fa-pen"></i> Edit Profile</button>
            <button class="modal-close-btn" id="modal-close">&times;</button>
          </div>
        </div>

        <div class="modal-body">
          <!-- Summary Cards Row -->
          <div class="kpi-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 20px;">
            <div class="kpi-card">
              <div>
                <div class="kpi-title">Total Invoiced</div>
                <div class="kpi-value text-primary">${Utils.formatCurrency(totalInvoiced, currency)}</div>
                <div class="kpi-subtext">${invoices.length} Invoices Issued</div>
              </div>
              <div class="kpi-icon-box kpi-icon-primary"><i class="fa-solid fa-file-invoice-dollar"></i></div>
            </div>

            <div class="kpi-card">
              <div>
                <div class="kpi-title">Total Paid</div>
                <div class="kpi-value text-success">${Utils.formatCurrency(totalPaid, currency)}</div>
                <div class="kpi-subtext">Received with thanks</div>
              </div>
              <div class="kpi-icon-box kpi-icon-success"><i class="fa-solid fa-circle-check"></i></div>
            </div>

            <div class="kpi-card">
              <div>
                <div class="kpi-title">Outstanding Balance</div>
                <div class="kpi-value ${balanceDue > 0 ? 'text-danger' : 'text-success'}">${Utils.formatCurrency(balanceDue, currency)}</div>
                <div class="kpi-subtext">${balanceDue > 0 ? 'Pending Collection' : 'Zero balance'}</div>
              </div>
              <div class="kpi-icon-box ${balanceDue > 0 ? 'kpi-icon-danger' : 'kpi-icon-success'}"><i class="fa-solid fa-scale-balanced"></i></div>
            </div>
          </div>

          <!-- Quick Action Buttons for this client -->
          <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
            <button class="btn btn-primary btn-sm" id="btn-client-new-inv"><i class="fa-solid fa-plus"></i> New Invoice</button>
            <button class="btn btn-secondary btn-sm" id="btn-client-new-quote"><i class="fa-solid fa-file-signature"></i> New Quotation</button>
            <button class="btn btn-secondary btn-sm" id="btn-client-new-prop"><i class="fa-solid fa-lightbulb"></i> New Proposal</button>
            <button class="btn btn-outline btn-sm" id="btn-client-soa"><i class="fa-solid fa-table-list"></i> Statement of Account</button>
          </div>

          <!-- Document History Table -->
          <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 12px; color: var(--text-main);">
            Document History (${clientDocs.length})
          </h4>

          ${clientDocs.length === 0 ? `
            <div class="empty-state" style="padding: 24px;">
              <p class="text-muted" style="margin: 0;">No documents created for this client yet.</p>
            </div>
          ` : `
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Type & Number</th>
                    <th>Project Name</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th style="text-align: right;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${clientDocs.map(d => `
                    <tr>
                      <td>
                        <strong>${Utils.escapeHtml(d.number)}</strong>
                        <div style="font-size: 11px; color: var(--text-muted);">${d.type}</div>
                      </td>
                      <td>${Utils.escapeHtml(d.projectName || '—')}</td>
                      <td>${Utils.formatDate(d.date)}</td>
                      <td class="font-semibold">${Utils.formatCurrency(d.total, d.currency || currency)}</td>
                      <td><span class="badge ${Utils.getStatusBadgeClass(d.status)}">${Utils.escapeHtml(d.status)}</span></td>
                      <td style="text-align: right;">
                        <button class="btn btn-outline btn-sm" onclick="window.app.openDocumentPreviewModal('${d.id}')">
                          <i class="fa-regular fa-eye"></i> View
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => modal.remove();
    modal.querySelector('#modal-close').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    modal.querySelector('#btn-edit-from-drawer').onclick = () => {
      closeModal();
      ClientsView.openClientModal(client);
    };

    modal.querySelector('#btn-client-new-inv').onclick = () => {
      closeModal();
      window.app.openDocumentEditorModal('Invoice', null, { clientId: client.id });
    };

    modal.querySelector('#btn-client-new-quote').onclick = () => {
      closeModal();
      window.app.openDocumentEditorModal('Quotation', null, { clientId: client.id });
    };

    modal.querySelector('#btn-client-new-prop').onclick = () => {
      closeModal();
      window.app.openDocumentEditorModal('Proposal', null, { clientId: client.id });
    };

    const btnSoa = modal.querySelector('#btn-client-soa');
    if (btnSoa) {
      btnSoa.onclick = async () => {
        if (invoices.length === 0) {
          Utils.showToast('No invoices found for this client to generate a Statement of Account.', 'info');
          return;
        }
        closeModal();

        const nextNumber = await window.db.getNextDocumentNumber(companyId, 'Statement of Account');
        const items = invoices.map(inv => ({
          name: `${inv.number} - ${inv.projectName || 'Services'}`,
          description: `Date: ${Utils.formatDate(inv.date)} | Invoice Total: ${Utils.formatCurrency(inv.total, currency)} | Paid: ${Utils.formatCurrency(inv.paidAmount, currency)} | Balance Due: ${Utils.formatCurrency(inv.balanceDue, currency)} (Status: ${inv.status})`,
          quantity: 1,
          unit: 'inv',
          unitPrice: Math.round((parseFloat(inv.total) || 0) * 100) / 100,
          discount: 0,
          taxRate: 0,
          amount: Math.round((parseFloat(inv.total) || 0) * 100) / 100
        }));

        const roundedTotal = Math.round(totalInvoiced * 100) / 100;
        const roundedPaid = Math.round(totalPaid * 100) / 100;
        const roundedBalance = Math.round(balanceDue * 100) / 100;

        const soaDoc = {
          id: 'soa_' + Utils.generateUUID(),
          companyId: companyId,
          clientId: client.id,
          clientName: client.name,
          clientOrg: client.organization,
          type: 'Statement of Account',
          number: nextNumber,
          date: new Date().toISOString().split('T')[0],
          projectName: 'Statement of Account - ' + (client.organization || client.name),
          subject: `Statement of all invoices, payments, and outstanding balances as of ${Utils.formatDate(new Date().toISOString().split('T')[0])}`,
          items: items,
          subtotal: roundedTotal,
          discount: 0,
          taxableAmount: roundedTotal,
          tax: 0,
          total: roundedTotal,
          paidAmount: roundedPaid,
          balanceDue: roundedBalance,
          status: roundedBalance > 0 ? (roundedPaid > 0 ? 'Partially Paid' : 'Sent') : 'Paid',
          currency: currency,
          notes: `Statement of Account generated as of ${Utils.formatDate(new Date().toISOString().split('T')[0])}. Total Billed: ${Utils.formatCurrency(roundedTotal, currency)}, Total Received: ${Utils.formatCurrency(roundedPaid, currency)}, Net Outstanding Balance: ${Utils.formatCurrency(roundedBalance, currency)}.`,
          terms: 'Please verify all listed billing records against your accounts ledger. For payment reconciliations or disputes, contact our finance desk.'
        };

        window.app.openDocumentPreviewModal(null, soaDoc, company, client);
      };
    }
  }
};

window.ClientsView = ClientsView;
