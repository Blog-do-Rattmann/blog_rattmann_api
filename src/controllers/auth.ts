import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';

import fs from 'fs';
import path from 'path';

const privateKey = fs.readFileSync(path.resolve(__dirname, '../../keys/private.key'));

import { exceptionFieldInvalid } from '../utils/exceptions';
import {
    validateData,
    validateUsername,
    validateEmail
} from '../utils/validate';
import { createHistoryLogin } from '../utils/middleware';

const prisma = new PrismaClient();

const login = async (req: Request, res: Response, next: NextFunction) => {
    await verifyLogin()
    .then(async (response) => {
        await prisma.$disconnect();

        if (response !== null) {
            const listLevelAccess = response.nivel_acesso.map(level => {
                return level.nome;
            });

            const token = jwt.sign({
                sub: response.id,
                nome: response.nome,
                estado_conta: response.estado_conta,
                nivel_acesso: listLevelAccess
            }, privateKey, { algorithm: 'ES512' });

            return res
            .status(200)
            .send({
                token: token
            });
        }
    })
    .catch(async (err) => {
        console.error(err);
        await prisma.$disconnect();

        let status = 500;
        let mensagem = 'Ocorreu um erro em nosso servidor.<br\>Tente novamente mais tarde!';

        return res
            .status(status)
            .send(mensagem);
    });

    async function verifyLogin() {
        const fields = req.body;

        const { hasFieldIncorrect, nameFieldIncorrect } = verifyFieldIncorrect(fields);

        if (!hasFieldIncorrect) {
            const {
                login,
                senha
            } = fields;

            if (!validateData(login) || (!validateUsername(login) && !validateEmail(login))) return exceptionFieldInvalid(res, 'E-mail/nome de usuário está preenchido incorretamente!');
            if (!validateData(senha)) return exceptionFieldInvalid(res, 'Senha está preenchida incorretamente!');

            const dataHistory: {
                login: string,
                id: number | undefined,
                success: boolean,
                error: string | null,
            } = {
                login: login,
                id: undefined,
                success: false,
                error: null
            };

            const user = await prisma.usuario.findFirst({
                where: {
                    OR: [
                        {
                            nome_usuario: login
                        },
                        {
                            email: login
                        }
                    ]
                },
                include: {
                    nivel_acesso: {
                        select: {
                            nome: true
                        }
                    }
                }
            });

            if (user === null || !await argon2.verify(user.senha, senha)) {
                if (user === null) {
                    dataHistory.error = 'Usuário não encontrado!';

                    await createHistoryLogin(dataHistory);
                } else {
                    dataHistory.id = user.id;
                    dataHistory.error = 'Senha incorreta!';

                    await createHistoryLogin(dataHistory);
                }

                res
                .status(400)
                .send('Dados de login estão incorretos!');

                return null;
            }

            if (user.estado_conta !== 'ativo') {
                dataHistory.id = user.id;
                dataHistory.error = 'Usuário sem permissão de acesso!';

                await createHistoryLogin(dataHistory);

                res
                .status(400)
                .send('Usuário não possui permissão de acesso!<br\>Favor entrar em contato com um administrador.');

                return null;
            }

            dataHistory.id = user.id;
            dataHistory.success = true;

            await createHistoryLogin(dataHistory);

            return user;
        }

        res
        .status(400)
        .send(`Campo ${nameFieldIncorrect} não existe!`);

        return null;
    }
}

const verifyFieldIncorrect = (fields: {}) => {
    let hasFieldIncorrect = true;
    let nameFieldIncorrect = '';

    for (const field in fields) {
        switch (field) {
            case 'login':
                hasFieldIncorrect = false;
            break;
            case 'senha':
                hasFieldIncorrect = false;
            break;
            default:
                nameFieldIncorrect = field;
        }
    }

    return { hasFieldIncorrect, nameFieldIncorrect };
}

export default { login };