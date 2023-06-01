import { Response } from 'express';
import { PrismaClient, AcaoUsuario } from '@prisma/client';
import { execSync } from 'child_process';

import { createConnectId } from './handle';

const prisma = new PrismaClient();

const createHistoryLogin = async (data: {
    login: string,
    id: number | undefined,
    success: boolean,
    error: string | null
}) => {
    if (Object.keys(data).length > 0) {
        const ip = getIp();

        await prisma.historicoLogin.create({
            data: {
                ip: ip,
                login: data.login,
                usuario: createConnectId(data.id),
                sucesso: data.success,
                erro: data.error
            }
        });
    }
}

const createHistoryUser = async (action: AcaoUsuario = 'alteracao', authorId: number, userId: number) => {
    const data: {
        acao: AcaoUsuario | undefined,
        autor: {
            connect: {
                id: number
            }
        },
        usuario: {
            connect: {
                id: number
            }
        }
    } = {
        acao: action,
        autor: {
            connect: {
                id: authorId
            }
        },
        usuario: {
            connect: {
                id: userId
            }
        }
    }

    const history = await prisma.historicoUsuario.create({
        data: data
    });

    return history;
}

const displayResponseJson = (res: Response, status: number, context: any = '') => {
    if (typeof context === 'string' && context.trim() === '') {
        if (status === 500) context = 'Ocorreu um erro em nosso servidor.<br\>Tente novamente mais tarde!';
    }

    return res
        .status(status)
        .send(context);
}

const getIp = () => {
    const cmd = `curl -s http://checkip.amazonaws.com || printf "0.0.0.0"`;
    const ip = execSync(cmd).toString().trim();

    return ip;
}

export {
    createHistoryLogin,
    createHistoryUser,
    displayResponseJson
}