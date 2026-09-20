import Document from '../models/Document.js';
import User from '../models/User.js'; // NEW
import mongoose from 'mongoose';

export const getDocuments = async (req, res) => {
  try {
    const documents = await Document.find({
      $or: [
        { owner: req.user._id },
        { collaborators: req.user._id },
      ],
    })
      .sort({ updatedAt: -1 })
      .select('_id title updatedAt owner');
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createDocument = async (req, res) => {
  try {
    const { title, content } = req.body;
    const newDocument = new Document({
      title,
      content,
      owner: req.user._id,
    });
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

    const isOwner = document.owner.equals(req.user._id);
    const isCollaborator = document.collaborators.some(c => c.equals(req.user._id));
    if (!isOwner && !isCollaborator && !document.isPublic) {
      return res.status(403).json({ message: 'You do not have access to this document' });
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

    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const isOwner = document.owner.equals(req.user._id);
    const isCollaborator = document.collaborators.some(c => c.equals(req.user._id));
    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ message: 'You do not have permission to edit this document' });
    }

    const { title } = req.body;
    document.title = title;
    document.updatedAt = Date.now();
    const updatedDocument = await document.save();
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

        const document = await Document.findById(req.params.id);
        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        if (!document.owner.equals(req.user._id)) {
            return res.status(403).json({ message: 'Only the owner can delete this document' });
        }

        await Document.findByIdAndDelete(req.params.id);
        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// NEW: manage sharing settings — public toggle and adding collaborators by email
export const shareDocument = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const document = await Document.findById(req.params.id).populate('collaborators', 'email name');
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (!document.owner.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only the owner can manage sharing' });
    }

    const { isPublic, collaboratorEmail } = req.body;

    if (typeof isPublic === 'boolean') {
      document.isPublic = isPublic;
    }

    if (collaboratorEmail) {
      const collaborator = await User.findOne({ email: collaboratorEmail.toLowerCase() });
      if (!collaborator) {
        return res.status(404).json({ message: 'No user found with that email' });
      }
      if (collaborator._id.equals(document.owner)) {
        return res.status(400).json({ message: 'The owner is already the owner' });
      }
      const alreadyCollaborator = document.collaborators.some(c => c.equals(collaborator._id));
      if (!alreadyCollaborator) {
        document.collaborators.push(collaborator._id);
      }
    }

    await document.save();
    const populated = await Document.findById(document._id).populate('collaborators', 'email name');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const removeCollaborator = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (!document.owner.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only the owner can manage sharing' });
    }

    const { collaboratorId } = req.body;
    document.collaborators = document.collaborators.filter(c => !c.equals(collaboratorId));
    await document.save();

    const populated = await Document.findById(document._id).populate('collaborators', 'email name');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};