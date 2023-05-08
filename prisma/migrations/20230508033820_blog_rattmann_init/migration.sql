/*
  Warnings:

  - A unique constraint covering the columns `[nome_usuario]` on the table `usuarios` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `usuarios` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `usuarios_nome_usuario_email_key` ON `usuarios`;

-- CreateIndex
CREATE UNIQUE INDEX `usuarios_nome_usuario_key` ON `usuarios`(`nome_usuario`);

-- CreateIndex
CREATE UNIQUE INDEX `usuarios_email_key` ON `usuarios`(`email`);
