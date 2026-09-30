/**
 * AgencyBooks - Backup & Restore View
 * Full database JSON export, company-scoped backup, JSON validation,
 * schema verification, and restore/merge mechanisms.
 */

const BackupView = {
  async render(container) {
    const companies = await window.db.getCompanies();
    const activeCompanyId = window.appState.currentCompanyId;
    const activeCompany = window.appState.currentCompany;

    // Check storage estimate if available
    let storageInfo = 'Local IndexedDB Active';
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const usedMB = (estimate.usage / (1024 * 1024)).toFixed(2);
        const quotaMB = (estimate.quota / (1024 * 1024)).toFixed(0);
        storageInfo = `${usedMB} MB used of ~${quotaMB} MB browser allocation`;
      } catch (e) {
        // fallback
      }
    }

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h2>Backup & Data Safety</h2>
          <p>Protect your agency's financial ledgers, documents, client directory, and settings.</p>
        </div>
      </div>

      <!-- Safety Alert Callout -->
      <div class="card mb-4" style="background: #fffbeb; border-color: #fde68a;">
        <div class="card-body" style="padding: 16px 20px; display: flex; align-items: flex-start; gap: 14px;">
          <div style="font-size: 22px; color: #d97706; margin-top: 2px;">
            <i class="fa-solid fa-shield-halved"></i>
          </div>
          <div>
            <h4 style="font-size: 14px; font-weight: 700; color: #92400e; margin-bottom: 4px;">
              Important: Browser Storage & Backup Advisory
            </h4>
            <p style="font-size: 13px; color: #b45309; line-height: 1.5; margin: 0;">
              AgencyBooks stores all your agencies, proposals, invoices, client records, and signatures securely inside your browser's private IndexedDB storage.
              <strong>If you clear your browser site data or use private incognito mode, local data can be lost.</strong> We strongly advise downloading a full JSON backup weekly or prior to clearing browser history.
            </p>
          </div>
        </div>
      </div>

      <div class="form-grid">
        <!-- Export All Data Card -->
        <div class="col-6">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title"><i class="fa-solid fa-cloud-arrow-down text-primary"></i> Export Full Backup</h3>
            </div>
            <div class="card-body">
              <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px; line-height: 1.5;">
                Generates a complete, verified JSON file containing all registered companies, clients, proposals, quotations, invoices, payments, receipts, logos, and preferences.
              </p>
              <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 20px;">
                <i class="fa-solid fa-hard-drive"></i> Storage Diagnostic: <strong>${storageInfo}</strong>
              </div>
              <button class="btn btn-primary" id="btn-export-full-backup">
                <i class="fa-solid fa-download"></i> Download Full System Backup (JSON)
              </button>
            </div>
          </div>
        </div>

        <!-- Export Single Agency Data Card -->
        <div class="col-6">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title"><i class="fa-solid fa-building text-primary"></i> Export Single Agency Backup</h3>
            </div>
            <div class="card-body">
              <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px; line-height: 1.5;">
                Export only the selected agency's profile, its specific clients, documents, and payment receipts. Ideal for archiving or sharing with an accountant.
              </p>
              <div class="form-group mb-4">
                <label class="form-label">Select Agency to Export</label>
                <select class="form-select" id="export-company-select">
                  ${companies.map(c => `
                    <option value="${c.id}" ${c.id === activeCompanyId ? 'selected' : ''}>${Utils.escapeHtml(c.name)}</option>
                  `).join('')}
                </select>
              </div>
              <button class="btn btn-secondary" id="btn-export-company-backup">
                <i class="fa-solid fa-download"></i> Download Agency Archive (JSON)
              </button>
            </div>
          </div>
        </div>

        <!-- Restore / Import Data Card -->
        <div class="col-12 mt-3">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title"><i class="fa-solid fa-cloud-arrow-up text-primary"></i> Restore from JSON Backup</h3>
            </div>
            <div class="card-body">
              <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px; line-height: 1.5;">
                Select a valid <code>.json</code> file previously exported from AgencyBooks. The system will inspect and validate the schema before updating your local database.
              </p>

              <div style="background: var(--bg-hover); border: 2px dashed var(--border-color); border-radius: var(--radius-lg); padding: 32px; text-align: center; margin-bottom: 20px;">
                <input type="file" id="backup-file-input" accept=".json" style="display: none;" />
                <div style="font-size: 32px; color: var(--primary); margin-bottom: 10px;">
                  <i class="fa-solid fa-file-code"></i>
                </div>
                <h4 style="font-size: 15px; font-weight: 700; color: var(--text-main); margin-bottom: 4px;">
                  Select AgencyBooks Backup File
                </h4>
                <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">
                  Supports Full System Backups or Single Agency Archives
                </p>
                <button type="button" class="btn btn-primary" onclick="document.getElementById('backup-file-input').click()">
                  <i class="fa-solid fa-folder-open"></i> Browse Backup File
                </button>
              </div>

              <div id="import-preview-box" style="display: none; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; margin-bottom: 16px;"></div>
            </div>
          </div>
        </div>

        <!-- Danger Zone: Reset / Clean Slate Database -->
        <div class="col-12 mt-3">
          <div class="card" style="border-color: #fecaca; background: #fffafb;">
            <div class="card-header" style="background: transparent; border-bottom: 1px solid #fee2e2;">
              <h3 class="card-title text-danger"><i class="fa-solid fa-triangle-exclamation"></i> Danger Zone: Database Reset</h3>
            </div>
            <div class="card-body">
              <p style="font-size: 13px; color: #7f1d1d; margin-bottom: 14px; line-height: 1.5;">
                Need a completely clean slate or want to remove all existing records and legacy demo data? Resetting the database clears all companies, clients, documents, and payments stored in this browser.
              </p>
              <button class="btn btn-danger btn-sm" id="btn-purge-database">
                <i class="fa-solid fa-trash-can"></i> Purge All Records & Reset Database
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    // Export Full Backup
    const btnFull = container.querySelector('#btn-export-full-backup');
    if (btnFull) {
      btnFull.onclick = async () => {
        try {
          const backup = await window.db.exportAllData();
          const jsonStr = JSON.stringify(backup, null, 2);
          const blob = new Blob([jsonStr], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const dateStr = new Date().toISOString().split('T')[0];
          a.href = url;
          a.download = `AgencyBooks_FullBackup_${dateStr}.json`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          Utils.showToast('Full backup downloaded successfully!', 'success');
        } catch (e) {
          console.error(e);
          Utils.showToast('Failed to export backup: ' + e.message, 'error');
        }
      };
    }

    // Export Single Company Backup
    const btnComp = container.querySelector('#btn-export-company-backup');
    if (btnComp) {
      btnComp.onclick = async () => {
        const compId = container.querySelector('#export-company-select').value;
        try {
          const backup = await window.db.exportCompanyData(compId);
          const jsonStr = JSON.stringify(backup, null, 2);
          const blob = new Blob([jsonStr], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const safeName = backup.companyName.replace(/[^a-zA-Z0-9]/g, '_');
          const dateStr = new Date().toISOString().split('T')[0];
          a.href = url;
          a.download = `AgencyBooks_${safeName}_Backup_${dateStr}.json`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          Utils.showToast(`Backup for "${backup.companyName}" downloaded!`, 'success');
        } catch (e) {
          console.error(e);
          Utils.showToast('Failed to export company: ' + e.message, 'error');
        }
      };
    }

    // Import Backup File
    const fileInput = container.querySelector('#backup-file-input');
    const previewBox = container.querySelector('#import-preview-box');

    if (fileInput) {
      fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          const text = await file.text();
          const parsed = JSON.parse(text);

          if (!parsed.appName || parsed.appName !== 'AgencyBooks' || !parsed.data) {
            Utils.showToast('Invalid backup file. Not an AgencyBooks backup format.', 'error');
            return;
          }

          const isSingle = parsed.exportType === 'SingleCompany';
          const data = parsed.data;

          previewBox.style.display = 'block';
          previewBox.innerHTML = `
            <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 14px;">
              <div>
                <h4 style="font-size: 14.5px; font-weight: 700; color: var(--text-main); margin-bottom: 2px;">
                  Backup File Verified: ${Utils.escapeHtml(file.name)}
                </h4>
                <p style="font-size: 12px; color: var(--text-muted); margin: 0;">
                  Export Date: ${Utils.formatDateTime(parsed.exportDate)} • Type: ${isSingle ? `Single Agency (${Utils.escapeHtml(parsed.companyName)})` : 'Full System Backup'}
                </p>
              </div>
              <span class="badge badge-success"><i class="fa-solid fa-check"></i> Valid Schema</span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: var(--bg-hover); padding: 12px; border-radius: var(--radius-sm); margin-bottom: 16px; font-size: 12px;">
              <div><strong>Companies:</strong> ${isSingle ? 1 : (data.companies?.length || 0)}</div>
              <div><strong>Clients:</strong> ${data.clients?.length || 0}</div>
              <div><strong>Documents:</strong> ${data.documents?.length || 0}</div>
              <div><strong>Payments:</strong> ${data.payments?.length || 0}</div>
            </div>

            <div style="display: flex; gap: 10px; justify-content: flex-end;">
              <button class="btn btn-outline btn-sm" id="btn-cancel-import">Cancel</button>
              <button class="btn btn-primary btn-sm" id="btn-confirm-merge">
                <i class="fa-solid fa-code-merge"></i> Merge into Existing Data
              </button>
              ${!isSingle ? `
                <button class="btn btn-danger btn-sm" id="btn-confirm-overwrite">
                  <i class="fa-solid fa-triangle-exclamation"></i> Replace All Existing Data
                </button>
              ` : ''}
            </div>
          `;

          previewBox.querySelector('#btn-cancel-import').onclick = () => {
            previewBox.style.display = 'none';
            fileInput.value = '';
          };

          previewBox.querySelector('#btn-confirm-merge').onclick = async () => {
            const confirmed = await Utils.showConfirmDialog({
              title: 'Confirm Merge Data',
              message: 'Imported records will be merged with your current database. Existing records with identical IDs will be updated.',
              confirmText: 'Merge Data'
            });
            if (confirmed) {
              await window.db.importData(parsed, 'merge');
              await window.appState.refreshCompanies();
              Utils.showToast('Data imported and merged successfully!', 'success');
              fileInput.value = '';
              BackupView.render(container);
            }
          };

          const btnOverwrite = previewBox.querySelector('#btn-confirm-overwrite');
          if (btnOverwrite) {
            btnOverwrite.onclick = async () => {
              const confirmed = await Utils.showConfirmDialog({
                title: 'CRITICAL: Replace All Data?',
                message: 'This will completely erase all current companies, clients, and documents in this browser and replace them with the backup contents. Are you absolutely certain?',
                confirmText: 'Erase and Replace All',
                isDanger: true
              });
              if (confirmed) {
                await window.db.importData(parsed, 'overwrite');
                await window.appState.refreshCompanies();
                Utils.showToast('Database restored completely from backup!', 'success');
                fileInput.value = '';
                BackupView.render(container);
              }
            };
          }
        } catch (err) {
          console.error(err);
          Utils.showToast('Error reading backup file: ' + err.message, 'error');
        }
      };
    }

    // Purge / Clean Slate
    const btnPurge = container.querySelector('#btn-purge-database');
    if (btnPurge) {
      btnPurge.onclick = async () => {
        const confirmed = await Utils.showConfirmDialog({
          title: 'Clean Slate: Reset All Data?',
          message: 'This will permanently erase all companies, clients, documents, invoices, proposals, payments, and settings in this browser. This cannot be undone. Are you sure?',
          confirmText: 'Yes, Purge and Reset',
          isDanger: true
        });

        if (confirmed) {
          await window.db.resetAllData();
          await window.appState.refreshCompanies();
          Utils.showToast('All application data has been purged. Clean slate initialized.', 'info');
          window.app.navigateTo('dashboard');
        }
      };
    }
  }
};

window.BackupView = BackupView;
