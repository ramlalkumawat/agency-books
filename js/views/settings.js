/**
 * AgencyBooks - Settings View
 * Global application preferences, company settings, and PDF layout options.
 */

const SettingsView = {
  async render(container) {
    const savedSettings = await window.db.getById('settings', 'app_settings') || {};
    const company = window.appState.currentCompany;

    const theme = savedSettings.theme || 'light';
    const dateFormat = savedSettings.dateFormat || 'DD/MM/YYYY';
    const currency = savedSettings.currency || 'INR';

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h2>Application Settings</h2>
          <p>Customize global display preferences, currency rules, and active agency defaults.</p>
        </div>
      </div>

      <div class="form-grid">
        <!-- App Preferences Card -->
        <div class="col-6">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title"><i class="fa-solid fa-sliders text-primary"></i> General Preferences</h3>
            </div>
            <div class="card-body">
              <form id="app-settings-form">
                <div class="form-group mb-3">
                  <label class="form-label">Theme Mode</label>
                  <select class="form-select" id="setting-theme">
                    <option value="light" ${theme === 'light' ? 'selected' : ''}>Light Theme (Clean White & Slate)</option>
                    <option value="dark" ${theme === 'dark' ? 'selected' : ''}>Dark Theme (Sleek Charcoal)</option>
                  </select>
                </div>

                <div class="form-group mb-3">
                  <label class="form-label">Default Date Display Format</label>
                  <select class="form-select" id="setting-date-format">
                    <option value="DD/MM/YYYY" ${dateFormat === 'DD/MM/YYYY' ? 'selected' : ''}>DD/MM/YYYY (e.g. 01/10/2026)</option>
                    <option value="MM/DD/YYYY" ${dateFormat === 'MM/DD/YYYY' ? 'selected' : ''}>MM/DD/YYYY (e.g. 10/01/2026)</option>
                    <option value="YYYY-MM-DD" ${dateFormat === 'YYYY-MM-DD' ? 'selected' : ''}>YYYY-MM-DD (ISO standard)</option>
                  </select>
                </div>

                <div class="form-group mb-4">
                  <label class="form-label">Default Number System</label>
                  <select class="form-select" id="setting-currency">
                    <option value="INR" ${currency === 'INR' ? 'selected' : ''}>Indian Numbering (₹ Lakhs & Crores: 1,50,000.00)</option>
                    <option value="USD" ${currency === 'USD' ? 'selected' : ''}>International Standard ($ Millions: 150,000.00)</option>
                  </select>
                </div>

                <button type="submit" class="btn btn-primary">
                  <i class="fa-solid fa-check"></i> Save General Preferences
                </button>
              </form>
            </div>
          </div>
        </div>

        <!-- Active Agency Profile Quick Edit -->
        <div class="col-6">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title"><i class="fa-solid fa-building text-primary"></i> Active Agency Settings</h3>
              <button class="btn btn-outline btn-sm" onclick="CompaniesView.openCompanyModal(window.appState.currentCompany)">
                <i class="fa-solid fa-pen"></i> Full Profile Editor
              </button>
            </div>
            <div class="card-body">
              ${company && company.id !== 'all' ? `
                <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 16px;">
                  ${company.logo ? `
                    <img src="${company.logo}" style="width: 48px; height: 48px; object-fit: contain; border-radius: 8px; border: 1px solid var(--border-color);" />
                  ` : `
                    <div style="width: 48px; height: 48px; border-radius: 8px; background: ${company.brandColor || 'var(--primary)'}; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700;">
                      ${(company.name || 'CO').substring(0, 2).toUpperCase()}
                    </div>
                  `}
                  <div>
                    <h4 style="font-size: 15px; font-weight: 700; color: var(--text-main); margin: 0;">${Utils.escapeHtml(company.name)}</h4>
                    <p style="font-size: 12px; color: var(--text-muted); margin: 2px 0 0;">${Utils.escapeHtml(company.email || 'No email')} • ${Utils.escapeHtml(company.gstin ? `GST: ${company.gstin}` : 'No GST')}</p>
                  </div>
                </div>

                <div style="font-size: 13px; color: var(--text-main); line-height: 1.6;">
                  <p><strong>Bank:</strong> ${Utils.escapeHtml(company.bankDetails?.bankName || 'Not configured')}</p>
                  <p><strong>A/C:</strong> ${Utils.escapeHtml(company.bankDetails?.accountNumber || 'Not configured')} (${Utils.escapeHtml(company.bankDetails?.ifscCode || '')})</p>
                  <p><strong>UPI ID:</strong> ${Utils.escapeHtml(company.upiId || 'Not configured')}</p>
                  <p><strong>Brand Color:</strong> <span style="display: inline-block; width: 14px; height: 14px; background: ${company.brandColor}; border-radius: 3px; vertical-align: middle;"></span> ${company.brandColor}</p>
                </div>
              ` : `
                <p class="text-muted">You are currently in All Companies mode. Switch to a specific company in the top navigation to edit its settings.</p>
              `}
            </div>
          </div>
        </div>

        <!-- Document & PDF Layout Settings -->
        <div class="col-12 mt-3">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title"><i class="fa-solid fa-file-pdf text-primary"></i> A4 Document & Print Configuration</h3>
            </div>
            <div class="card-body">
              <div class="form-grid">
                <div class="col-4">
                  <label class="form-label">Page Margin & Layout</label>
                  <p class="text-muted" style="font-size: 12px;">Pre-configured for ISO A4 210mm x 297mm standard with 10mm print margins and crisp vector borders.</p>
                </div>
                <div class="col-4">
                  <label class="form-label">Tax Compliance</label>
                  <p class="text-muted" style="font-size: 12px;">Dynamic GST breakdown handles CGST + SGST (intra-state) or IGST (inter-state) with amount in words.</p>
                </div>
                <div class="col-4">
                  <label class="form-label">Security & Privacy</label>
                  <p class="text-muted" style="font-size: 12px;">All PDF rendering happens 100% locally in your browser. No financial data ever leaves your computer.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container, savedSettings);
  },

  bindEvents(container, savedSettings) {
    const form = container.querySelector('#app-settings-form');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();

        const theme = container.querySelector('#setting-theme').value;
        const dateFormat = container.querySelector('#setting-date-format').value;
        const currency = container.querySelector('#setting-currency').value;

        const updated = {
          ...savedSettings,
          key: 'app_settings',
          theme,
          dateFormat,
          currency
        };

        await window.db.put('settings', updated);

        // Apply theme immediately
        document.documentElement.setAttribute('data-theme', theme);

        Utils.showToast('Preferences saved successfully!', 'success');
      };
    }
  }
};

window.SettingsView = SettingsView;
