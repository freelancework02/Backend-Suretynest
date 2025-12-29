// routes/eventsRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const ctrl = require('../Controller/eventsController');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024, files: 50 }
});

// STATIC ROUTES FIRST
router.post('/', upload.fields([
    { name: 'images', maxCount: 50 },
    { name: 'images[]', maxCount: 50 }
]), ctrl.createEvent);

router.get('/all', ctrl.listAllEvents);
router.get('/previous', ctrl.listPreviousEvents);

// IMAGE ROUTES BEFORE :id
router.post('/image', upload.single('image'), ctrl.createImage);
router.get('/image/:imageId/blob', ctrl.getImageBlob);
router.delete('/image/:imageId', ctrl.deleteImage);

// ACTIVE EVENTS LIST
router.get('/', ctrl.listEvents);

// ROUTES WITH NUMERIC ID LAST
router.get('/:id', ctrl.getEvent);
router.put('/:id', upload.fields([
    { name: 'images', maxCount: 50 },
    { name: 'images[]', maxCount: 50 }
]), ctrl.updateEvent);
router.delete('/:id', ctrl.deleteEvent);

router.put('/:id/archive', ctrl.archiveEvent);

module.exports = router;
