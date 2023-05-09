import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import moment from 'moment';

const prisma = new PrismaClient();

const register = async (req: Request, res: Response) => {
    await createUser()
    .then(async () => {
        await prisma.$disconnect();

        return res
        .status(200)
        .send('Cadastro realizado com sucesso!');
    })
    .catch(async (err) => {
        console.error(err);
        await prisma.$disconnect();

        let status = 500;
        let mensagem = 'Ocorreu um erro em nosso servidor.<br\>Tente novamente mais tarde!';

        if (err.code === 'P2002') {
            status = 400;
            mensagem = 'Não foi possível realizar o cadastro!';

            if (err.meta.target === 'usuarios_nome_usuario_key') {
                mensagem = 'Nome de usuário já cadastrado em nossa base de dados!';
            }

            if (err.meta.target === 'usuarios_email_key') {
                mensagem = 'E-mail já cadastrado em nossa base de dados!';
            }
        }

        return res
            .status(status)
            .send(mensagem);
    });

    async function createUser() {
        const data = await dataProcessing();

        if (data !== null) {
            const user = await prisma.usuario.create({
                data: {
                    nome: data.name,
                    nome_usuario: data.username,
                    email: data.email,
                    senha: data.password,
                    data_nascimento: data.birthday,
                    nivel_acesso: {
                        connect: data.level_access
                    }
                }
            });
        }

        return false;
    }

    async function dataProcessing() {
        var birthday = adjustBirthday(req.body.data_nascimento);
        var levelAccess = await adjustLevelAccess(req.body.nivel_acesso);

        if (birthday === null) {
            res.status(400).send('Data de nascimento está incorreta!');

            return null;
        }

        if (levelAccess.length < 1) {
            res.status(400).send('Nível de acesso selecionado está incorreto!');

            return null;
        }
        
        const data = {
            name: req.body.nome,
            username: req.body.nome_usuario,
            email: req.body.email,
            password: req.body.senha,
            birthday: birthday,
            level_access: levelAccess
        }

        return data;
    }

    function adjustBirthday(date: string) {
        let splitDate = null;

        if (date.includes('-')) {
            splitDate = date.split('-');
        } else if (date.includes('/')) {
            splitDate = date.split('/');
        }

        if (splitDate !== null) {
            let year: number = Number(splitDate[0]);
            let month: number = Number(splitDate[1]);
            let day: number = Number(splitDate[2]);

            if (year < 32) {
                year = Number(splitDate[2]);
                day = Number(splitDate[0]);
            }

            return new Date(year, month, day);
        }

        return null;
    }

    async function adjustLevelAccess(levels: []) {
        if (levels.length > 0) {
            let listLevels: { id: number }[] = [];

            for (let level of levels) {
                const permissao = await prisma.permissoes.findFirst({
                    where: {
                        id: level
                    }
                });

                if (permissao !== null) {
                    let objectLevel = {
                        id: level
                    }

                    listLevels.push(objectLevel);
                }
            }

            return listLevels;
        }

        return [];
    }
}

const profile = async (req: Request, res: Response) => {
    await showProfile()
    .then(async (response) => {
        await prisma.$disconnect();

        const dataNascimento = moment(response.data_nascimento)
        .utc()
        .format('DD/MM/YYYY');

        const dataCriacao = moment(response.criado_em)
        .utc()
        .format('DD/MM/YYYY HH:mm:ss');

        const user = {
            id: response.id,
            nome: response.nome,
            nome_usuario: response.nome_usuario,
            email: response.email,
            data_nascimento: dataNascimento,
            estado_conta: response.estado_conta,
            data_criacao: dataCriacao
        }

        return res
        .status(200)
        .send(user);
    })
    .catch(async (err) => {
        console.error(err);
        await prisma.$disconnect();

        let status = 500;
        let mensagem = 'Ocorreu um erro em nosso servidor.<br\>Tente novamente mais tarde!';

        if (err.code === 'P2025') {
            status = 404;
            mensagem = 'Usuário não encontrado!';
        }

        return res
            .status(status)
            .send(mensagem);
    });

    async function showProfile() {
        const id = req.params.id;
        let idNumerico: number | undefined = Number(id);

        if (isNaN(idNumerico)) idNumerico = undefined;

        const user = prisma.usuario.findFirstOrThrow({
            where: {
                OR: [
                    {
                        id: idNumerico
                    },
                    {
                        nome_usuario: id
                    }
                ]
            }
        });

        return user;
    }
}

const list = async (req: Request, res: Response) => {
    await showList()
    .then(async (response) => {
        await prisma.$disconnect();
        
        if (response.length < 1) {
            return res
            .status(404)
            .send('Nenhum usuário encontrado!');
        }

        const listUsers = dataProcessing(response);

        return res
        .status(200)
        .send(listUsers);
    })
    .catch(async (err) => {
        console.error(err);
        await prisma.$disconnect();

        let status = 500;
        let mensagem = 'Ocorreu um erro em nosso servidor.<br\>Tente novamente mais tarde!';

        return res
            .status(status)
            .send(mensagem);
    });

    async function showList() {
        const users = prisma.usuario.findMany();

        return users;
    }

    function dataProcessing(users: any) {
        let listUsers: {}[] = [];

        for (const user of users) {
            const dataNascimento = moment(user.data_nascimento)
            .utc()
            .format('DD/MM/YYYY');

            const dataCriacao = moment(user.criado_em)
            .utc()
            .format('DD/MM/YYYY HH:mm:ss');

            const objectUser = {
                id: user.id,
                nome: user.nome,
                nome_usuario: user.nome_usuario,
                email: user.email,
                data_nascimento: dataNascimento,
                estado_conta: user.estado_conta,
                data_criacao: dataCriacao
            }

            listUsers.push(objectUser);
        }

        return listUsers;
    }
}

export default {
    register,
    profile,
    list
}