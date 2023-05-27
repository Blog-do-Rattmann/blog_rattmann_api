import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import moment from 'moment';
import 'moment-timezone';

import fs from 'fs';
import path from 'path';

const privateKey = fs.readFileSync(path.resolve(__dirname, '../../keys/private.key'));

import { exceptionUserNotFound, exceptionFieldInvalid } from '../utils/exceptions';

import {
    validateData,
    validateUsername,
    validateEmail,
    validatePassword
} from '../utils/validate';

import {
    verifyFieldIncorrect
} from '../utils/handle';

import { createHistoryLogin, displayResponseJson } from '../utils/middleware';

import { convertStringToBoolean } from '../utils/global';

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
                    const emailSent = await sendMail(user, token);

                    if (emailSent) return displayResponseJson(res, 200, 'E-mail de recuperação enviado com sucesso!');

                    return displayResponseJson(res, 502, 'Não foi possível enviar o e-mail de recuperação. Tente novamente mais tarde!');
                }

                return displayResponseJson(res, 502, 'Não foi possível gerar o token de recuperação. Tente novamente mais tarde!');
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
        // Moment converte a data atual de UTC para fuso horário de São Paulo, adiciona 30 minutos e
        // formata para um padrão aceito pelo prisma
        const timeExpiration = moment().add(30, 'minutes').tz('America/Sao_Paulo').format('YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');

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

    async function sendMail(user: any, token: string) {
        const secure = String(process.env.MAIL_SECURE);

        const smtpSettings: {
            host: string,
            port: number,
            secure: boolean,
            auth: {
                user: string,
                pass: string
            }
        } = {
            host: String(process.env.MAIL_HOST),
            port: Number(process.env.MAIL_PORT),
            secure: convertStringToBoolean(secure),
            auth: {
                user: String(process.env.MAIL_USER),
                pass: String(process.env.MAIL_PASSWORD)
            }
        }

        const bodyMail: {
            from: string,
            to: string,
            subject: string,
            text: string,
            html: string
        } = {
            from: `"${String(process.env.MAIL_FROM_NAME)}" ${String(process.env.MAIL_FROM_ADDRESS)}`,
            to: user.email,
            subject: 'Recuperação de Senha',
            text: `
            Caro ${String(user.nome)},
            
            Entramos em contato para fornecer o acesso para recuperação da sua senha.
            
            Necessário acessar o link abaixo para iniciar o processo:
            http://localhost:3000/recuperar-senha/${token}
            
            Caso não tenha feito a solicitação, sugerimos que troque sua senha.`,
            html: `
            <!DOCTYPE html>
            <html lang="pt-br">
                <head>
                    <meta charset="UTF-8">
                    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Document</title>
                    <style>
                        body {
                            background-color: #f6f6f6;
                            color: #2b2b2b;
                            -webkit-font-smoothing: antialiased;
                            line-height: 1.4;
                            margin: 0;
                            padding: 0;
                            -ms-text-size-adjust: 100%;
                            -webkit-text-size-adjust: 100%;
                            font-family: Arial, Helvetica, sans-serif;
                            font-size: 16px;
                        }

                        a {
                            background-color: #036ffc;
                            color: #fff;
                            padding: 12px 25px;
                            margin: 0;
                            border-radius: 10px;
                            text-decoration: none;
                            text-transform: capitalize;
                            font-weight: 700;
                        }

                        .aviso {
                            color: #ad4242;
                        }
                    </style>
                </head>
                <body>
                    <table border="0" cellpadding="0" cellspacing="0" class="">
                        <tbody>
                            <tr>
                                <td>
                                    <p>Caro <strong>${String(user.nome)}</strong>,</p>
                                    <p>Entramos em contato para fornecer o acesso para recuperação da sua senha.</p>
                                    <p style="padding-bottom: 8px;">
                                        <span style="padding-bottom: 12px; display: block;">Necessário acessar o link abaixo para iniciar o processo:</span>
                                        <a href="http://localhost:3000/recuperar-senha/${token}">
                                            Recuperar Senha
                                        </a>
                                        <br/>
                                    </p>
                                    <p>
                                        Se não conseguir acessar o link clicando no botão, copie o link abaixo e cole em seu navegador:
                                        <br/>
                                        <i>http://localhost:3000/recuperar-senha/${token}</i>
                                    </p>
                                    <p class="aviso">
                                        Caso não tenha feito a solicitação, sugerimos que troque sua senha.
                                    </p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </body>
            </html>`
        }

        let transporter = nodemailer.createTransport(smtpSettings);

        let verifySmtpServer = true;
        
        transporter.verify((error, success) => {
            if (error) {
                console.error(error)

                verifySmtpServer = false;
            }
        });

        let validEmail = true;
        let infoEmail = null;

        if (verifySmtpServer) {
            transporter.sendMail(bodyMail, (error, info) => {
                if (error) {
                    console.error(error)

                    validEmail = false;
                }

                infoEmail = info;
            });

            return validEmail;
        }

        return verifySmtpServer;
    }
}

const recoveryPassword = async (req: Request, res: Response) => {
    await changePassword()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (err) => {
        console.error(err);
        await prisma.$disconnect();

        return displayResponseJson(res, 500);
    });

    async function changePassword() {
        const data = dataProcessing();

        if (data !== null) {
            const { token } = req.params;

            if (token !== undefined) {
                const verifyToken = await prisma.recuperacaoSenha.findFirst({
                    where: {
                        token: token
                    },
                    include: {
                        usuario: true
                    }
                });

                if (verifyToken === null) return displayResponseJson(res, 401, 'Token inválido para recuperação de senha!');

                const timeNow = moment();
                const dateTokenUtc = moment(verifyToken.tempo)
                                    .utc()
                                    .format('YYYY-MM-DD[T]HH:mm:ss');
                // Pega a data recuperada do banco em UTC e converte para o formato do moment
                const dateToken = moment(dateTokenUtc);

                const hash = await argon2.hash(data);

                if (!timeNow.isAfter(dateToken)) {
                    const updatePassword = await prisma.usuario.update({
                        where: {
                            id: verifyToken.usuario_id
                        },
                        data: {
                            senha: hash
                        }
                    });

                    if (updatePassword === null) return displayResponseJson(res, 500, 'Não foi possível atualizar senha!');

                    await prisma.recuperacaoSenha.update({
                        where: {
                            id: verifyToken.id
                        },
                        data: {
                            token: null,
                            tempo: null
                        }
                    });

                    return displayResponseJson(res, 200, 'Senha recuperada com sucesso. Agora é possível realizar login!');
                }

                return displayResponseJson(res, 403, 'Tempo para recuperação de senha expirou.<br/>Faça uma nova solicitação para recuperação!');
            }
        }
    }

    function dataProcessing() {
        const fields = req.body;

        const { hasFieldIncorrect, nameFieldIncorrect } = verifyFieldIncorrect(fields, 'post', 'recovery-password');
        
        if (!hasFieldIncorrect) {
            const {
                senha,
            } = fields;
    
            if (!validateData(senha) || !validatePassword(senha)) return exceptionFieldInvalid(res, 'Senha não está no padrão correto!<br\>Precisa de pelo menos 8 caractes, uma letra minúscula, uma maiúscula, um número e um caracter especial.');

            return senha.trim();
        }

        if (nameFieldIncorrect === '') {
            displayResponseJson(res, 400, 'Nenhum campo foi preenchido!');

            return null;
        }

        displayResponseJson(res, 400, `Campo ${nameFieldIncorrect} não existe!`);

        return null;
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
    forgotPassword,
    recoveryPassword
};