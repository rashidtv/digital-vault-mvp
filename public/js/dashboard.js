console.log('Dashboard JavaScript loaded');

// DOM Elements - DON'T declare token here again
const uploadForm = document.getElementById('uploadForm');
const uploadStatus = document.getElementById('uploadStatus');
const vaultItems = document.getElementById('vaultItems');
const fileInput = document.getElementById('document');

// Check if elements exist
console.log('Upload form:', uploadForm);
console.log('File input:', fileInput);

// Get token from localStorage (already declared in auth.js)
const dashboardToken = localStorage.getItem('token');
console.log('Token exists:', !!dashboardToken);

if (!dashboardToken) {
    console.log('No token, redirecting to home');
    window.location.href = '/';
    return; // Stop execution if no token
}

// Handle file upload with detailed logging
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('📤 Upload form submitted');
    
    const file = fileInput.files[0];
    console.log('Selected file:', file);
    
    if (!file) {
        console.log('❌ No file selected');
        showUploadStatus('Please select a file', 'danger');
        return;
    }

    console.log('File details:', {
        name: file.name,
        size: file.size,
        type: file.type
    });

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
        console.log('❌ File too large:', file.size);
        showUploadStatus('File size must be less than 10MB', 'danger');
        return;
    }

    const formData = new FormData();
    formData.append('document', file);
    console.log('FormData created');

    // Show loading state
    setUploadLoading(true);
    showUploadStatus('Uploading and processing document...', 'info');
    console.log('Sending upload request...');

    try {
        const response = await fetch('/api/vault/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${dashboardToken}`  // Use dashboardToken here
            },
            body: formData
        });

        console.log('Response status:', response.status);
        
        let data;
        try {
            data = await response.json();
            console.log('Response data:', data);
        } catch (jsonError) {
            console.error('JSON parse error:', jsonError);
            const text = await response.text();
            console.log('Response text:', text);
            throw new Error('Invalid JSON response: ' + text);
        }

        if (response.ok) {
            console.log('✅ Upload successful');
            showUploadStatus('✅ File uploaded successfully! OCR processing started.', 'success');
            fileInput.value = ''; // Clear file input
            document.getElementById('fileInfo').style.display = 'none';
            loadVaultItems(); // Refresh items list
        } else {
            console.log('❌ Upload failed:', data.message);
            showUploadStatus('❌ ' + (data.message || 'Upload failed'), 'danger');
        }
    } catch (error) {
        console.error('❌ Upload error:', error);
        console.error('Error details:', error.message);
        showUploadStatus('❌ Error during upload: ' + error.message, 'danger');
    } finally {
        setUploadLoading(false);
        console.log('Upload process completed');
    }
});

// Show upload status
function showUploadStatus(message, type = 'info') {
    console.log('Status:', type, message);
    const statusDiv = document.getElementById('uploadStatus');
    statusDiv.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
}

// Set upload loading state
function setUploadLoading(isLoading) {
    console.log('Setting loading:', isLoading);
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

// Load user's vault items
async function loadVaultItems() {
    try {
        const response = await fetch('/api/vault/items', {
            headers: {
                'Authorization': `Bearer ${dashboardToken}`  // Use dashboardToken here
            }
        });

        if (response.ok) {
            const items = await response.json();
            displayVaultItems(items);
        } else {
            console.error('Failed to load items:', response.status);
        }
    } catch (error) {
        console.error('Error loading vault items:', error);
        document.getElementById('vaultItems').innerHTML = `
            <div class="alert alert-danger">
                Error loading documents. Please try again.
            </div>
        `;
    }
}

// Display vault items
function displayVaultItems(items) {
    const vaultItems = document.getElementById('vaultItems');
    const itemsCount = document.getElementById('itemsCount');
    
    itemsCount.textContent = `${items.length} document${items.length !== 1 ? 's' : ''}`;

    if (items.length === 0) {
        vaultItems.innerHTML = `
            <div class="text-center py-4">
                <div class="text-muted">No documents uploaded yet.</div>
                <small class="text-muted">Upload your first property grant above to get started!</small>
            </div>
        `;
        return;
    }

    vaultItems.innerHTML = items.map(item => `
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
                        <div class="d-flex align-items-center">
                            <span class="badge status-badge bg-${getStatusColor(item.ocrStatus)} me-2">
                                ${item.ocrStatus}
                            </span>
                            ${item.isProcessed ? '<span class="badge status-badge bg-success">Processed</span>' : ''}
                        </div>
                    </div>
                    <div class="btn-group">
                        ${item.extractedText ? `
                            <button class="btn btn-sm btn-outline-primary view-text" data-text="${escapeHtml(item.extractedText)}" data-filename="${item.originalName}">
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

// Helper functions
function getStatusColor(status) {
    const colors = {
        'completed': 'success',
        'processing': 'warning',
        'pending': 'secondary',
        'failed': 'danger'
    };
    return colors[status] || 'secondary';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showTextModal(filename, text) {
    // Create and show modal logic here
    alert('Extracted text from ' + filename + ':\n\n' + text);
}

// Load items when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard DOM loaded');
    loadVaultItems();
});