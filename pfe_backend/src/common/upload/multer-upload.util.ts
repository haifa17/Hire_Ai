import { existsSync, mkdirSync } from 'node:fs';
import { diskStorage, Options } from 'multer';
import { extname, join } from 'node:path';
import { randomInt } from 'node:crypto';

export const UPLOADS_ROOT = join(process.cwd(), 'uploads');

export function ensureDirectory(path: string) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

// Math.random() is not cryptographically secure and its output can be
// predicted; use the CSPRNG-backed crypto.randomInt for the uniqueness
// suffix of uploaded file names instead.
function uniqueSuffix(): number {
  return randomInt(1e9);
}

export function createImageUploadOptions(subDir: string): Options {
  const destination = join(UPLOADS_ROOT, subDir);
  ensureDirectory(destination);
  const extensionByMime: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/pjpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/x-png': '.png',
  };

  return {
    storage: diskStorage({
      destination,
      filename: (_req, file, cb) => {
        const originalExt = extname(file.originalname).toLowerCase();
        const safeExt =
          extensionByMime[file.mimetype] ??
          (['.jpg', '.jpeg', '.png', '.webp'].includes(originalExt)
            ? originalExt
            : '.jpg');
        const uniqueName = `${Date.now()}-${uniqueSuffix()}${safeExt}`;
        cb(null, uniqueName);
      },
    }),
    fileFilter: (_req, file, cb) => {
      if (!extensionByMime[file.mimetype]) {
        cb(null, false);
        return;
      }
      cb(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 1,
      fields: 20,
      parts: 25,
      fieldNameSize: 100,
      fieldSize: 1024 * 1024,
      headerPairs: 2000,
    },
  };
}

export function createFileUploadOptions(
  subDir: string,
  allowedMimes?: string[],
): Options {
  const destination = join(UPLOADS_ROOT, subDir);
  ensureDirectory(destination);

  const defaultAllowed = [
    'application/pdf',
    'image/jpeg',
    'image/pjpeg',
    'image/png',
    'image/webp',
  ];

  const allowed = allowedMimes ?? defaultAllowed;

  return {
    storage: diskStorage({
      destination,
      filename: (_req, file, cb) => {
        const originalExt = extname(file.originalname).toLowerCase();
        const safeExt = originalExt || '.bin';
        const uniqueName = `${Date.now()}-${uniqueSuffix()}${safeExt}`;
        cb(null, uniqueName);
      },
    }),
    fileFilter: (_req, file, cb) => {
      if (!allowed.includes(file.mimetype)) {
        cb(null, false);
        return;
      }
      cb(null, true);
    },
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 1,
      fields: 20,
      parts: 25,
      fieldNameSize: 100,
      fieldSize: 1024 * 1024,
      headerPairs: 2000,
    },
  };
}

export function createApplicationUploadOptions(): Options {
  const cvDestination = join(UPLOADS_ROOT, 'applications/cvs');
  const coverLetterDestination = join(
    UPLOADS_ROOT,
    'applications/cover-letters',
  );
  const supportingDestination = join(
    UPLOADS_ROOT,
    'applications/supporting-documents',
  );

  ensureDirectory(cvDestination);
  ensureDirectory(coverLetterDestination);
  ensureDirectory(supportingDestination);

  const allowedByField: Record<string, string[]> = {
    cv: ['application/pdf'],
    coverLetter: ['application/pdf'],
    supportingDocuments: [
      'application/pdf',
      'image/jpeg',
      'image/pjpeg',
      'image/png',
      'image/webp',
    ],
  };

  return {
    storage: diskStorage({
      destination: (_req, file, cb) => {
        let destination = supportingDestination;
        if (file.fieldname === 'cv') {
          destination = cvDestination;
        } else if (file.fieldname === 'coverLetter') {
          destination = coverLetterDestination;
        }
        cb(null, destination);
      },
      filename: (_req, file, cb) => {
        const originalExt = extname(file.originalname).toLowerCase();
        const safeExt = originalExt || '.bin';
        const uniqueName = `${Date.now()}-${uniqueSuffix()}${safeExt}`;
        cb(null, uniqueName);
      },
    }),
    fileFilter: (_req, file, cb) => {
      const allowed = allowedByField[file.fieldname] ?? [];
      if (!allowed.includes(file.mimetype)) {
        cb(null, false);
        return;
      }
      cb(null, true);
    },
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 6,
      fields: 30,
      parts: 40,
      fieldNameSize: 100,
      fieldSize: 1024 * 1024,
      headerPairs: 2000,
    },
  };
}

export function toPublicUploadUrl(filePath: string): string {
  const normalized = filePath.split('\\').join('/');
  const uploadsIndex = normalized.lastIndexOf('/uploads/');

  if (uploadsIndex === -1) {
    return normalized;
  }

  return normalized.slice(uploadsIndex);
}
