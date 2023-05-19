import { Router } from "express";
import userRoutes from "./user";
import authRoutes from "./auth";

const routes = Router();

routes.use('/usuario', userRoutes);
routes.use(authRoutes);

routes.all('*', (req, res) => {
    res
    .status(404)
    .send('Página não encontrada!');
});

export { routes };