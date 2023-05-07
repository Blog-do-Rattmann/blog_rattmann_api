import { Router } from "express";

export const routes = Router();

routes.get('/', (req, res) => {
    res
    .status(200)
    .send('Olá mundo!');
});

routes.all('*', (req, res) => {
    res
    .status(404)
    .send('Página não encontrada!');
});