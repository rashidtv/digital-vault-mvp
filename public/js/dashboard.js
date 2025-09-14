console.log('Dashboard JavaScript loaded');
const API_BASE = '/api';

// DOM Elements
const uploadForm = document.getElementById('uploadForm');
const uploadStatus = document.getElementById('uploadStatus');
const vaultItems = document.getElementById('vaultItems');
const fileInput = document.getElementById('document');

// Check if elements exist
console.log('Upload form:', uploadForm);
console.log('File input:', fileInput);

// Check authentication
const token = localStorage.getItem('token');
console.log('Token exists:', !!token);
if (!token) {
    console.log('No token, redirecting to home');
    window.location.href = '/';
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
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
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
        console.error('Error details:', error.message, error.stack);
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
        const response = await fetch(`${API_BASE}/vault/items`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const items = await response.json();
            displayVaultItems(items);
        }
    } catch (error) {
        console.error('Error loading vault items:', error);
    }
}

// Display vault items
function displayVaultItems(items) {
    if (items.length === 0) {
        vaultItems.innerHTML = '<p class="text-muted">No documents uploaded yet.</p>';
        return;
    }

    vaultItems.innerHTML = items.map(item => `
        <div class="card mb-3">
            <div class="card-body">
                <h6 class="card-title">${item.originalName}</h6>
                <p class="card-text">
                    <small class="text-muted">
                        Uploaded: ${new Date(item.createdAt).toLocaleDateString()}<br>
                        Status: <span class="badge bg-${getStatusColor(item.ocrStatus)}">${item.ocrStatus}</span><br>
                        Size: ${formatFileSize(item.fileSize)}
                    </small>
                </p>
                ${item.extractedText ? `
                    <button class="btn btn-sm btn-outline-primary view-text" data-text="${escapeHtml(item.extractedText)}">
                        View Extracted Text
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');

    // Add event listeners for view buttons
    document.querySelectorAll('.view-text').forEach(button => {
        button.addEventListener('click', () => {
            const text = button.getAttribute('data-text');
            alert('Extracted Text:\n\n' + text);
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
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Load items when page loads
document.addEventListener('DOMContentLoaded', loadVaultItems);