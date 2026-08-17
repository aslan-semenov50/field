import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ListVacanciesQueryDto } from './dto/list-vacancies-query.dto';
import { VacanciesService } from './vacancies.service';

@ApiTags('vacancies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vacancies')
export class VacanciesController {
  constructor(private readonly vacanciesService: VacanciesService) {}

  @Get()
  @ApiOperation({ summary: 'List active vacancies' })
  findAll(@Query() query: ListVacanciesQueryDto) {
    return this.vacanciesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a vacancy' })
  findOne(@Param('id') id: string) {
    return this.vacanciesService.findOne(id);
  }
}
