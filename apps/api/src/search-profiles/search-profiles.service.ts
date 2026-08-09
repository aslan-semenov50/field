import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSearchProfileDto } from './dto/create-search-profile.dto';
import { UpdateSearchProfileDto } from './dto/update-search-profile.dto';

@Injectable()
export class SearchProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateSearchProfileDto) {
    return this.prisma.searchProfile.create({
      data: {
        ...dto,
        userId,
      },
    });
  }

  findAll(userId: string) {
    return this.prisma.searchProfile.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const profile = await this.prisma.searchProfile.findFirst({
      where: { id, userId },
    });

    if (!profile) {
      throw new NotFoundException('Search profile not found');
    }

    return profile;
  }

  async update(userId: string, id: string, dto: UpdateSearchProfileDto | undefined) {
    if (!dto || Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    try {
      return await this.prisma.searchProfile.update({
        where: { id, userId },
        data: dto,
      });
    } catch (error) {
      this.throwNotFoundForMissingRecord(error);
    }
  }

  async remove(userId: string, id: string) {
    try {
      await this.prisma.searchProfile.delete({
        where: { id, userId },
      });
    } catch (error) {
      this.throwNotFoundForMissingRecord(error);
    }
  }

  private throwNotFoundForMissingRecord(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new NotFoundException('Search profile not found');
    }

    throw error;
  }
}
