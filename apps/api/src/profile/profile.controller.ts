import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpsertProfileDto } from './dto/upsert-profile.dto';
import { ProfileService } from './profile.service';

@ApiTags('profile')
@ApiBearerAuth()
@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get the current user professional profile' })
  get(@Req() req: Request) {
    return this.profileService.get(req.user!.sub);
  }

  @Put()
  @ApiOperation({ summary: 'Create or update the current user professional profile' })
  upsert(@Req() req: Request, @Body() dto: UpsertProfileDto) {
    return this.profileService.upsert(req.user!.sub, dto);
  }
}
