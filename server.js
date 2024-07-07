const express = require('express');
const Datastore = require('nedb');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const sharp = require('sharp');
const { stringify } = require('querystring');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize NeDB
const db = new Datastore({ filename: 'orders.db', autoload: true });

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname))
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Handle POST request to /api/orders
app.post('/api/orders', upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { name, email, address, template } = req.body;
  const { filename, mimetype } = req.file;

  const newOrder = {
    name,
    email,
    address: JSON.parse(address),
    template,
    photo: { 
      filename, 
      contentType: mimetype
    },
    createdAt: new Date()
  };

  db.insert(newOrder, (err, newDoc) => {
    if (err) {
      console.error('Error saving order:', err);
      return res.status(500).json({ error: 'Failed to submit order' });
    }
    res.json({ message: 'Order submitted successfully!', orderId: newDoc._id });
    console.log('Order saved successfully:', newDoc);
  });
});

// Handle POST request to /api/process-image
app.post('/api/process-image', async (req, res) => {
  const { orderId } = req.body;

  try {
    const order = await new Promise((resolve, reject) => {
      db.findOne({ _id: orderId }, (err, doc) => {
        if (err) reject(err);
        else resolve(doc);
      });
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const inputPath = path.join(__dirname, 'uploads', order.photo.filename);
    const templatePath = path.join(__dirname, 'assets', order.template);
    const outputPath = path.join(__dirname, 'processed', `${orderId}.jpg`);

    // Process the image (this is a simple overlay, you might want to adjust this)
    await sharp(templatePath)
      .composite([{ input: inputPath, gravity: 'center' }])
      .toFile(outputPath);

    res.json({ processedImageUrl: `/processed/${orderId}.jpg` });
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

// Serve uploaded and processed files
app.use('/uploads', express.static('uploads'));
app.use('/processed', express.static('processed'));

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));