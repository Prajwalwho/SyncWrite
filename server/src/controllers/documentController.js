import Document from '../models/Document.js';
import mongoose from 'mongoose';

export const getDocuments = async (req, res) => {
  try {
    const documents = await Document.find().sort({ updatedAt: -1 }).select('_id title updatedAt');
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createDocument = async (req, res) => {
  try {
    const { title, content } = req.body;
    const newDocument = new Document({ title, content });
    const savedDocument = await newDocument.save();
    res.status(201).json(savedDocument);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getDocumentById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ message: 'Document not found' });
    }
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    if (document.revision === undefined || document.revision === null) {
        document.revision = 0;
    }
    res.json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateDocument = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ message: 'Document not found' });
    }
    const { title } = req.body;
    const updatedDocument = await Document.findByIdAndUpdate(
      req.params.id,
      { title, updatedAt: Date.now() },
      { new: true }
    );
    if (!updatedDocument) {
      return res.status(404).json({ message: 'Document not found' });
    }
    res.json(updatedDocument);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteDocument = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({ message: 'Document not found' });
        }
        const deletedDocument = await Document.findByIdAndDelete(req.params.id);
        if (!deletedDocument) {
            return res.status(404).json({ message: 'Document not found' });
        }
        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
