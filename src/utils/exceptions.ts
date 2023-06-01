import { Response } from 'express';

import { displayResponseJson } from './middleware';

const exceptionUserNotFound = (res: Response) => {
    return displayResponseJson(res, 404, 'Usuário não encontrado!');
}

const exceptionFieldInvalid = (res: Response, message: string) => {
    displayResponseJson(res, 400, message);

    return null;
}

const exceptionUserUnauthorized = (res: Response) => {
    return displayResponseJson(res, 403, 'Acesso não autorizado!');
}

export {
    exceptionUserNotFound,
    exceptionFieldInvalid,
    exceptionUserUnauthorized
}