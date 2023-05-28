import { Router } from 'express';
import user from '../controllers/user';
import auth from '../middleware/auth';

const userRoutes = Router();

userRoutes.post('/cadastrar', auth, user.register);
userRoutes.get('/perfil/:id?', auth, user.profile);
userRoutes.get('/lista', auth, user.list);
userRoutes.patch('/editar/:id?', auth, user.update);
userRoutes.delete('/deletar/:id?', auth, user.remove);
userRoutes.put('/trocar-senha/:id?', auth, user.changePassword);
userRoutes.put('/alterar-estado-conta/:id?', auth, user.changeStatus);

export default userRoutes;