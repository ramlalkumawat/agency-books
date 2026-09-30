/**
 * AgencyBooks - Dashboard View
 * Real-time financial summary cards, monthly revenue SVG chart,
 * overdue invoice reminders, recent documents, and quick action launchpads.
 */

const DashboardView = {
  selectedPeriod: 'all', // 'all', 'this_month', 'last_month', 'this_year'

  async render(container) {
    const companyId = window.appState.currentCompanyId;
    const company = window.appState.currentCompany;
    const isAll = window.appState.isAllCompaniesMode;

    // First Launch / No Companies State
    if (!company && !isAll) {
      container.innerHTML = `
        <div class="view-header">
          <div class="view-title-group">
            <h2>Welcome to AgencyBooks</h2>
            <p>Multi-company quotation, invoice, proposal, and payment management suite.</p>
          </div>
        </div>

        <div class="empty-state" style="padding: 60px 24px; max-width: 640px; margin: 30px auto; border-radius: var(--radius-xl);">
          <div class="empty-state-icon" style="width: 68px; height: 68px; font-size: 30px; background: var(--primary-light); color: var(--primary);">
            <i class="fa-solid fa-building-circle-check"></i>
          </div>
          <h3 class="empty-state-title" style="font-size: 20px;">No companies found</h3>
          <p class="empty-state-desc">
            You don't have any agency or company profiles registered yet. Add your first company to start managing clients, creating proposals, and issuing tax invoices.
          </p>
          <button class="btn btn-primary" onclick="CompaniesView.openCompanyModal()">
            <i class="fa-solid fa-plus"></i> Add Your First Company
          </button>
        </div>
      `;
      return;
    }

    // Fetch documents, payments, clients for selected company
    const docs = await window.db.getDocumentsByCompany(companyId);
    const payments = await window.db.getPaymentsByCompany(companyId);
    const clients = await window.db.getClientsByCompany(companyId);

    // Apply period filtering
    const filteredDocs = this.filterByPeriod(docs, this.selectedPeriod);
    const filteredPayments = this.filterByPeriod(payments, this.selectedPeriod);

    // Calculate metrics
    const proposals = filteredDocs.filter(d => d.type === 'Proposal');
    const quotations = filteredDocs.filter(d => d.type === 'Quotation');
    const invoices = filteredDocs.filter(d => d.type === 'Invoice');

    const totalRevenue = invoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
    const paidAmount = invoices.reduce((sum, inv) => sum + (parseFloat(inv.paidAmount) || 0), 0);
    const unpaidInvoices = invoices.filter(inv => inv.status === 'Unpaid');
    const unpaidAmount = unpaidInvoices.reduce((sum, inv) => sum + (parseFloat(inv.balanceDue) || 0), 0);
    const partialInvoices = invoices.filter(inv => inv.status === 'Partially Paid');
    const partialAmount = partialInvoices.reduce((sum, inv) => sum + (parseFloat(inv.balanceDue) || 0), 0);
    
    // Overdue invoices check
    const now = new Date();
    const overdueInvoices = invoices.filter(inv => {
      if (inv.status === 'Overdue') return true;
      if (inv.status !== 'Paid' && inv.dueDate && new Date(inv.dueDate) < now) return true;
      return false;
    });
    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (parseFloat(inv.balanceDue) || 0), 0);

    const currency = company?.currency || 'INR';

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h2>${isAll ? 'Consolidated Overview' : Utils.escapeHtml(company?.name || 'Company Dashboard')}</h2>
          <p>${isAll ? 'Aggregated metrics across all registered agencies' : 'Financial overview and real-time document tracker'}</p>
        </div>
        <div class="view-actions-group">
          <!-- Date Filter Selector -->
          <select class="select-filter" id="dashboard-period-filter">
            <option value="all" ${this.selectedPeriod === 'all' ? 'selected' : ''}>All Time</option>
            <option value="this_month" ${this.selectedPeriod === 'this_month' ? 'selected' : ''}>This Month</option>
            <option value="last_month" ${this.selectedPeriod === 'last_month' ? 'selected' : ''}>Last Month</option>
            <option value="this_year" ${this.selectedPeriod === 'this_year' ? 'selected' : ''}>This Year</option>
          </select>

          <!-- Quick Action Buttons -->
          <button class="btn btn-primary" id="btn-quick-new-inv">
            <i class="fa-solid fa-plus"></i> New Invoice
          </button>
          <button class="btn btn-secondary" id="btn-quick-new-quote">
            <i class="fa-solid fa-file-signature"></i> New Quotation
          </button>
          <button class="btn btn-secondary" id="btn-quick-new-prop">
            <i class="fa-solid fa-lightbulb"></i> New Proposal
          </button>
        </div>
      </div>

      <!-- Overdue Alert Banner if any -->
      ${overdueInvoices.length > 0 ? `
        <div class="card mb-4" style="background: #fff1f2; border-color: #fecdd3;">
          <div class="card-body" style="padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 38px; height: 38px; border-radius: 50%; background: #ffe4e6; color: #e11d48; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                <i class="fa-solid fa-triangle-exclamation"></i>
              </div>
              <div>
                <strong style="color: #9f1239; font-size: 14px;">${overdueInvoices.length} Overdue Invoice${overdueInvoices.length > 1 ? 's' : ''} (${Utils.formatCurrency(overdueAmount, currency)})</strong>
                <p style="color: #be123c; font-size: 12px; margin: 0;">Follow up with clients to ensure healthy cashflow.</p>
              </div>
            </div>
            <button class="btn btn-danger btn-sm" id="btn-view-overdue">Review Overdue Invoices</button>
          </div>
        </div>
      ` : ''}

      <!-- Top KPI Metrics Grid -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div>
            <div class="kpi-title">Total Revenue</div>
            <div class="kpi-value text-primary">${Utils.formatCurrency(totalRevenue, currency)}</div>
            <div class="kpi-subtext">${invoices.length} Invoiced Orders</div>
          </div>
          <div class="kpi-icon-box kpi-icon-primary">
            <i class="fa-solid fa-coins"></i>
          </div>
        </div>

        <div class="kpi-card">
          <div>
            <div class="kpi-title">Paid Amount</div>
            <div class="kpi-value text-success">${Utils.formatCurrency(paidAmount, currency)}</div>
            <div class="kpi-subtext">${filteredPayments.length} Payments Collected</div>
          </div>
          <div class="kpi-icon-box kpi-icon-success">
            <i class="fa-solid fa-circle-check"></i>
          </div>
        </div>

        <div class="kpi-card">
          <div>
            <div class="kpi-title">Unpaid Balance</div>
            <div class="kpi-value text-orange">${Utils.formatCurrency(unpaidAmount, currency)}</div>
            <div class="kpi-subtext">${unpaidInvoices.length} Pending Invoices</div>
          </div>
          <div class="kpi-icon-box kpi-icon-orange">
            <i class="fa-solid fa-clock"></i>
          </div>
        </div>

        <div class="kpi-card">
          <div>
            <div class="kpi-title">Overdue Amount</div>
            <div class="kpi-value text-danger">${Utils.formatCurrency(overdueAmount, currency)}</div>
            <div class="kpi-subtext">${overdueInvoices.length} Past Due Date</div>
          </div>
          <div class="kpi-icon-box kpi-icon-danger">
            <i class="fa-solid fa-calendar-xmark"></i>
          </div>
        </div>
      </div>

      <!-- Secondary Metrics Row -->
      <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); margin-bottom: 24px;">
        <div class="card p-3" style="cursor: pointer;" onclick="window.appState.navigate('clients')">
          <div class="d-flex align-items-center justify-content-between">
            <div>
              <span class="text-muted" style="font-size: 11.5px; font-weight: 600;">ACTIVE CLIENTS</span>
              <h3 style="font-size: 20px; font-weight: 700; margin-top: 4px;">${clients.length}</h3>
            </div>
            <i class="fa-solid fa-users text-primary" style="font-size: 22px; opacity: 0.8;"></i>
          </div>
        </div>

        <div class="card p-3" style="cursor: pointer;" onclick="window.appState.navigate('proposals')">
          <div class="d-flex align-items-center justify-content-between">
            <div>
              <span class="text-muted" style="font-size: 11.5px; font-weight: 600;">PROPOSALS</span>
              <h3 style="font-size: 20px; font-weight: 700; margin-top: 4px;">${proposals.length}</h3>
            </div>
            <i class="fa-solid fa-lightbulb text-warning" style="font-size: 22px; opacity: 0.8;"></i>
          </div>
        </div>

        <div class="card p-3" style="cursor: pointer;" onclick="window.appState.navigate('quotations')">
          <div class="d-flex align-items-center justify-content-between">
            <div>
              <span class="text-muted" style="font-size: 11.5px; font-weight: 600;">QUOTATIONS</span>
              <h3 style="font-size: 20px; font-weight: 700; margin-top: 4px;">${quotations.length}</h3>
            </div>
            <i class="fa-solid fa-file-signature text-info" style="font-size: 22px; opacity: 0.8;"></i>
          </div>
        </div>

        <div class="card p-3" style="cursor: pointer;" onclick="window.appState.navigate('invoices')">
          <div class="d-flex align-items-center justify-content-between">
            <div>
              <span class="text-muted" style="font-size: 11.5px; font-weight: 600;">INVOICES</span>
              <h3 style="font-size: 20px; font-weight: 700; margin-top: 4px;">${invoices.length}</h3>
            </div>
            <i class="fa-solid fa-file-invoice-dollar text-success" style="font-size: 22px; opacity: 0.8;"></i>
          </div>
        </div>
      </div>

      <!-- Charts & Status Row -->
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 24px;" class="dashboard-charts-row">
        <!-- Monthly Revenue Chart Card -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fa-solid fa-chart-simple text-primary"></i> Monthly Revenue Trend</h3>
            <span class="text-muted" style="font-size: 12px;">Invoiced vs Collected</span>
          </div>
          <div class="card-body">
            ${this.renderMonthlyRevenueChart(invoices, payments, currency)}
          </div>
        </div>

        <!-- Document Status Breakdown Card -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fa-solid fa-pie-chart text-primary"></i> Invoice Breakdown</h3>
          </div>
          <div class="card-body">
            ${this.renderStatusBreakdown(invoices, currency)}
          </div>
        </div>
      </div>

      <!-- Recent Documents Section -->
      <div class="card mb-4">
        <div class="card-header">
          <h3 class="card-title"><i class="fa-solid fa-clock-rotate-left text-primary"></i> Recent Documents</h3>
          <button class="btn btn-outline btn-sm" onclick="window.appState.navigate('documents')">View All Documents</button>
        </div>
        <div class="card-body" style="padding: 0;">
          ${this.renderRecentDocumentsTable(docs.slice(0, 7), currency)}
        </div>
      </div>
    `;

    // Bind event listeners
    this.bindEvents(container);
  },

  filterByPeriod(records, period) {
    if (period === 'all') return records;

    const now = new Date();
    return records.filter(item => {
      const d = new Date(item.date || item.createdAt);
      if (isNaN(d.getTime())) return true;

      if (period === 'this_month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      } else if (period === 'last_month') {
        const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
      } else if (period === 'this_year') {
        return d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  },

  renderMonthlyRevenueChart(invoices, payments, currency) {
    if (invoices.length === 0 && payments.length === 0) {
      return `
        <div class="empty-state" style="padding: 32px 16px; border: none;">
          <div class="empty-state-icon" style="width: 44px; height: 44px; font-size: 18px;"><i class="fa-solid fa-chart-line"></i></div>
          <div style="font-size: 14px; font-weight: 600; color: var(--text-main); margin-bottom: 4px;">No revenue recorded yet</div>
          <p style="font-size: 12px; color: var(--text-muted); margin: 0;">Monthly invoiced and collected trends will automatically visualize here once you issue invoices.</p>
        </div>
      `;
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const monthlyData = months.map((m, i) => ({ month: m, invoiced: 0, collected: 0 }));

    invoices.forEach(inv => {
      const d = new Date(inv.date || inv.createdAt);
      if (d.getFullYear() === currentYear) {
        const m = d.getMonth();
        monthlyData[m].invoiced += (parseFloat(inv.total) || 0);
      }
    });

    payments.forEach(pay => {
      const d = new Date(pay.date || pay.createdAt);
      if (d.getFullYear() === currentYear) {
        const m = d.getMonth();
        monthlyData[m].collected += (parseFloat(pay.amount) || 0);
      }
    });

    const maxVal = Math.max(1, ...monthlyData.map(d => Math.max(d.invoiced, d.collected)));

    // Clean modern SVG Bar Chart
    const svgHeight = 200;
    const svgWidth = 600;
    const colWidth = svgWidth / 12;

    const bars = monthlyData.map((d, idx) => {
      const x = idx * colWidth + 8;
      const invoicedHeight = (d.invoiced / maxVal) * (svgHeight - 40);
      const collectedHeight = (d.collected / maxVal) * (svgHeight - 40);
      const yInv = svgHeight - 25 - invoicedHeight;
      const yCol = svgHeight - 25 - collectedHeight;

      return `
        <g class="chart-col" style="cursor: pointer;">
          <title>${d.month} ${currentYear}: Invoiced ${Utils.formatCurrency(d.invoiced, currency)} | Collected ${Utils.formatCurrency(d.collected, currency)}</title>
          <!-- Invoiced Bar -->
          <rect x="${x}" y="${yInv}" width="${(colWidth - 16) / 2}" height="${Math.max(2, invoicedHeight)}" rx="3" fill="#93c5fd" />
          <!-- Collected Bar -->
          <rect x="${x + (colWidth - 16) / 2 + 2}" y="${yCol}" width="${(colWidth - 16) / 2}" height="${Math.max(2, collectedHeight)}" rx="3" fill="var(--primary)" />
          <!-- Month Label -->
          <text x="${x + colWidth / 2 - 8}" y="${svgHeight - 8}" font-size="11" fill="#64748b" text-anchor="middle">${d.month}</text>
        </g>
      `;
    }).join('');

    return `
      <div style="width: 100%; overflow-x: auto;">
        <svg viewBox="0 0 ${svgWidth} ${svgHeight}" style="width: 100%; max-height: 220px; display: block;">
          <!-- Grid lines -->
          <line x1="0" y1="${svgHeight - 25}" x2="${svgWidth}" y2="${svgHeight - 25}" stroke="#e2e8f0" stroke-width="1" />
          <line x1="0" y1="${(svgHeight - 25) / 2}" x2="${svgWidth}" y2="${(svgHeight - 25) / 2}" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="4" />
          ${bars}
        </svg>
      </div>
      <div style="display: flex; align-items: center; justify-content: center; gap: 24px; margin-top: 12px; font-size: 12px;">
        <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 12px; height: 12px; background: #93c5fd; border-radius: 2px;"></span> Invoiced</span>
        <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 12px; height: 12px; background: var(--primary); border-radius: 2px;"></span> Collected</span>
      </div>
    `;
  },

  renderStatusBreakdown(invoices, currency) {
    if (invoices.length === 0) {
      return `
        <div class="empty-state" style="padding: 24px 12px;">
          <div class="empty-state-icon" style="width: 40px; height: 40px; font-size: 18px;"><i class="fa-solid fa-file-invoice"></i></div>
          <p style="font-size: 13px; color: var(--text-muted); margin: 0;">No invoices created yet.</p>
        </div>
      `;
    }

    const counts = {
      Paid: invoices.filter(i => i.status === 'Paid').length,
      'Partially Paid': invoices.filter(i => i.status === 'Partially Paid').length,
      Unpaid: invoices.filter(i => i.status === 'Unpaid').length,
      Overdue: invoices.filter(i => i.status === 'Overdue').length,
      Draft: invoices.filter(i => i.status === 'Draft').length
    };

    const total = invoices.length;

    return `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <!-- Paid Progress -->
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
            <span style="font-weight: 600; color: var(--success);"><i class="fa-solid fa-circle-check"></i> Paid (${counts.Paid})</span>
            <span style="color: var(--text-muted);">${Math.round((counts.Paid / total) * 100)}%</span>
          </div>
          <div style="height: 7px; background: var(--bg-hover); border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; width: ${(counts.Paid / total) * 100}%; background: var(--success);"></div>
          </div>
        </div>

        <!-- Partially Paid Progress -->
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
            <span style="font-weight: 600; color: var(--warning);"><i class="fa-solid fa-circle-half-stroke"></i> Partially Paid (${counts['Partially Paid']})</span>
            <span style="color: var(--text-muted);">${Math.round((counts['Partially Paid'] / total) * 100)}%</span>
          </div>
          <div style="height: 7px; background: var(--bg-hover); border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; width: ${(counts['Partially Paid'] / total) * 100}%; background: var(--warning);"></div>
          </div>
        </div>

        <!-- Unpaid Progress -->
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
            <span style="font-weight: 600; color: var(--orange);"><i class="fa-regular fa-clock"></i> Unpaid (${counts.Unpaid})</span>
            <span style="color: var(--text-muted);">${Math.round((counts.Unpaid / total) * 100)}%</span>
          </div>
          <div style="height: 7px; background: var(--bg-hover); border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; width: ${(counts.Unpaid / total) * 100}%; background: var(--orange);"></div>
          </div>
        </div>

        <!-- Overdue Progress -->
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
            <span style="font-weight: 600; color: var(--danger);"><i class="fa-solid fa-triangle-exclamation"></i> Overdue (${counts.Overdue})</span>
            <span style="color: var(--text-muted);">${Math.round((counts.Overdue / total) * 100)}%</span>
          </div>
          <div style="height: 7px; background: var(--bg-hover); border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; width: ${(counts.Overdue / total) * 100}%; background: var(--danger);"></div>
          </div>
        </div>
      </div>
    `;
  },

  renderRecentDocumentsTable(docs, currency) {
    if (docs.length === 0) {
      return `
        <div class="empty-state" style="border: none; padding: 36px 20px;">
          <div class="empty-state-icon" style="width: 44px; height: 44px; font-size: 18px;"><i class="fa-solid fa-folder-open"></i></div>
          <div class="empty-state-title">No documents found</div>
          <div class="empty-state-desc">Create your first proposal, quotation, or invoice for this company.</div>
          <button class="btn btn-primary btn-sm" onclick="window.app.openDocumentEditorModal('Invoice')">
            <i class="fa-solid fa-plus"></i> Create Your First Invoice
          </button>
        </div>
      `;
    }

    const rows = docs.map(doc => `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid ${doc.type === 'Invoice' ? 'fa-file-invoice-dollar text-primary' : doc.type === 'Proposal' ? 'fa-lightbulb text-warning' : 'fa-file-signature text-info'}"></i>
            <div>
              <strong style="color: var(--text-main); font-size: 13px;">${Utils.escapeHtml(doc.number)}</strong>
              <div style="font-size: 11px; color: var(--text-muted);">${doc.type}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="font-weight: 600;">${Utils.escapeHtml(doc.clientOrg || doc.clientName || '—')}</div>
          ${doc.projectName ? `<div style="font-size: 11.5px; color: var(--text-muted);">${Utils.escapeHtml(doc.projectName)}</div>` : ''}
        </td>
        <td>${Utils.formatDate(doc.date)}</td>
        <td style="font-weight: 700;">${Utils.formatCurrency(doc.total, doc.currency || currency)}</td>
        <td>
          <span class="badge ${Utils.getStatusBadgeClass(doc.status)}">${Utils.escapeHtml(doc.status)}</span>
        </td>
        <td style="text-align: right;">
          <div style="display: flex; gap: 6px; justify-content: flex-end;">
            <button class="btn btn-outline btn-sm btn-icon-only" title="Preview / Print" onclick="window.app.openDocumentPreviewModal('${doc.id}')">
              <i class="fa-regular fa-eye"></i>
            </button>
            <button class="btn btn-outline btn-sm btn-icon-only" title="Edit" onclick="window.app.openDocumentEditorModal('${doc.type}', '${doc.id}')">
              <i class="fa-solid fa-pen"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    return `
      <div class="table-responsive" style="border: none;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Document #</th>
              <th>Client / Project</th>
              <th>Date</th>
              <th>Total Amount</th>
              <th>Status</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  },

  bindEvents(container) {
    const periodFilter = container.querySelector('#dashboard-period-filter');
    if (periodFilter) {
      periodFilter.onchange = (e) => {
        this.selectedPeriod = e.target.value;
        this.render(container);
      };
    }

    const btnNewInv = container.querySelector('#btn-quick-new-inv');
    if (btnNewInv) btnNewInv.onclick = () => window.app.openDocumentEditorModal('Invoice');

    const btnNewQuote = container.querySelector('#btn-quick-new-quote');
    if (btnNewQuote) btnNewQuote.onclick = () => window.app.openDocumentEditorModal('Quotation');

    const btnNewProp = container.querySelector('#btn-quick-new-prop');
    if (btnNewProp) btnNewProp.onclick = () => window.app.openDocumentEditorModal('Proposal');

    const btnViewOverdue = container.querySelector('#btn-view-overdue');
    if (btnViewOverdue) {
      btnViewOverdue.onclick = () => {
        window.appState.navigate('invoices', { filterStatus: 'Overdue' });
      };
    }
  }
};

window.DashboardView = DashboardView;
