console.log('✅ Dashboard JS loaded');

// DOM Elements
const uploadForm = document.getElementById('uploadForm');
const uploadStatus = document.getElementById('uploadStatus');
const vaultItems = document.getElementById('vaultItems');
const fileInput = document.getElementById('document');
const logoutBtn = document.getElementById('logoutBtn');

// Get token
const dashboardToken = localStorage.getItem('token');
console.log('✅ Token found:', !!dashboardToken);

// Redirect if no token
if (!dashboardToken) {
  window.location.href = '/';
} else {
  initializeUploadHandler();
  loadVaultItems();
}

// Logout
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('token');
  window.location.href = '/';
});

// Show nominee/trustee form on file select
function handleFileSelect(input) {
  const file = input.files[0];
  const uploadButton = document.getElementById('uploadButton');
  const formSection = document.getElementById('nomineeTrusteeForm');

  if (file) {
    formSection.classList.remove('d-none');
    uploadButton.disabled = false;
  } else {
    formSection.classList.add('d-none');
    uploadButton.disabled = true;
  }
}

function initializeUploadHandler() {
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('📤 Uploading...');

    const file = fileInput.files[0];
    if (!file) {
      showUploadStatus('Please select a file first', 'danger');
      return;
    }

    // Collect nominee & trustee details
    const nomineeName = document.getElementById('nomineeName').value;
    const nomineeEmail = document.getElementById('nomineeEmail').value;
    const nomineePhone = document.getElementById('nomineePhone').value;
    const trusteeName = document.getElementById('trusteeName').value;
    const trusteeEmail = document.getElementById('trusteeEmail').value;
    const trusteePhone = document.getElementById('trusteePhone').value;

    if (!nomineeName || !nomineeEmail || !nomineePhone || !trusteeName || !trusteeEmail || !trusteePhone) {
      showUploadStatus('Please fill in nominee and trustee details', 'danger');
      return;
    }

    const formData = new FormData();
    formData.append('document', file);
    formData.append('nomineeName', nomineeName);
    formData.append('nomineeEmail', nomineeEmail);
    formData.append('nomineePhone', nomineePhone);
    formData.append('trusteeName', trusteeName);
    formData.append('trusteeEmail', trusteeEmail);
    formData.append('trusteePhone', trusteePhone);

    setUploadLoading(true);
    showUploadStatus('Uploading and processing...', 'info');

    try {
      const response = await fetch('/api/vault/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${dashboardToken}` },
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
    } catch (error) {
      console.error('Upload error:', error);
      showUploadStatus('❌ ' + error.message, 'danger');
    } finally {
      setUploadLoading(false);
    }
  });
}

function resetUploadForm() {
  fileInput.value = '';
  document.getElementById('nomineeTrusteeForm').classList.add('d-none');
  document.getElementById('uploadButton').disabled = true;
}

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
  const uploadText = button.querySelector('.upload-text');

  if (isLoading) {
    button.disabled = true;
    spinner.classList.remove('d-none');
    uploadText.textContent = 'Processing...';
  } else {
    button.disabled = false;
    spinner.classList.add('d-none');
    uploadText.textContent = 'Upload & Process Document';
  }
}

// Load items
async function loadVaultItems() {
  try {
    const response = await fetch('/api/vault/items', {
      headers: { 'Authorization': `Bearer ${dashboardToken}` }
    });

    if (response.ok) {
      const items = await response.json();
      displayVaultItems(items);
    } else {
      displayVaultItems([]);
    }
  } catch (error) {
    console.error('Error loading items:', error);
    displayVaultItems([]);
  }
}

// Render items
function displayVaultItems(items) {
  if (items.length === 0) {
    vaultItems.innerHTML = `<div class="text-muted">No documents uploaded yet.</div>`;
    return;
  }

  vaultItems.innerHTML = items.map(item => `
    <div class="card mb-3">
      <div class="card-body">
        <h5>${item.originalName}</h5>
        <p><small>Uploaded: ${new Date(item.createdAt).toLocaleString()}</small></p>
        <p><b>Nominee:</b> ${item.nomineeName} (${item.nomineeEmail}, ${item.nomineePhone})</p>
        <p><b>Trustee:</b> ${item.trusteeName} (${item.trusteeEmail}, ${item.trusteePhone})</p>
        <span class="badge bg-${getStatusColor(item.ocrStatus)}">${item.ocrStatus}</span>
      </div>
    </div>
  `).join('');
}

function getStatusColor(status) {
  const colors = { completed: 'success', processing: 'warning', pending: 'secondary', failed: 'danger' };
  return colors[status] || 'secondary';
}
