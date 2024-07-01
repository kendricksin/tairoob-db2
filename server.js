const express = require('express');
const Datastore = require('nedb');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize NeDB
const db = new Datastore({ filename: 'orders.db', autoload: true });

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') // Make sure this directory exists
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
  console.log('Received request headers:', req.headers);
  console.log('Received request body:', req.body);
  console.log('Received file:', req.file);

  if (!req.file) {
    console.log('No file received');
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { name, email, address } = req.body;
  const { filename, mimetype } = req.file;

  console.log('File details:', { filename, mimetype });

  const newOrder = {
    name,
    email,
    address: JSON.parse(address),
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
    console.log('Order saved successfully:', newDoc);
    res.json({ message: 'Order submitted successfully!', order: newDoc });
  });
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));