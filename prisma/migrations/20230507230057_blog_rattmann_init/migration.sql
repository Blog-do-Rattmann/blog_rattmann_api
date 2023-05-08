/*
  Warnings:

  - You are about to drop the column `nivel_acesso` on the `usuarios` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `usuarios` DROP COLUMN `nivel_acesso`,
    MODIFY `data_nascimento` DATE NOT NULL;

-- CreateTable
CREATE TABLE `Permissoes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_PermissoesToUsuario` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_PermissoesToUsuario_AB_unique`(`A`, `B`),
    INDEX `_PermissoesToUsuario_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_PermissoesToUsuario` ADD CONSTRAINT `_PermissoesToUsuario_A_fkey` FOREIGN KEY (`A`) REFERENCES `Permissoes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_PermissoesToUsuario` ADD CONSTRAINT `_PermissoesToUsuario_B_fkey` FOREIGN KEY (`B`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
