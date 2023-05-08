/*
  Warnings:

  - You are about to drop the `Permissoes` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `_PermissoesToUsuario` DROP FOREIGN KEY `_PermissoesToUsuario_A_fkey`;

-- DropTable
DROP TABLE `Permissoes`;

-- CreateTable
CREATE TABLE `permissoes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_PermissoesToUsuario` ADD CONSTRAINT `_PermissoesToUsuario_A_fkey` FOREIGN KEY (`A`) REFERENCES `permissoes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
