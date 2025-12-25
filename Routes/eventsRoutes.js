// routes/eventsRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');

// multer: memory storage, 8MB per file, up to 50 files per field
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 50 }
});

// require controller (ensure path matches your folder structure)
const ctrl = require('../Controller/eventsController');

// Specific literal routes — must come before numeric-id routes
// single-image route (attach to an existing event)
router.post('/image', upload.single('image'), ctrl.createImage);
router.get('/image/:imageId/blob', ctrl.getImageBlob);
router.delete('/image/:imageId', ctrl.deleteImage);

// Generic listing (literal '/')
router.get('/', ctrl.listEvents);

// Create event (accepts multipart: images OR images[])
// Use upload.fields so we accept either field name sent by client.
router.post('/', upload.fields([
  { name: 'images', maxCount: 50 },
  { name: 'images[]', maxCount: 50 }
]), ctrl.createEvent);

// Numeric-id routes (no constraint here; controller validates id)
router.get('/:id', ctrl.getEvent);

// Update event: accept new images with same flexible field names
router.put('/:id', upload.fields([
  { name: 'images', maxCount: 50 },
  { name: 'images[]', maxCount: 50 }
]), ctrl.updateEvent);

router.delete('/:id', ctrl.deleteEvent);

module.exports = router;
