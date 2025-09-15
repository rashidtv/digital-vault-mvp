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
  const vaultItemsContainer = document.getElementById('vaultItems');
  const itemsCount = document.getElementById('itemsCount');

  if (itemsCount) {
    itemsCount.textContent = `${items.length} document${items.length !== 1 ? 's' : ''}`;
  }

  if (items.length === 0) {
    vaultItemsContainer.innerHTML = `
      <div class="text-center py-4">
        <div class="text-muted">No documents uploaded yet.</div>
        <small class="text-muted">Upload your first property grant above to get started!</small>
      </div>
    `;
    return;
  }

  vaultItemsContainer.innerHTML = items.map(item => `
    <div class="card mb-3 vault-item">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start">
          <div class="flex-grow-1">
            <h6 class="card-title d-flex align-items-center">
              <i class="bi bi-file-earmark-${item.fileType.includes('pdf') ? 'pdf' : 'image'} me-2"></i>
              ${item.originalName}
            </h6>
            <p class="card-text mb-1">
              <small class="text-muted">
                <i class="bi bi-calendar me-1"></i>
                Uploaded: ${new Date(item.createdAt).toLocaleDateString()} at ${new Date(item.createdAt).toLocaleTimeString()}
              </small>
            </p>
            <p class="card-text mb-2">
              <small class="text-muted">
                <i class="bi bi-hdd me-1"></i>
                Size: ${formatFileSize(item.fileSize)}
              </small>
            </p>
            <p class="card-text mb-2">
              <small class="text-muted">
                <i class="bi bi-person me-1"></i>
                Nominee: ${item.nominee?.name || '—'} (${item.nominee?.relationship || '—'})
              </small>
            </p>
            <div class="d-flex align-items-center">
              <span class="badge status-badge bg-${getStatusColor(item.ocrStatus)} me-2">
                ${item.ocrStatus}
              </span>
              ${item.isProcessed ? '<span class="badge status-badge bg-success">Processed</span>' : ''}
            </div>
          </div>
          <div class="btn-group">
            ${item.extractedText ? `
              <button class="btn btn-sm btn-outline-primary view-text" 
                data-text="${escapeHtml(item.extractedText)}" 
                data-filename="${item.originalName}">
                <i class="bi bi-eye me-1"></i>View Text
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `).join('');

   // Add event listeners for view buttons
  document.querySelectorAll('.view-text').forEach(button => {
    button.addEventListener('click', () => {
      const text = button.getAttribute('data-text');
      const filename = button.getAttribute('data-filename');
      showTextModal(filename, text);
    });
  });
}

// --- Utils ---
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
