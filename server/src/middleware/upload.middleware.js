const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

// Ensure upload directories exist
const dirs = ['selfies', 'meters', 'receipts', 'vehicles', 'slides', 'avatars', 'sites'];
dirs.forEach(dir => {
  const fullPath = path.join(UPLOAD_DIR, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

function createStorage(subfolder) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(UPLOAD_DIR, subfolder));
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    }
  });
}

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPG, PNG, WEBP) are allowed'), false);
  }
};

const maxSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB

const uploadSelfie = multer({ storage: createStorage('selfies'), fileFilter, limits: { fileSize: maxSize } });
const uploadMeter = multer({ storage: createStorage('meters'), fileFilter, limits: { fileSize: maxSize } });
const uploadReceipt = multer({ storage: createStorage('receipts'), fileFilter, limits: { fileSize: maxSize } });
const uploadVehicle = multer({ storage: createStorage('vehicles'), fileFilter, limits: { fileSize: maxSize } });
const uploadSlide = multer({ storage: createStorage('slides'), fileFilter, limits: { fileSize: maxSize } });
const uploadAvatar = multer({ storage: createStorage('avatars'), fileFilter, limits: { fileSize: maxSize } });
const uploadSite = multer({ storage: createStorage('sites'), fileFilter, limits: { fileSize: maxSize } });

module.exports = {
  uploadSelfie,
  uploadMeter,
  uploadReceipt,
  uploadVehicle,
  uploadSlide,
  uploadAvatar,
  uploadSite,
  UPLOAD_DIR
};
