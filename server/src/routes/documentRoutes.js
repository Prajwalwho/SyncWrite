import express from 'express';
import {
  getDocuments,
  createDocument,
  getDocumentById,
  updateDocument,
  deleteDocument,
  shareDocument,
  removeCollaborator, // NEW
} from '../controllers/documentController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', getDocuments);
router.post('/', createDocument);
router.get('/:id', getDocumentById);
router.put('/:id', updateDocument);
router.delete('/:id', deleteDocument);
router.patch('/:id/share', shareDocument); // NEW
router.patch('/:id/collaborators/remove', removeCollaborator);

export default router;