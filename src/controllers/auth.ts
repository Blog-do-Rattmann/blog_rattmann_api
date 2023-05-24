import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import fs from 'fs';
import path from 'path';

const privateKey = fs.readFileSync(path.resolve(__dirname, '../../keys/private.key'));

import { exceptionUserNotFound, exceptionFieldInvalid } from '../utils/exceptions';

import {
    validateData,
    validateUsername,
    validateEmail
} from '../utils/validate';

import {
    verifyFieldIncorrect
} from '../utils/handle';

import { createHistoryLogin, displayResponseJson } from '../utils/middleware';

const prisma = new PrismaClient();

const login = async (req: Request, res: Response, next: NextFunction) => {
    await verifyLogin()
    .then(async (response) => {
        await prisma.$disconnect();

        if (response !== null) {
            const token = generateToken(res, response);

            return token;
        }
    })
    .catch(async (err) => {
        console.error(err);
        await prisma.$disconnect();

        return displayResponseJson(res, 500);
    });

    async function verifyLogin() {
        const fields = req.body;

        const { hasFieldIncorrect, nameFieldIncorrect } = verifyFieldIncorrect(fields, 'post', 'login');

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
                    permissao: {
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

                displayResponseJson(res, 400, 'Dados de login estão incorretos!');

                return null;
            }

            if (user.estado_conta !== 'ativo') {
                dataHistory.id = user.id;
                dataHistory.error = 'Usuário sem permissão de acesso!';

                await createHistoryLogin(dataHistory);

                displayResponseJson(res, 400, 'Usuário não possui permissão de acesso!<br\>Favor entrar em contato com um administrador.');

                return null;
            }

            dataHistory.id = user.id;
            dataHistory.success = true;

            await createHistoryLogin(dataHistory);

            return user;
        }

        displayResponseJson(res, 400, `Campo ${nameFieldIncorrect} não existe!`);

        return null;
    }
}

const forgotPassword = async (req: Request, res: Response) => {
    await forgottenPassword()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (err) => {
        console.error(err);
        await prisma.$disconnect();

        return displayResponseJson(res, 500);
    });

    async function forgottenPassword() {
        const data = dataProcessing();

        if (data !== null) {
            const user = await prisma.usuario.findFirst({
                where: {
                    OR: [
                        {
                            nome_usuario: data
                        },
                        {
                            email: data
                        }
                    ]
                }
            });

            if (user !== null) {
                const token = await passwordRecoveryToken(user.id);

                if (token !== null) {
                    console.log(token)

                    // Criar função para enviar e-mail com dados em dotenv
                }

                return null;
            }

            return exceptionUserNotFound(res);
        }
    }

    function dataProcessing() {
        const fields = req.body;

        const { hasFieldIncorrect, nameFieldIncorrect } = verifyFieldIncorrect(fields, 'post', 'forgot-password');
        
        if (!hasFieldIncorrect) {
            const {
                login,
                email,
                nome_usuario
            } = fields;
    
            if (validateData(login) && (validateUsername(login) || validateEmail(login))) return login;
            if (validateData(nome_usuario) && validateUsername(nome_usuario)) return nome_usuario;
            if (validateData(email) && validateEmail(email)) return email;

            return null;
        }

        if (nameFieldIncorrect === '') {
            displayResponseJson(res, 400, 'Nenhum campo foi preenchido!');

            return null;
        }

        displayResponseJson(res, 400, `Campo ${nameFieldIncorrect} não existe!`);

        return null;
    }

    async function passwordRecoveryToken(id: number) {
        const token = crypto.randomBytes(60).toString('hex');
        const timeExpiration = new Date();

        timeExpiration.setMinutes(timeExpiration.getMinutes() + 30);

        const recovery = await prisma.recuperacaoSenha.upsert({
            where: {
                usuario_id: id,
            },
            update: {
                token: token,
                tempo: timeExpiration
            },
            create: {
                token: token,
                tempo: timeExpiration,
                usuario: {
                    connect: {
                        id: id
                    }
                }
            }
        });

        if (recovery === null) {
            displayResponseJson(res, 400, 'Não foi possível gerar token de recuperação de senha!');

            return null;
        }

        return token;
    }
}

const generateToken = (res: Response, data: {
    id: number,
    nome: string,
    nome_usuario: string,
    estado_conta: string,
    permissao: {
        nome: string
    }
}) => {
    const token = jwt.sign({
        sub: data.id,
        data: {
            nome: data.nome,
            nome_usuario: data.nome_usuario,
            estado_conta: data.estado_conta,
            permissao: data.permissao.nome
        },
        exp: Math.floor(Date.now() / 1000) + (60 * 60)
    }, privateKey, { algorithm: 'ES512' }, (error, token) => {
        if (error) {
            return displayResponseJson(res, 500, 'Falha ao gerar token!<br\>Tente novamente mais tarde!');
        }

        return res
        .set('X-Access-Token', token)
        .status(200)
        .send('Login realizado com sucesso!');
    });

    return token;
}

export default {
    login,
    forgotPassword
};