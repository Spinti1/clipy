const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOADS_DIR = path.join(__dirname, '..', 'data', 'uploads');
const FILES_DIR = path.join(__dirname, '..', 'data', 'files');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(FILES_DIR)) fs.mkdirSync(FILES_DIR, { recursive: true });

const activeUploads = new Map();

function initUpload(name, size) {
  const uploadId = 'up_' + crypto.randomBytes(8).toString('hex');
  const filePath = path.join(UPLOADS_DIR, `${uploadId}.part`);
  const record = {
    uploadId,
    name: name || 'video.mp4',
    size: Number(size) || 0,
    offset: 0,
    filePath,
    createdAt: Date.now()
  };
  fs.writeFileSync(filePath, Buffer.alloc(0));
  activeUploads.set(uploadId, record);
  return {
    uploadId,
    chunkSize: 50 * 1024 * 1024
  };
}

function appendChunk(uploadId, offset, chunkBuffer) {
  const upload = activeUploads.get(uploadId);
  if (!upload) {
    const err = new Error('Upload session not found');
    err.status = 404;
    throw err;
  }
  fs.appendFileSync(upload.filePath, chunkBuffer);
  upload.offset += chunkBuffer.length;
  return {
    ok: true,
    offset: upload.offset
  };
}

function finishUpload(uploadId) {
  const upload = activeUploads.get(uploadId);
  if (!upload) {
    const err = new Error('Upload session not found');
    err.status = 404;
    throw err;
  }
  const fileExt = path.extname(upload.name) || '.mp4';
  const finalFilename = `${uploadId}${fileExt}`;
  const finalPath = path.join(FILES_DIR, finalFilename);

  if (fs.existsSync(upload.filePath)) {
    fs.renameSync(upload.filePath, finalPath);
  }

  activeUploads.delete(uploadId);

  return {
    ok: true,
    url: `/files/${finalFilename}`,
    durationSec: 15.0,
    uploadId,
    name: upload.name
  };
}

function deleteUpload(uploadId) {
  const upload = activeUploads.get(uploadId);
  if (upload) {
    if (fs.existsSync(upload.filePath)) fs.unlinkSync(upload.filePath);
    activeUploads.delete(uploadId);
  }
  return { ok: true };
}

module.exports = {
  initUpload,
  appendChunk,
  finishUpload,
  deleteUpload,
  UPLOADS_DIR,
  FILES_DIR
};
