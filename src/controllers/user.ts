import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import moment from 'moment';
import argon2 from 'argon2';

import {
    exceptionUserNotFound,
    exceptionFieldInvalid,
    exceptionUserUnauthorized
} from '../utils/exceptions';

import {
    validateData,
    validateName,
    validateUsername,
    validateEmail,
    validateDate,
    validatePassword,
    validatePermission
} from '../utils/validate';

import {
    adjustBirthday,
    verifyPermissionUser,
    filterIdOrUsername,
    getIdPermission
} from '../utils/handle';

import {
    displayResponseJson
} from '../utils/middleware';

const prisma = new PrismaClient();

const register = async (req: Request, res: Response) => {
    await createUser()
    .then(async (response) => {
        await prisma.$disconnect();

        if (response !== null) return displayResponseJson(res, 200, 'Cadastro realizado com sucesso!');
    })
    .catch(async (err) => {
        console.error(err);
        await prisma.$disconnect();

        if (err.code === 'P2002') {
            let mensagem = 'Não foi possível realizar o cadastro!';

            if (err.meta.target === 'usuarios_nome_usuario_key') {
                mensagem = 'Nome de usuário já cadastrado em nossa base de dados!';
            }

            if (err.meta.target === 'usuarios_email_key') {
                mensagem = 'E-mail já cadastrado em nossa base de dados!';
            }

            return displayResponseJson(res, 400, mensagem);
        }

        return displayResponseJson(res, 500);
    });

    async function createUser() {
        const data = await dataProcessing();

        if (data !== null) {
            const user = await prisma.usuario.create({
                data: data
            });

            return user;
        }

        return null;
    }

    async function dataProcessing() {
        const fields = req.body;

        const { hasFieldIncorrect, nameFieldIncorrect } = verifyFieldIncorrect(fields);
        
        if (!hasFieldIncorrect) {
            const dataToken = req.userInfo?.data;

            const {
                nome,
                nome_usuario,
                email,
                senha,
                data_nascimento,
                permissao
            } = fields;

            var birthday = adjustBirthday(data_nascimento);

            let permission = 'leitor';

            if (!validateData(nome) || !validateName(nome)) return exceptionFieldInvalid(res, 'Nome está preenchido incorretamente!');
            if (!validateData(nome_usuario) || !validateUsername(nome_usuario)) return exceptionFieldInvalid(res, 'Nome de usuário está preenchido incorretamente!');
            if (!validateData(email) || !validateEmail(email)) return exceptionFieldInvalid(res, 'E-mail está preenchido incorretamente!');
            if (!validateData(senha) || !validatePassword(senha)) return exceptionFieldInvalid(res, 'Senha não está no padrão correto!<br\>Precisa de pelo menos 8 caractes, uma letra minúscula, uma maiúscula, um número e um caracter especial.');
            if (!birthday || !validateDate(birthday)) return exceptionFieldInvalid(res, 'Data de nascimento preenchida incorretamente!');
            if (dataToken?.permissao === 'admin') {
                if (!validateData(permissao) || !await validatePermission(permissao)) return exceptionFieldInvalid(res, 'Permissão de acesso selecionada está incorreta!');
                
                if (dataToken?.permissao === 'admin') permission = permissao;
            }

            const idPermission = await getIdPermission(permission);

            let connectPermission = {
                connect: {
                    id: 3
                }
            }

            if (idPermission !== null) {
                connectPermission.connect.id = idPermission;
            }

            const hashPassword = await argon2.hash(req.body.senha);
        
            const data = {
                nome: nome,
                nome_usuario: nome_usuario,
                email: email,
                senha: hashPassword,
                data_nascimento: birthday,
                permissao: connectPermission
            }

            return data;
        }

        displayResponseJson(res, 400, `Campo ${nameFieldIncorrect} não existe!`);

        return null;
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

        return displayResponseJson(res, 200, user);
    })
    .catch(async (err) => {
        console.error(err);
        await prisma.$disconnect();

        if (err.code === 'P2025') {
            return displayResponseJson(res, 404, 'Usuário não encontrado!');
        }

        return displayResponseJson(res, 500);
    });

    async function showProfile() {
        let { id } = req.params;
        
        if (id === undefined) id = req.userInfo?.sub;

        const user = prisma.usuario.findFirstOrThrow({
            where: {
                OR: filterIdOrUsername(id)
            }
        });

        return user;
    }
}

const list = async (req: Request, res: Response) => {
    await showList()
    .then(async (response: any) => {
        await prisma.$disconnect();

        if (response === null) return exceptionUserUnauthorized(res);
        
        if (response.length < 1) {
            return displayResponseJson(res, 404, 'Nenhum usuário encontrado!');
        }

        const listUsers = dataProcessing(response);

        return displayResponseJson(res, 200, listUsers);
    })
    .catch(async (err) => {
        console.error(err);
        await prisma.$disconnect();

        return displayResponseJson(res, 500);
    });

    async function showList() {
        const dataToken = req.userInfo?.data;

        if (!verifyPermissionUser(dataToken, 'admin')) return null;

        const users = prisma.usuario.findMany({
            include: {
                permissao: true
            }
        });
    
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
                permissao: user.permissao.nome,
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

        if (response !== null) return displayResponseJson(res, 200, 'Usuário alterado com sucesso!');
    })
    .catch(async (err) => {
        console.error(err);
        await prisma.$disconnect();

        return displayResponseJson(res, 500);
    });

    async function updateUser() {
        const { id } = req.params;
        const dataToken = req.userInfo?.data;

        let idNumber = null;

        if (id !== undefined) {
            if (!verifyPermissionUser(dataToken, 'admin')) {
                exceptionUserUnauthorized(res);

                return null;
            }
        } else {
            idNumber = req.userInfo?.sub;
        }

        const user = await verifyUserExists(id);

        if (user === null) return exceptionUserNotFound(res);

        if (idNumber === null) idNumber = user.id;

        const data = await dataProcessing(dataToken, idNumber);

        if (data !== null) {
            const updated = await prisma.usuario.update({
                where: {
                    id: idNumber
                },
                data: data
            });

            return updated;
        }

        return null;
    }

    async function dataProcessing(dataToken: any, id: number) {
        const fields = req.body;

        const { hasFieldIncorrect, nameFieldIncorrect } = verifyFieldIncorrect(fields, 'update');
        
        if (!hasFieldIncorrect) {
            interface IData {
                nome: string,
                nome_usuario: string,
                email: string,
                data_nascimento: Date,
                permissao: {
                    connect: {
                        id: number
                    }
                }
            }

            const data = {} as IData;

            const {
                nome,
                nome_usuario,
                email,
                data_nascimento,
                permissao
            } = fields;
    
            const birthday = adjustBirthday(data_nascimento);
            data.permissao.connect.id = 3;
    
            if (validateData(nome) && validateName(nome)) data.nome = nome;
            if (validateData(nome_usuario) && validateUsername(nome)) data.nome_usuario = nome_usuario;
            if (validateData(email) && validateEmail(email)) data.email = email;
            if (validateData(data_nascimento) && birthday !== false) data.data_nascimento = birthday;

            if (dataToken.permissao === 'admin') {
                if (validateData(permissao) && await validatePermission(permissao)) data.permissao.connect.id = permissao;
            }
    
            return data;
        }

        displayResponseJson(res, 400, `Campo ${nameFieldIncorrect} não existe!`);

        return null;
    }
}

const remove = async (req: Request, res: Response) => {
    await removeUser()
    .then(async (response) => {
        await prisma.$disconnect();

        if (response !== null) return displayResponseJson(res, 200, 'Usuário deletado com sucesso!');
    })
    .catch(async (err) => {
        console.error(err);
        await prisma.$disconnect();
        
        if (err.code === 'P2025') {
            return displayResponseJson(res, 404, 'Usuário não encontrado!');
        }
        
        return displayResponseJson(res, 500);
    });

    async function removeUser() {
        let { id } = req.params;
        const dataToken = req.userInfo?.data;

        if (id !== undefined) {
            if (!verifyPermissionUser(dataToken, 'admin')) {
                exceptionUserUnauthorized(res);

                return null;
            }
        } else {
            id = req.userInfo?.sub;
        }

        await prisma.usuario.deleteMany({
            where: {
                OR: filterIdOrUsername(id)
            }
        });
    }
}

const changePassword = async (req: Request, res: Response) => {
    await newPassword()
    .then(async (response) => {
        await prisma.$disconnect();

        if (response !== null) return displayResponseJson(res, 200, 'Senha alterada com sucesso!');
    })
    .catch(async (err) => {
        console.error(err);
        await prisma.$disconnect();

        return displayResponseJson(res, 500);
    });

    async function newPassword() {
        const { id } = req.params;
        const dataToken = req.userInfo?.data;

        let idNumber = req.userInfo?.sub;

        if (id !== undefined) {
            idNumber = id;
        }

        const user = await verifyUserExists(idNumber);

        if (user === null) return exceptionUserNotFound(res);

        if (idNumber === null) idNumber = user.id;

        if (idNumber !== req.userInfo?.sub) {
            if (!verifyPermissionUser(dataToken, 'admin')) {
                exceptionUserUnauthorized(res);

                return null;
            }
        }
        
        const data = await dataProcessing(user);

        if (data !== null) {
            const changedPassword = await prisma.usuario.update({
                where: {
                    id: idNumber
                },
                data: data
            });

            return changedPassword;
        }

        return null;
    }

    async function dataProcessing(user: any) {
        const fields = req.body;

        const { hasFieldIncorrect, nameFieldIncorrect } = verifyFieldIncorrect(fields, 'change-password');
        
        if (!hasFieldIncorrect) {
            interface IData { senha: string };

            const data = {} as IData;

            const {
                senha_atual,
                senha_nova
            } = fields;

            if (!validatePassword(senha_atual) || !await argon2.verify(user.senha, senha_atual)) {
                res
                .status(400)
                .send('Senha atual não confere!');

                return null;
            }

            if (!validatePassword(senha_nova)) {
                res
                .status(400)
                .send('Nova senha não está no padrão correto!<br\>Precisa de pelo menos 8 caractes, uma letra minúscula, uma maiúscula, um número e um caracter especial.');

                return null;
            }

            const hashPassword = await argon2.hash(senha_nova);

            data.senha = hashPassword;

            return data;
        }

        displayResponseJson(res, 400, `Campo ${nameFieldIncorrect} não existe!`);

        return null;
    }
}

const verifyUserExists = async (id: string | number | undefined) => {
    const user = prisma.usuario.findFirst({
        where: {
            OR: filterIdOrUsername(id)
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
            } else if (field === 'senha_nova') {
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