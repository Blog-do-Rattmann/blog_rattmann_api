import { Request, Response, NextFunction } from 'express';

const register = (req: Request, res: Response) => {
    return res
    .status(200)
    .send('Criar usuário!');
}

export default {
    register
}