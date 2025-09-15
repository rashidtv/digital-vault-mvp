console.log('✅ Dashboard JS loaded');

// DOM Elements
const uploadForm = document.getElementById('uploadForm');
const uploadStatus = document.getElementById('uploadStatus');
const vaultItems = document.getElementById('vaultItems');
const fileInput = document.getElementById('document');

// Token from localStorage
const dashboardToken = localStorage.getItem('token');

// --- Auth check ---
if (!dashboardToken) {
  console.log('❌ No token found, redirecting to home');
  window.location.href = '/';
} else {
  console.log('✅ Token found');
  initializeUploadHandler();
  loadVaultItems();
}

// --- Logout ---
function logout() {
  localStorage.removeItem('token');
  window.location.href = '/';
}

// --- Upload handler ---
function initializeUploadHandler() {
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const file = fileInput.files[0];
    if (!file) {
      showUploadStatus('Please select a file first', 'danger');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showUploadStatus('Invalid file type. Allowed: JPG, PNG, PDF, WEBP', 'danger');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      showUploadStatus('File size must be under 10MB', 'danger');
      return;
    }

    const formData = new FormData();
    formData.append('document', file);

    setUploadLoading(true);
    showUploadStatus('Uploading and processing document...', 'info');

    try {
      const response = await fetch('/api/vault/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${dashboardToken}` },
        body: formData
      });

      const data = await response.json();
      console.log('Upload response:', data);

      if (response.ok && data.status === 'success') {
        showUploadStatus('✅ ' + data.message, 'success');
        resetUploadForm();
        loadVaultItems();
      } else {
        showUploadStatus('❌ ' + (data.message || 'Upload failed'), 'danger');
      }
    } catch (err) {
      console.error('Upload error:', err);
      showUploadStatus('❌ Upload failed: ' + err.message, 'danger');
    } finally {
      setUploadLoading(false);
    }
  });
}

// --- File controls ---
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
  } else {
    clearFile();
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

// --- Status messages ---
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
  const spinner = document.getElementById('uploadSpinner');

  if (isLoading) {
    button.disabled = true;
    spinner.classList.remove('d-none');
    button.querySelector('.upload-text').textContent = 'Processing...';
  } else {
    button.disabled = false;
    spinner.classList.add('d-none');
    button.querySelector('.upload-text').textContent = 'Upload & Process Document';
  }
}

// --- Vault Items ---
async function loadVaultItems() {
  try {
    const response = await fetch('/api/vault/items', {
      headers: { Authorization: `Bearer ${dashboardToken}` }
    });

    const items = await response.json();
    displayVaultItems(items);
  } catch (err) {
    console.error('Error loading vault items:', err);
    vaultItems.innerHTML = `
      <div class="alert alert-danger">Error loading documents. Please try again.</div>
    `;
  }
}

function displayVaultItems(items) {
  if (!items || items.length === 0) {
    vaultItems.innerHTML = `
      <div class="text-center py-4 text-muted">
        No documents uploaded yet. Upload your first property grant to get started.
      </div>
    `;
    return;
  }

  vaultItems.innerHTML = items.map(item => `
    <div class="card mb-3 vault-item">
      <div class="card-body">
        <h6 class="card-title">
          ${item.originalName} <small class="text-muted">(${formatFileSize(item.fileSize)})</small>
        </h6>
        <p class="mb-1"><strong>Status:</strong> ${item.ocrStatus}</p>
        <p class="mb-0"><strong>Uploaded:</strong> ${new Date(item.createdAt).toLocaleString()}</p>
      </div>
    </div>
  `).join('');
}

// --- Utils ---
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
