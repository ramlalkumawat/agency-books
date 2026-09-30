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

        // Check if DB is completely empty. If so, seed initial companies & sample records
        const companies = await this.getAll('companies');
        if (companies.length === 0) {
          await this.seedInitialData();
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
      const totalPaid = allPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      const grandTotal = parseFloat(invoice.total) || 0;
      const balanceDue = Math.max(0, grandTotal - totalPaid);

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
        const totalPaid = remainingPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const grandTotal = parseFloat(invoice.total) || 0;
        const balanceDue = Math.max(0, grandTotal - totalPaid);

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
      'Debit Note': 'DN'
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

  // --- Seed Initial Starter Companies & Data ---

  async seedInitialData() {
    const sampleCompany1 = {
      id: 'comp_apex',
      name: 'Apex Digital Creative Labs',
      logo: '',
      email: 'hello@apexdigital.io',
      phone: '+91 98765 43210',
      website: 'https://apexdigital.io',
      address: 'Suite 402, Pinnacle Business Park, Indiranagar, Bengaluru, Karnataka, 560038',
      gstin: '29ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
      bankDetails: {
        bankName: 'HDFC Bank Ltd',
        accountNumber: '50200034981290',
        ifscCode: 'HDFC0000240',
        branch: 'Indiranagar, Bangalore',
        accountType: 'Current'
      },
      upiId: 'apexdigital@hdfcbank',
      currency: 'INR',
      brandColor: '#2563eb', // Royal Blue
      isDefault: true,
      documentPrefixes: {
        Proposal: 'PROP',
        Quotation: 'QUO',
        Invoice: 'INV',
        Receipt: 'REC'
      },
      defaultPaymentTerms: 'Payment due within 15 days of invoice date. 50% advance for milestone work.',
      termsAndConditions: '1. All payments must be made in full as per the agreed schedule.\n2. Work begins only upon receipt of upfront payment.\n3. Revisions outside the agreed scope will be billed at an hourly rate.',
      signature: '',
      footerText: 'Thank you for choosing Apex Digital Creative Labs! We build high-impact digital experiences.'
    };

    const sampleCompany2 = {
      id: 'comp_vortex',
      name: 'Vortex Cloud Solutions',
      logo: '',
      email: 'billing@vortexcloud.tech',
      phone: '+91 98111 22334',
      website: 'https://vortexcloud.tech',
      address: 'Level 8, Cyber Tower B, HITEC City, Hyderabad, Telangana, 500081',
      gstin: '36XYZAB5678C1Z2',
      pan: 'XYZAB5678C',
      bankDetails: {
        bankName: 'ICICI Bank',
        accountNumber: '001105023941',
        ifscCode: 'ICIC0000011',
        branch: 'HITEC City, Hyderabad',
        accountType: 'Current'
      },
      upiId: 'vortexcloud@icici',
      currency: 'INR',
      brandColor: '#059669', // Emerald Green
      isDefault: false,
      documentPrefixes: {
        Proposal: 'V-PROP',
        Quotation: 'V-QUO',
        Invoice: 'V-INV',
        Receipt: 'V-REC'
      },
      defaultPaymentTerms: 'Net 30 days. Late payments incur 1.5% interest per month.',
      termsAndConditions: '1. Cloud maintenance services are subject to SLA guarantees of 99.9% uptime.\n2. Third-party cloud hosting bills are directly payable by the client.',
      signature: '',
      footerText: 'Vortex Cloud Solutions - Enterprise DevOps, Cloud Architecture & Cybersecurity'
    };

    await this.put('companies', sampleCompany1);
    await this.put('companies', sampleCompany2);

    // Seed sample clients for Company 1
    const client1 = {
      id: 'client_nexus',
      companyId: 'comp_apex',
      name: 'Rahul Sharma',
      organization: 'Nexus Retail Ventures Pvt Ltd',
      email: 'rahul.s@nexusretail.in',
      phone: '+91 98220 11223',
      whatsapp: '+91 98220 11223',
      billingAddress: '4th Floor, Phoenix Marketcity Commercial Tower, Whitefield, Bengaluru, 560048',
      shippingAddress: '4th Floor, Phoenix Marketcity Commercial Tower, Whitefield, Bengaluru, 560048',
      gstin: '29AABCN8890K1Z9',
      pan: 'AABCN8890K',
      state: 'Karnataka',
      city: 'Bengaluru',
      pinCode: '560048',
      notes: 'Key retail client. Prefers monthly milestone invoicing.'
    };

    const client2 = {
      id: 'client_solaris',
      companyId: 'comp_apex',
      name: 'Ananya Verma',
      organization: 'Solaris Mobility Technologies',
      email: 'ananya@solarismobility.com',
      phone: '+91 97110 33445',
      whatsapp: '+91 97110 33445',
      billingAddress: 'Plot 18, Sector 44, Institutional Area, Gurugram, Haryana, 122003',
      shippingAddress: 'Plot 18, Sector 44, Institutional Area, Gurugram, Haryana, 122003',
      gstin: '06AAACS5512B1ZQ',
      pan: 'AAACS5512B',
      state: 'Haryana',
      city: 'Gurugram',
      pinCode: '122003',
      notes: 'EV fleet management startup.'
    };

    // Client for Company 2
    const client3 = {
      id: 'client_orion',
      companyId: 'comp_vortex',
      name: 'Vikram Mehta',
      organization: 'Orion FinTech Labs',
      email: 'vikram@orionfin.io',
      phone: '+91 99300 44556',
      whatsapp: '+91 99300 44556',
      billingAddress: '12th Floor, Express Towers, Nariman Point, Mumbai, Maharashtra, 400021',
      shippingAddress: '12th Floor, Express Towers, Nariman Point, Mumbai, Maharashtra, 400021',
      gstin: '27AABCO3321D1ZN',
      pan: 'AABCO3321D',
      state: 'Maharashtra',
      city: 'Mumbai',
      pinCode: '400021',
      notes: 'Fintech client with strict SOC2 compliance requirements.'
    };

    await this.put('clients', client1);
    await this.put('clients', client2);
    await this.put('clients', client3);

    const year = new Date().getFullYear();

    // Sample Documents for Apex
    // 1. Proposal
    const prop1 = {
      id: 'doc_prop_01',
      companyId: 'comp_apex',
      clientId: client1.id,
      clientName: client1.name,
      clientOrg: client1.organization,
      type: 'Proposal',
      number: `PROP-${year}-001`,
      date: new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
      projectName: 'Omnichannel E-Commerce Portal & Mobile App UI/UX Redesign',
      projectDescription: 'End-to-end design and design system for Nexus Retail omnichannel web platform and native mobile apps.',
      projectObjectives: '1. Enhance conversion rate by 35% with frictionless mobile checkout.\n2. Create a unified, scalable design system for web and iOS/Android.\n3. Modernize brand presence and improve page-speed metrics.',
      scopeOfWork: 'Discovery workshops, wireframing, high-fidelity prototypes in Figma, design tokens, interactive micro-animations, and full developer handoff documentation.',
      timeline: '8 Weeks (Phase 1: Wireframing - 2 weeks, Phase 2: High Fidelity - 4 weeks, Phase 3: QA & Handoff - 2 weeks)',
      deliverables: 'Complete Figma design system, 45+ unique screen templates, clickable prototype, interactive component specs.',
      items: [
        {
          name: 'UI/UX Research & Discovery Phase',
          description: 'User interviews, competitive analysis, and UX architecture blueprint',
          quantity: 1,
          unit: 'phase',
          unitPrice: 45000,
          taxRate: 18,
          discount: 0,
          total: 45000
        },
        {
          name: 'Design System & Component Library',
          description: 'Comprehensive tokens, light/dark themes, accessible WCAG 2.1 AA UI kit',
          quantity: 1,
          unit: 'kit',
          unitPrice: 65000,
          taxRate: 18,
          discount: 0,
          total: 65000
        },
        {
          name: 'Mobile App Screens (iOS & Android)',
          description: '45 production-ready screens with responsive layout variants',
          quantity: 45,
          unit: 'screen',
          unitPrice: 2200,
          taxRate: 18,
          discount: 5000,
          total: 94000
        }
      ],
      subtotal: 204000,
      discount: 5000,
      taxableAmount: 199000,
      tax: 35820,
      total: 234820,
      paidAmount: 0,
      balanceDue: 234820,
      status: 'Accepted',
      paymentTerms: '50% advance upon contract signing, 30% on mid-term milestone, 20% on final handover.',
      terms: sampleCompany1.termsAndConditions,
      notes: 'Includes 2 rounds of client revisions per milestone.',
      currency: 'INR'
    };

    // 2. Quotation
    const quo1 = {
      id: 'doc_quo_01',
      companyId: 'comp_apex',
      clientId: client2.id,
      clientName: client2.name,
      clientOrg: client2.organization,
      type: 'Quotation',
      number: `QUO-${year}-001`,
      date: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 16 * 86400000).toISOString().split('T')[0],
      projectName: 'Solaris Fleet Telematics Web Dashboard',
      subject: 'Quotation for Real-Time IoT Fleet Monitoring Dashboard',
      items: [
        {
          name: 'Frontend Development (React & TailwindCSS)',
          description: 'High performance real-time map tracking with Mapbox GL and WebSockets',
          quantity: 1,
          unit: 'module',
          unitPrice: 120000,
          taxRate: 18,
          discount: 0,
          total: 120000
        },
        {
          name: 'Data Visualization & Charts Module',
          description: 'Battery health, speed metrics, geofence breach alert graphs',
          quantity: 1,
          unit: 'module',
          unitPrice: 50000,
          taxRate: 18,
          discount: 0,
          total: 50000
        }
      ],
      subtotal: 170000,
      discount: 0,
      taxableAmount: 170000,
      tax: 30600,
      total: 200600,
      paidAmount: 0,
      balanceDue: 200600,
      status: 'Sent',
      paymentTerms: 'Payment due within 15 days of invoice date.',
      terms: sampleCompany1.termsAndConditions,
      notes: 'Valid for 30 calendar days from the issue date.',
      currency: 'INR'
    };

    // 3. Invoice (Partially Paid)
    const inv1 = {
      id: 'doc_inv_01',
      companyId: 'comp_apex',
      clientId: client1.id,
      clientName: client1.name,
      clientOrg: client1.organization,
      type: 'Invoice',
      number: `INV-${year}-001`,
      date: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      projectName: 'Omnichannel E-Commerce - Milestone 1 Handover',
      referenceNumber: `PO-NEX-${year}-44`,
      items: [
        {
          name: 'Milestone 1: Discovery & UX Wireframes',
          description: 'Approved wireframes and architecture diagrams',
          quantity: 1,
          unit: 'milestone',
          unitPrice: 100000,
          taxRate: 18,
          discount: 0,
          total: 100000
        }
      ],
      subtotal: 100000,
      discount: 0,
      taxableAmount: 100000,
      tax: 18000,
      total: 118000,
      paidAmount: 59000,
      balanceDue: 59000,
      status: 'Partially Paid',
      paymentTerms: '50% advance received, balance payable upon Milestone 1 acceptance.',
      bankDetails: sampleCompany1.bankDetails,
      upiId: sampleCompany1.upiId,
      terms: sampleCompany1.termsAndConditions,
      notes: 'Thank you for your prompt business partnership!',
      currency: 'INR'
    };

    // 4. Overdue Invoice
    const inv2 = {
      id: 'doc_inv_02',
      companyId: 'comp_apex',
      clientId: client2.id,
      clientName: client2.name,
      clientOrg: client2.organization,
      type: 'Invoice',
      number: `INV-${year}-002`,
      date: new Date(Date.now() - 40 * 86400000).toISOString().split('T')[0],
      dueDate: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
      projectName: 'Solaris Brand Identity & Guidelines',
      referenceNumber: 'REF-SOL-99',
      items: [
        {
          name: 'Brand Guidelines & Typography System',
          description: 'Vector logo package, color tokens, and corporate presentation kit',
          quantity: 1,
          unit: 'pkg',
          unitPrice: 40000,
          taxRate: 18,
          discount: 0,
          total: 40000
        }
      ],
      subtotal: 40000,
      discount: 0,
      taxableAmount: 40000,
      tax: 7200,
      total: 47200,
      paidAmount: 0,
      balanceDue: 47200,
      status: 'Overdue',
      paymentTerms: 'Net 15 days.',
      bankDetails: sampleCompany1.bankDetails,
      upiId: sampleCompany1.upiId,
      terms: sampleCompany1.termsAndConditions,
      notes: 'Payment reminder sent on ' + new Date(Date.now() - 5 * 86400000).toLocaleDateString(),
      currency: 'INR'
    };

    await this.put('documents', prop1);
    await this.put('documents', quo1);
    await this.put('documents', inv1);
    await this.put('documents', inv2);

    // Seed sample payment for Invoice 1
    const payment1 = {
      id: 'pay_01',
      companyId: 'comp_apex',
      clientId: client1.id,
      invoiceId: inv1.id,
      invoiceNumber: inv1.number,
      receiptNumber: `REC-${year}-001`,
      date: new Date(Date.now() - 8 * 86400000).toISOString().split('T')[0],
      amount: 59000,
      method: 'Bank Transfer',
      reference: 'NEFT/HDFC/9928374102',
      notes: 'Initial 50% milestone advance payment received with thanks.'
    };
    await this.put('payments', payment1);

    // Seed an invoice for Company 2 (Vortex Cloud Solutions)
    const invVortex = {
      id: 'doc_inv_v1',
      companyId: 'comp_vortex',
      clientId: client3.id,
      clientName: client3.name,
      clientOrg: client3.organization,
      type: 'Invoice',
      number: `V-INV-${year}-001`,
      date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0],
      projectName: 'Kubernetes Architecture & AWS DevOps Retainer (Month 1)',
      referenceNumber: 'PO-ORION-K8S-01',
      items: [
        {
          name: 'Multi-AZ EKS Cluster Setup & Hardening',
          description: 'Terraform IaC, Helm charts, and Falco security monitoring',
          quantity: 1,
          unit: 'month',
          unitPrice: 150000,
          taxRate: 18,
          discount: 0,
          total: 150000
        }
      ],
      subtotal: 150000,
      discount: 0,
      taxableAmount: 150000,
      tax: 27000,
      total: 177000,
      paidAmount: 177000,
      balanceDue: 0,
      status: 'Paid',
      paymentTerms: 'Payment due on receipt.',
      bankDetails: sampleCompany2.bankDetails,
      upiId: sampleCompany2.upiId,
      terms: sampleCompany2.termsAndConditions,
      notes: 'Full payment received electronically.',
      currency: 'INR'
    };
    await this.put('documents', invVortex);

    const paymentVortex = {
      id: 'pay_v01',
      companyId: 'comp_vortex',
      clientId: client3.id,
      invoiceId: invVortex.id,
      invoiceNumber: invVortex.number,
      receiptNumber: `V-REC-${year}-001`,
      date: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
      amount: 177000,
      method: 'UPI',
      reference: 'UPI/329482938192/orion',
      notes: 'Full payment cleared via instant UPI.'
    };
    await this.put('payments', paymentVortex);

    // Default settings
    await this.put('settings', {
      key: 'app_settings',
      activeCompanyId: 'comp_apex',
      theme: 'light',
      dateFormat: 'DD/MM/YYYY',
      currency: 'INR',
      numberFormat: 'en-IN'
    });
  }
}

// Global singleton db instance
window.db = new Database();
