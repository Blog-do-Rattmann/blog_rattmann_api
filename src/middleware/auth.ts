import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import fs from 'fs';
import path from 'path';

const publicKey = fs.readFileSync(path.resolve(__dirname, '../../keys/public.key'));

import {
    exceptionUserUnauthorized
} from '../utils/exceptions';

const auth = async (req: Request, res: Response, next: NextFunction) => {
    if (req.originalUrl !== '/usuario/cadastrar') {
        let token = req.headers['authorization'];
        
        if (token !== undefined) {
            token = token.replace('Bearer', '');
            token = token.trim();
    
            jwt.verify(token, publicKey, (error: any, tokenDecoded: any) => {
                if (error) {
                    exceptionUserUnauthorized(res);
                }
    
                req['userInfo'] = tokenDecoded;
                next();
            });

            return true;
        }
    
        return res
        .status(401)
        .send('Token inválido!');
    }
}

export default auth;