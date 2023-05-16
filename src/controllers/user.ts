import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import moment from 'moment';
import argon2 from 'argon2';

import { exceptionUserNotFound, exceptionFieldInvalid } from '../utils/exceptions';
import {
    validateData,
    validateName,
    validateUsername,
    validateEmail,
    validateDate,
    validatePassword
} from '../utils/validate';
import {
    adjustBirthday,
    adjustLevelAccess,
    removeAllLevels
} from '../utils/handle';

const prisma = new PrismaClient();

const register = async (req: Request, res: Response) => {
    await createUser()
    .then(async (response) => {
        await prisma.$disconnect();

        if (response !== null) {
            return res
            .status(200)
            .send('Cadastro realizado com sucesso!');
        }
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

            return user;
        }

        return null;
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

        if (!validatePassword(req.body.senha)) {
            res
            .status(400)
            .send('Senha não está no padrão correto!<br\>Precisa de pelo menos 8 caractes, uma letra minúscula, uma maiúscula, um número e um caracter especial.');

            return null;
        }

        const hashPassword = await argon2.hash(req.body.senha);
        
        const data = {
            name: req.body.nome,
            username: req.body.nome_usuario,
            email: req.body.email,
            password: hashPassword,
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
                const permissions = await prisma.permissoes.findFirst({
                    where: {
                        id: level
                    }
                });

                if (permissions !== null) {
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
        let idNumber: number | undefined = Number(id);

        if (isNaN(idNumber)) idNumber = undefined;

        const user = prisma.usuario.findFirstOrThrow({
            where: {
                OR: [
                    {
                        id: idNumber
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

const update = async (req: Request, res: Response) => {
    await updateUser()
    .then(async (response) => {
        await prisma.$disconnect();

        if (response !== null) {
            return res
            .status(200)
            .send('Usuário alterado com sucesso!');
        }
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

    async function updateUser() {
        const { id } = req.params;
        
        const user = await verifyUserExists(id);

        if (user === null) return exceptionUserNotFound(res);

        const data = await dataProcessing(id);

        if (data !== null) {
            const updated = await prisma.usuario.update({
                where: {
                    id: user.id
                },
                data: data
            });

            return updated;
        }

        return null;
    }

    async function dataProcessing(id: string) {
        const fields = req.body;

        const { hasFieldIncorrect, nameFieldIncorrect } = verifyFieldIncorrect(fields, 'update');
        
        if (!hasFieldIncorrect) {
            interface IData {
                nome: string,
                nome_usuario: string,
                email: string,
                data_nascimento: Date,
                nivel_acesso: {
                    connect: { id: number; }[]
                }
            }

            const data = {} as IData;

            const {
                nome,
                nome_usuario,
                email,
                data_nascimento,
                nivel_acesso
            } = fields;
    
            const birthday = adjustBirthday(data_nascimento);
            const levelAccess = await adjustLevelAccess(nivel_acesso);
    
            if (validateData(nome)) data.nome = nome;
            if (validateData(nome_usuario)) data.nome_usuario = nome_usuario;
            if (validateData(email)) data.email = email;
            if (birthday !== false) data.data_nascimento = birthday;
            if (levelAccess.length > 0) {
                await removeAllLevels(id);
    
                const level = {
                    connect: levelAccess
                }
    
                data.nivel_acesso = level;
            }
    
            // if (!validateData(req.body.nome) || !validateName(req.body.nome)) return exceptionFieldInvalid(res, 'Nome está preenchido incorretamente!');
            // if (!validateData(req.body.nome_usuario) || !validateUsername(req.body.nome_usuario)) return exceptionFieldInvalid(res, 'Nome de usuário está preenchido incorretamente!');
            // if (!validateData(req.body.email) || !validateEmail(req.body.email)) return exceptionFieldInvalid(res, 'E-mail está preenchido incorretamente!');
            // if (!birthday || !validateDate(birthday)) return exceptionFieldInvalid(res, 'Data de nascimento preenchida incorretamente!');
            // if (levelAccess.length < 1) return exceptionFieldInvalid(res, 'Nível de acesso selecionado está incorreto!');
    
            return data;
        }

        res
        .status(400)
        .send(`Campo ${nameFieldIncorrect} não existe!`);

        return null;
    }
}

const remove = async (req: Request, res: Response) => {
    await removeUser()
    .then(async () => {
        await prisma.$disconnect();

        return res
            .status(200)
            .send('Usuário deletado com sucesso!');
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

    async function removeUser() {
        const { id } = req.params;
        let idNumber: number | undefined = Number(id);
        if (isNaN(idNumber)) idNumber = undefined;

        await removeAllLevels(id);

        await prisma.usuario.deleteMany({
            where: {
                OR: [
                    {
                        id: idNumber
                    },
                    {
                        nome_usuario: id
                    }
                ]
            }
        });
    }
}

const changePassword = async (req: Request, res: Response) => {
    await newPassword()
    .then(async (response) => {
        await prisma.$disconnect();

        if (response !== null) {
            return res
                .status(200)
                .send('Senha alterada com sucesso!');
        }
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

    async function newPassword() {
        const { id } = req.params;
        
        const user = await verifyUserExists(id);

        if (user === null) return exceptionUserNotFound(res);

        const data = await dataProcessing(id, user);

        if (data !== null) {
            const changedPassword = await prisma.usuario.update({
                where: {
                    id: user.id
                },
                data: data
            });

            return changedPassword;
        }

        return null;
    }

    async function dataProcessing(id: string, user: any) {
        const fields = req.body;

        const { hasFieldIncorrect, nameFieldIncorrect } = verifyFieldIncorrect(fields, 'change-password');
        
        if (!hasFieldIncorrect) {
            interface IData { senha: string };

            const data = {} as IData;

            const {
                senha_atual,
                nova_senha
            } = fields;

            if (!validatePassword(senha_atual) || !await argon2.verify(user.senha, senha_atual)) {
                res
                .status(400)
                .send('Senha atual não confere!');

                return null;
            }

            if (!validatePassword(nova_senha)) {
                res
                .status(400)
                .send('Nova senha não está no padrão correto!<br\>Precisa de pelo menos 8 caractes, uma letra minúscula, uma maiúscula, um número e um caracter especial.');

                return null;
            }

            const hashPassword = await argon2.hash(nova_senha);

            data.senha = hashPassword;

            return data;
        }

        res
        .status(400)
        .send(`Campo ${nameFieldIncorrect} não existe!`);

        return null;
    }
}

const verifyUserExists = async (id: string) => {
    let idNumber: number | undefined = Number(id);

    if (isNaN(idNumber)) idNumber = undefined;

    const user = prisma.usuario.findFirst({
        where: {
            OR: [
                {
                    id: idNumber
                },
                {
                    nome_usuario: id
                }
            ]
        }
    });

    return user;
}

const verifyFieldIncorrect = (fields: {}, typeRequest: string = 'register') => {
    let hasFieldIncorrect = true;
    let nameFieldIncorrect = '';

    for (const field in fields) {
        if (typeRequest === 'change-password') {
            if (field === 'senha_atual') {
                hasFieldIncorrect = false;
            } else if (field === 'nova_senha') {
                hasFieldIncorrect = false;
            } else {
                nameFieldIncorrect = field;
            }
        } else {
            switch (field) {
                case 'nome':
                    hasFieldIncorrect = false;
                break;
                case 'nome_usuario':
                    hasFieldIncorrect = true;
                break;
                case 'email':
                    hasFieldIncorrect = false;
                break;
                case 'data_nascimento':
                    hasFieldIncorrect = false;
                break;
                case 'nivel_acesso':
                    hasFieldIncorrect = false;
                break;
                default:
                    nameFieldIncorrect = field;
    
                    if (typeRequest === 'register') {
                        if (field === 'senha') {
                            hasFieldIncorrect = false;
                            nameFieldIncorrect = '';
                        }
                    }
            }
        }
    }

    return { hasFieldIncorrect, nameFieldIncorrect };
}

export default {
    register,
    profile,
    list,
    update,
    remove,
    changePassword
}