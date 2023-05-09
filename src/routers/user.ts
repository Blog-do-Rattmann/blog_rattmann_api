import { Router } from "express";
import user from '../controllers/user';

const userRoutes = Router();

userRoutes.post('/cadastrar', user.register);
userRoutes.get('/perfil/:id', user.profile);
userRoutes.get('/lista', user.list);

export default userRoutes;