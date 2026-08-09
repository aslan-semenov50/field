import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';

type ResumeWriteData = {
  title?: string;
  languageCode?: string;
  structuredContent?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
  plainText?: string | null;
  contentVersion?: number;
  storageProvider?: string | null;
  storageKey?: string | null;
  originalFileName?: string | null;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  checksumSha256?: string | null;
};

@Injectable()
export class ResumesService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateResumeDto) {
    const data = this.buildWriteData(dto);

    return this.prisma.resume.create({
      data: {
        ...data,
        title: dto.title,
        languageCode: dto.languageCode,
        userId,
      },
    });
  }

  findAll(userId: string) {
    return this.prisma.resume.findMany({
      where: { userId, archivedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const resume = await this.prisma.resume.findFirst({
      where: { id, userId, archivedAt: null },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    return resume;
  }

  async update(userId: string, id: string, dto: UpdateResumeDto | undefined) {
    if (!dto || Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    try {
      return await this.prisma.resume.update({
        where: { id, userId, archivedAt: null },
        data: this.buildWriteData(dto),
      });
    } catch (error) {
      this.throwNotFoundForMissingRecord(error);
    }
  }

  async remove(userId: string, id: string) {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.resume.update({
          where: { id, userId, archivedAt: null },
          data: { archivedAt: new Date() },
        });

        await tx.candidateProfile.updateMany({
          where: { userId, primaryResumeId: id },
          data: { primaryResumeId: null },
        });
      });
    } catch (error) {
      this.throwNotFoundForMissingRecord(error);
    }
  }

  private buildWriteData(dto: CreateResumeDto | UpdateResumeDto) {
    const data: ResumeWriteData = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.languageCode !== undefined) data.languageCode = dto.languageCode;
    if (dto.structuredContent !== undefined) {
      data.structuredContent =
        dto.structuredContent === null
          ? Prisma.DbNull
          : (dto.structuredContent as Prisma.InputJsonObject);
    }
    if (dto.plainText !== undefined) data.plainText = dto.plainText;
    if (dto.contentVersion !== undefined) data.contentVersion = dto.contentVersion;
    if (dto.storageProvider !== undefined) data.storageProvider = dto.storageProvider;
    if (dto.storageKey !== undefined) data.storageKey = dto.storageKey;
    if (dto.originalFileName !== undefined) data.originalFileName = dto.originalFileName;
    if (dto.mimeType !== undefined) data.mimeType = dto.mimeType;
    if (dto.fileSizeBytes !== undefined) data.fileSizeBytes = dto.fileSizeBytes;
    if (dto.checksumSha256 !== undefined) data.checksumSha256 = dto.checksumSha256;

    return data;
  }

  private throwNotFoundForMissingRecord(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new NotFoundException('Resume not found');
    }

    throw error;
  }
}
