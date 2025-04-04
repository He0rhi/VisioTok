/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Blacklist` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Blacklist` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Friend` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Friend` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Blacklist" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "Friend" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";
