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

const exceptionServerError = (res: Response) => {
    const status = 500;
    const mensagem = 'Ocorreu um erro em nosso servidor.<br\>Tente novamente mais tarde!';

    return res
        .status(status)
        .send(mensagem);
}

const exceptionUserUnauthorized = (res: Response) => {
    return res
    .status(403)
    .send('Acesso não autorizado!');
}

export {
    exceptionUserNotFound,
    exceptionFieldInvalid,
    exceptionServerError,
    exceptionUserUnauthorized
}