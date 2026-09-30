/**
 * AgencyBooks - Reports & Analytics View
 * Financial audits, client-wise revenue, multi-company revenue comparisons,
 * conversion funnels, CSV exports, and printable financial statements.
 */

const ReportsView = {
  activeTab: 'revenue', // 'revenue', 'clients', 'companies', 'conversion'
  dateRange: 'this_year',

  async render(container) {
    const companies = await window.db.getCompanies();
    const currentCompanyId = window.appState.currentCompanyId;
    const isAll = window.appState.isAllCompaniesMode;
    const activeCompany = window.appState.currentCompany;

    const allInvoices = await window.db.getDocumentsByCompany(isAll ? null : currentCompanyId, 'Invoice');
    const allQuotes = await window.db.getDocumentsByCompany(isAll ? null : currentCompanyId, 'Quotation');
    const allProposals = await window.db.getDocumentsByCompany(isAll ? null : currentCompanyId, 'Proposal');
    const allPayments = await window.db.getPaymentsByCompany(isAll ? null : currentCompanyId);
    const allClients = await window.db.getClientsByCompany(isAll ? null : currentCompanyId);

    const currency = activeCompany?.currency || 'INR';

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h2>Financial Reports & Analytics</h2>
          <p>Real-time analytics, revenue distribution, client ledgers, and conversion metrics.</p>
        </div>
        <div class="view-actions-group">
          <button class="btn btn-outline" id="btn-export-csv">
            <i class="fa-solid fa-file-csv"></i> Export CSV
          </button>
          <button class="btn btn-secondary" onclick="window.print()">
            <i class="fa-solid fa-print"></i> Print Report
          </button>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div style="display: flex; gap: 8px; border-bottom: 1px solid var(--border-color); margin-bottom: 24px; overflow-x: auto;">
        <button class="btn ${this.activeTab === 'revenue' ? 'btn-primary' : 'btn-outline'} btn-sm" id="tab-revenue">
          <i class="fa-solid fa-chart-line"></i> Monthly & Yearly Revenue
        </button>
        <button class="btn ${this.activeTab === 'clients' ? 'btn-primary' : 'btn-outline'} btn-sm" id="tab-clients">
          <i class="fa-solid fa-users"></i> Client-wise Revenue
        </button>
        <button class="btn ${this.activeTab === 'companies' ? 'btn-primary' : 'btn-outline'} btn-sm" id="tab-companies">
          <i class="fa-solid fa-building"></i> Multi-Company Comparison
        </button>
        <button class="btn ${this.activeTab === 'conversion' ? 'btn-primary' : 'btn-outline'} btn-sm" id="tab-conversion">
          <i class="fa-solid fa-filter-circle-dollar"></i> Conversion Funnel
        </button>
      </div>

      <div id="report-tab-content">
        ${this.renderActiveTabContent(this.activeTab, {
          allInvoices,
          allQuotes,
          allProposals,
          allPayments,
          allClients,
          companies,
          currency
        })}
      </div>
    `;

    this.bindEvents(container, { allInvoices, allPayments, allClients, currency });
  },

  renderActiveTabContent(tab, data) {
    if (tab === 'revenue') {
      return this.renderRevenueReport(data.allInvoices, data.allPayments, data.currency);
    } else if (tab === 'clients') {
      return this.renderClientRevenueReport(data.allClients, data.allInvoices, data.currency);
    } else if (tab === 'companies') {
      return this.renderCompanyComparisonReport(data.companies, data.currency);
    } else if (tab === 'conversion') {
      return this.renderConversionReport(data.allProposals, data.allQuotes, data.allInvoices, data.currency);
    }
    return '';
  },

  renderRevenueReport(invoices, payments, currency) {
    const totalInvoiced = invoices.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);
    const totalCollected = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const totalPending = invoices.reduce((sum, i) => sum + (parseFloat(i.balanceDue) || 0), 0);

    // Group invoices by year
    const yearlyBreakdown = {};
    invoices.forEach(inv => {
      const year = new Date(inv.date || inv.createdAt).getFullYear();
      if (!yearlyBreakdown[year]) {
        yearlyBreakdown[year] = { year, invoiced: 0, count: 0, collected: 0 };
      }
      yearlyBreakdown[year].invoiced += (parseFloat(inv.total) || 0);
      yearlyBreakdown[year].count += 1;
      yearlyBreakdown[year].collected += (parseFloat(inv.paidAmount) || 0);
    });

    return `
      <div class="kpi-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 24px;">
        <div class="kpi-card">
          <div>
            <div class="kpi-title">Gross Invoiced</div>
            <div class="kpi-value text-primary">${Utils.formatCurrency(totalInvoiced, currency)}</div>
            <div class="kpi-subtext">Cumulative Invoicing</div>
          </div>
          <div class="kpi-icon-box kpi-icon-primary"><i class="fa-solid fa-file-invoice"></i></div>
        </div>

        <div class="kpi-card">
          <div>
            <div class="kpi-title">Net Collected</div>
            <div class="kpi-value text-success">${Utils.formatCurrency(totalCollected, currency)}</div>
            <div class="kpi-subtext">Realized Bank & Cash Flow</div>
          </div>
          <div class="kpi-icon-box kpi-icon-success"><i class="fa-solid fa-circle-check"></i></div>
        </div>

        <div class="kpi-card">
          <div>
            <div class="kpi-title">Accounts Receivable</div>
            <div class="kpi-value text-danger">${Utils.formatCurrency(totalPending, currency)}</div>
            <div class="kpi-subtext">Outstanding Client Balance</div>
          </div>
          <div class="kpi-icon-box kpi-icon-danger"><i class="fa-solid fa-clock"></i></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fa-solid fa-calendar-days text-primary"></i> Annual Financial Performance</h3>
        </div>
        <div class="card-body" style="padding: 0;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>Invoices Issued</th>
                <th>Invoiced Value</th>
                <th>Collected Value</th>
                <th>Collection Rate</th>
              </tr>
            </thead>
            <tbody>
              ${Object.values(yearlyBreakdown).length === 0 ? `
                <tr><td colspan="5" class="text-center py-4 text-muted">No historical invoice data.</td></tr>
              ` : Object.values(yearlyBreakdown).sort((a, b) => b.year - a.year).map(row => {
                const rate = row.invoiced > 0 ? Math.round((row.collected / row.invoiced) * 100) : 0;
                return `
                  <tr>
                    <td><strong>${row.year}</strong></td>
                    <td>${row.count} invoices</td>
                    <td class="font-semibold">${Utils.formatCurrency(row.invoiced, currency)}</td>
                    <td class="text-success font-semibold">${Utils.formatCurrency(row.collected, currency)}</td>
                    <td>
                      <span class="badge ${rate >= 80 ? 'badge-success' : rate >= 50 ? 'badge-warning' : 'badge-danger'}">
                        ${rate}% collected
                      </span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderClientRevenueReport(clients, invoices, currency) {
    const clientStats = clients.map(c => {
      const cInvoices = invoices.filter(i => i.clientId === c.id);
      const invoiced = cInvoices.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);
      const paid = cInvoices.reduce((sum, i) => sum + (parseFloat(i.paidAmount) || 0), 0);
      const balance = cInvoices.reduce((sum, i) => sum + (parseFloat(i.balanceDue) || 0), 0);

      return {
        client: c,
        invoiced,
        paid,
        balance,
        invoiceCount: cInvoices.length
      };
    }).sort((a, b) => b.invoiced - a.invoiced);

    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fa-solid fa-users text-primary"></i> Client Revenue Breakdown</h3>
          <span class="text-muted" style="font-size: 12px;">Ranked by Gross Invoicing</span>
        </div>
        <div class="card-body" style="padding: 0;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Client / Organization</th>
                <th>Invoices</th>
                <th>Total Invoiced</th>
                <th>Total Paid</th>
                <th>Outstanding Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${clientStats.length === 0 ? `
                <tr><td colspan="6" class="text-center py-4 text-muted">No clients or invoice data.</td></tr>
              ` : clientStats.map(s => `
                <tr>
                  <td>
                    <strong>${Utils.escapeHtml(s.client.organization || s.client.name)}</strong>
                    ${s.client.organization && s.client.name ? `<div style="font-size: 11px; color: var(--text-muted);">${Utils.escapeHtml(s.client.name)}</div>` : ''}
                  </td>
                  <td>${s.invoiceCount}</td>
                  <td class="font-semibold">${Utils.formatCurrency(s.invoiced, currency)}</td>
                  <td class="text-success font-semibold">${Utils.formatCurrency(s.paid, currency)}</td>
                  <td class="${s.balance > 0 ? 'text-danger font-semibold' : 'text-muted'}">${Utils.formatCurrency(s.balance, currency)}</td>
                  <td>
                    ${s.balance <= 0.01 && s.invoiced > 0 ? `
                      <span class="badge badge-success">Settled</span>
                    ` : s.balance > 0 ? `
                      <span class="badge badge-danger">Due</span>
                    ` : `
                      <span class="badge badge-neutral">No Invoices</span>
                    `}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async renderCompanyComparisonReport(companies, currency) {
    const allDocs = await window.db.getAll('documents');
    const allPayments = await window.db.getAll('payments');

    const comparisons = companies.map(comp => {
      const cInvoices = allDocs.filter(d => d.companyId === comp.id && d.type === 'Invoice');
      const cPayments = allPayments.filter(p => p.companyId === comp.id);

      const invoiced = cInvoices.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);
      const collected = cPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      const pending = cInvoices.reduce((sum, i) => sum + (parseFloat(i.balanceDue) || 0), 0);

      return {
        company: comp,
        invoiced,
        collected,
        pending,
        invCount: cInvoices.length
      };
    });

    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fa-solid fa-building text-primary"></i> Multi-Agency Financial Comparison</h3>
        </div>
        <div class="card-body" style="padding: 0;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Agency / Company</th>
                <th>Invoices Issued</th>
                <th>Total Invoiced</th>
                <th>Total Collected</th>
                <th>Pending Balance</th>
                <th>Performance</th>
              </tr>
            </thead>
            <tbody>
              ${comparisons.map(c => {
                const rate = c.invoiced > 0 ? Math.round((c.collected / c.invoiced) * 100) : 0;
                return `
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="width: 10px; height: 10px; border-radius: 50%; background: ${c.company.brandColor || 'var(--primary)'};"></span>
                        <strong>${Utils.escapeHtml(c.company.name)}</strong>
                      </div>
                    </td>
                    <td>${c.invCount}</td>
                    <td class="font-semibold">${Utils.formatCurrency(c.invoiced, c.company.currency || currency)}</td>
                    <td class="text-success font-semibold">${Utils.formatCurrency(c.collected, c.company.currency || currency)}</td>
                    <td class="text-danger font-semibold">${Utils.formatCurrency(c.pending, c.company.currency || currency)}</td>
                    <td>
                      <span class="badge ${rate >= 80 ? 'badge-success' : rate >= 50 ? 'badge-warning' : 'badge-danger'}">
                        ${rate}% collection rate
                      </span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderConversionReport(proposals, quotes, invoices, currency) {
    const acceptedProps = proposals.filter(p => p.status === 'Accepted').length;
    const propRate = proposals.length > 0 ? Math.round((acceptedProps / proposals.length) * 100) : 0;

    const acceptedQuotes = quotes.filter(q => q.status === 'Accepted' || q.status === 'Converted').length;
    const quoteRate = quotes.length > 0 ? Math.round((acceptedQuotes / quotes.length) * 100) : 0;

    const paidInvoices = invoices.filter(i => i.status === 'Paid').length;
    const invRate = invoices.length > 0 ? Math.round((paidInvoices / invoices.length) * 100) : 0;

    return `
      <div class="kpi-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 24px;">
        <div class="kpi-card">
          <div>
            <div class="kpi-title">Proposal Acceptance</div>
            <div class="kpi-value text-warning">${propRate}%</div>
            <div class="kpi-subtext">${acceptedProps} of ${proposals.length} Accepted</div>
          </div>
          <div class="kpi-icon-box kpi-icon-warning"><i class="fa-solid fa-lightbulb"></i></div>
        </div>

        <div class="kpi-card">
          <div>
            <div class="kpi-title">Quotation Conversion</div>
            <div class="kpi-value text-info">${quoteRate}%</div>
            <div class="kpi-subtext">${acceptedQuotes} of ${quotes.length} Converted</div>
          </div>
          <div class="kpi-icon-box kpi-icon-info"><i class="fa-solid fa-file-signature"></i></div>
        </div>

        <div class="kpi-card">
          <div>
            <div class="kpi-title">Invoice Realization</div>
            <div class="kpi-value text-success">${invRate}%</div>
            <div class="kpi-subtext">${paidInvoices} of ${invoices.length} Fully Paid</div>
          </div>
          <div class="kpi-icon-box kpi-icon-success"><i class="fa-solid fa-circle-check"></i></div>
        </div>
      </div>

      <div class="card p-4">
        <h4 style="font-size: 15px; font-weight: 700; margin-bottom: 12px; color: var(--text-main);">
          Sales Funnel Flow (Proposals → Quotes → Invoices)
        </h4>
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
              <span><strong>1. Proposals Submitted:</strong> ${proposals.length} issued</span>
              <span class="text-muted">${propRate}% win rate</span>
            </div>
            <div style="height: 10px; background: var(--bg-hover); border-radius: 6px; overflow: hidden;">
              <div style="height: 100%; width: ${Math.max(8, propRate)}%; background: #f59e0b;"></div>
            </div>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
              <span><strong>2. Commercial Quotations:</strong> ${quotes.length} delivered</span>
              <span class="text-muted">${quoteRate}% accepted</span>
            </div>
            <div style="height: 10px; background: var(--bg-hover); border-radius: 6px; overflow: hidden;">
              <div style="height: 100%; width: ${Math.max(8, quoteRate)}%; background: #0284c7;"></div>
            </div>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
              <span><strong>3. Tax Invoices:</strong> ${invoices.length} billed</span>
              <span class="text-muted">${invRate}% paid</span>
            </div>
            <div style="height: 10px; background: var(--bg-hover); border-radius: 6px; overflow: hidden;">
              <div style="height: 100%; width: ${Math.max(8, invRate)}%; background: #10b981;"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  bindEvents(container, { allInvoices, allPayments, allClients, currency }) {
    container.querySelector('#tab-revenue').onclick = () => {
      this.activeTab = 'revenue';
      this.render(container);
    };

    container.querySelector('#tab-clients').onclick = () => {
      this.activeTab = 'clients';
      this.render(container);
    };

    container.querySelector('#tab-companies').onclick = () => {
      this.activeTab = 'companies';
      this.render(container);
    };

    container.querySelector('#tab-conversion').onclick = () => {
      this.activeTab = 'conversion';
      this.render(container);
    };

    const btnExport = container.querySelector('#btn-export-csv');
    if (btnExport) {
      btnExport.onclick = () => {
        if (this.activeTab === 'revenue') {
          const headers = ['Invoice Number', 'Client', 'Date', 'Due Date', 'Total', 'Paid', 'Balance', 'Status'];
          const rows = allInvoices.map(i => [
            i.number,
            i.clientOrg || i.clientName || '',
            i.date,
            i.dueDate || '',
            i.total,
            i.paidAmount || 0,
            i.balanceDue || 0,
            i.status
          ]);
          Utils.exportToCSV('AgencyBooks_Invoices_Report', headers, rows);
        } else if (this.activeTab === 'clients') {
          const headers = ['Client Name', 'Organization', 'Email', 'Phone', 'GSTIN', 'City', 'State'];
          const rows = allClients.map(c => [
            c.name,
            c.organization || '',
            c.email || '',
            c.phone || '',
            c.gstin || '',
            c.city || '',
            c.state || ''
          ]);
          Utils.exportToCSV('AgencyBooks_Clients_Report', headers, rows);
        } else {
          Utils.showToast('CSV export ready for Invoices & Clients.', 'info');
        }
      };
    }
  }
};

window.ReportsView = ReportsView;
