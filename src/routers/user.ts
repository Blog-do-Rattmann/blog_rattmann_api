import { Router } from "express";
import user from '../controllers/user';

const userRoutes = Router();

userRoutes.get('/cadastrar', user.register);

export default userRoutes;