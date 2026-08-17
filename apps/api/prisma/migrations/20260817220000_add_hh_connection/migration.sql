-- CreateTable
CREATE TABLE "hh_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hhUserId" TEXT NOT NULL,
    "accessTokenCiphertext" TEXT NOT NULL,
    "refreshTokenCiphertext" TEXT NOT NULL,
    "accessTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hh_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hh_oauth_states" (
    "stateHash" VARCHAR(64) NOT NULL,
    "userId" TEXT NOT NULL,
    "codeVerifierCiphertext" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hh_oauth_states_pkey" PRIMARY KEY ("stateHash")
);

-- CreateIndex
CREATE UNIQUE INDEX "hh_connections_userId_key" ON "hh_connections"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "hh_oauth_states_userId_key" ON "hh_oauth_states"("userId");

-- AddForeignKey
ALTER TABLE "hh_connections" ADD CONSTRAINT "hh_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hh_oauth_states" ADD CONSTRAINT "hh_oauth_states_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
