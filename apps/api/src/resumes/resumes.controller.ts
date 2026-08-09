import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { ResumesService } from './resumes.service';

@ApiTags('resumes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('resumes')
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Get()
  @ApiOperation({ summary: "List the current user's active resumes" })
  findAll(@Req() req: Request) {
    return this.resumesService.findAll(req.user!.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Create an internal FIELD resume' })
  create(@Req() req: Request, @Body() dto: CreateResumeDto) {
    return this.resumesService.create(req.user!.sub, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an active resume' })
  findOne(@Req() req: Request, @Param('id') id: string) {
    return this.resumesService.findOne(req.user!.sub, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an active resume' })
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateResumeDto | undefined,
  ) {
    return this.resumesService.update(req.user!.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive a resume' })
  async remove(@Req() req: Request, @Param('id') id: string) {
    await this.resumesService.remove(req.user!.sub, id);
  }
}
