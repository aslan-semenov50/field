import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { trimString } from '../../common/validation/transforms';

const isProvided = (_object: unknown, value: unknown) => value !== undefined;
const isNonNullProvided = (_object: unknown, value: unknown) =>
  value !== undefined && value !== null;

export class UpdateResumeDto {
  @ValidateIf(isProvided)
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @ValidateIf(isProvided)
  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  @Matches(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,2}$/)
  languageCode?: string;

  @ValidateIf(isNonNullProvided)
  @IsObject()
  structuredContent?: Record<string, unknown> | null;

  @ValidateIf(isNonNullProvided)
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100_000)
  plainText?: string | null;

  @ValidateIf(isProvided)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  contentVersion?: number;

  @ValidateIf(isNonNullProvided)
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  storageProvider?: string | null;

  @ValidateIf(isNonNullProvided)
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2_048)
  storageKey?: string | null;

  @ValidateIf(isNonNullProvided)
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  originalFileName?: string | null;

  @ValidateIf(isNonNullProvided)
  @Transform(trimString)
  @IsString()
  @MaxLength(255)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*\/[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*$/)
  mimeType?: string | null;

  @ValidateIf(isNonNullProvided)
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  fileSizeBytes?: number | null;

  @ValidateIf(isNonNullProvided)
  @Transform(trimString)
  @IsString()
  @Matches(/^[A-Fa-f0-9]{64}$/)
  checksumSha256?: string | null;
}
