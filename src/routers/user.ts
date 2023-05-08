import { Router } from "express";
import user from '../controllers/user';

const userRoutes = Router();

userRoutes.post('/cadastrar', user.register);

export default userRoutes;