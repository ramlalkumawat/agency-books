/**
 * AgencyBooks - Utilities & Helpers
 * Formatting, Notifications, Dialogs, Calculations, and Export tools
 */

const Utils = {
  // Currency formatting with Indian lakh/crore formatting or international standard
  formatCurrency(amount, currency = 'INR') {
    const val = parseFloat(amount) || 0;
    const symbols = {
      INR: '₹',
      USD: '$',
      EUR: '€',
      GBP: '£',
      AED: 'AED ',
      SGD: 'S$',
      AUD: 'A$',
      CAD: 'C$'
    };
    const symbol = symbols[currency] || (currency + ' ');

    let formattedNumber = '';
    if (currency === 'INR') {
      formattedNumber = new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(val);
    } else {
      formattedNumber = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(val);
    }

    return `${symbol} ${formattedNumber}`;
  },

  formatNumber(val) {
    const n = parseFloat(val) || 0;
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(n);
  },

  formatDate(dateString) {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  },

  formatDateTime(dateString) {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  },

  getDaysDifference(fromDate, toDate = new Date()) {
    if (!fromDate) return 0;
    const d1 = new Date(fromDate);
    const d2 = new Date(toDate);
    const diffTime = d1 - d2;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  // Convert numbers to words in Indian English (Lakhs & Crores) for invoices
  numberToWordsINR(amount) {
    const num = Math.round(parseFloat(amount) || 0);
    if (num === 0) return 'Zero Rupees Only';

    const a = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function inWords(n) {
      if (n === 0) return '';
      if (n < 20) return a[n] + ' ';
      if (n < 100) return b[Math.floor(n / 10)] + ' ' + (n % 10 !== 0 ? a[n % 10] + ' ' : '');
      if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred ' + inWords(n % 100);
      if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + inWords(n % 1000);
      if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + inWords(n % 100000);
      return inWords(Math.floor(n / 10000000)) + 'Crore ' + inWords(n % 10000000);
    }

    const words = inWords(num).trim();
    return words ? `${words} Rupees Only` : 'Zero Rupees Only';
  },

  // Toast notifications
  showToast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} animate-slide-in`;

    const iconMap = {
      success: 'fa-solid fa-circle-check',
      error: 'fa-solid fa-circle-exclamation',
      warning: 'fa-solid fa-triangle-exclamation',
      info: 'fa-solid fa-circle-info'
    };

    const icon = iconMap[type] || iconMap.info;

    toast.innerHTML = `
      <div class="toast-icon"><i class="${icon}"></i></div>
      <div class="toast-message">${Utils.escapeHtml(message)}</div>
      <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('animate-slide-out');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // Elegant async confirmation dialog
  showConfirmDialog({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false }) {
    return new Promise((resolve) => {
      const modalOverlay = document.createElement('div');
      modalOverlay.className = 'modal-backdrop animate-fade-in';
      modalOverlay.innerHTML = `
        <div class="confirm-dialog animate-scale-up">
          <div class="confirm-dialog-header">
            <div class="confirm-icon ${isDanger ? 'danger' : 'primary'}">
              <i class="fa-solid ${isDanger ? 'fa-triangle-exclamation' : 'fa-circle-question'}"></i>
            </div>
            <div>
              <h3 class="confirm-title">${Utils.escapeHtml(title)}</h3>
              <p class="confirm-message">${Utils.escapeHtml(message)}</p>
            </div>
          </div>
          <div class="confirm-dialog-actions">
            <button class="btn btn-outline" id="confirm-btn-cancel">${Utils.escapeHtml(cancelText)}</button>
            <button class="btn ${isDanger ? 'btn-danger' : 'btn-primary'}" id="confirm-btn-ok">${Utils.escapeHtml(confirmText)}</button>
          </div>
        </div>
      `;

      document.body.appendChild(modalOverlay);

      const cleanup = (result) => {
        modalOverlay.remove();
        resolve(result);
      };

      modalOverlay.querySelector('#confirm-btn-ok').onclick = () => cleanup(true);
      modalOverlay.querySelector('#confirm-btn-cancel').onclick = () => cleanup(false);
      modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) cleanup(false);
      };
    });
  },

  // Helper to escape HTML safely
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  // CSV export helper
  exportToCSV(filename, headers, rows) {
    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '""';
      let str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += headers.map(escapeCSV).join(',') + '\r\n';

    rows.forEach(row => {
      csvContent += row.map(escapeCSV).join(',') + '\r\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  // Read file as base64 (for logos and signatures)
  readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve('');
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  },

  // Status badge styling helper
  getStatusBadgeClass(status) {
    const s = (status || '').toLowerCase().trim();
    switch (s) {
      case 'paid':
      case 'accepted':
        return 'badge-success';
      case 'sent':
      case 'viewed':
        return 'badge-info';
      case 'partially paid':
      case 'converted':
        return 'badge-warning';
      case 'overdue':
      case 'rejected':
      case 'cancelled':
        return 'badge-danger';
      case 'unpaid':
        return 'badge-orange';
      case 'draft':
      default:
        return 'badge-neutral';
    }
  },

  debounce(func, wait = 250) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
};

window.Utils = Utils;
