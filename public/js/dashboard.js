console.log("✅ Dashboard JS loaded");

// DOM Elements
const uploadForm = document.getElementById("uploadForm");
const uploadStatus = document.getElementById("uploadStatus");
const vaultItems = document.getElementById("vaultItems");
const fileInput = document.getElementById("document");

// Token from localStorage
const dashboardToken = localStorage.getItem("token");
console.log("✅ Token found:", !!dashboardToken);

// Redirect if no token
if (!dashboardToken) {
  console.log("❌ No token, redirecting to home");
  window.location.href = "/";
} else {
  initializeUploadHandler();
  loadVaultItems();
}

// Upload Handler
function initializeUploadHandler() {
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const file = fileInput.files[0];
    if (!file) {
      showUploadStatus("Please select a file first", "danger");
      return;
    }

    // Validate file type & size
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      showUploadStatus("Invalid file type. Allowed: JPG, PNG, PDF, WEBP", "danger");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showUploadStatus("File must be < 10MB", "danger");
      return;
    }

    const formData = new FormData();
    formData.append("document", file);

    setUploadLoading(true);
    showUploadStatus("Uploading and processing document...", "info");

    try {
      const response = await fetch("/api/vault/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${dashboardToken}` },
        body: formData,
      });

      const data = await response.json();
      console.log("Upload response:", data);

      if (response.ok && data.status === "success") {
        showUploadStatus("✅ " + data.message, "success");
        resetUploadForm();
        loadVaultItems();
      } else {
        showUploadStatus("❌ " + (data.message || "Upload failed"), "danger");
      }
    } catch (error) {
      console.error("Upload error:", error);
      showUploadStatus("❌ Error: " + error.message, "danger");
    } finally {
      setUploadLoading(false);
    }
  });
}

// File Input Helpers
function triggerFileInput() {
  document.getElementById("document").click();
}

function handleFileSelect(input) {
  const file = input.files[0];
  const fileInfo = document.getElementById("fileInfo");
  const uploadButton = document.getElementById("uploadButton");

  if (file) {
    document.getElementById("fileName").textContent = file.name;
    document.getElementById("fileSize").textContent = formatFileSize(file.size);
    fileInfo.style.display = "block";
    uploadButton.disabled = false;
  } else {
    clearFile();
  }
}

function clearFile() {
  fileInput.value = "";
  document.getElementById("fileInfo").style.display = "none";
  document.getElementById("uploadButton").disabled = true;
}

function resetUploadForm() {
  clearFile();
}

// Status Display
function showUploadStatus(message, type = "info") {
  uploadStatus.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
}

function setUploadLoading(isLoading) {
  const button = document.getElementById("uploadButton");
  const spinner = document.getElementById("uploadSpinner");
  const text = button.querySelector(".upload-text");

  if (isLoading) {
    button.disabled = true;
    spinner.classList.remove("d-none");
    text.textContent = "Processing...";
  } else {
    button.disabled = false;
    spinner.classList.add("d-none");
    text.textContent = "Upload & Process Document";
  }
}

// Vault Items
async function loadVaultItems() {
  try {
    const response = await fetch("/api/vault/items", {
      headers: { Authorization: `Bearer ${dashboardToken}` },
    });

    if (response.ok) {
      const items = await response.json();
      displayVaultItems(items);
    } else {
      displayVaultItems([]);
    }
  } catch (error) {
    console.error("Error loading vault items:", error);
    displayVaultItems([]);
  }
}

function displayVaultItems(items) {
  const vaultItemsContainer = document.getElementById("vaultItems");
  const itemsCount = document.getElementById("itemsCount");

  itemsCount.textContent = `${items.length} document${items.length !== 1 ? "s" : ""}`;

  if (items.length === 0) {
    vaultItemsContainer.innerHTML = `
      <div class="text-center py-4">
        <div class="text-muted">No documents uploaded yet.</div>
        <small class="text-muted">Upload your first document above!</small>
      </div>
    `;
    return;
  }

  vaultItemsContainer.innerHTML = items
    .map(
      (item) => `
      <div class="card mb-3 vault-item">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <div class="flex-grow-1">
              <h6 class="card-title">
                <i class="bi bi-file-earmark-${item.fileType?.includes("pdf") ? "pdf" : "image"} me-2"></i>
                ${item.originalName}
              </h6>
              <p class="mb-1"><small class="text-muted">Uploaded: ${new Date(item.createdAt).toLocaleString()}</small></p>
              <p class="mb-2"><small class="text-muted">Size: ${formatFileSize(item.fileSize)}</small></p>
              <span class="badge bg-${getStatusColor(item.ocrStatus)}">${item.ocrStatus}</span>
              ${item.isProcessed ? '<span class="badge bg-success ms-2">Processed</span>' : ""}
            </div>
          </div>
        </div>
      </div>
    `
    )
    .join("");
}

// Helpers
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getStatusColor(status) {
  const colors = {
    completed: "success",
    processing: "warning",
    pending: "secondary",
    failed: "danger",
  };
  return colors[status] || "secondary";
}
// Logout functionality
document.getElementById("logoutBtn")?.addEventListener("click", () => {
  console.log("🔒 Logging out...");
  localStorage.removeItem("token"); // Clear stored token
  window.location.href = "/"; // Redirect to landing page
});
