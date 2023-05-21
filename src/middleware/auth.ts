import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import fs from 'fs';
import path from 'path';

const publicKey = fs.readFileSync(path.resolve(__dirname, '../../keys/public.key'));

import {
    exceptionUserUnauthorized
} from '../utils/exceptions';

const auth = (req: Request, res: Response, next: NextFunction) => {
    let tokenValid = true;
    let token = req.headers['authorization'];
    
    if (token !== undefined) {
        token = token.replace('Bearer', '');
        token = token.trim();
        
        jwt.verify(token, publicKey, (error: any, tokenDecoded: any) => {
            if (error) {
                tokenValid = false;
            } else {
                req.userInfo = tokenDecoded;
            }
        });
    }
    
    if (req.originalUrl !== '/usuario/cadastrar') {
        if (token === undefined) {
            return res
            .status(401)
            .send('Token inválido!');
        }
    }

    if (!tokenValid) {
        return exceptionUserUnauthorized(res);
    }
    
    return next();
}

export default auth;