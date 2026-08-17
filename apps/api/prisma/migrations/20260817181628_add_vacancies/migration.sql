-- CreateEnum
CREATE TYPE "VacancyLifecycleStatus" AS ENUM ('ACTIVE', 'CLOSED', 'REMOVED');

-- CreateTable
CREATE TABLE "vacancy_sources" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacancy_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacancies" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "companyName" TEXT,
    "description" TEXT,
    "salaryMin" DECIMAL(14,2),
    "salaryMax" DECIMAL(14,2),
    "salaryCurrency" VARCHAR(3),
    "salaryPeriod" "SalaryPeriod",
    "locationText" TEXT,
    "countryCode" VARCHAR(2),
    "city" TEXT,
    "workFormat" "WorkFormat",
    "employmentType" "EmploymentType",
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourceUrl" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "status" "VacancyLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacancies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vacancy_sources_code_key" ON "vacancy_sources"("code");

-- CreateIndex
CREATE UNIQUE INDEX "vacancies_sourceId_externalId_key" ON "vacancies"("sourceId", "externalId");

-- CreateIndex
CREATE INDEX "vacancies_status_publishedAt_id_idx" ON "vacancies"("status", "publishedAt", "id");

-- CreateIndex
CREATE INDEX "vacancies_sourceId_status_publishedAt_id_idx" ON "vacancies"("sourceId", "status", "publishedAt", "id");

-- AddForeignKey
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "vacancy_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
