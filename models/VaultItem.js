const mongoose = require('mongoose');

const VaultItemSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  extractedText: {
    type: String,
    default: ''
  },
  // Property grant details (extracted from OCR)
  propertyDetails: {
    ownerName: String,
    propertyAddress: String,
    surveyNumber: String,
    area: String,
    registrationDate: Date,
    // Add more fields as needed
  },
  nominees: [{
    name: String,
    email: String,
    relationship: String,
    sharePercentage: Number,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isProcessed: {
    type: Boolean,
    default: false
  },
  ocrStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Text index for search
VaultItemSchema.index({ extractedText: 'text', 'propertyDetails.ownerName': 'text' });

module.exports = mongoose.model('VaultItem', VaultItemSchema);