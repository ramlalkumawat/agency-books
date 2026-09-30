/**
 * AgencyBooks - Main Application Controller & Global Modals
 * Unified document editor, payment recorder, A4 preview modal,
 * global search overlay, and reactive view routing.
 */

class App {
  constructor() {
    this.currentDocEditor = null;
  }

  async init() {
    // 1. Initialize Database
    await window.db.init();

    // 2. Initialize State
    await window.appState.init();

    // 3. Setup Layout Elements & Listeners
    this.setupLayout();
    this.setupGlobalKeyboardShortcuts();

    // 4. Render Initial View
    const savedRoute = window.location.hash.replace('#', '') || 'dashboard';
    this.navigateTo(savedRoute);

    // Register Service Worker for PWA if supported
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => {
          console.log('ServiceWorker registration note:', err.message);
        });
      });
    }
  }

  setupLayout() {
    // Topbar Company Picker Dropdown
    this.updateCompanyPickerUI();
    window.appState.on('companyChanged', () => {
      this.updateCompanyPickerUI();
      this.updateNotificationBadge();
    });
    window.appState.on('companiesChanged', () => {
      this.updateCompanyPickerUI();
    });

    // Mobile Sidebar Drawer
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('app-sidebar');
    if (mobileMenuBtn && sidebar) {
      mobileMenuBtn.onclick = () => sidebar.classList.toggle('mobile-open');
      document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('mobile-open') && !sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
          sidebar.classList.remove('mobile-open');
        }
      });
    }

    // Sidebar navigation clicks
    document.querySelectorAll('.nav-item').forEach(item => {
      item.onclick = () => {
        const view = item.dataset.view;
        if (view) {
          this.navigateTo(view);
          if (sidebar) sidebar.classList.remove('mobile-open');
        }
      };
    });

    // Global Search Triggers
    const searchTrigger = document.getElementById('global-search-trigger');
    if (searchTrigger) {
      searchTrigger.onclick = () => this.openGlobalSearchModal();
    }

    // Top "+ New" Button Dropdown
    const btnNew = document.getElementById('btn-top-new');
    const newDropdown = document.getElementById('top-new-dropdown');
    if (btnNew && newDropdown) {
      btnNew.onclick = (e) => {
        e.stopPropagation();
        newDropdown.style.display = newDropdown.style.display === 'none' ? 'block' : 'none';
      };
      document.addEventListener('click', () => {
        newDropdown.style.display = 'none';
      });
    }

    // Top Quick Create Items
    document.querySelectorAll('.top-create-item').forEach(item => {
      item.onclick = () => {
        const type = item.dataset.type;
        if (newDropdown) newDropdown.style.display = 'none';
        if (type === 'Client') {
          ClientsView.openClientModal();
        } else if (type === 'Payment') {
          this.openRecordPaymentModal();
        } else {
          this.openDocumentEditorModal(type);
        }
      };
    });

    // Notifications / Reminders Dropdown
    const btnNotif = document.getElementById('btn-notifications');
    const notifDropdown = document.getElementById('notifications-dropdown');
    if (btnNotif && notifDropdown) {
      btnNotif.onclick = async (e) => {
        e.stopPropagation();
        await this.renderNotificationsDropdown(notifDropdown);
        notifDropdown.style.display = notifDropdown.style.display === 'none' ? 'block' : 'none';
      };
      document.addEventListener('click', () => {
        notifDropdown.style.display = 'none';
      });
    }

    this.updateNotificationBadge();
  }

  async updateNotificationBadge() {
    const badge = document.getElementById('notification-badge');
    if (!badge) return;

    const companyId = window.appState.currentCompanyId;
    const docs = await window.db.getDocumentsByCompany(companyId, 'Invoice');
    const now = new Date();
    const overdueCount = docs.filter(i => {
      return (i.status === 'Overdue') || (i.status !== 'Paid' && i.status !== 'Cancelled' && i.dueDate && new Date(i.dueDate) < now);
    }).length;

    if (overdueCount > 0) {
      badge.textContent = overdueCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  async renderNotificationsDropdown(dropdown) {
    const companyId = window.appState.currentCompanyId;
    const docs = await window.db.getDocumentsByCompany(companyId, 'Invoice');
    const now = new Date();
    const overdue = docs.filter(i => i.status === 'Overdue' || (i.status !== 'Paid' && i.status !== 'Cancelled' && i.dueDate && new Date(i.dueDate) < now));

    dropdown.innerHTML = `
      <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
        <strong style="font-size: 13.5px;">Pending Alerts & Dues</strong>
        <span class="badge ${overdue.length > 0 ? 'badge-danger' : 'badge-success'}">${overdue.length} Action${overdue.length !== 1 ? 's' : ''}</span>
      </div>
      <div style="max-height: 280px; overflow-y: auto; padding: 6px;">
        ${overdue.length === 0 ? `
          <div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px;">
            <i class="fa-solid fa-circle-check text-success" style="font-size: 20px; margin-bottom: 6px; display: block;"></i>
            No overdue payments! All accounts in good standing.
          </div>
        ` : overdue.map(inv => `
          <div style="padding: 10px 12px; border-radius: var(--radius-sm); border-bottom: 1px solid var(--border-light); cursor: pointer;" onclick="window.app.openDocumentPreviewModal('${inv.id}')">
            <div style="display: flex; justify-content: space-between; font-size: 12.5px; font-weight: 600;">
              <span>${Utils.escapeHtml(inv.number)}</span>
              <span class="text-danger">${Utils.formatCurrency(inv.balanceDue, inv.currency)}</span>
            </div>
            <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
              ${Utils.escapeHtml(inv.clientOrg || inv.clientName || 'Client')} • Due ${Utils.formatDate(inv.dueDate)}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  updateCompanyPickerUI() {
    const currentCompany = window.appState.currentCompany;
    const companies = window.appState.companies;

    // Sidebar active company card
    const sideCard = document.getElementById('sidebar-company-card');
    if (sideCard && currentCompany) {
      sideCard.innerHTML = `
        <div class="sidebar-company-avatar" style="background: ${currentCompany.brandColor || 'var(--primary)'};">
          ${currentCompany.logo ? `<img src="${currentCompany.logo}" />` : Utils.escapeHtml((currentCompany.name || 'AB').substring(0, 2).toUpperCase())}
        </div>
        <div class="sidebar-company-meta">
          <div class="company-meta-name">${Utils.escapeHtml(currentCompany.name)}</div>
          <div class="company-meta-tag"><i class="fa-solid fa-arrows-rotate"></i> Click to switch</div>
        </div>
      `;
      sideCard.onclick = () => this.openCompanySwitcherModal();
    }

    // Topbar company picker
    const topPicker = document.getElementById('topbar-company-picker');
    if (topPicker && currentCompany) {
      topPicker.innerHTML = `
        <span class="picker-logo-dot" style="background: ${currentCompany.brandColor || 'var(--primary)'};"></span>
        <span class="picker-text">${Utils.escapeHtml(currentCompany.name)}</span>
        <i class="fa-solid fa-chevron-down" style="font-size: 10px; color: var(--text-muted); margin-left: auto;"></i>
      `;
      topPicker.onclick = () => this.openCompanySwitcherModal();
    }
  }

  openCompanySwitcherModal() {
    const companies = window.appState.companies;
    const currentId = window.appState.currentCompanyId;

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop animate-fade-in';
    modal.innerHTML = `
      <div class="modal-container animate-scale-up" style="max-width: 460px;">
        <div class="modal-header">
          <h3 class="modal-title"><i class="fa-solid fa-building text-primary"></i> Select Active Agency</h3>
          <button class="modal-close-btn" id="modal-close">&times;</button>
        </div>
        <div class="modal-body" style="padding: 12px;">
          <!-- All Companies Consolidated option -->
          <div class="search-result-item ${currentId === 'all' ? 'active-company-item' : ''}" id="switch-to-all" style="padding: 12px; margin-bottom: 8px; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
            <div class="search-item-icon" style="background: #4f46e5; color: #fff;"><i class="fa-solid fa-cubes"></i></div>
            <div class="search-item-info">
              <div class="search-item-title">All Companies (Consolidated Mode)</div>
              <div class="search-item-subtitle">View aggregated financial metrics across all entities</div>
            </div>
            ${currentId === 'all' ? '<i class="fa-solid fa-check text-primary"></i>' : ''}
          </div>

          <div style="font-size: 11px; font-weight: 700; color: var(--text-light); text-transform: uppercase; padding: 6px 10px;">
            Individual Agency Profiles (${companies.length})
          </div>

          ${companies.map(c => `
            <div class="search-result-item switch-comp-option ${c.id === currentId ? 'active-company-item' : ''}" data-id="${c.id}" style="padding: 10px 12px; border-radius: var(--radius-md); border: 1px solid ${c.id === currentId ? 'var(--primary)' : 'var(--border-color)'}; margin-bottom: 6px;">
              <div class="search-item-icon" style="background: ${c.brandColor || 'var(--primary)'}; color: #fff;">
                ${c.logo ? `<img src="${c.logo}" style="width: 100%; height: 100%; object-fit: cover;" />` : (c.name || 'CO').substring(0, 2).toUpperCase()}
              </div>
              <div class="search-item-info">
                <div class="search-item-title">${Utils.escapeHtml(c.name)}</div>
                <div class="search-item-subtitle">${c.currency || 'INR'} • ${c.gstin ? `GST: ${Utils.escapeHtml(c.gstin)}` : 'No GSTIN'}</div>
              </div>
              ${c.id === currentId ? '<i class="fa-solid fa-check text-primary"></i>' : ''}
            </div>
          `).join('')}
        </div>
        <div class="modal-footer" style="justify-content: space-between;">
          <button class="btn btn-outline btn-sm" id="btn-manage-companies-shortcut">
            <i class="fa-solid fa-gear"></i> Manage Companies
          </button>
          <button class="btn btn-primary btn-sm" id="btn-add-comp-shortcut">
            <i class="fa-solid fa-plus"></i> New Company
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => modal.remove();
    modal.querySelector('#modal-close').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    modal.querySelector('#switch-to-all').onclick = async () => {
      await window.appState.setActiveCompany('all', true);
      closeModal();
      Utils.showToast('Switched to Consolidated All Companies mode', 'info');
    };

    modal.querySelectorAll('.switch-comp-option').forEach(item => {
      item.onclick = async () => {
        const id = item.dataset.id;
        await window.appState.setActiveCompany(id, true);
        closeModal();
        Utils.showToast(`Switched active agency to "${window.appState.currentCompany.name}"`, 'success');
      };
    });

    modal.querySelector('#btn-manage-companies-shortcut').onclick = () => {
      closeModal();
      this.navigateTo('companies');
    };

    modal.querySelector('#btn-add-comp-shortcut').onclick = () => {
      closeModal();
      CompaniesView.openCompanyModal();
    };
  }

  setupGlobalKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ctrl+K or '/' for global search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.openGlobalSearchModal();
      } else if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        this.openGlobalSearchModal();
      }
    });
  }

  openGlobalSearchModal() {
    // If existing search modal open, close it
    const existing = document.getElementById('global-search-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'global-search-modal';
    modal.className = 'modal-backdrop animate-fade-in';
    modal.innerHTML = `
      <div class="search-modal animate-scale-up">
        <div class="search-modal-header">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" class="search-modal-input" id="search-modal-input" placeholder="Search invoices, quotations, proposals, clients, projects... (Esc to close)" autofocus />
          <button class="modal-close-btn" id="search-modal-close">&times;</button>
        </div>
        <div class="search-results-list" id="search-results-list">
          <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px;">
            Type at least 2 characters to search across all clients, document numbers, and projects...
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const input = modal.querySelector('#search-modal-input');
    const resultsContainer = modal.querySelector('#search-results-list');
    const closeModal = () => modal.remove();

    modal.querySelector('#search-modal-close').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    input.focus();

    input.oninput = Utils.debounce(async (e) => {
      const q = e.target.value.trim();
      if (q.length < 2) {
        resultsContainer.innerHTML = `
          <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px;">
            Type at least 2 characters to search...
          </div>
        `;
        return;
      }

      const results = await window.appState.performGlobalSearch(q);

      if (results.length === 0) {
        resultsContainer.innerHTML = `
          <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px;">
            No records found for "<strong>${Utils.escapeHtml(q)}</strong>"
          </div>
        `;
        return;
      }

      resultsContainer.innerHTML = results.map((res, idx) => `
        <div class="search-result-item" data-idx="${idx}">
          <div class="search-item-icon"><i class="${res.icon}"></i></div>
          <div class="search-item-info">
            <div class="search-item-title">${Utils.escapeHtml(res.title)}</div>
            <div class="search-item-subtitle">${Utils.escapeHtml(res.subtitle)}</div>
          </div>
          <span class="badge badge-neutral">${res.type}</span>
        </div>
      `).join('');

      resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
        item.onclick = () => {
          const idx = parseInt(item.dataset.idx, 10);
          closeModal();
          results[idx].action();
        };
      });
    }, 200);

    // Escape to close
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }

  // --- Router & View Render Engine ---
  navigateTo(viewName, params = null) {
    window.location.hash = viewName;
    window.appState.currentView = viewName;
    window.appState.viewParams = params;

    // Update active state in sidebar
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.dataset.view === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    this.renderCurrentView();
  }

  async renderCurrentView() {
    const container = document.getElementById('view-container');
    if (!container) return;

    const viewName = window.appState.currentView || 'dashboard';
    const params = window.appState.viewParams;

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    switch (viewName) {
      case 'dashboard':
        await DashboardView.render(container);
        break;
      case 'companies':
        await CompaniesView.render(container);
        break;
      case 'clients':
        await ClientsView.render(container);
        break;
      case 'proposals':
        await ProposalsView.render(container);
        break;
      case 'quotations':
        await QuotationsView.render(container);
        break;
      case 'invoices':
        await InvoicesView.render(container, params);
        break;
      case 'payments':
        await PaymentsView.render(container);
        break;
      case 'documents':
        await DocumentsView.render(container);
        break;
      case 'reports':
        await ReportsView.render(container);
        break;
      case 'settings':
        await SettingsView.render(container);
        break;
      case 'backup':
        await BackupView.render(container);
        break;
      default:
        await DashboardView.render(container);
    }
  }

  // --- Global Document Editor Modal ---
  async openDocumentEditorModal(docType = 'Invoice', docId = null, prefill = null) {
    const companyId = window.appState.currentCompanyId === 'all'
      ? (window.appState.companies[0]?.id || '')
      : window.appState.currentCompanyId;

    const company = await window.db.getCompany(companyId);
    if (!company) {
      Utils.showToast('Please select or create an active company first.', 'error');
      return;
    }

    const clients = await window.db.getClientsByCompany(companyId);
    let existingDoc = null;

    if (docId) {
      existingDoc = await window.db.getDocument(docId);
    }

    const isEdit = !!existingDoc;
    const defaultNumber = isEdit ? existingDoc.number : await window.db.generateDocumentNumber(companyId, docType);
    const currency = company.currency || 'INR';

    const initialDate = existingDoc?.date || new Date().toISOString().split('T')[0];
    const initialDueDate = existingDoc?.dueDate || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
    const initialValidUntil = existingDoc?.validUntil || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const initialItems = existingDoc?.items || prefill?.items || [
      { name: '', description: '', quantity: 1, unit: 'hrs', unitPrice: 0, taxRate: 18, discount: 0, total: 0 }
    ];

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop animate-fade-in';
    modal.innerHTML = `
      <div class="modal-container modal-xl animate-scale-up">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 32px; height: 32px; border-radius: var(--radius-sm); background: var(--primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px;">
              <i class="fa-solid ${docType === 'Invoice' ? 'fa-file-invoice-dollar' : docType === 'Proposal' ? 'fa-lightbulb' : 'fa-file-signature'}"></i>
            </div>
            <div>
              <h3 class="modal-title" style="margin: 0;">${isEdit ? `Edit ${docType}` : `New ${docType}`}</h3>
              <p style="font-size: 12px; color: var(--text-muted); margin: 0;">For ${Utils.escapeHtml(company.name)}</p>
            </div>
          </div>
          <button class="modal-close-btn" id="modal-close">&times;</button>
        </div>

        <form id="doc-editor-form" class="modal-body">
          <div class="form-grid">
            <!-- Header Meta -->
            <div class="col-4 form-group">
              <label class="form-label">${docType} Number <span class="required">*</span></label>
              <input type="text" class="form-input" id="doc-number" required value="${Utils.escapeHtml(defaultNumber)}" />
            </div>

            <div class="col-4 form-group">
              <label class="form-label">Issue Date <span class="required">*</span></label>
              <input type="date" class="form-input" id="doc-date" required value="${initialDate}" />
            </div>

            ${docType === 'Invoice' ? `
              <div class="col-4 form-group">
                <label class="form-label">Payment Due Date <span class="required">*</span></label>
                <input type="date" class="form-input" id="doc-due-date" required value="${initialDueDate}" />
              </div>
            ` : `
              <div class="col-4 form-group">
                <label class="form-label">Valid Until</label>
                <input type="date" class="form-input" id="doc-valid-until" value="${initialValidUntil}" />
              </div>
            `}

            <!-- Client Selector & Quick Add -->
            <div class="col-8 form-group">
              <label class="form-label">Select Client <span class="required">*</span></label>
              <div style="display: flex; gap: 8px;">
                <select class="form-select" id="doc-client-select" required>
                  <option value="">-- Choose a Client --</option>
                  ${clients.map(c => `
                    <option value="${c.id}" ${(existingDoc?.clientId === c.id || prefill?.clientId === c.id) ? 'selected' : ''}>
                      ${Utils.escapeHtml(c.organization ? `${c.name} (${c.organization})` : c.name)}
                    </option>
                  `).join('')}
                </select>
                <button type="button" class="btn btn-secondary" id="btn-inline-add-client" title="Add New Client">
                  <i class="fa-solid fa-user-plus"></i> New
                </button>
              </div>
            </div>

            <div class="col-4 form-group">
              <label class="form-label">Status</label>
              <select class="form-select" id="doc-status">
                ${docType === 'Invoice' ? `
                  <option value="Unpaid" ${(existingDoc?.status === 'Unpaid' || !isEdit) ? 'selected' : ''}>Unpaid</option>
                  <option value="Partially Paid" ${existingDoc?.status === 'Partially Paid' ? 'selected' : ''}>Partially Paid</option>
                  <option value="Paid" ${existingDoc?.status === 'Paid' ? 'selected' : ''}>Paid</option>
                  <option value="Overdue" ${existingDoc?.status === 'Overdue' ? 'selected' : ''}>Overdue</option>
                  <option value="Draft" ${existingDoc?.status === 'Draft' ? 'selected' : ''}>Draft</option>
                  <option value="Cancelled" ${existingDoc?.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                ` : docType === 'Proposal' ? `
                  <option value="Draft" ${(existingDoc?.status === 'Draft' || !isEdit) ? 'selected' : ''}>Draft</option>
                  <option value="Sent" ${existingDoc?.status === 'Sent' ? 'selected' : ''}>Sent</option>
                  <option value="Viewed" ${existingDoc?.status === 'Viewed' ? 'selected' : ''}>Viewed</option>
                  <option value="Accepted" ${existingDoc?.status === 'Accepted' ? 'selected' : ''}>Accepted</option>
                  <option value="Rejected" ${existingDoc?.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                  <option value="Expired" ${existingDoc?.status === 'Expired' ? 'selected' : ''}>Expired</option>
                ` : `
                  <option value="Draft" ${(existingDoc?.status === 'Draft' || !isEdit) ? 'selected' : ''}>Draft</option>
                  <option value="Sent" ${existingDoc?.status === 'Sent' ? 'selected' : ''}>Sent</option>
                  <option value="Accepted" ${existingDoc?.status === 'Accepted' ? 'selected' : ''}>Accepted</option>
                  <option value="Converted" ${existingDoc?.status === 'Converted' ? 'selected' : ''}>Converted</option>
                  <option value="Rejected" ${existingDoc?.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                `}
              </select>
            </div>

            <!-- Project / Subject Details -->
            <div class="col-8 form-group">
              <label class="form-label">Project / Subject Title <span class="required">*</span></label>
              <input type="text" class="form-input" id="doc-project-name" required value="${Utils.escapeHtml(existingDoc?.projectName || prefill?.projectName || '')}" placeholder="e.g. Website Redesign & Brand Identity" />
            </div>

            <div class="col-4 form-group">
              <label class="form-label">${docType === 'Invoice' ? 'PO / Reference #' : 'Reference / Tracking #'}</label>
              <input type="text" class="form-input" id="doc-ref-number" value="${Utils.escapeHtml(existingDoc?.referenceNumber || '')}" placeholder="PO-2026-99" />
            </div>

            <!-- Extra Proposal Blocks if Proposal -->
            ${docType === 'Proposal' ? `
              <div class="col-12" style="background: var(--bg-hover); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <h4 style="font-size: 13.5px; font-weight: 700; margin-bottom: 10px; color: var(--text-main);">
                  <i class="fa-solid fa-list-check text-warning"></i> Proposal Scope & Strategy
                </h4>
                <div class="form-grid">
                  <div class="col-6 form-group">
                    <label class="form-label">Project Objectives</label>
                    <textarea class="form-textarea" id="prop-objectives" rows="2" placeholder="Key goals and KPI targets...">${Utils.escapeHtml(existingDoc?.projectObjectives || '')}</textarea>
                  </div>
                  <div class="col-6 form-group">
                    <label class="form-label">Scope of Work</label>
                    <textarea class="form-textarea" id="prop-scope" rows="2" placeholder="Tasks, deliverables, modules...">${Utils.escapeHtml(existingDoc?.scopeOfWork || '')}</textarea>
                  </div>
                  <div class="col-6 form-group">
                    <label class="form-label">Project Timeline</label>
                    <input type="text" class="form-input" id="prop-timeline" value="${Utils.escapeHtml(existingDoc?.timeline || '')}" placeholder="e.g. 6 Weeks (Phased Rollout)" />
                  </div>
                  <div class="col-6 form-group">
                    <label class="form-label">Key Deliverables</label>
                    <input type="text" class="form-input" id="prop-deliverables" value="${Utils.escapeHtml(existingDoc?.deliverables || '')}" placeholder="e.g. Figma Source, React App, Documentation" />
                  </div>
                </div>
              </div>
            ` : ''}

            <!-- Line Items Editor Table -->
            <div class="col-12" style="margin-top: 10px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h4 style="font-size: 14px; font-weight: 700; color: var(--text-main);">
                  Line Items & Services (${currency})
                </h4>
                <button type="button" class="btn btn-secondary btn-sm" id="btn-add-line-item">
                  <i class="fa-solid fa-plus"></i> Add Item
                </button>
              </div>

              <div class="table-responsive">
                <table class="items-editor-table">
                  <thead>
                    <tr>
                      <th style="width: 32%;">Item / Service Description <span class="required">*</span></th>
                      <th style="width: 10%;">Qty</th>
                      <th style="width: 10%;">Unit</th>
                      <th style="width: 14%;">Rate (${currency})</th>
                      <th style="width: 10%;">Disc (${currency})</th>
                      <th style="width: 10%;">Tax %</th>
                      <th style="width: 14%; text-align: right;">Total (${currency})</th>
                      <th style="width: 5%;"></th>
                    </tr>
                  </thead>
                  <tbody id="items-table-body">
                    <!-- Populated dynamically -->
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Totals & Calculations Card -->
            <div class="col-6 form-group" style="margin-top: 16px;">
              <label class="form-label">Payment Terms</label>
              <textarea class="form-textarea" id="doc-payment-terms" rows="2">${Utils.escapeHtml(existingDoc?.paymentTerms || company.defaultPaymentTerms || '')}</textarea>

              <label class="form-label mt-2">Notes & Remarks</label>
              <textarea class="form-textarea" id="doc-notes" rows="2" placeholder="Thank you for your business!">${Utils.escapeHtml(existingDoc?.notes || '')}</textarea>
            </div>

            <div class="col-6" style="margin-top: 16px;">
              <div class="card" style="background: var(--bg-hover); padding: 16px;">
                <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
                  <span>Subtotal:</span>
                  <span id="calc-subtotal" class="font-semibold">0.00</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; color: var(--success);">
                  <span>Total Discount:</span>
                  <span id="calc-discount">0.00</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; color: var(--text-muted);">
                  <span>Taxable Amount:</span>
                  <span id="calc-taxable">0.00</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px;">
                  <span>GST / Tax Amount:</span>
                  <span id="calc-tax" class="font-semibold">0.00</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; border-top: 2px solid var(--border-color); padding-top: 10px; color: var(--primary);">
                  <span>Grand Total:</span>
                  <span id="calc-total">0.00</span>
                </div>
                <div id="calc-words" style="font-size: 11px; font-style: italic; color: var(--text-muted); margin-top: 4px;"></div>
              </div>
            </div>
          </div>
        </form>

        <div class="modal-footer">
          <button type="button" class="btn btn-outline" id="modal-cancel">Cancel</button>
          <button type="submit" form="doc-editor-form" class="btn btn-primary" id="btn-save-doc">
            <i class="fa-solid fa-check"></i> ${isEdit ? 'Update Document' : 'Save Document'}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => modal.remove();
    modal.querySelector('#modal-close').onclick = closeModal;
    modal.querySelector('#modal-cancel').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    // Inline Add Client helper
    const btnInlineClient = modal.querySelector('#btn-inline-add-client');
    btnInlineClient.onclick = () => {
      ClientsView.openClientModal(null, (newClient) => {
        const select = modal.querySelector('#doc-client-select');
        const opt = document.createElement('option');
        opt.value = newClient.id;
        opt.textContent = newClient.organization ? `${newClient.name} (${newClient.organization})` : newClient.name;
        opt.selected = true;
        select.appendChild(opt);
      });
    };

    // Render items table & bind math calculation
    const itemsTbody = modal.querySelector('#items-table-body');
    const itemsData = JSON.parse(JSON.stringify(initialItems));

    const renderItemsTable = () => {
      itemsTbody.innerHTML = itemsData.map((item, idx) => `
        <tr data-index="${idx}">
          <td>
            <input type="text" class="form-input item-name" required value="${Utils.escapeHtml(item.name || '')}" placeholder="Service Name" style="font-weight: 600; margin-bottom: 4px;" />
            <input type="text" class="form-input item-desc text-muted" value="${Utils.escapeHtml(item.description || '')}" placeholder="Optional details..." style="font-size: 11px;" />
          </td>
          <td>
            <input type="number" step="any" min="0" class="form-input item-qty text-center" value="${item.quantity || 1}" />
          </td>
          <td>
            <input type="text" class="form-input item-unit text-center" value="${Utils.escapeHtml(item.unit || 'unit')}" />
          </td>
          <td>
            <input type="number" step="any" min="0" class="form-input item-price text-right" value="${item.unitPrice || 0}" />
          </td>
          <td>
            <input type="number" step="any" min="0" class="form-input item-discount text-right" value="${item.discount || 0}" />
          </td>
          <td>
            <select class="form-select item-tax text-center" style="padding: 6px 4px;">
              <option value="0" ${item.taxRate == 0 ? 'selected' : ''}>0%</option>
              <option value="5" ${item.taxRate == 5 ? 'selected' : ''}>5%</option>
              <option value="12" ${item.taxRate == 12 ? 'selected' : ''}>12%</option>
              <option value="18" ${(item.taxRate == 18 || item.taxRate === undefined) ? 'selected' : ''}>18%</option>
              <option value="28" ${item.taxRate == 28 ? 'selected' : ''}>28%</option>
            </select>
          </td>
          <td class="text-right font-semibold item-line-total" style="vertical-align: middle;">
            ${Utils.formatCurrency(item.total || 0, currency)}
          </td>
          <td style="vertical-align: middle;">
            ${itemsData.length > 1 ? `
              <button type="button" class="btn btn-outline btn-sm btn-icon-only text-danger btn-remove-item" data-index="${idx}">
                <i class="fa-regular fa-trash-can"></i>
              </button>
            ` : ''}
          </td>
        </tr>
      `).join('');

      recalculateTotals();
      bindItemInputs();
    };

    const recalculateTotals = () => {
      let subtotal = 0;
      let totalDiscount = 0;
      let totalTax = 0;

      itemsData.forEach((item, idx) => {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unitPrice) || 0;
        const disc = parseFloat(item.discount) || 0;
        const taxRate = parseFloat(item.taxRate) || 0;

        const baseTotal = Math.round((qty * price) * 100) / 100;
        const lineDiscount = Math.round(Math.min(baseTotal, disc) * 100) / 100;
        const taxable = Math.max(0, Math.round((baseTotal - lineDiscount) * 100) / 100);
        const tax = Math.round((taxable * (taxRate / 100)) * 100) / 100;

        item.total = taxable;
        subtotal = Math.round((subtotal + baseTotal) * 100) / 100;
        totalDiscount = Math.round((totalDiscount + lineDiscount) * 100) / 100;
        totalTax = Math.round((totalTax + tax) * 100) / 100;

        const rowTotalEl = itemsTbody.querySelectorAll('.item-line-total')[idx];
        if (rowTotalEl) {
          rowTotalEl.textContent = Utils.formatCurrency(taxable, currency);
        }
      });

      const taxableAmount = Math.max(0, Math.round((subtotal - totalDiscount) * 100) / 100);
      const grandTotal = Math.round((taxableAmount + totalTax) * 100) / 100;

      modal.querySelector('#calc-subtotal').textContent = Utils.formatCurrency(subtotal, currency);
      modal.querySelector('#calc-discount').textContent = `-${Utils.formatCurrency(totalDiscount, currency)}`;
      modal.querySelector('#calc-taxable').textContent = Utils.formatCurrency(taxableAmount, currency);
      modal.querySelector('#calc-tax').textContent = Utils.formatCurrency(totalTax, currency);
      modal.querySelector('#calc-total').textContent = Utils.formatCurrency(grandTotal, currency);

      if (currency === 'INR') {
        modal.querySelector('#calc-words').textContent = Utils.numberToWordsINR(grandTotal);
      }
    };

    const bindItemInputs = () => {
      itemsTbody.querySelectorAll('tr').forEach(tr => {
        const idx = parseInt(tr.dataset.index, 10);
        const nameInput = tr.querySelector('.item-name');
        const descInput = tr.querySelector('.item-desc');
        const qtyInput = tr.querySelector('.item-qty');
        const unitInput = tr.querySelector('.item-unit');
        const priceInput = tr.querySelector('.item-price');
        const discInput = tr.querySelector('.item-discount');
        const taxInput = tr.querySelector('.item-tax');
        const removeBtn = tr.querySelector('.btn-remove-item');

        nameInput.oninput = (e) => itemsData[idx].name = e.target.value;
        descInput.oninput = (e) => itemsData[idx].description = e.target.value;
        unitInput.oninput = (e) => itemsData[idx].unit = e.target.value;

        const updateNums = () => {
          itemsData[idx].quantity = parseFloat(qtyInput.value) || 0;
          itemsData[idx].unitPrice = parseFloat(priceInput.value) || 0;
          itemsData[idx].discount = parseFloat(discInput.value) || 0;
          itemsData[idx].taxRate = parseFloat(taxInput.value) || 0;
          recalculateTotals();
        };

        qtyInput.oninput = updateNums;
        priceInput.oninput = updateNums;
        discInput.oninput = updateNums;
        taxInput.onchange = updateNums;

        if (removeBtn) {
          removeBtn.onclick = () => {
            itemsData.splice(idx, 1);
            renderItemsTable();
          };
        }
      });
    };

    modal.querySelector('#btn-add-line-item').onclick = () => {
      itemsData.push({
        name: '',
        description: '',
        quantity: 1,
        unit: 'hrs',
        unitPrice: 0,
        taxRate: 18,
        discount: 0,
        total: 0
      });
      renderItemsTable();
    };

    renderItemsTable();

    // Form Submit
    const form = modal.querySelector('#doc-editor-form');
    form.onsubmit = async (e) => {
      e.preventDefault();

      const docNumber = modal.querySelector('#doc-number').value.trim();
      const clientId = modal.querySelector('#doc-client-select').value;
      const projectName = modal.querySelector('#doc-project-name').value.trim();

      if (!docNumber) return Utils.showToast('Document number is required', 'error');
      if (!clientId) return Utils.showToast('Please select a client', 'error');
      if (itemsData.length === 0 || !itemsData.some(i => i.name.trim())) {
        return Utils.showToast('Please enter at least one valid line item', 'error');
      }

      const client = await window.db.getClient(clientId);

      // Calculate totals
      let subtotal = 0;
      let totalDiscount = 0;
      let totalTax = 0;

      itemsData.forEach(item => {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unitPrice) || 0;
        const disc = parseFloat(item.discount) || 0;
        const taxRate = parseFloat(item.taxRate) || 0;

        const baseTotal = Math.round((qty * price) * 100) / 100;
        const lineDiscount = Math.round(Math.min(baseTotal, disc) * 100) / 100;
        const taxable = Math.max(0, Math.round((baseTotal - lineDiscount) * 100) / 100);
        const tax = Math.round((taxable * (taxRate / 100)) * 100) / 100;

        subtotal = Math.round((subtotal + baseTotal) * 100) / 100;
        totalDiscount = Math.round((totalDiscount + lineDiscount) * 100) / 100;
        totalTax = Math.round((totalTax + tax) * 100) / 100;
      });

      const taxableAmount = Math.max(0, Math.round((subtotal - totalDiscount) * 100) / 100);
      const grandTotal = Math.round((taxableAmount + totalTax) * 100) / 100;

      const paidAmount = existingDoc?.paidAmount || 0;
      const balanceDue = Math.max(0, Math.round((grandTotal - paidAmount) * 100) / 100);

      const docObj = {
        ...(existingDoc || {}),
        companyId,
        clientId,
        clientName: client?.name || '',
        clientOrg: client?.organization || '',
        type: docType,
        number: docNumber,
        date: modal.querySelector('#doc-date').value,
        dueDate: modal.querySelector('#doc-due-date')?.value || null,
        validUntil: modal.querySelector('#doc-valid-until')?.value || null,
        status: modal.querySelector('#doc-status').value,
        projectName,
        referenceNumber: modal.querySelector('#doc-ref-number')?.value.trim() || '',
        projectObjectives: modal.querySelector('#prop-objectives')?.value.trim() || null,
        scopeOfWork: modal.querySelector('#prop-scope')?.value.trim() || null,
        timeline: modal.querySelector('#prop-timeline')?.value.trim() || null,
        deliverables: modal.querySelector('#prop-deliverables')?.value.trim() || null,
        items: itemsData.filter(i => i.name.trim()),
        subtotal,
        discount: totalDiscount,
        taxableAmount,
        tax: totalTax,
        total: grandTotal,
        paidAmount,
        balanceDue,
        paymentTerms: modal.querySelector('#doc-payment-terms').value.trim(),
        notes: modal.querySelector('#doc-notes').value.trim(),
        terms: company.termsAndConditions || '',
        currency
      };

      try {
        const saved = await window.db.saveDocument(docObj);
        closeModal();
        Utils.showToast(`${docType} "${saved.number}" saved successfully!`, 'success');
        this.renderCurrentView();
        this.openDocumentPreviewModal(saved.id);
      } catch (err) {
        console.error(err);
        Utils.showToast(err.message, 'error');
      }
    };
  }

  // --- Document Preview Modal ---
  async openDocumentPreviewModal(docId, customDoc = null, customCompany = null, customClient = null) {
    let doc = customDoc;
    let company = customCompany;
    let client = customClient;

    if (docId) {
      doc = await window.db.getDocument(docId);
      if (!doc) return Utils.showToast('Document not found', 'error');
      company = await window.db.getCompany(doc.companyId);
      client = doc.clientId ? await window.db.getClient(doc.clientId) : null;
    }

    if (!doc || !company) return;

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop animate-fade-in';
    modal.innerHTML = `
      <div class="modal-container modal-xl animate-scale-up" style="max-height: 94vh;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="badge ${Utils.getStatusBadgeClass(doc.status)}">${Utils.escapeHtml(doc.status)}</span>
            <strong style="font-size: 15px;">${doc.type} - ${Utils.escapeHtml(doc.number)}</strong>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <!-- Print Button -->
            <button class="btn btn-outline btn-sm" id="btn-doc-print">
              <i class="fa-solid fa-print"></i> Print
            </button>
            <!-- Download PDF Button -->
            <button class="btn btn-primary btn-sm" id="btn-doc-download-pdf">
              <i class="fa-solid fa-download"></i> Download PDF
            </button>
            <button class="modal-close-btn" id="modal-close">&times;</button>
          </div>
        </div>

        <div class="modal-body doc-preview-modal-body">
          ${PDFEngine.generateDocumentHTML(doc, company, client)}
        </div>

        <div class="modal-footer" style="justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 8px;">
            ${doc.id ? `
              <button class="btn btn-outline btn-sm" id="btn-preview-edit"><i class="fa-solid fa-pen"></i> Edit</button>
              ${doc.type === 'Proposal' ? `
                <button class="btn btn-secondary btn-sm" id="btn-preview-convert-quote"><i class="fa-solid fa-file-signature"></i> Convert to Quotation</button>
                <button class="btn btn-primary btn-sm" id="btn-preview-convert-inv"><i class="fa-solid fa-file-invoice-dollar"></i> Convert to Invoice</button>
              ` : doc.type === 'Quotation' ? `
                <button class="btn btn-primary btn-sm" id="btn-preview-convert-inv"><i class="fa-solid fa-file-invoice-dollar"></i> Convert to Invoice</button>
              ` : doc.type === 'Invoice' && doc.balanceDue > 0 ? `
                <button class="btn btn-success btn-sm" id="btn-preview-pay"><i class="fa-solid fa-receipt"></i> Record Payment</button>
              ` : ''}
            ` : ''}
          </div>
          <button class="btn btn-secondary btn-sm" id="modal-done">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => modal.remove();
    modal.querySelector('#modal-close').onclick = closeModal;
    modal.querySelector('#modal-done').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    modal.querySelector('#btn-doc-print').onclick = () => {
      PDFEngine.printDocument(doc, company, client);
    };

    modal.querySelector('#btn-doc-download-pdf').onclick = async () => {
      await PDFEngine.downloadPDF(doc, company, client);
    };

    const btnEdit = modal.querySelector('#btn-preview-edit');
    if (btnEdit) {
      btnEdit.onclick = () => {
        closeModal();
        this.openDocumentEditorModal(doc.type, doc.id);
      };
    }

    const btnConvertQuote = modal.querySelector('#btn-preview-convert-quote');
    if (btnConvertQuote) {
      btnConvertQuote.onclick = async () => {
        closeModal();
        await this.convertDocument(doc.id, 'Quotation');
      };
    }

    const btnConvertInv = modal.querySelector('#btn-preview-convert-inv');
    if (btnConvertInv) {
      btnConvertInv.onclick = async () => {
        closeModal();
        await this.convertDocument(doc.id, 'Invoice');
      };
    }

    const btnPay = modal.querySelector('#btn-preview-pay');
    if (btnPay) {
      btnPay.onclick = () => {
        closeModal();
        this.openRecordPaymentModal(doc.id);
      };
    }
  }

  // --- Record Payment Modal ---
  async openRecordPaymentModal(preselectedInvoiceId = null) {
    const companyId = window.appState.currentCompanyId;
    const company = window.appState.currentCompany;
    const invoices = await window.db.getDocumentsByCompany(companyId, 'Invoice');
    const unpaidInvoices = invoices.filter(i => (i.balanceDue === undefined || i.balanceDue > 0) && i.status !== 'Cancelled');

    if (unpaidInvoices.length === 0) {
      Utils.showToast('No outstanding unpaid invoices found for this agency.', 'info');
      return;
    }

    const initialInvoice = unpaidInvoices.find(i => i.id === preselectedInvoiceId) || unpaidInvoices[0];
    const receiptNumber = await window.db.generateDocumentNumber(companyId, 'Receipt');
    const currency = initialInvoice?.currency || company?.currency || 'INR';

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop animate-fade-in';
    modal.innerHTML = `
      <div class="modal-container animate-scale-up" style="max-width: 520px;">
        <div class="modal-header">
          <h3 class="modal-title"><i class="fa-solid fa-receipt text-success"></i> Record Client Payment</h3>
          <button class="modal-close-btn" id="modal-close">&times;</button>
        </div>

        <form id="record-payment-form" class="modal-body">
          <div class="form-grid">
            <div class="col-12 form-group">
              <label class="form-label">Select Invoice to Settle <span class="required">*</span></label>
              <select class="form-select" id="pay-invoice-select" required>
                ${unpaidInvoices.map(inv => `
                  <option value="${inv.id}" ${inv.id === initialInvoice.id ? 'selected' : ''}>
                    ${Utils.escapeHtml(inv.number)} - ${Utils.escapeHtml(inv.clientOrg || inv.clientName || 'Client')} (Bal: ${Utils.formatCurrency(inv.balanceDue, inv.currency)})
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="col-6 form-group">
              <label class="form-label">Receipt Voucher #</label>
              <input type="text" class="form-input" id="pay-receipt-num" required value="${receiptNumber}" />
            </div>

            <div class="col-6 form-group">
              <label class="form-label">Payment Date <span class="required">*</span></label>
              <input type="date" class="form-input" id="pay-date" required value="${new Date().toISOString().split('T')[0]}" />
            </div>

            <div class="col-6 form-group">
              <label class="form-label">Amount Received (${currency}) <span class="required">*</span></label>
              <input type="number" step="any" min="0.01" class="form-input font-semibold" id="pay-amount" required value="${initialInvoice.balanceDue}" />
              <span id="max-balance-hint" style="font-size: 11px; color: var(--text-muted);">Max balance: ${Utils.formatCurrency(initialInvoice.balanceDue, currency)}</span>
            </div>

            <div class="col-6 form-group">
              <label class="form-label">Payment Mode <span class="required">*</span></label>
              <select class="form-select" id="pay-method" required>
                <option value="UPI">UPI / QR Code</option>
                <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
                <option value="Card">Debit / Credit Card</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div class="col-12 form-group">
              <label class="form-label">Transaction Reference (UTR / UPI Ref / Cheque #)</label>
              <input type="text" class="form-input" id="pay-reference" placeholder="e.g. UPI/3910293812 or NEFT-HDFC-991823" />
            </div>

            <div class="col-12 form-group">
              <label class="form-label">Internal Payment Notes</label>
              <input type="text" class="form-input" id="pay-notes" placeholder="e.g. Received 50% milestone advance" />
            </div>
          </div>
        </form>

        <div class="modal-footer">
          <button type="button" class="btn btn-outline" id="modal-cancel">Cancel</button>
          <button type="submit" form="record-payment-form" class="btn btn-success">
            <i class="fa-solid fa-check"></i> Record & Update Balance
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => modal.remove();
    modal.querySelector('#modal-close').onclick = closeModal;
    modal.querySelector('#modal-cancel').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    // Update amount & balance hint when selecting different invoice
    const invSelect = modal.querySelector('#pay-invoice-select');
    const amountInput = modal.querySelector('#pay-amount');
    const balanceHint = modal.querySelector('#max-balance-hint');

    invSelect.onchange = (e) => {
      const selected = unpaidInvoices.find(i => i.id === e.target.value);
      if (selected) {
        amountInput.value = selected.balanceDue;
        balanceHint.textContent = `Max balance: ${Utils.formatCurrency(selected.balanceDue, selected.currency || currency)}`;
      }
    };

    const form = modal.querySelector('#record-payment-form');
    form.onsubmit = async (e) => {
      e.preventDefault();

      const invoiceId = invSelect.value;
      const targetInv = unpaidInvoices.find(i => i.id === invoiceId);
      const amount = parseFloat(amountInput.value) || 0;

      if (amount <= 0) return Utils.showToast('Please enter a valid positive payment amount.', 'error');
      if (amount > targetInv.balanceDue + 0.01) {
        return Utils.showToast(`Payment amount cannot exceed outstanding invoice balance (${Utils.formatCurrency(targetInv.balanceDue, currency)})`, 'error');
      }

      const payment = {
        companyId,
        clientId: targetInv.clientId,
        invoiceId: targetInv.id,
        invoiceNumber: targetInv.number,
        receiptNumber: modal.querySelector('#pay-receipt-num').value.trim(),
        date: modal.querySelector('#pay-date').value,
        amount,
        method: modal.querySelector('#pay-method').value,
        reference: modal.querySelector('#pay-reference').value.trim(),
        notes: modal.querySelector('#pay-notes').value.trim()
      };

      try {
        await window.db.savePayment(payment);
        closeModal();
        Utils.showToast(`Payment of ${Utils.formatCurrency(amount, currency)} recorded successfully!`, 'success');
        this.renderCurrentView();
        this.updateNotificationBadge();
      } catch (err) {
        console.error(err);
        Utils.showToast('Error recording payment: ' + err.message, 'error');
      }
    };
  }

  // --- Duplicate Document ---
  async duplicateDocument(docId) {
    const original = await window.db.getDocument(docId);
    if (!original) return;

    const newNumber = await window.db.generateDocumentNumber(original.companyId, original.type);
    const clone = {
      ...original,
      id: null,
      number: newNumber,
      date: new Date().toISOString().split('T')[0],
      dueDate: original.type === 'Invoice' ? new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0] : null,
      status: 'Draft',
      paidAmount: 0,
      balanceDue: original.total,
      createdAt: null,
      updatedAt: null
    };

    const saved = await window.db.saveDocument(clone);
    Utils.showToast(`Duplicated into new ${original.type} "${saved.number}"`, 'success');
    this.renderCurrentView();
  }

  // --- Convert Proposal -> Quotation OR Quotation -> Invoice ---
  async convertDocument(docId, targetType = 'Invoice') {
    const original = await window.db.getDocument(docId);
    if (!original) return;

    const newNumber = await window.db.generateDocumentNumber(original.companyId, targetType);

    const convertedDoc = {
      companyId: original.companyId,
      clientId: original.clientId,
      clientName: original.clientName,
      clientOrg: original.clientOrg,
      type: targetType,
      number: newNumber,
      date: new Date().toISOString().split('T')[0],
      dueDate: targetType === 'Invoice' ? new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0] : null,
      validUntil: targetType === 'Quotation' ? new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] : null,
      projectName: original.projectName,
      referenceNumber: `Converted from ${original.number}`,
      items: JSON.parse(JSON.stringify(original.items || [])),
      subtotal: original.subtotal,
      discount: original.discount,
      taxableAmount: original.taxableAmount,
      tax: original.tax,
      total: original.total,
      paidAmount: 0,
      balanceDue: original.total,
      status: targetType === 'Invoice' ? 'Unpaid' : 'Draft',
      paymentTerms: original.paymentTerms,
      terms: original.terms,
      notes: `Generated from ${original.type} #${original.number}`,
      currency: original.currency
    };

    // Update status of original doc to Accepted/Converted
    original.status = 'Accepted';
    await window.db.put('documents', original);

    // Save newly converted document
    const saved = await window.db.saveDocument(convertedDoc);
    Utils.showToast(`Converted ${original.number} into ${targetType} "${saved.number}"!`, 'success');

    // Switch view to target and preview
    this.navigateTo(targetType === 'Invoice' ? 'invoices' : 'quotations');
    this.openDocumentPreviewModal(saved.id);
  }
}

// Global App Instance
window.app = new App();

// Bootstrap on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  window.app.init().catch(err => {
    console.error('AgencyBooks initialization failed:', err);
  });
});
