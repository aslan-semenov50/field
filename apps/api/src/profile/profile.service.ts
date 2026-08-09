import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertProfileDto } from './dto/upsert-profile.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }

  upsert(userId: string, dto: UpsertProfileDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.primaryResumeId) {
        const primaryResume = await tx.resume.findFirst({
          where: {
            id: dto.primaryResumeId,
            userId,
            archivedAt: null,
          },
          select: { id: true },
        });

        if (!primaryResume) {
          throw new BadRequestException('Primary resume is not available');
        }
      }

      return tx.candidateProfile.upsert({
        where: { userId },
        create: {
          userId,
          ...dto,
        },
        update: dto,
      });
    });
  }
}
