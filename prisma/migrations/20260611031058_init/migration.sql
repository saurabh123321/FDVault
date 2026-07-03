-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'VIEWER');

-- CreateEnum
CREATE TYPE "FdStatus" AS ENUM ('ACTIVE', 'MATURED', 'RENEWED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('CREATE', 'RENEW', 'WITHDRAW', 'ADD');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fds" (
    "id" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "holderName" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "principalAmount" DOUBLE PRECISION NOT NULL,
    "withdrawAmount" DOUBLE PRECISION NOT NULL,
    "interestEarned" DOUBLE PRECISION NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL,
    "status" "FdStatus" NOT NULL DEFAULT 'ACTIVE',
    "remarks" TEXT,
    "parentFdId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fd_transactions" (
    "id" TEXT NOT NULL,
    "fdId" TEXT NOT NULL,
    "transactionType" "TransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fd_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "fds_accountNumber_receiptNumber_key" ON "fds"("accountNumber", "receiptNumber");

-- AddForeignKey
ALTER TABLE "fds" ADD CONSTRAINT "fds_parentFdId_fkey" FOREIGN KEY ("parentFdId") REFERENCES "fds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fd_transactions" ADD CONSTRAINT "fd_transactions_fdId_fkey" FOREIGN KEY ("fdId") REFERENCES "fds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
