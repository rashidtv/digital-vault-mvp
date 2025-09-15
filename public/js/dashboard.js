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

// ------------------- Upload Handling -------------------
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

        if (data.item) {
          vaultItemsContainer.insertAdjacentHTML('afterbegin', renderVaultItem(data.item));
        }

        loadVaultItems(); // refresh from server
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

// ------------------- File Input Helpers -------------------
function triggerFileInput() {
  fileInput.click();
}

function handleFileSelect(input) {
  const file = input.files[0];
  const fileInfo = document.getElementById('fileInfo');
  const uploadButton = document.getElementById('uploadButton');

  if (file) {
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatFileSize(file.size);
    fileInfo.style.display = 'block';
    uploadButton.disabled = false;
  }
}

function clearFile() {
  fileInput.value = '';
  const fileInfo = document.getElementById('fileInfo');
  const uploadButton = document.getElementById('uploadButton');
  fileInfo.style.display = 'none';
  uploadButton.disabled = true;
}

function resetUploadForm() {
  clearFile();
}

// ------------------- Vault Display -------------------
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

function renderVaultItem(item) {
  const type = item.fileType || 'application/pdf'; // fallback
  const icon = type.includes('pdf') ? 'pdf' : 'image';

  return `
    <div class="card mb-3 vault-item">
      <div class="card-body">
        <h6 class="card-title">
          <i class="bi bi-file-earmark-${icon} me-2"></i>
          ${item.originalName || 'Untitled Document'}
        </h6>
        <p class="mb-1">
          <small>Uploaded: ${new Date(item.createdAt).toLocaleString()}</small>
        </p>
        <p>
          <span class="badge bg-${getStatusColor(item.ocrStatus || 'pending')}">
            ${item.ocrStatus || 'pending'}
          </span>
        </p>
      </div>
    </div>
  `;
}

// ------------------- Utils -------------------
function showUploadStatus(message, type = 'info') {
  uploadStatus.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
}

function setUploadLoading(isLoading) {
  const button = document.getElementById('uploadButton');
  if (isLoading) {
    button.disabled = true;
    button.innerHTML = 'Processing... <span id="uploadSpinner" class="spinner-border spinner-border-sm"></span>';
  } else {
    button.disabled = false;
    button.innerHTML = '<span class="upload-text">Upload & Process Document</span>';
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getStatusColor(status) {
  const colors = {
    'completed': 'success',
    'processing': 'warning',
    'pending': 'secondary',
    'failed': 'danger'
  };
  return colors[status] || 'secondary';
}
