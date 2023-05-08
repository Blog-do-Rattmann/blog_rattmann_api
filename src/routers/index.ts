import { Router } from "express";
import userRoutes from "./user";

const routes = Router();

routes.use('/usuario', userRoutes);

routes.all('*', (req, res) => {
    res
    .status(404)
    .send('Página não encontrada!');
});

export { routes };