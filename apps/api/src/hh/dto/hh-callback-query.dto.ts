import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { trimString } from '../../common/validation/transforms';

export class HhCallbackQueryDto {
  @Transform(trimString)
  @IsString()
  @Length(43, 43)
  @Matches(/^[A-Za-z0-9_-]+$/)
  state!: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  code?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @IsIn(['access_denied'])
  error?: 'access_denied';
}
