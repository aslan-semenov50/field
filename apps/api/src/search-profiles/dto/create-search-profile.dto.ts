import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { EmploymentType, SalaryPeriod, Seniority, WorkFormat } from '@prisma/client';
import {
  trimString,
  trimStringArray,
  upperTrimString,
  upperTrimStringArray,
} from '../../common/validation/transforms';

const isProvided = (_object: unknown, value: unknown) => value !== undefined;
const isNonNullish = (_object: unknown, value: unknown) =>
  value !== undefined && value !== null;

export class CreateSearchProfileDto {
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ValidateIf(isProvided)
  @Transform(trimStringArray)
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(120, { each: true })
  roleTitles?: string[];

  @ValidateIf(isProvided)
  @Transform(upperTrimStringArray)
  @IsArray()
  @ArrayMaxSize(8)
  @ArrayUnique()
  @IsEnum(Seniority, { each: true })
  seniorities?: Seniority[];

  @ValidateIf(isNonNullish)
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999_999_999_999.99)
  salaryMin?: number | null;

  @ValidateIf(isNonNullish)
  @Transform(upperTrimString)
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/)
  salaryCurrency?: string | null;

  @ValidateIf(isNonNullish)
  @Transform(upperTrimString)
  @IsEnum(SalaryPeriod)
  salaryPeriod?: SalaryPeriod | null;

  @ValidateIf(isProvided)
  @IsBoolean()
  requireKnownSalary?: boolean;

  @ValidateIf(isProvided)
  @Transform(upperTrimStringArray)
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsString({ each: true })
  @Length(2, 2, { each: true })
  @Matches(/^[A-Z]{2}$/, { each: true })
  countryCodes?: string[];

  @ValidateIf(isProvided)
  @Transform(trimStringArray)
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(100, { each: true })
  cities?: string[];

  @ValidateIf(isProvided)
  @Transform(upperTrimStringArray)
  @IsArray()
  @ArrayMaxSize(3)
  @ArrayUnique()
  @IsEnum(WorkFormat, { each: true })
  workFormats?: WorkFormat[];

  @ValidateIf(isProvided)
  @Transform(upperTrimStringArray)
  @IsArray()
  @ArrayMaxSize(6)
  @ArrayUnique()
  @IsEnum(EmploymentType, { each: true })
  employmentTypes?: EmploymentType[];

  @ValidateIf(isProvided)
  @Transform(trimStringArray)
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(80, { each: true })
  requiredSkills?: string[];

  @ValidateIf(isProvided)
  @Transform(trimStringArray)
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(80, { each: true })
  preferredSkills?: string[];

  @ValidateIf(isProvided)
  @IsBoolean()
  isActive?: boolean;
}
