const express = require('express');
const { auth } = require('../middleware/auth');
const VaultItem = require('../models/VaultItem');
const { upload, handleUploadError } = require('../middleware/upload');
const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// @route   POST /api/vault/upload
// @desc    Upload property grant document
router.post('/upload', auth, upload.single('document'), handleUploadError, async (req, res) => {
  try {
    console.log('Upload endpoint hit');
    console.log('Request file:', req.file);
    console.log('Request body:', req.body);

    if (!req.file) {
      console.log('No file in request');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Create vault item record
    const vaultItem = new VaultItem({
      user: req.user.id,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size
    });

    await vaultItem.save();
    console.log('Vault item saved:', vaultItem._id);

    // Start OCR processing in background
    processOCR(vaultItem._id);

    res.status(201).json({
      message: 'File uploaded successfully. OCR processing started.',
      item: vaultItem
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Server error during upload' });
  }
});
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

// Add this to routes/vault.js
router.get('/test', auth, (req, res) => {
  res.json({ message: 'Vault route is working', user: req.user.id });
});

// OCR Processing function (runs in background)
async function processOCR(itemId) {
  try {
    const item = await VaultItem.findById(itemId);
    if (!item) return;

    // Update status to processing
    item.ocrStatus = 'processing';
    await item.save();

    // Perform OCR based on file type
    let text = '';
    if (item.fileType.includes('image')) {
      // Process image with Tesseract
      const result = await Tesseract.recognize(
        item.filePath,
        'eng', // English language
        { logger: m => console.log(m) }
      );
      text = result.data.text;
    } else if (item.fileType.includes('pdf')) {
      // For PDFs, we'd need to convert to images first
      // This is a simplified version - in production, use pdf2image
      text = '[PDF OCR would require additional processing]';
    }

    // Update item with extracted text
    item.extractedText = text;
    item.isProcessed = true;
    item.ocrStatus = 'completed';
    
    // Try to extract property details (basic pattern matching)
    const details = extractPropertyDetails(text);
    if (details) {
      item.propertyDetails = details;
    }

    await item.save();

  } catch (error) {
    console.error('OCR processing error:', error);
    await VaultItem.findByIdAndUpdate(itemId, { 
      ocrStatus: 'failed',
      extractedText: 'OCR processing failed: ' + error.message
    });
  }
}

// Helper function to extract property details from text
function extractPropertyDetails(text) {
  const details = {};
  
  // Simple pattern matching - you'd enhance this based on your document format
  const patterns = {
    ownerName: /(?:owner|name)[:\s]*([^\n]+)/i,
    propertyAddress: /(?:address|location)[:\s]*([^\n]+)/i,
    surveyNumber: /(?:survey no|survey number)[:\s]*([^\n]+)/i,
    area: /(?:area|size)[:\s]*([^\n]+)/i
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern);
    if (match && match[1]) {
      details[key] = match[1].trim();
    }
  }

  return Object.keys(details).length > 0 ? details : null;
}

module.exports = router;