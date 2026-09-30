/**
 * AgencyBooks - Global State Management
 * Active company management, reactive event dispatching,
 * dynamic theme styling, and global search indexing.
 */

class AppState {
  constructor() {
    this.currentCompanyId = null;
    this.currentCompany = null;
    this.companies = [];
    this.currentView = 'dashboard';
    this.viewParams = null;
    this.listeners = new Map();
    this.isAllCompaniesMode = false;
  }

  async init() {
    this.companies = await window.db.getCompanies();

    // Check saved active company in settings or default
    const savedSettings = await window.db.getById('settings', 'app_settings');
    let targetCompanyId = savedSettings?.activeCompanyId;

    if (!targetCompanyId || !this.companies.some(c => c.id === targetCompanyId)) {
      const defaultCompany = this.companies.find(c => c.isDefault) || this.companies[0];
      targetCompanyId = defaultCompany ? defaultCompany.id : null;
    }

    if (targetCompanyId) {
      await this.setActiveCompany(targetCompanyId, false);
    }

    return this;
  }

  // Subscribe to state change events
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in listener for event ${event}:`, e);
        }
      });
    }
  }

  async refreshCompanies() {
    this.companies = await window.db.getCompanies();
    if (this.currentCompanyId) {
      this.currentCompany = this.companies.find(c => c.id === this.currentCompanyId) || null;
    }
    this.emit('companiesChanged', this.companies);
  }

  async setActiveCompany(companyId, triggerRender = true) {
    if (companyId === 'all') {
      this.isAllCompaniesMode = true;
      this.currentCompanyId = 'all';
      this.currentCompany = {
        id: 'all',
        name: 'All Companies (Consolidated)',
        brandColor: '#4f46e5',
        currency: 'INR'
      };
    } else {
      this.isAllCompaniesMode = false;
      this.currentCompanyId = companyId;
      this.currentCompany = this.companies.find(c => c.id === companyId) || (await window.db.getCompany(companyId));
    }

    // Save preference
    await window.db.put('settings', {
      key: 'app_settings',
      activeCompanyId: this.currentCompanyId
    });

    // Apply company brand color to CSS custom properties
    this.applyBrandTheme();

    this.emit('companyChanged', this.currentCompany);

    if (triggerRender && window.router) {
      window.router.renderCurrentView();
    }
  }

  applyBrandTheme() {
    const brandColor = this.currentCompany?.brandColor || '#2563eb';
    document.documentElement.style.setProperty('--primary', brandColor);
    
    // Calculate subtle tints
    document.documentElement.style.setProperty('--primary-light', `${brandColor}18`);
    document.documentElement.style.setProperty('--primary-focus', `${brandColor}33`);
  }

  navigate(viewName, params = null) {
    this.currentView = viewName;
    this.viewParams = params;
    this.emit('viewChanged', { view: viewName, params });
    if (window.router) {
      window.router.renderCurrentView();
    }
  }

  // Global search across company documents, clients, and projects
  async performGlobalSearch(query) {
    if (!query || query.trim().length < 2) return [];

    const q = query.trim().toLowerCase();
    const results = [];

    // Search Clients
    const clients = await window.db.getClientsByCompany(this.currentCompanyId);
    for (const client of clients) {
      const matchName = (client.name || '').toLowerCase().includes(q);
      const matchOrg = (client.organization || '').toLowerCase().includes(q);
      const matchEmail = (client.email || '').toLowerCase().includes(q);
      const matchPhone = (client.phone || '').toLowerCase().includes(q);
      const matchGST = (client.gstin || '').toLowerCase().includes(q);

      if (matchName || matchOrg || matchEmail || matchPhone || matchGST) {
        results.push({
          type: 'Client',
          icon: 'fa-solid fa-user-tie',
          title: client.organization ? `${client.name} (${client.organization})` : client.name,
          subtitle: client.email || client.phone || 'Client Profile',
          id: client.id,
          action: () => window.app.openClientDetailModal(client.id)
        });
      }
    }

    // Search Documents (Proposals, Quotes, Invoices, etc.)
    const docs = await window.db.getDocumentsByCompany(this.currentCompanyId);
    for (const doc of docs) {
      const matchNum = (doc.number || '').toLowerCase().includes(q);
      const matchProject = (doc.projectName || '').toLowerCase().includes(q);
      const matchClient = (doc.clientName || '').toLowerCase().includes(q) || (doc.clientOrg || '').toLowerCase().includes(q);
      const matchStatus = (doc.status || '').toLowerCase().includes(q);

      if (matchNum || matchProject || matchClient || matchStatus) {
        let icon = 'fa-solid fa-file-lines';
        if (doc.type === 'Invoice') icon = 'fa-solid fa-file-invoice-dollar';
        else if (doc.type === 'Proposal') icon = 'fa-solid fa-lightbulb';
        else if (doc.type === 'Quotation') icon = 'fa-solid fa-file-signature';

        results.push({
          type: doc.type,
          icon,
          title: `${doc.number} • ${doc.projectName || doc.type}`,
          subtitle: `${doc.clientName || doc.clientOrg || 'Client'} | ${Utils.formatCurrency(doc.total, doc.currency)} | ${doc.status}`,
          id: doc.id,
          action: () => window.app.openDocumentPreviewModal(doc.id)
        });
      }
    }

    return results;
  }
}

window.appState = new AppState();
