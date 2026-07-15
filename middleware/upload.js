const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = [
  'uploads/gallery',
  'uploads/certificates',
  'uploads/certificates/templates',
  'uploads/courses/pdf',
  'uploads/courses/images',
  'uploads/courses/videos',
  'uploads/courses/documents',
  'uploads/payments/screenshots',
  'uploads/logos',
  'uploads/invoices',
  'uploads/profiles',
  'uploads/support',
  'uploads/repair_photos'
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
    else if (['.mp4', '.webm', '.ogg', '.mov', '.avi', '.3gp', '.mpeg'].includes(ext)) subDir = 'videos';
    cb(null, path.join(__dirname, '..', `uploads/courses/${subDir}`));
  },
  filename: (req, file, cb) => {
    const uniqueName = `course_${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Payment Screenshot Upload
const paymentStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads/payments/screenshots')),
  filename: (req, file, cb) => {
    const uniqueName = `screenshot_${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
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
    'application/pdf', 
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'application/zip',
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/3gpp', 'video/mpeg'
  ];
  if (allowed.includes(file.mimetype) || file.mimetype.startsWith('video/')) cb(null, true);
  else cb(new Error('File type not allowed'), false);
};

// Profile Photo Storage
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads/profiles')),
  filename: (req, file, cb) => {
    const uniqueName = `profile_${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Support Attachment Storage
const supportStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads/support')),
  filename: (req, file, cb) => {
    const uniqueName = `support_${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Certificate Template Background, Logo, Signature Storage
const templateStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads/certificates/templates')),
  filename: (req, file, cb) => {
    const uniqueName = `tpl_${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 10485760; // 10MB
const courseMaxSize = 52428800; // 50MB for videos/materials

module.exports = {
  uploadGallery: multer({ storage: galleryStorage, fileFilter: imageFilter, limits: { fileSize: maxSize } }),
  uploadCertificate: multer({ storage: certificateStorage, fileFilter: certificateFilter, limits: { fileSize: maxSize } }),
  uploadCourseMaterial: multer({ storage: courseStorage, fileFilter: documentFilter, limits: { fileSize: courseMaxSize } }),
  uploadLogo: multer({ storage: logoStorage, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } }),
  uploadRepairPhoto: multer({ storage: repairPhotoStorage, fileFilter: imageFilter, limits: { fileSize: maxSize } }),
  uploadPaymentScreenshot: multer({ storage: paymentStorage, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } }),
  uploadProfilePhoto: multer({ storage: profileStorage, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } }),
  uploadSupportAttachment: multer({ storage: supportStorage, fileFilter: documentFilter, limits: { fileSize: maxSize } }),
  uploadCertificateTemplate: multer({ storage: templateStorage, fileFilter: imageFilter, limits: { fileSize: maxSize } })
};
