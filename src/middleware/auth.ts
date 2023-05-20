import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import fs from 'fs';
import path from 'path';

const publicKey = fs.readFileSync(path.resolve(__dirname, '../../keys/public.key'));

const auth = async (req: Request, res: Response, next: NextFunction) => {
    if (req.originalUrl !== '/usuario/cadastrar') {
        let token = req.headers['authorization'];
        
        if (token !== undefined) {
            token = token.replace('Bearer', '');
            token = token.trim();
    
            return jwt.verify(token, publicKey, (error: any, tokenDecoded: any) => {
                if (error) {
                    return res
                    .status(403)
                    .send('Acesso não autorizado!');
                }
    
                req['userInfo'] = tokenDecoded;
                return next();
            });
        }
    
        return res
        .status(401)
        .send('Token inválido!');
    }
}

export default auth;