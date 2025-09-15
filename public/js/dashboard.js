console.log('✅ Dashboard JS loaded');

// DOM Elements
const uploadForm = document.getElementById('uploadForm');
const uploadStatus = document.getElementById('uploadStatus');
const vaultItemsContainer = document.getElementById('vaultItems');
const fileInput = document.getElementById('document');

// Token check
const dashboardToken = localStorage.getItem('token');
console.log('✅ Token found:', !!dashboardToken);

if (!dashboardToken) {
  console.log('❌ No token, redirecting...');
  window.location.href = '/';
} else {
  initializeUploadHandler();
  loadVaultItems();
}

// Initialize upload form
function initializeUploadHandler() {
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const file = fileInput.files[0];
    if (!file) {
      showUploadStatus('Please select a file first', 'danger');
      return;
    }

    const formData = new FormData();
    formData.append('document', file);

    setUploadLoading(true);
    showUploadStatus('Uploading and processing...', 'info');

    try {
      const response = await fetch('/api/vault/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${dashboardToken}`
        },
        body: formData
      });

      const data = await response.json();
      console.log('Upload response:', data);

      if (response.ok && data.status === 'success') {
        showUploadStatus('✅ ' + data.message, 'success');
        resetUploadForm();

        // Insert new item immediately
        if (data.item) {
          vaultItemsContainer.insertAdjacentHTML('afterbegin', renderVaultItem(data.item));
        }

        loadVaultItems(); // refresh from API
      } else {
        showUploadStatus('❌ ' + (data.message || 'Upload failed'), 'danger');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showUploadStatus('❌ Error: ' + error.message, 'danger');
    } finally {
      setUploadLoading(false);
    }
  });
}

// Reset upload form
function resetUploadForm() {
  fileInput.value = '';
  const fileInfo = document.getElementById('fileInfo');
  if (fileInfo) fileInfo.style.display = 'none';
}

// Render vault item
function renderVaultItem(item) {
  return `
    <div class="card mb-3 vault-item">
      <div class="card-body">
        <h6 class="card-title">
          <i class="bi bi-file-earmark-${item.fileType.includes('pdf') ? 'pdf' : 'image'} me-2"></i>
          ${item.originalName}
        </h6>
        <p class="mb-1">
          <small>Uploaded: ${new Date(item.createdAt).toLocaleString()}</small>
        </p>
        <p>
          <span class="badge bg-${getStatusColor(item.ocrStatus)}">${item.ocrStatus}</span>
        </p>
      </div>
    </div>
  `;
}

// Show upload status
function showUploadStatus(message, type = 'info') {
  uploadStatus.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
}

// Upload loading state
function setUploadLoading(isLoading) {
  const button = document.getElementById('uploadButton');
  const spinner = document.getElementById('uploadSpinner');
  
  if (isLoading) {
    button.disabled = true;
    button.innerHTML = 'Processing... <span id="uploadSpinner" class="spinner-border spinner-border-sm"></span>';
  } else {
    button.disabled = false;
    button.innerHTML = 'Upload & Process Document';
  }
}

// Load vault items
async function loadVaultItems() {
  try {
    const response = await fetch('/api/vault/items', {
      headers: { 'Authorization': `Bearer ${dashboardToken}` }
    });
    const items = await response.json();
    displayVaultItems(items);
  } catch (error) {
    console.error('Error loading items:', error);
    vaultItemsContainer.innerHTML = `
      <div class="alert alert-danger">Error loading documents.</div>
    `;
  }
}

// Display vault items
function displayVaultItems(items) {
  if (!items.length) {
    vaultItemsContainer.innerHTML = `
      <div class="text-center py-4 text-muted">
        No documents uploaded yet.
      </div>
    `;
    return;
  }
  vaultItemsContainer.innerHTML = items.map(renderVaultItem).join('');
}

// Status colors
function getStatusColor(status) {
  const colors = {
    'completed': 'success',
    'processing': 'warning',
    'pending': 'secondary',
    'failed': 'danger'
  };
  return colors[status] || 'secondary';
}
