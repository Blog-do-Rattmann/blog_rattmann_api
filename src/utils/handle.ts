import { Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

import { validateData } from '../utils/validate';

import {
    exceptionUserNotFound,
    exceptionUserUnauthorized
} from '../utils/exceptions';

import {
    displayResponseJson
} from '../utils/middleware';

const adjustBirthday = (date: string) => {
    if (validateData(date)) {
        var splitDate = date.split('-');

        if (date.includes('/')) {
            splitDate = date.split('/');
        }

        let day = splitDate[0];
        let month = splitDate[1];
        let year = splitDate[2];

        if (Number(splitDate[1]) > 12) {
            month = splitDate[2];
        }

        if (splitDate[0].length === 4) {
            year = splitDate[0];
            day = splitDate[2];
        }

        const dateFinal = new Date(`${year}-${month}-${day}`);

        return dateFinal;
    }

    return false;
}

const createConnectId = (id: any) => {
    let idNumber = Number(id);
    
    if (!isNaN(idNumber)) {
        return {
            connect: {
                id: idNumber
            }
        }
    }
    
    return undefined;
}

const filterIdOrUsername = (data: string | number | undefined) => {
    return [
        {
            id: !isNaN(Number(data)) ? Number(data) : undefined
        },
        {
            nome_usuario: typeof data === 'string' ? data : undefined
        }
    ]
}

const verifyIdTokenOrUser = async (res: Response, dataToken: any, reqId: string | number | undefined, tokenDecoded: any): Promise<{
    idNumber: number,
    user: any
} | null> => {
    let idNumber = tokenDecoded?.sub;

    if (reqId !== undefined) {
        idNumber = reqId;
    }

    const user = await verifyUserExists(idNumber);
    
    if (user === null) {
        exceptionUserNotFound(res);

        return null;
    }

    if (user !== null) idNumber = user.id;

    if (idNumber !== tokenDecoded?.sub) {
        if (!verifyPermissionUserToken(dataToken, 'admin')) {
            exceptionUserUnauthorized(res);

            return null;
        }
    }

    return { idNumber, user };
}

const verifyPermissionUserToken = (data: any, typeUser: string) => {
    let userHasPermission = false;

    if (data.estado_conta === 'ativo') {
        if (typeUser === data.permissao) userHasPermission = true;
    }

    return userHasPermission;
}

const getIdPermission = async (permission: string) => {
    const getPermission = await prisma.permissoes.findFirst({
        where: {
            nome: permission
        },
        select: {
            id: true
        }
    });

    if (getPermission !== null) return getPermission.id;

    return null;
}

const verifyUserExists = async (id: string | number | undefined) => {
    const user = prisma.usuario.findFirst({
        where: {
            OR: filterIdOrUsername(id)
        }
    });

    return user;
}

export {
    adjustBirthday,
    createConnectId,
    filterIdOrUsername,
    verifyIdTokenOrUser,
    verifyPermissionUserToken,
    getIdPermission
}