import { PartialType } from '@nestjs/swagger';
import { CreateSearchProfileDto } from './create-search-profile.dto';

export class UpdateSearchProfileDto extends PartialType(CreateSearchProfileDto, {
  skipNullProperties: false,
}) {}
