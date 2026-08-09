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
import { CreateSearchProfileDto } from './dto/create-search-profile.dto';
import { UpdateSearchProfileDto } from './dto/update-search-profile.dto';
import { SearchProfilesService } from './search-profiles.service';

@ApiTags('search-profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search-profiles')
export class SearchProfilesController {
  constructor(private readonly searchProfilesService: SearchProfilesService) {}

  @Get()
  @ApiOperation({ summary: "List the current user's search profiles" })
  findAll(@Req() req: Request) {
    return this.searchProfilesService.findAll(req.user!.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Create a search profile' })
  create(@Req() req: Request, @Body() dto: CreateSearchProfileDto) {
    return this.searchProfilesService.create(req.user!.sub, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a search profile' })
  findOne(@Req() req: Request, @Param('id') id: string) {
    return this.searchProfilesService.findOne(req.user!.sub, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a search profile' })
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateSearchProfileDto | undefined,
  ) {
    return this.searchProfilesService.update(req.user!.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a search profile' })
  async remove(@Req() req: Request, @Param('id') id: string) {
    await this.searchProfilesService.remove(req.user!.sub, id);
  }
}
