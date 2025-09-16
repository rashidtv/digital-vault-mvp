console.log("✅ Dashboard loaded");

const token = localStorage.getItem("token");
if (!token) {
  window.location.href = "/";
}

document.addEventListener("DOMContentLoaded", async () => {
  // Fetch user to check PDPA
  const res = await fetch("/api/auth/user", {
    headers: { Authorization: `Bearer ${token}` }
  });
  const user = await res.json();

  if (!user.pdpaConsent) {
    const modal = new bootstrap.Modal(document.getElementById("pdpaModal"));
    modal.show();

    document.getElementById("acceptConsent").addEventListener("click", async () => {
      await fetch("/api/auth/consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ consent: true })
      });
      modal.hide();
      alert("✅ Consent recorded!");
    });

    document.getElementById("declineConsent").addEventListener("click", () => {
      alert("⚠️ Consent required to use the system.");
      window.location.href = "/";
    });
  }

  loadVaultItems();
});

const uploadForm = document.getElementById("uploadForm");
uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const file = document.getElementById("document").files[0];
  if (!file) return alert("Please select a file");

  const formData = new FormData();
  formData.append("document", file);

  const res = await fetch("/api/vault/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });

  const data = await res.json();
  if (data.status === "success") {
    alert("✅ File uploaded");
    loadVaultItems();
  } else {
    alert("❌ Upload failed: " + data.error);
  }
});

async function loadVaultItems() {
  const res = await fetch("/api/vault/items", {
    headers: { Authorization: `Bearer ${token}` }
  });
  const items = await res.json();

  const container = document.getElementById("vaultItems");
  container.innerHTML = items.map(item => `
    <div class="card mb-2">
      <div class="card-body">
        <strong>${item.originalName}</strong><br>
        Size: ${item.fileSize} bytes<br>
        Status: ${item.ocrStatus}
      </div>
    </div>
  `).join("");
}

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "/";
});
