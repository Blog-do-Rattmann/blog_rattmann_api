import { Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

import { validateData } from '../utils/validate';

import {
    exceptionUserNotFound,
    exceptionUserUnauthorized
} from '../utils/exceptions';

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

const verifyFieldIncorrect = (fields: {}, typeMethod: string = 'post', typeRequest: string = 'register') => {
    let hasFieldIncorrect = true;
    let nameFieldIncorrect = '';

    typeMethod = typeMethod.toLowerCase().trim();
    typeRequest = typeRequest.toLowerCase().trim();

    const fieldsCount = Object.keys(fields).length;

    let expectedFieldsCount = 0;
    let verifyFieldsCount = false;

    for (const field in fields) {
        if (typeRequest === 'change-password') {
            expectedFieldsCount = 2;
            verifyFieldsCount = true;

            switch (field) {
                case 'senha_atual':
                    hasFieldIncorrect = false;
                break;
                case 'senha_nova':
                    hasFieldIncorrect = false;
                break;
                default:
                    nameFieldIncorrect = field;
            }
        } else if (typeRequest === 'login') {
            expectedFieldsCount = 2;
            verifyFieldsCount = true;

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
        } else if (typeRequest === 'forgot-password') {
            expectedFieldsCount = 1;
            verifyFieldsCount = true;

            switch (field) {
                case 'login':
                    hasFieldIncorrect = false;
                break;
                case 'email':
                    hasFieldIncorrect = false;
                break;
                case 'nome_usuario':
                    hasFieldIncorrect = false;
                break;
                default:
                    nameFieldIncorrect = field;
            }
        } else if (typeRequest === 'recovery-password') {
            expectedFieldsCount = 1;

            switch (field) {
                case 'senha':
                    hasFieldIncorrect = false;
                break;
                default:
                    nameFieldIncorrect = field;
            }
        } else {
            expectedFieldsCount = 5;
            verifyFieldsCount = true;

            switch (field) {
                case 'nome':
                    hasFieldIncorrect = false;
                break;
                case 'nome_usuario':
                    hasFieldIncorrect = false;
                break;
                case 'email':
                    hasFieldIncorrect = false;
                break;
                case 'data_nascimento':
                    hasFieldIncorrect = false;
                break;
                case 'permissao':
                    hasFieldIncorrect = false;
                break;
                default:
                    nameFieldIncorrect = field;

                    if (typeRequest === 'register') {
                        expectedFieldsCount = 6;

                        if (field === 'senha') {
                            hasFieldIncorrect = false;
                        }
                    }
            }
        }
    }

    console.log(verifyFieldsCount)
    console.log(fieldsCount)
    console.log(expectedFieldsCount)

    if (typeMethod !== 'patch' && verifyFieldsCount && fieldsCount > 0 && expectedFieldsCount === fieldsCount) hasFieldIncorrect = false;

    return { hasFieldIncorrect, nameFieldIncorrect };
}

export {
    adjustBirthday,
    createConnectId,
    filterIdOrUsername,
    verifyIdTokenOrUser,
    verifyPermissionUserToken,
    getIdPermission,
    verifyFieldIncorrect
}