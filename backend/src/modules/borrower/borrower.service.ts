import { randomUUID } from 'node:crypto';
import type { Types } from 'mongoose';
import { evaluateBre } from '../../lib/bre';
import { stageOf } from '../../lib/borrowerStage';
import { AppError, badRequest, conflict } from '../../lib/errors';
import { contentMatchesType, EXTENSIONS, isAllowedSlipType } from '../../lib/fileSignature';
import { toPaise } from '../../lib/money';
import { serializeProfile } from '../../lib/serializers';
import { BorrowerProfile } from '../../models/BorrowerProfile';
import type { StorageDriver } from '../../storage';
import type { ProfileInput } from './borrower.schemas';

type ProfileDocument = NonNullable<Awaited<ReturnType<typeof BorrowerProfile.findOne>>>;

export function profileView(profile: ProfileDocument | null) {
  return { profile: profile ? serializeProfile(profile) : null, stage: stageOf(profile) };
}

export const getProfile = (userId: Types.ObjectId) => BorrowerProfile.findOne({ user: userId });

/** Saves personal details and runs the BRE on the server. A failed BRE is persisted, then reported as 422. */
export async function saveProfile(userId: Types.ObjectId, input: ProfileInput) {
  const monthlySalary = toPaise(input.monthlySalary);
  const bre = evaluateBre({ ...input, monthlySalary });

  const profile = await BorrowerProfile.findOneAndUpdate(
    { user: userId },
    { $set: { ...input, monthlySalary, bre: { ...bre, checkedAt: new Date() } } },
    { upsert: true, new: true, runValidators: true },
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

export async function saveSalarySlip(userId: Types.ObjectId, file: UploadedFile | undefined, storage: StorageDriver) {
  if (!file) throw badRequest('Attach a salary slip file in the "file" field');

  const profile = await getProfile(userId);
  if (!profile?.bre?.passed) {
    throw conflict('Complete your personal details and pass the eligibility check first', 'BRE_NOT_PASSED');
  }
  if (!isAllowedSlipType(file.mimetype) || !contentMatchesType(file.buffer, file.mimetype)) {
    throw new AppError(400, 'UNSUPPORTED_FILE', 'Salary slip must be a PDF, JPG or PNG file');
  }

  const storageKey = `salary-slips/${userId}/${randomUUID()}${EXTENSIONS[file.mimetype]}`;
  await storage.save(storageKey, file.buffer, file.mimetype);

  profile.salarySlip = {
    storageKey,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    uploadedAt: new Date(),
  };
  await profile.save();
  return profile;
}
