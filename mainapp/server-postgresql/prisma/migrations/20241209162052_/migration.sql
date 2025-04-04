/*
  Warnings:

  - You are about to drop the column `userId` on the `Call` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Call" DROP CONSTRAINT "Call_userId_fkey";

-- AlterTable
ALTER TABLE "Call" DROP COLUMN "userId";
