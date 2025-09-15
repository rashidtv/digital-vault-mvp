console.log("✅ Dashboard JS loaded");

// DOM Elements
const uploadForm = document.getElementById("uploadForm");
const fileInput = document.getElementById("document");
const uploadButton = document.getElementById("uploadButton");
const uploadSpinner = document.getElementById("uploadSpinner");
const uploadStatus = document.getElementById("uploadStatus");
const vaultItems = document.getElementById("vaultItems");
const itemsCount = document.getElementById("itemsCount");
const logoutBtn = document.getElementById("logoutBtn");
const welcomeUser = document.getElementById("welcomeUser");

// Token
const token = localStorage.getItem("token");
if (!token) {
  window.location.href = "/";
}

// Fetch logged in user
async function fetchUser() {
  try {
    const res = await fetch("/api/auth/user", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const user = await res.json();
      welcomeUser.textContent = `Welcome, ${user.username}`;
    } else {
      console.warn("User fetch failed");
    }
  } catch (err) {
    console.error("User fetch error:", err);
  }
}

// Logout
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "/";
});

// Upload handler
uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const file = fileInput.files[0];
  if (!file) {
    showUploadStatus("Please select a file", "danger");
    return;
  }

  const allowedTypes = ["image/jpeg", "image/png", "application/pdf", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    showUploadStatus("Invalid file type. Use JPG, PNG, PDF, or WEBP", "danger");
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    showUploadStatus("File too large (max 10MB)", "danger");
    return;
  }

  const formData = new FormData();
  formData.append("document", file);

  setUploadLoading(true);
  showUploadStatus("Uploading & processing...", "info");

  try {
    const res = await fetch("/api/vault/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });

    const data = await res.json();
    console.log("Upload response:", data);

    if (res.ok && data.status === "success") {
      showUploadStatus("✅ " + data.message, "success");
      resetUploadForm();
      await loadVaultItems();
    } else {
      showUploadStatus("❌ " + (data.message || "Upload failed"), "danger");
    }
  } catch (err) {
    console.error("Upload error:", err);
    showUploadStatus("🚨 Server error: " + err.message, "danger");
  } finally {
    setUploadLoading(false);
  }
});

// Reset form
function resetUploadForm() {
  fileInput.value = "";
  document.getElementById("fileInfo").style.display = "none";
  uploadButton.disabled = true;
}

// Trigger file input
function triggerFileInput() {
  fileInput.click();
}

// Handle file select
function handleFileSelect(input) {
  const file = input.files[0];
  if (file) {
    document.getElementById("fileName").textContent = file.name;
    document.getElementById("fileSize").textContent = formatFileSize(file.size);
    document.getElementById("fileInfo").style.display = "block";
    uploadButton.disabled = false;
  }
}

// Clear file
function clearFile() {
  fileInput.value = "";
  document.getElementById("fileInfo").style.display = "none";
  uploadButton.disabled = true;
}

// Status messages
function showUploadStatus(message, type = "info") {
  uploadStatus.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
}

// Upload button state
function setUploadLoading(isLoading) {
  if (isLoading) {
    uploadButton.disabled = true;
    uploadButton.querySelector(".upload-text").textContent = "Processing...";
    uploadSpinner.classList.remove("d-none");
  } else {
    uploadButton.disabled = false;
    uploadButton.querySelector(".upload-text").textContent = "Upload & Process Document";
    uploadSpinner.classList.add("d-none");
  }
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Load vault items
async function loadVaultItems() {
  try {
    const res = await fetch("/api/vault/items", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      throw new Error("Failed to fetch vault items");
    }

    const items = await res.json();
    displayVaultItems(items);
  } catch (err) {
    console.error("Error loading vault items:", err);
    vaultItems.innerHTML = `<div class="alert alert-danger">Error loading documents.</div>`;
  }
}

// Display vault items
function displayVaultItems(items) {
  itemsCount.textContent = items.length;
  if (items.length === 0) {
    vaultItems.innerHTML = `<div class="text-muted">No documents uploaded yet.</div>`;
    return;
  }

  vaultItems.innerHTML = items
    .map(
      (item) => `
      <div class="card mb-3">
        <div class="card-body d-flex justify-content-between">
          <div>
            <h6 class="mb-1">${item.originalName}</h6>
            <small class="text-muted">${formatFileSize(item.fileSize)} | ${new Date(item.createdAt).toLocaleString()}</small>
          </div>
          <span class="badge bg-${getStatusColor(item.ocrStatus)}">${item.ocrStatus}</span>
        </div>
      </div>
    `
    )
    .join("");
}

// Status colors
function getStatusColor(status) {
  const colors = {
    completed: "success",
    processing: "warning",
    pending: "secondary",
    failed: "danger"
  };
  return colors[status] || "secondary";
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  fetchUser();
  loadVaultItems();
});
