import { Router } from 'express';
import auth from '../controllers/auth';

const authRoutes = Router();

authRoutes.post('/login', auth.login);
authRoutes.post('/esqueceu-senha', auth.forgotPassword);
authRoutes.post('/recuperar-senha/:token', auth.recoveryPassword);

export default authRoutes;