import { PrismaClient } from '@prisma/client';
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

        const history =await prisma.historicoLogin.create({
            data: {
                ip: ip,
                login: data.login,
                usuario: createConnectId(data.id),
                sucesso: data.success,
                erro: data.error
            }
        });

        console.log(history)
    }
}

const getIp = () => {
    const cmd = `curl -s http://checkip.amazonaws.com || printf "0.0.0.0"`;
    const ip = execSync(cmd).toString().trim();

    return ip;
}

export {
    createHistoryLogin
}