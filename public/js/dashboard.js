console.log('Dashboard JS loaded');
const API_BASE = '/api';

// DOM Elements
const uploadForm = document.getElementById('uploadForm');
const uploadStatus = document.getElementById('uploadStatus');
const vaultItems = document.getElementById('vaultItems');

// Check authentication
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/';
}

// Handle file upload
// Add this at the top of your dashboard.js
console.log('Dashboard JS loaded');

// Modify the upload event listener to add debugging:
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Upload form submitted');
    
    const fileInput = document.getElementById('document');
    const file = fileInput.files[0];
    console.log('Selected file:', file);
    
    if (!file) {
        console.log('No file selected');
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
        console.log('File too large:', file.size);
        showUploadStatus('File size must be less than 10MB', 'danger');
        return;
    }

    const formData = new FormData();
    formData.append('document', file);
    console.log('FormData created');

    // Show loading state
    setUploadLoading(true);
    showUploadStatus('Uploading and processing document...', 'info');

    try {
        console.log('Sending upload request...');
        const response = await fetch('/api/vault/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);

        if (response.ok) {
            showUploadStatus('✅ File uploaded successfully! OCR processing started.', 'success');
            fileInput.value = ''; // Clear file input
            document.getElementById('fileInfo').style.display = 'none';
            loadVaultItems(); // Refresh items list
        } else {
            showUploadStatus('❌ ' + (data.message || 'Upload failed'), 'danger');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showUploadStatus('❌ Network error during upload', 'danger');
    } finally {
        setUploadLoading(false);
    }
});

// Show upload status
function showUploadStatus(message, type = 'info') {
    uploadStatus.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
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