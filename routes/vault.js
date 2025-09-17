const express = require('express');
const { auth } = require('../middleware/auth');
const VaultItem = require('../models/VaultItem');
const { upload, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// @route   POST /api/vault/upload
// @desc    Upload property grant document
router.post('/upload', auth, upload.single('document'), handleUploadError, async (req, res) => {
  try {
    console.log('Upload endpoint hit');
    
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Since we're using memory storage, we don't have a file path
    // We'll store the file buffer in memory or process it immediately
    console.log('File received (memory storage):', {
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      bufferSize: req.file.buffer ? req.file.buffer.length : 'no buffer'
    });

    // Create vault item record without filePath (since we're using memory)
    const vaultItem = new VaultItem({
      user: req.user.id,
      fileName: req.file.originalname, // Store original name
      originalName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      // Note: We're not storing filePath since we're using memory storage
      // For production, you'd want to upload to cloud storage (S3, etc.)
    });

    await vaultItem.save();

    // Simulate OCR processing
    simulateOCRProcessing(vaultItem._id);

    res.status(201).json({
      message: 'File uploaded successfully. OCR processing started.',
      status: 'success',
      item: {
        id: vaultItem._id,
        originalName: vaultItem.originalName,
        fileSize: vaultItem.fileSize,
        createdAt: vaultItem.createdAt
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      message: 'Server error during upload',
      error: error.message 
    });
  }
});

// Simulate OCR processing
async function simulateOCRProcessing(itemId) {
  try {
    console.log('Starting simulated OCR for item:', itemId);
    const item = await VaultItem.findById(itemId);
    if (!item) return;

    // Update status to processing
    item.ocrStatus = 'processing';
    await item.save();

    // Simulate processing delay
    setTimeout(async () => {
      try {
        const simulatedText = `OCR EXTRACTED TEXT FOR: ${item.originalName}

Property Grant Document Analysis:

- Document: ${item.originalName}
- File Size: ${item.fileSize} bytes
- File Type: ${item.fileType}
- Processed: ${new Date().toLocaleString()}
- Status: Successfully processed

This is a simulation of OCR text extraction. 
In a production environment, this would contain actual text extracted from your property grant document.`;

        item.extractedText = simulatedText;
        item.isProcessed = true;
        item.ocrStatus = 'completed';
        
        await item.save();
        console.log('Simulated OCR completed for:', item.originalName);

      } catch (error) {
        console.error('Simulated OCR error:', error);
        await VaultItem.findByIdAndUpdate(itemId, { 
          ocrStatus: 'failed',
          extractedText: 'OCR processing failed'
        });
      }
    }, 3000);

  } catch (error) {
    console.error('OCR simulation setup error:', error);
  }
}

// @route   GET /api/vault/items
// @desc    Get user's vault items
router.get('/items', auth, async (req, res) => {
  try {
    const items = await VaultItem.find({ user: req.user.id })
      .sort({ createdAt: -1 });

    res.json(items);
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ message: 'Server error fetching items' });
  }
});

module.exports = router;