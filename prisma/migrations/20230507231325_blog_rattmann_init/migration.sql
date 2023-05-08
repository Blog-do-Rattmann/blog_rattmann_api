/*
  Warnings:

  - You are about to alter the column `nome` on the `categorias` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(100)`.
  - You are about to alter the column `descricao` on the `categorias` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(100)`.
  - You are about to alter the column `nome` on the `permissoes` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(30)`.
  - You are about to alter the column `titulo` on the `posts` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(100)`.
  - You are about to alter the column `editado_por` on the `posts` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(100)`.

*/
-- AlterTable
ALTER TABLE `categorias` MODIFY `nome` VARCHAR(100) NOT NULL,
    MODIFY `descricao` VARCHAR(100) NOT NULL;

-- AlterTable
ALTER TABLE `comentarios` MODIFY `conteudo` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `permissoes` MODIFY `nome` VARCHAR(30) NOT NULL,
    MODIFY `descricao` TINYTEXT NOT NULL;

-- AlterTable
ALTER TABLE `posts` MODIFY `titulo` VARCHAR(100) NULL,
    MODIFY `conteudo` MEDIUMTEXT NULL,
    MODIFY `editado_por` VARCHAR(100) NULL;
