const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = [
  'uploads/gallery',
  'uploads/certificates',
  'uploads/courses/pdf',
  'uploads/courses/images',
  'uploads/courses/documents',
  'uploads/courses/videos',
  'uploads/courses/zip',
  'uploads/logos',
  'uploads/invoices',
  'uploads/profiles',
  'uploads/repair_photos',
  'uploads/accessories'
];

uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Gallery Image Upload
const galleryStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads/gallery')),
  filename: (req, file, cb) => {
    const uniqueName = `gallery_${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Certificate Upload
const certificateStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads/certificates')),
  filename: (req, file, cb) => {
    const uniqueName = `cert_${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Course Material Upload
const courseStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subDir = 'documents';
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) subDir = 'images';
    else if (ext === '.pdf') subDir = 'pdf';
    else if (['.mp4', '.webm', '.ogg', '.mov', '.3gp', '.mkv'].includes(ext)) subDir = 'videos';
    else if (['.zip', '.rar', '.7z'].includes(ext)) subDir = 'zip';
    cb(null, path.join(__dirname, '..', `uploads/courses/${subDir}`));
  },
  filename: (req, file, cb) => {
    const uniqueName = `course_${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Logo Upload
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads/logos')),
  filename: (req, file, cb) => {
    const uniqueName = `logo_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Repair Photo Upload
const repairPhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads/repair_photos')),
  filename: (req, file, cb) => { cb(null, 'repair_' + Date.now() + '_' + Math.round(Math.random()*1E9) + path.extname(file.originalname)); }
});

// File filters
const imageFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only image files are allowed (jpg, jpeg, png, gif, webp)'), false);
};

const certificateFilter = (req, file, cb) => {
  const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only PDF and image files are allowed for certificates'), false);
};

const documentFilter = (req, file, cb) => {
  const allowed = [
    'application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed',
    'application/x-7z-compressed', 'application/octet-stream',
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/3gpp', 'video/x-matroska'
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('File type not allowed. Supported: images, PDFs, office docs, ZIP, videos.'), false);
};

const accessoryStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads/accessories')),
  filename: (req, file, cb) => {
    const uniqueName = `accessory_${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Profile Photo Upload Storage
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads/profiles')),
  filename: (req, file, cb) => {
    const uniqueName = `profile_${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 10485760; // 10MB

module.exports = {
  uploadGallery: multer({ storage: galleryStorage, fileFilter: imageFilter, limits: { fileSize: maxSize } }),
  uploadCertificate: multer({ storage: certificateStorage, fileFilter: certificateFilter, limits: { fileSize: maxSize } }),
  uploadCourseMaterial: multer({ storage: courseStorage, fileFilter: documentFilter, limits: { fileSize: 100 * 1024 * 1024 } }), // 100MB for PDFs/videos
  uploadLogo: multer({ storage: logoStorage, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } }),
  uploadRepairPhoto: multer({ storage: repairPhotoStorage, fileFilter: imageFilter, limits: { fileSize: maxSize } }),
  uploadAccessory: multer({ storage: accessoryStorage, fileFilter: imageFilter, limits: { fileSize: maxSize } }),
  uploadProfile: multer({ storage: profileStorage, fileFilter: imageFilter, limits: { fileSize: maxSize } })
};
