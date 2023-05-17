import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

import { exceptionUserNotFound, exceptionFieldInvalid } from '../utils/exceptions';
import {
    validateData,
    validateUsername,
    validateEmail,
    validatePassword
} from '../utils/validate';

const prisma = new PrismaClient();

const login = async (req: Request, res: Response, next: NextFunction) => {
    await verifyLogin()
    .then(async (response) => {
        await prisma.$disconnect();

        if (response !== null) {
            return res
            .status(200)
            .send('Login realizado com sucesso!');
        }

        return res
        .status(400)
        .send('Não foi possível realizar login!');
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
                }
            });

            if (user === null) {
                res
                .status(404)
                .send('Usuário não encontrado!');

                return null;
            }

            console.log(!await argon2.verify(user.senha, senha))
            console.log('Antes argon')

            if (!await argon2.verify(user.senha, senha)) {
                res
                .status(400)
                .send('Dados de login estão incorretos!');

                return null;
            }

            console.log('Depois do argon')

            if (user.estado_conta !== 'ativo') {
                res
                .status(400)
                .send('Usuário não está ativo!<br\>Favor entrar em contato com um administrador.');

                return null;
            }

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