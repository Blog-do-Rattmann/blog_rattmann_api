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

const adjustLevelAccess = async (levels: []) => {
    if (Array.isArray(levels)) {
        if (levels.length > 0) {
            let listLevels: { id: number }[] = [];
    
            for (let level of levels) {
                const levelNumber = Number(level);

                if (!isNaN(levelNumber)) {
                    const permissions = await prisma.permissoes.findFirst({
                        where: {
                            id: levelNumber
                        }
                    });
        
                    if (permissions !== null) {
                        let objectLevel = {
                            id: levelNumber
                        }
        
                        listLevels.push(objectLevel);
                    }
                }
            }
    
            return listLevels;
        }
    }

    return [];
}

const removeAllLevels = async (id: string) => {
    let idNumber = Number(id);

    if (!isNaN(idNumber)) {
        await prisma.usuario.update({
            where: {
                id: idNumber
            },
            data: {
                nivel_acesso: {
                    set: []
                }
            }
        });
    }
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

export {
    adjustBirthday,
    adjustLevelAccess,
    removeAllLevels,
    createConnectId
}