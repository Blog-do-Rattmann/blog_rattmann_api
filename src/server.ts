import express from 'express';
import cors from 'cors';
import { routes } from './routers/index';

import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();

const protocol = 'http';
const port = 3000;

const allowedOrigins = [`${protocol}://localhost:${port}`];

const options: cors.CorsOptions = {
  origin: allowedOrigins
};

app.use(cors(options));
app.use(express.json());
app.use('/', routes);

app.listen(port, () => {
    console.log('Servidor está em execução!');
    console.log(`${protocol}://localhost:${port}`)
});