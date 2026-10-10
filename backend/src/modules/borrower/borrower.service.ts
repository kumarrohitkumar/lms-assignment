import { randomUUID } from 'node:crypto';
import type { Types } from 'mongoose';
import { evaluateBre } from '../../lib/bre';
import { stageOf } from '../../lib/borrowerStage';
import { AppError, badRequest, conflict } from '../../lib/errors';
import { contentMatchesType, EXTENSIONS, isAllowedSlipType, MAX_SLIP_BYTES, type SlipMimeType } from '../../lib/fileSignature';
import { toPaise } from '../../lib/money';
import { serializeProfile } from '../../lib/serializers';
import { BorrowerProfile } from '../../models/BorrowerProfile';
import type { StorageDriver } from '../../storage';
import type { CompleteDirectUploadInput, DirectUploadInput, ProfileInput } from './borrower.schemas';
import { assertNoOpenLoan } from './loan.service';

type ProfileDocument = NonNullable<Awaited<ReturnType<typeof BorrowerProfile.findOne>>>;

export function profileView(profile: ProfileDocument | null) {
  return { profile: profile ? serializeProfile(profile) : null, stage: stageOf(profile) };
}

export const getProfile = (userId: Types.ObjectId) => BorrowerProfile.findOne({ user: userId });

/** Saves personal details and runs the BRE on the server. A failed BRE is persisted, then reported as 422. */
export async function saveProfile(userId: Types.ObjectId, input: ProfileInput) {
  await assertNoOpenLoan(userId);
  const monthlySalary = toPaise(input.monthlySalary);
  const bre = evaluateBre({ ...input, monthlySalary });

  const profile = await BorrowerProfile.findOneAndUpdate(
    { user: userId },
    { $set: { ...input, monthlySalary, bre: { ...bre, checkedAt: new Date() } } },
    { upsert: true, returnDocument: 'after', runValidators: true },
  );

  if (!bre.passed) {
    throw new AppError(422, 'BRE_REJECTED', 'You are not eligible for a loan', bre.failures);
  }
  return profile;
}

export interface UploadedFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

async function profileReadyForSlip(userId: Types.ObjectId) {
  await assertNoOpenLoan(userId);
  const profile = await getProfile(userId);
  if (!profile?.bre?.passed) {
    throw conflict('Complete your personal details and pass the eligibility check first', 'BRE_NOT_PASSED');
  }
  return profile;
}

const unsupportedFile = () => new AppError(400, 'UNSUPPORTED_FILE', 'Salary slip must be a PDF, JPG or PNG file');
const fileTooLarge = () => new AppError(413, 'FILE_TOO_LARGE', 'File must be 5 MB or smaller');

const newSlipKey = (userId: Types.ObjectId, mime: SlipMimeType) => `salary-slips/${userId}/${randomUUID()}${EXTENSIONS[mime]}`;

async function attachSlip(
  profile: ProfileDocument,
  slip: { storageKey: string; originalName: string; mimeType: SlipMimeType; size: number },
) {
  profile.salarySlip = { ...slip, originalName: slip.originalName.slice(0, 200), uploadedAt: new Date() };
  await profile.save();
  return profile;
}

/** Multipart upload through the API (used with local disk storage). */
export async function saveSalarySlip(userId: Types.ObjectId, file: UploadedFile | undefined, storage: StorageDriver) {
  if (!file) throw badRequest('Attach a salary slip file in the "file" field');
  const profile = await profileReadyForSlip(userId);
  if (!isAllowedSlipType(file.mimetype) || !contentMatchesType(file.buffer, file.mimetype)) throw unsupportedFile();

  const storageKey = newSlipKey(userId, file.mimetype);
  await storage.save(storageKey, file.buffer, file.mimetype);
  return attachSlip(profile, { storageKey, originalName: file.originalname, mimeType: file.mimetype, size: file.size });
}

/**
 * Step 1 of a browser-to-storage upload: check the declared file, then hand out a target that only
 * accepts that key, type and size. Returns `{ direct: false }` when the storage can't do this.
 */
export async function startDirectUpload(userId: Types.ObjectId, input: DirectUploadInput, storage: StorageDriver) {
  await profileReadyForSlip(userId);
  if (!isAllowedSlipType(input.contentType)) throw unsupportedFile();
  if (input.size > MAX_SLIP_BYTES) throw fileTooLarge();
  if (!storage.direct) return { direct: false as const };

  const key = newSlipKey(userId, input.contentType);
  const target = await storage.direct.createTarget(key, { contentType: input.contentType, maxBytes: MAX_SLIP_BYTES });
  return { direct: true as const, key, ...target };
}

const MIME_BY_EXTENSION: Record<string, SlipMimeType> = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg' };

/** Step 2: the browser says it uploaded; verify what actually landed in storage before linking it. */
export async function completeDirectUpload(userId: Types.ObjectId, input: CompleteDirectUploadInput, storage: StorageDriver) {
  if (!storage.direct) throw badRequest('Direct uploads are not available; upload the file to /borrower/salary-slip');
  const match = new RegExp(`^salary-slips/${userId}/[0-9a-f-]{36}\\.(pdf|png|jpg)$`).exec(input.key);
  if (!match) throw badRequest('Unknown upload');
  const profile = await profileReadyForSlip(userId);

  const size = await storage.direct.size(input.key);
  if (size === null) throw new AppError(400, 'UPLOAD_NOT_FOUND', 'The file was not uploaded. Try again.');
  if (size > MAX_SLIP_BYTES) {
    await storage.direct.remove(input.key);
    throw fileTooLarge();
  }
  const mimeType = MIME_BY_EXTENSION[match[1]!]!;
  if (!contentMatchesType(await storage.direct.readStart(input.key, 8), mimeType)) {
    await storage.direct.remove(input.key);
    throw unsupportedFile();
  }
  return attachSlip(profile, { storageKey: input.key, originalName: input.fileName, mimeType, size });
}
