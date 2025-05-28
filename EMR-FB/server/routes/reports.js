import express from 'express';
import multer from 'multer';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = 'uploads/reports';
    fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // Save using original filename
  },
});
const upload = multer({ storage });

// Upload PDF Endpoint
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.status(200).json({ message: 'File uploaded successfully' });
  } catch (error) {
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Email PDF Endpoint
router.post('/email', async (req, res) => {
  const { email, fileName } = req.body;
  const filePath = path.join('uploads/reports', fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // ✅ Configure mail transporter (replace with real creds)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'yourclinicemail@gmail.com',
      pass: 'your-email-password-or-app-password',
    },
  });

  const mailOptions = {
    from: 'yourclinicemail@gmail.com',
    to: email,
    subject: 'Your Medical Report from The Wellness Studio',
    text: 'Please find your medical report attached.',
    attachments: [{ filename: fileName, path: filePath }],
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

export default router;
