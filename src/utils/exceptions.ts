import { Response } from 'express';

const exceptionUserNotFound = (res: Response) => {
    return res
        .status(404)
        .send('Usuário não encontrado!');
}

const exceptionFieldInvalid = (res: Response, message: string) => {
    res
    .status(400)
    .send(message);

    return null;
}

const exceptionUserUnauthorized = (res: Response) => {
    return res
    .status(403)
    .send('Acesso não autorizado!');
}

export {
    exceptionUserNotFound,
    exceptionFieldInvalid,
    exceptionUserUnauthorized
}