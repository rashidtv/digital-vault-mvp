const express = require('express');
const { auth } = require('../middleware/auth');
const VaultItem = require('../models/VaultItem');
const { upload, handleUploadError } = require('../middleware/upload');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// @route   POST /api/vault/upload
// @desc    Upload property grant document
router.post('/upload', auth, (req, res) => {
    console.log('Upload endpoint hit - auth passed');
    
    // Use Multer middleware
    upload.single('document')(req, res, async function(err) {
        try {
            console.log('Multer processing completed');
            
            if (err) {
                console.error('Multer error:', err);
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
                }
                return res.status(400).json({ message: err.message });
            }

            if (!req.file) {
                console.log('No file in request');
                return res.status(400).json({ message: 'No file uploaded' });
            }

            console.log('File received:', {
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype
            });

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

            // Start OCR processing in background (simulated)
            simulateOCRProcessing(vaultItem._id);

            res.status(201).json({
                message: 'File uploaded successfully. OCR processing started.',
                item: {
                    id: vaultItem._id,
                    originalName: vaultItem.originalName,
                    fileSize: vaultItem.fileSize,
                    createdAt: vaultItem.createdAt
                }
            });

        } catch (error) {
            console.error('Upload processing error:', error);
            res.status(500).json({ message: 'Server error during upload processing' });
        }
    });
});

// @route   GET /api/vault/items
// @desc    Get user's vault items
router.get('/items', auth, async (req, res) => {
    try {
        console.log('Fetching vault items for user:', req.user.id);
        const items = await VaultItem.find({ user: req.user.id })
            .sort({ createdAt: -1 });

        console.log('Found items:', items.length);
        res.json(items);
    } catch (error) {
        console.error('Get items error:', error);
        res.status(500).json({ message: 'Server error fetching items' });
    }
});

// @route   GET /api/vault/test
// @desc    Test endpoint
router.get('/test', auth, (req, res) => {
    res.json({ 
        message: 'Vault API is working', 
        user: req.user.id,
        timestamp: new Date().toISOString()
    });
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
                const simulatedText = `SIMULATED OCR TEXT FOR: ${item.originalName}

Document processed successfully. This is simulated text extraction.

File: ${item.originalName}
Size: ${item.fileSize} bytes
Type: ${item.fileType}
Processed: ${new Date().toLocaleString()}`;

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
        }, 2000); // 2 second delay

    } catch (error) {
        console.error('OCR simulation setup error:', error);
    }
}

module.exports = router;