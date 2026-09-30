/**
 * AgencyBooks - Companies View & Management
 * Manage multiple agencies/entities, company profiles, logos,
 * banking details, prefixes, and brand color palettes.
 */

const CompaniesView = {
  async render(container) {
    const companies = await window.db.getCompanies();
    const activeCompanyId = window.appState.currentCompanyId;

    // Get counts for each company
    const allDocs = await window.db.getAll('documents');
    const allClients = await window.db.getAll('clients');

    const companyCards = companies.map(comp => {
      const docCount = allDocs.filter(d => d.companyId === comp.id).length;
      const clientCount = allClients.filter(c => c.companyId === comp.id).length;
      const isActive = comp.id === activeCompanyId;

      return `
        <div class="card company-profile-card ${isActive ? 'active-company-border' : ''}" style="position: relative; overflow: hidden; ${isActive ? 'border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-light);' : ''}">
          <div style="height: 6px; background: ${comp.brandColor || 'var(--primary)'};"></div>
          <div class="card-body">
            <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px;">
              <div style="display: flex; align-items: center; gap: 14px;">
                ${comp.logo ? `
                  <img src="${comp.logo}" alt="${Utils.escapeHtml(comp.name)}" style="width: 52px; height: 52px; border-radius: 8px; object-fit: contain; border: 1px solid var(--border-color); background: #fff;" />
                ` : `
                  <div style="width: 52px; height: 52px; border-radius: 8px; background: ${comp.brandColor || 'var(--primary)'}; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 20px;">
                    ${Utils.escapeHtml((comp.name || 'CO').substring(0, 2).toUpperCase())}
                  </div>
                `}
                <div>
                  <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main); margin-bottom: 2px;">
                    ${Utils.escapeHtml(comp.name)}
                  </h3>
                  <div style="font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
                    <span>${comp.currency || 'INR'}</span>
                    <span>•</span>
                    <span>${comp.gstin ? `GST: ${Utils.escapeHtml(comp.gstin)}` : (comp.email || 'No GSTIN')}</span>
                  </div>
                </div>
              </div>

              ${comp.isDefault ? `
                <span class="badge badge-success" title="Default Agency Profile"><i class="fa-solid fa-star"></i> Default</span>
              ` : ''}
            </div>

            <!-- Stats row -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: var(--bg-hover); padding: 10px 12px; border-radius: var(--radius-md); margin-bottom: 16px;">
              <div>
                <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Clients</span>
                <div style="font-weight: 700; font-size: 15px;">${clientCount}</div>
              </div>
              <div>
                <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Documents</span>
                <div style="font-weight: 700; font-size: 15px;">${docCount}</div>
              </div>
            </div>

            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px; line-height: 1.4; max-height: 38px; overflow: hidden; text-overflow: ellipsis;">
              <i class="fa-solid fa-location-dot" style="margin-right: 4px;"></i> ${Utils.escapeHtml(comp.address || 'Address not configured')}
            </div>

            <!-- Card Actions -->
            <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-color); padding-top: 12px;">
              <div>
                ${isActive ? `
                  <span class="badge badge-info"><i class="fa-solid fa-check"></i> Currently Active</span>
                ` : `
                  <button class="btn btn-outline btn-sm btn-switch-company" data-id="${comp.id}">
                    <i class="fa-solid fa-arrow-right-arrow-left"></i> Switch To
                  </button>
                `}
              </div>

              <div style="display: flex; gap: 6px;">
                <button class="btn btn-secondary btn-sm btn-icon-only btn-edit-company" data-id="${comp.id}" title="Edit Profile & Branding">
                  <i class="fa-solid fa-pen"></i>
                </button>
                ${companies.length > 1 ? `
                  <button class="btn btn-outline btn-sm btn-icon-only text-danger btn-delete-company" data-id="${comp.id}" data-name="${Utils.escapeHtml(comp.name)}" title="Delete Company">
                    <i class="fa-regular fa-trash-can"></i>
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h2>Agency & Company Profiles</h2>
          <p>Create and manage distinct companies with independent branding, prefixes, clients, and financials.</p>
        </div>
        <div class="view-actions-group">
          <button class="btn btn-primary" id="btn-add-company">
            <i class="fa-solid fa-plus"></i> Add New Company
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 20px;">
        ${companyCards}
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const btnAdd = container.querySelector('#btn-add-company');
    if (btnAdd) {
      btnAdd.onclick = () => this.openCompanyModal();
    }

    container.querySelectorAll('.btn-switch-company').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        await window.appState.setActiveCompany(id, true);
        Utils.showToast(`Switched active agency to "${window.appState.currentCompany.name}"`, 'success');
      };
    });

    container.querySelectorAll('.btn-edit-company').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const comp = await window.db.getCompany(id);
        if (comp) this.openCompanyModal(comp);
      };
    });

    container.querySelectorAll('.btn-delete-company').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const name = btn.dataset.name;

        const confirmed = await Utils.showConfirmDialog({
          title: `Delete "${name}"?`,
          message: `Are you sure you want to permanently delete this company? All associated clients, proposals, quotations, invoices, and payment records for this agency will be deleted from local storage.`,
          confirmText: 'Delete Permanently',
          isDanger: true
        });

        if (confirmed) {
          await window.db.deleteCompany(id, true);
          await window.appState.refreshCompanies();

          // If deleted company was active, switch to first remaining
          const remaining = window.appState.companies;
          if (remaining.length > 0) {
            await window.appState.setActiveCompany(remaining[0].id, false);
          }
          Utils.showToast(`Company "${name}" and its associated records were removed.`, 'info');
          CompaniesView.render(document.getElementById('view-container'));
        }
      };
    });
  },

  // Open Company Edit / Create Modal
  openCompanyModal(company = null) {
    const isEdit = !!company;
    const comp = company || {
      name: '',
      logo: '',
      email: '',
      phone: '',
      website: '',
      address: '',
      gstin: '',
      pan: '',
      bankDetails: {
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        branch: '',
        accountType: 'Current'
      },
      upiId: '',
      currency: 'INR',
      brandColor: '#2563eb',
      isDefault: false,
      documentPrefixes: {
        Proposal: 'PROP',
        Quotation: 'QUO',
        Invoice: 'INV',
        Receipt: 'REC'
      },
      defaultPaymentTerms: 'Payment due within 15 days of invoice date.',
      termsAndConditions: '1. Invoices are payable as per agreed terms.\n2. Work commences upon payment receipt.',
      signature: '',
      footerText: 'Thank you for your business!'
    };

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop animate-fade-in';
    modal.innerHTML = `
      <div class="modal-container modal-lg animate-scale-up">
        <div class="modal-header">
          <h3 class="modal-title">
            <i class="fa-solid ${isEdit ? 'fa-pen-to-square' : 'fa-building-circle-check'} text-primary"></i>
            ${isEdit ? 'Edit Agency Profile' : 'Add New Agency Profile'}
          </h3>
          <button class="modal-close-btn" id="modal-close">&times;</button>
        </div>

        <form id="company-form" class="modal-body">
          <div class="form-grid">
            <!-- Basic Details -->
            <div class="col-8 form-group">
              <label class="form-label">Agency / Company Name <span class="required">*</span></label>
              <input type="text" class="form-input" id="comp-name" required value="${Utils.escapeHtml(comp.name)}" placeholder="e.g. Apex Digital Creative Labs" />
            </div>

            <div class="col-4 form-group">
              <label class="form-label">Brand Color</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="color" id="comp-brand-color" value="${comp.brandColor || '#2563eb'}" style="width: 44px; height: 38px; padding: 2px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); cursor: pointer;" />
                <input type="text" class="form-input" id="comp-brand-color-text" value="${comp.brandColor || '#2563eb'}" style="font-family: monospace;" />
              </div>
            </div>

            <!-- Logo Upload -->
            <div class="col-6 form-group">
              <label class="form-label">Company Logo</label>
              <div style="display: flex; align-items: center; gap: 12px;">
                <div id="logo-preview-box" style="width: 56px; height: 56px; border: 1px dashed var(--border-color); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; background: #fff; overflow: hidden;">
                  ${comp.logo ? `<img src="${comp.logo}" style="width: 100%; height: 100%; object-fit: contain;" />` : '<i class="fa-solid fa-image text-muted"></i>'}
                </div>
                <div>
                  <input type="file" id="comp-logo-file" accept="image/*" style="display: none;" />
                  <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('comp-logo-file').click()">
                    <i class="fa-solid fa-upload"></i> Upload Logo
                  </button>
                  ${comp.logo ? `<button type="button" class="btn btn-outline btn-sm text-danger" id="btn-remove-logo" style="margin-left: 6px;">Remove</button>` : ''}
                </div>
              </div>
            </div>

            <!-- Currency & Default -->
            <div class="col-3 form-group">
              <label class="form-label">Base Currency</label>
              <select class="form-select" id="comp-currency">
                <option value="INR" ${comp.currency === 'INR' ? 'selected' : ''}>INR (₹ - Indian Rupee)</option>
                <option value="USD" ${comp.currency === 'USD' ? 'selected' : ''}>USD ($ - US Dollar)</option>
                <option value="EUR" ${comp.currency === 'EUR' ? 'selected' : ''}>EUR (€ - Euro)</option>
                <option value="GBP" ${comp.currency === 'GBP' ? 'selected' : ''}>GBP (£ - British Pound)</option>
                <option value="AED" ${comp.currency === 'AED' ? 'selected' : ''}>AED (UAE Dirham)</option>
                <option value="SGD" ${comp.currency === 'SGD' ? 'selected' : ''}>SGD (S$ - Singapore Dollar)</option>
                <option value="AUD" ${comp.currency === 'AUD' ? 'selected' : ''}>AUD (A$ - Australian Dollar)</option>
                <option value="CAD" ${comp.currency === 'CAD' ? 'selected' : ''}>CAD (C$ - Canadian Dollar)</option>
              </select>
            </div>

            <div class="col-3 form-group" style="justify-content: flex-end;">
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding-bottom: 10px;">
                <input type="checkbox" id="comp-is-default" ${comp.isDefault ? 'checked' : ''} />
                <span class="form-label" style="margin: 0;">Set as Default Agency</span>
              </label>
            </div>

            <!-- Contact & Address -->
            <div class="col-4 form-group">
              <label class="form-label">Email Address</label>
              <input type="email" class="form-input" id="comp-email" value="${Utils.escapeHtml(comp.email || '')}" placeholder="billing@agency.com" />
            </div>

            <div class="col-4 form-group">
              <label class="form-label">Phone Number</label>
              <input type="text" class="form-input" id="comp-phone" value="${Utils.escapeHtml(comp.phone || '')}" placeholder="+91 98765 43210" />
            </div>

            <div class="col-4 form-group">
              <label class="form-label">Website</label>
              <input type="url" class="form-input" id="comp-website" value="${Utils.escapeHtml(comp.website || '')}" placeholder="https://agency.com" />
            </div>

            <div class="col-12 form-group">
              <label class="form-label">Full Address (Appears on Invoices & Quotations)</label>
              <textarea class="form-textarea" id="comp-address" rows="2" placeholder="Suite / Street, Area, City, State, PIN Code">${Utils.escapeHtml(comp.address || '')}</textarea>
            </div>

            <!-- Tax Registration Numbers -->
            <div class="col-6 form-group">
              <label class="form-label">GSTIN (Optional)</label>
              <input type="text" class="form-input" id="comp-gstin" value="${Utils.escapeHtml(comp.gstin || '')}" placeholder="29ABCDE1234F1Z5" />
            </div>

            <div class="col-6 form-group">
              <label class="form-label">PAN (Optional)</label>
              <input type="text" class="form-input" id="comp-pan" value="${Utils.escapeHtml(comp.pan || '')}" placeholder="ABCDE1234F" />
            </div>

            <!-- Document Prefixes -->
            <div class="col-12" style="border-top: 1px solid var(--border-color); padding-top: 14px; margin-top: 8px;">
              <h4 style="font-size: 13.5px; font-weight: 700; margin-bottom: 10px; color: var(--text-main);">
                <i class="fa-solid fa-hashtag text-primary"></i> Document Number Prefixes
              </h4>
            </div>

            <div class="col-3 form-group">
              <label class="form-label">Invoice Prefix</label>
              <input type="text" class="form-input" id="comp-pref-inv" value="${comp.documentPrefixes?.Invoice || 'INV'}" />
            </div>

            <div class="col-3 form-group">
              <label class="form-label">Quotation Prefix</label>
              <input type="text" class="form-input" id="comp-pref-quo" value="${comp.documentPrefixes?.Quotation || 'QUO'}" />
            </div>

            <div class="col-3 form-group">
              <label class="form-label">Proposal Prefix</label>
              <input type="text" class="form-input" id="comp-pref-prop" value="${comp.documentPrefixes?.Proposal || 'PROP'}" />
            </div>

            <div class="col-3 form-group">
              <label class="form-label">Receipt Prefix</label>
              <input type="text" class="form-input" id="comp-pref-rec" value="${comp.documentPrefixes?.Receipt || 'REC'}" />
            </div>

            <!-- Banking & UPI Details -->
            <div class="col-12" style="border-top: 1px solid var(--border-color); padding-top: 14px; margin-top: 8px;">
              <h4 style="font-size: 13.5px; font-weight: 700; margin-bottom: 10px; color: var(--text-main);">
                <i class="fa-solid fa-building-columns text-primary"></i> Bank & UPI Payment Details
              </h4>
            </div>

            <div class="col-6 form-group">
              <label class="form-label">Bank Name</label>
              <input type="text" class="form-input" id="comp-bank-name" value="${Utils.escapeHtml(comp.bankDetails?.bankName || '')}" placeholder="e.g. HDFC Bank Ltd" />
            </div>

            <div class="col-6 form-group">
              <label class="form-label">Account Number</label>
              <input type="text" class="form-input" id="comp-bank-acc" value="${Utils.escapeHtml(comp.bankDetails?.accountNumber || '')}" placeholder="Account Number" />
            </div>

            <div class="col-4 form-group">
              <label class="form-label">IFSC Code</label>
              <input type="text" class="form-input" id="comp-bank-ifsc" value="${Utils.escapeHtml(comp.bankDetails?.ifscCode || '')}" placeholder="HDFC0000123" />
            </div>

            <div class="col-4 form-group">
              <label class="form-label">Branch</label>
              <input type="text" class="form-input" id="comp-bank-branch" value="${Utils.escapeHtml(comp.bankDetails?.branch || '')}" placeholder="Branch Location" />
            </div>

            <div class="col-4 form-group">
              <label class="form-label">UPI ID / VPA</label>
              <input type="text" class="form-input" id="comp-upi-id" value="${Utils.escapeHtml(comp.upiId || '')}" placeholder="agency@upi" />
            </div>

            <!-- Signature & Terms -->
            <div class="col-12" style="border-top: 1px solid var(--border-color); padding-top: 14px; margin-top: 8px;">
              <h4 style="font-size: 13.5px; font-weight: 700; margin-bottom: 10px; color: var(--text-main);">
                <i class="fa-solid fa-signature text-primary"></i> Terms, Conditions & Authorized Signature
              </h4>
            </div>

            <div class="col-6 form-group">
              <label class="form-label">Default Terms & Conditions</label>
              <textarea class="form-textarea" id="comp-terms" rows="3">${Utils.escapeHtml(comp.termsAndConditions || '')}</textarea>
            </div>

            <div class="col-6 form-group">
              <label class="form-label">Authorized Signature / Stamp</label>
              <div style="display: flex; align-items: center; gap: 12px;">
                <div id="sign-preview-box" style="width: 120px; height: 56px; border: 1px dashed var(--border-color); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; background: #fff; overflow: hidden;">
                  ${comp.signature ? `<img src="${comp.signature}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />` : '<span style="font-size: 11px; color: var(--text-muted);">No Signature</span>'}
                </div>
                <div>
                  <input type="file" id="comp-sign-file" accept="image/*" style="display: none;" />
                  <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('comp-sign-file').click()">
                    <i class="fa-solid fa-upload"></i> Upload Signature
                  </button>
                  ${comp.signature ? `<button type="button" class="btn btn-outline btn-sm text-danger" id="btn-remove-sign" style="margin-left: 6px;">Remove</button>` : ''}
                </div>
              </div>
            </div>

            <div class="col-12 form-group">
              <label class="form-label">Footer Note</label>
              <input type="text" class="form-input" id="comp-footer" value="${Utils.escapeHtml(comp.footerText || '')}" placeholder="e.g. Thank you for your business!" />
            </div>
          </div>
        </form>

        <div class="modal-footer">
          <button type="button" class="btn btn-outline" id="modal-cancel">Cancel</button>
          <button type="submit" form="company-form" class="btn btn-primary" id="btn-save-company">
            <i class="fa-solid fa-check"></i> ${isEdit ? 'Save Changes' : 'Create Company'}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    let logoBase64 = comp.logo || '';
    let signBase64 = comp.signature || '';

    // Color sync
    const colorPicker = modal.querySelector('#comp-brand-color');
    const colorText = modal.querySelector('#comp-brand-color-text');
    colorPicker.oninput = (e) => colorText.value = e.target.value;
    colorText.oninput = (e) => colorPicker.value = e.target.value;

    // Logo upload handler
    const logoFile = modal.querySelector('#comp-logo-file');
    logoFile.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        logoBase64 = await Utils.readFileAsBase64(file);
        modal.querySelector('#logo-preview-box').innerHTML = `<img src="${logoBase64}" style="width: 100%; height: 100%; object-fit: contain;" />`;
      }
    };

    const btnRemoveLogo = modal.querySelector('#btn-remove-logo');
    if (btnRemoveLogo) {
      btnRemoveLogo.onclick = () => {
        logoBase64 = '';
        modal.querySelector('#logo-preview-box').innerHTML = '<i class="fa-solid fa-image text-muted"></i>';
        btnRemoveLogo.remove();
      };
    }

    // Signature upload handler
    const signFile = modal.querySelector('#comp-sign-file');
    signFile.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        signBase64 = await Utils.readFileAsBase64(file);
        modal.querySelector('#sign-preview-box').innerHTML = `<img src="${signBase64}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />`;
      }
    };

    const btnRemoveSign = modal.querySelector('#btn-remove-sign');
    if (btnRemoveSign) {
      btnRemoveSign.onclick = () => {
        signBase64 = '';
        modal.querySelector('#sign-preview-box').innerHTML = '<span style="font-size: 11px; color: var(--text-muted);">No Signature</span>';
        btnRemoveSign.remove();
      };
    }

    // Close handlers
    const closeModal = () => modal.remove();
    modal.querySelector('#modal-close').onclick = closeModal;
    modal.querySelector('#modal-cancel').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    // Form submission
    const form = modal.querySelector('#company-form');
    form.onsubmit = async (e) => {
      e.preventDefault();

      const name = modal.querySelector('#comp-name').value.trim();
      if (!name) {
        Utils.showToast('Please enter a company name', 'error');
        return;
      }

      const updatedCompany = {
        ...comp,
        name,
        brandColor: colorPicker.value,
        logo: logoBase64,
        currency: modal.querySelector('#comp-currency').value,
        isDefault: modal.querySelector('#comp-is-default').checked,
        email: modal.querySelector('#comp-email').value.trim(),
        phone: modal.querySelector('#comp-phone').value.trim(),
        website: modal.querySelector('#comp-website').value.trim(),
        address: modal.querySelector('#comp-address').value.trim(),
        gstin: modal.querySelector('#comp-gstin').value.trim(),
        pan: modal.querySelector('#comp-pan').value.trim(),
        documentPrefixes: {
          Invoice: modal.querySelector('#comp-pref-inv').value.trim() || 'INV',
          Quotation: modal.querySelector('#comp-pref-quo').value.trim() || 'QUO',
          Proposal: modal.querySelector('#comp-pref-prop').value.trim() || 'PROP',
          Receipt: modal.querySelector('#comp-pref-rec').value.trim() || 'REC'
        },
        bankDetails: {
          bankName: modal.querySelector('#comp-bank-name').value.trim(),
          accountNumber: modal.querySelector('#comp-bank-acc').value.trim(),
          ifscCode: modal.querySelector('#comp-bank-ifsc').value.trim(),
          branch: modal.querySelector('#comp-bank-branch').value.trim(),
          accountType: 'Current'
        },
        upiId: modal.querySelector('#comp-upi-id').value.trim(),
        termsAndConditions: modal.querySelector('#comp-terms').value.trim(),
        signature: signBase64,
        footerText: modal.querySelector('#comp-footer').value.trim()
      };

      const saved = await window.db.saveCompany(updatedCompany);
      await window.appState.refreshCompanies();

      if (!window.appState.currentCompanyId || window.appState.currentCompanyId === saved.id) {
        await window.appState.setActiveCompany(saved.id, false);
      }

      closeModal();
      Utils.showToast(`Company profile "${saved.name}" saved successfully!`, 'success');
      CompaniesView.render(document.getElementById('view-container'));
    };
  }
};

window.CompaniesView = CompaniesView;
