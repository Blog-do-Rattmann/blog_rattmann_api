import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

import { validateData } from '../utils/validate';

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

const verifyPermissionUser = (data: any, typeUser: string) => {
    let userHasPermission = false;

    if (data.estado_conta === 'ativo') {
        if (typeUser === data.permissao) userHasPermission = true;
    }

    return userHasPermission;
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

export {
    adjustBirthday,
    createConnectId,
    verifyPermissionUser,
    filterIdOrUsername,
    getIdPermission
}