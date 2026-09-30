/**
 * AgencyBooks - IndexedDB Storage Engine & Data Access Layer
 * Robust, asynchronous storage with Company-scoped querying,
 * automatic document numbering, cascading integrity checks, and backup/restore.
 */

const DB_NAME = 'AgencyBooksDB';
const DB_VERSION = 1;

class Database {
  constructor() {
    this.db = null;
    this.isReady = false;
    this.fallbackStorage = false;
  }

  async init() {
    if (this.isReady && this.db) return this;

    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.warn('IndexedDB not supported, falling back to LocalStorage');
        this.fallbackStorage = true;
        this.isReady = true;
        resolve(this);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        // Companies store
        if (!db.objectStoreNames.contains('companies')) {
          const store = db.createObjectStore('companies', { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('isDefault', 'isDefault', { unique: false });
        }

        // Clients store
        if (!db.objectStoreNames.contains('clients')) {
          const store = db.createObjectStore('clients', { keyPath: 'id' });
          store.createIndex('companyId', 'companyId', { unique: false });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('email', 'email', { unique: false });
        }

        // Documents store (Proposals, Quotations, Invoices, Receipts, etc.)
        if (!db.objectStoreNames.contains('documents')) {
          const store = db.createObjectStore('documents', { keyPath: 'id' });
          store.createIndex('companyId', 'companyId', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('clientId', 'clientId', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('number', 'number', { unique: false });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('company_type', ['companyId', 'type'], { unique: false });
        }

        // Payments store
        if (!db.objectStoreNames.contains('payments')) {
          const store = db.createObjectStore('payments', { keyPath: 'id' });
          store.createIndex('companyId', 'companyId', { unique: false });
          store.createIndex('invoiceId', 'invoiceId', { unique: false });
          store.createIndex('clientId', 'clientId', { unique: false });
          store.createIndex('date', 'date', { unique: false });
        }

        // Settings & Meta store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = async (e) => {
        this.db = e.target.result;
        this.isReady = true;

        // Clean any old demo records if present so DB starts 100% clean
        await this.purgeDemoDataIfPresent();

        // Ensure default settings exist if settings store is empty
        const appSettings = await this.getById('settings', 'app_settings');
        if (!appSettings) {
          await this.put('settings', {
            key: 'app_settings',
            theme: 'light',
            dateFormat: 'DD/MM/YYYY',
            currency: 'INR'
          });
        }

        resolve(this);
      };

      request.onerror = (e) => {
        console.error('IndexedDB error:', e.target.error);
        this.fallbackStorage = true;
        this.isReady = true;
        resolve(this);
      };
    });
  }

  // --- Generic IndexedDB CRUD helpers ---

  async getAll(storeName) {
    if (this.fallbackStorage) {
      return JSON.parse(localStorage.getItem(`ab_${storeName}`) || '[]');
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getById(storeName, id) {
    if (this.fallbackStorage) {
      const all = await this.getAll(storeName);
      return all.find(item => item.id === id) || null;
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async put(storeName, item) {
    if (!item.id) {
      item.id = 'id_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    }
    item.updatedAt = new Date().toISOString();
    if (!item.createdAt) {
      item.createdAt = item.updatedAt;
    }

    if (this.fallbackStorage) {
      let all = await this.getAll(storeName);
      const idx = all.findIndex(i => i.id === item.id);
      if (idx >= 0) {
        all[idx] = item;
      } else {
        all.push(item);
      }
      localStorage.setItem(`ab_${storeName}`, JSON.stringify(all));
      return item;
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(item);
      req.onsuccess = () => resolve(item);
      req.onerror = () => reject(req.error);
    });
  }

  async delete(storeName, id) {
    if (this.fallbackStorage) {
      let all = await this.getAll(storeName);
      all = all.filter(i => i.id !== id);
      localStorage.setItem(`ab_${storeName}`, JSON.stringify(all));
      return true;
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async clearStore(storeName) {
    if (this.fallbackStorage) {
      localStorage.removeItem(`ab_${storeName}`);
      return true;
    }
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  // --- Company Module APIs ---

  async getCompanies() {
    return await this.getAll('companies');
  }

  async getCompany(id) {
    if (!id) return null;
    return await this.getById('companies', id);
  }

  async saveCompany(company) {
    if (company.isDefault) {
      // Unset other defaults
      const companies = await this.getCompanies();
      for (const comp of companies) {
        if (comp.id !== company.id && comp.isDefault) {
          comp.isDefault = false;
          await this.put('companies', comp);
        }
      }
    }
    return await this.put('companies', company);
  }

  async deleteCompany(id, cascade = true) {
    await this.delete('companies', id);
    if (cascade) {
      // Also delete or orphan company documents, clients, payments
      const docs = await this.getDocumentsByCompany(id);
      for (const doc of docs) {
        await this.delete('documents', doc.id);
      }
      const clients = await this.getClientsByCompany(id);
      for (const client of clients) {
        await this.delete('clients', client.id);
      }
      const payments = await this.getPaymentsByCompany(id);
      for (const p of payments) {
        await this.delete('payments', p.id);
      }
    }
    return true;
  }

  // --- Client Module APIs ---

  async getClientsByCompany(companyId) {
    const clients = await this.getAll('clients');
    if (!companyId || companyId === 'all') return clients;
    return clients.filter(c => c.companyId === companyId);
  }

  async getClient(id) {
    return await this.getById('clients', id);
  }

  async saveClient(client) {
    return await this.put('clients', client);
  }

  async deleteClient(id) {
    return await this.delete('clients', id);
  }

  // --- Document Module APIs ---

  async getDocumentsByCompany(companyId, type = null) {
    const docs = await this.getAll('documents');
    let filtered = docs;
    if (companyId && companyId !== 'all') {
      filtered = filtered.filter(d => d.companyId === companyId);
    }
    if (type && type !== 'all') {
      filtered = filtered.filter(d => d.type.toLowerCase() === type.toLowerCase());
    }
    // Sort by date descending
    return filtered.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  }

  async getDocument(id) {
    return await this.getById('documents', id);
  }

  async saveDocument(doc) {
    // Validate required fields
    if (!doc.companyId) throw new Error('Company ID is required for a document');
    if (!doc.number) throw new Error('Document number is required');

    // Duplicate number check within company & type (unless updating same doc)
    const existing = await this.getAll('documents');
    const duplicate = existing.find(d => 
      d.companyId === doc.companyId && 
      d.type === doc.type && 
      d.number.trim().toLowerCase() === doc.number.trim().toLowerCase() && 
      d.id !== doc.id
    );

    if (duplicate) {
      throw new Error(`Document number "${doc.number}" is already used for another ${doc.type} in this company.`);
    }

    return await this.put('documents', doc);
  }

  async deleteDocument(id) {
    // Also remove associated payments if it's an invoice
    const doc = await this.getDocument(id);
    if (doc && doc.type === 'Invoice') {
      const payments = await this.getPaymentsByInvoice(id);
      for (const p of payments) {
        await this.delete('payments', p.id);
      }
    }
    return await this.delete('documents', id);
  }

  // --- Payments Module APIs ---

  async getPaymentsByCompany(companyId) {
    const payments = await this.getAll('payments');
    let filtered = payments;
    if (companyId && companyId !== 'all') {
      filtered = filtered.filter(p => p.companyId === companyId);
    }
    return filtered.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  }

  async getPaymentsByInvoice(invoiceId) {
    const payments = await this.getAll('payments');
    return payments.filter(p => p.invoiceId === invoiceId);
  }

  async savePayment(payment) {
    if (!payment.companyId) throw new Error('Company ID is required');
    if (!payment.invoiceId) throw new Error('Invoice ID is required');
    if (!payment.amount || payment.amount <= 0) throw new Error('Valid payment amount is required');

    // Save payment
    const saved = await this.put('payments', payment);

    // Update invoice paid amount, balance due, and status
    const invoice = await this.getDocument(payment.invoiceId);
    if (invoice) {
      const allPayments = await this.getPaymentsByInvoice(invoice.id);
      const totalPaid = Math.round(allPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) * 100) / 100;
      const grandTotal = Math.round((parseFloat(invoice.total) || 0) * 100) / 100;
      const balanceDue = Math.max(0, Math.round((grandTotal - totalPaid) * 100) / 100);

      invoice.paidAmount = totalPaid;
      invoice.balanceDue = balanceDue;

      if (balanceDue <= 0.001) {
        invoice.status = 'Paid';
      } else if (totalPaid > 0) {
        invoice.status = 'Partially Paid';
      } else {
        const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date();
        invoice.status = isOverdue ? 'Overdue' : 'Unpaid';
      }

      await this.put('documents', invoice);
    }

    return saved;
  }

  async deletePayment(id) {
    const payment = await this.getById('payments', id);
    if (!payment) return false;

    await this.delete('payments', id);

    // Recalculate invoice balance
    if (payment.invoiceId) {
      const invoice = await this.getDocument(payment.invoiceId);
      if (invoice) {
        const remainingPayments = await this.getPaymentsByInvoice(invoice.id);
        const totalPaid = Math.round(remainingPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) * 100) / 100;
        const grandTotal = Math.round((parseFloat(invoice.total) || 0) * 100) / 100;
        const balanceDue = Math.max(0, Math.round((grandTotal - totalPaid) * 100) / 100);

        invoice.paidAmount = totalPaid;
        invoice.balanceDue = balanceDue;

        if (balanceDue <= 0.001) {
          invoice.status = 'Paid';
        } else if (totalPaid > 0) {
          invoice.status = 'Partially Paid';
        } else {
          const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date();
          invoice.status = isOverdue ? 'Overdue' : 'Unpaid';
        }

        await this.put('documents', invoice);
      }
    }
    return true;
  }

  // --- Document Number Generator ---

  async generateDocumentNumber(companyId, docType) {
    const company = await this.getCompany(companyId);
    const prefixes = company?.documentPrefixes || {
      Proposal: 'PROP',
      Quotation: 'QUO',
      Invoice: 'INV',
      Receipt: 'REC',
      'Proforma Invoice': 'PRO-INV',
      'Purchase Order': 'PO',
      'Work Order': 'WO',
      'Credit Note': 'CN',
      'Debit Note': 'DN',
      'Statement of Account': 'SOA'
    };

    const prefix = prefixes[docType] || docType.substring(0, 3).toUpperCase();
    const currentYear = new Date().getFullYear();
    const prefixFormat = `${prefix}-${currentYear}-`;

    const allDocs = await this.getDocumentsByCompany(companyId, docType);
    let maxSeq = 0;

    for (const doc of allDocs) {
      if (doc.number && doc.number.startsWith(prefixFormat)) {
        const part = doc.number.replace(prefixFormat, '');
        const num = parseInt(part, 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }

    const nextSeq = String(maxSeq + 1).padStart(3, '0');
    return `${prefixFormat}${nextSeq}`;
  }

  // --- Backup & Restore APIs ---

  async exportAllData() {
    const companies = await this.getAll('companies');
    const clients = await this.getAll('clients');
    const documents = await this.getAll('documents');
    const payments = await this.getAll('payments');
    const settings = await this.getAll('settings');

    return {
      version: 1,
      appName: 'AgencyBooks',
      exportDate: new Date().toISOString(),
      data: {
        companies,
        clients,
        documents,
        payments,
        settings
      }
    };
  }

  async exportCompanyData(companyId) {
    const company = await this.getCompany(companyId);
    if (!company) throw new Error('Company not found');

    const clients = await this.getClientsByCompany(companyId);
    const documents = await this.getDocumentsByCompany(companyId);
    const payments = await this.getPaymentsByCompany(companyId);

    return {
      version: 1,
      appName: 'AgencyBooks',
      exportType: 'SingleCompany',
      companyId,
      companyName: company.name,
      exportDate: new Date().toISOString(),
      data: {
        company,
        clients,
        documents,
        payments
      }
    };
  }

  async importData(importedJson, replaceMode = 'merge') {
    if (!importedJson || !importedJson.appName || importedJson.appName !== 'AgencyBooks') {
      throw new Error('Invalid backup file. Missing AgencyBooks signature.');
    }

    const data = importedJson.data;
    if (!data) throw new Error('Backup data is empty or corrupted.');

    if (importedJson.exportType === 'SingleCompany') {
      // Import single company
      if (data.company) {
        await this.put('companies', data.company);
      }
      if (Array.isArray(data.clients)) {
        for (const c of data.clients) await this.put('clients', c);
      }
      if (Array.isArray(data.documents)) {
        for (const d of data.documents) await this.put('documents', d);
      }
      if (Array.isArray(data.payments)) {
        for (const p of data.payments) await this.put('payments', p);
      }
      return { success: true, count: 1 + (data.clients?.length || 0) + (data.documents?.length || 0) };
    }

    // Full export import
    if (replaceMode === 'overwrite') {
      await this.clearStore('companies');
      await this.clearStore('clients');
      await this.clearStore('documents');
      await this.clearStore('payments');
      await this.clearStore('settings');
    }

    if (Array.isArray(data.companies)) {
      for (const item of data.companies) await this.put('companies', item);
    }
    if (Array.isArray(data.clients)) {
      for (const item of data.clients) await this.put('clients', item);
    }
    if (Array.isArray(data.documents)) {
      for (const item of data.documents) await this.put('documents', item);
    }
    if (Array.isArray(data.payments)) {
      for (const item of data.payments) await this.put('payments', item);
    }
    if (Array.isArray(data.settings)) {
      for (const item of data.settings) await this.put('settings', item);
    }

    return {
      success: true,
      companiesCount: data.companies?.length || 0,
      documentsCount: data.documents?.length || 0,
      clientsCount: data.clients?.length || 0
    };
  }

  // --- Clean any old demo data from development ---
  async purgeDemoDataIfPresent() {
    try {
      const demoCompanyIds = ['comp_apex', 'comp_vortex'];
      const allCompanies = await this.getAll('companies');
      for (const id of demoCompanyIds) {
        if (allCompanies.some(c => c.id === id)) {
          await this.deleteCompany(id, true);
        }
      }
    } catch (e) {
      console.warn('Note on demo purge:', e);
    }
  }

  // --- Reset Entire Database to Fresh Production State ---
  async resetAllData() {
    await this.clearStore('companies');
    await this.clearStore('clients');
    await this.clearStore('documents');
    await this.clearStore('payments');
    await this.clearStore('settings');
    await this.put('settings', {
      key: 'app_settings',
      theme: 'light',
      dateFormat: 'DD/MM/YYYY',
      currency: 'INR',
      numberFormat: 'en-IN'
    });
    return true;
  }
}

// Global singleton db instance
window.db = new Database();
