import { Request, Response } from 'express';
import { PrismaClient, EstadoConta } from '@prisma/client';
import argon2 from 'argon2';
import moment from 'moment';

import 'moment-timezone';
moment.locale('pt-br');
moment.tz.setDefault('America/Sao_Paulo');
moment.relativeTimeThreshold('s', 60);
moment.relativeTimeThreshold('m', 60);
moment.relativeTimeThreshold('h', 24);
moment.relativeTimeThreshold('d', 7);
moment.relativeTimeThreshold('w', 4);
moment.relativeTimeThreshold('M', 12);

import {
    exceptionFieldInvalid,
    exceptionUserUnauthorized
} from '../utils/exceptions';

import {
    validateData,
    validateName,
    validateUsername,
    validateEmail,
    validateBirthday,
    validatePassword,
    validatePermission,
    validateDate
} from '../utils/validate';

import {
    adjustBirthday,
    filterIdOrUsername,
    verifyIdTokenOrUser,
    verifyPermissionUserToken,
    getIdPermission,
    verifyFieldIncorrect
} from '../utils/handle';

import {
    createHistoryUser,
    displayResponseJson
} from '../utils/middleware';

import {
    dateFormatAccept,
    validatePagination
} from '../utils/global';

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
        const dataToken = req.userInfo?.data;

        const data = await dataProcessing(dataToken);

        if (data !== null) {
            const user = await prisma.usuario.create({
                data: data
            });

            if (user !== null) {
                if (dataToken?.permissao === 'admin') {
                    const id = req.userInfo?.sub;

                    await createHistoryUser('inclusao', id, user.id);
                }
            }

            return user;
        }

        return null;
    }

    async function dataProcessing(dataToken: any) {
        const fields = req.body;

        const { hasFieldIncorrect, nameFieldIncorrect } = verifyFieldIncorrect(fields);
        
        if (!hasFieldIncorrect) {
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
            if (!birthday || !validateBirthday(birthday)) return exceptionFieldInvalid(res, 'Data de nascimento preenchida incorretamente!');
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
        
        const { paginas, quantidade } = req.params;
        const { pages, quantity } = validatePagination(paginas, quantidade);

        if (!verifyPermissionUserToken(dataToken, 'admin')) return null;

        const users = prisma.usuario.findMany({
            skip: pages,
            take: quantity,
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

        const getIdVerified = await verifyIdTokenOrUser(res, dataToken, id, req.userInfo);

        if (getIdVerified === null) return null;

        const idNumber = getIdVerified.idNumber;

        const data = await dataProcessing(dataToken);

        if (data !== null) {
            const updated = await prisma.usuario.update({
                where: {
                    id: idNumber
                },
                data: data
            });
            
            if (updated !== null) {
                const id = req.userInfo?.sub;

                await createHistoryUser('alteracao', id, updated.id);
            }

            return updated;
        }

        return null;
    }

    async function dataProcessing(dataToken: any) {
        const fields = req.body;

        const { hasFieldIncorrect, nameFieldIncorrect } = verifyFieldIncorrect(fields, 'patch', 'update');
        
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
            data.permissao = {
                connect: {
                    id: 3
                }
            }
    
            if (validateData(nome) && validateName(nome)) data.nome = nome;
            if (validateData(nome_usuario) && validateUsername(nome_usuario)) data.nome_usuario = nome_usuario;
            if (validateData(email) && validateEmail(email)) data.email = email;
            if (validateData(data_nascimento) && birthday !== false) data.data_nascimento = birthday;

            if (dataToken.permissao === 'admin') {
                if (validateData(permissao) && await validatePermission(permissao)) {
                    data.permissao = {
                        connect: {
                            id: permissao
                        }
                    }
                }
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

        const getIdVerified = await verifyIdTokenOrUser(res, dataToken, id, req.userInfo);

        if (getIdVerified === null) return null;

        const idNumber = getIdVerified.idNumber;

        await prisma.historicoUsuario.deleteMany({
            where: {
                OR: [
                    {
                        autor_id: idNumber
                    },
                    {
                        usuario_id: idNumber
                    }
                ]
            }
        });

        await prisma.usuario.deleteMany({
            where: {
                id: idNumber
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

        const getIdVerified = await verifyIdTokenOrUser(res, dataToken, id, req.userInfo);

        if (getIdVerified === null) return null;

        const idNumber = getIdVerified.idNumber;
        const user = getIdVerified.user;
        
        const data = await dataProcessing(user);

        if (data !== null) {
            const changedPassword = await prisma.usuario.update({
                where: {
                    id: idNumber
                },
                data: data
            });

            if (changedPassword !== null) {
                const id = req.userInfo?.sub;

                await createHistoryUser('alterar_senha', id, changedPassword.id);
            }

            return changedPassword;
        }

        return null;
    }

    async function dataProcessing(user: any) {
        const fields = req.body;

        const { hasFieldIncorrect, nameFieldIncorrect } = verifyFieldIncorrect(fields, 'put', 'change-password');
        
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

const changeStatus = async (req: Request, res: Response) => {
    await updateStatus()
    .then(async (response) => {
        await prisma.$disconnect();

        if (response !== null) {
            let message = 'Usuário agora está ativo!';

            if (response.status !== 'ativo') {
                let dateUnformatted = response.duration;

                if (dateUnformatted !== null) {
                    dateUnformatted = dateUnformatted.replace('T', ' ');
                    dateUnformatted = dateUnformatted.split('.')[0];

                    let date = moment(dateUnformatted).fromNow(true);

                    message = `Usuário agora está ${response.status} por ${date}!`;
                }
            }

            return displayResponseJson(res, 200, message);
        }
    })
    .catch(async (err) => {
        console.error(err);
        await prisma.$disconnect();

        return displayResponseJson(res, 500);
    });

    async function updateStatus() {
        const { id } = req.params;
        const dataToken = req.userInfo?.data;

        const getIdVerified = await verifyIdTokenOrUser(res, dataToken, id, req.userInfo);

        if (getIdVerified === null) return null;

        const idNumber = getIdVerified.idNumber;
        const user = getIdVerified.user;
        
        const data = await dataProcessing(user);

        if (data !== null) {
            const changedStatus = await prisma.usuario.update({
                where: {
                    id: idNumber
                },
                data: {
                    estado_conta: data.status,
                    duracao_estado: data.duration
                }
            });

            if (changedStatus !== null) {
                const id = req.userInfo?.sub;

                await createHistoryUser('alterar_estado_conta', id, changedStatus.id);

                return data;
            }
        }

        return null;
    }

    async function dataProcessing(user: any) {
        const fields = req.body;

        const { hasFieldIncorrect, nameFieldIncorrect } = verifyFieldIncorrect(fields, 'patch', 'change-status');
        
        if (!hasFieldIncorrect) {
            interface IData {
                status: EstadoConta;
                duration: string | null;
            };

            const data = {} as IData;

            const {
                tipo_estado,
                duracao
            } = fields;

            if (!EstadoConta.hasOwnProperty(tipo_estado)) return exceptionFieldInvalid(res, 'Estado da conta está preenchido incorretamente!');

            data.status = tipo_estado;
            data.duration = null;

            if (tipo_estado !== 'ativo') {
                if (!validateData(duracao) || !validateDate(duracao)) return exceptionFieldInvalid(res, 'Duração está preenchida incorretamente!');
                if (!validateDate(duracao, true)) return exceptionFieldInvalid(res, 'Data e hora informadas precisam ser maiores que a data e hora atual!');

                data.duration = moment(duracao, dateFormatAccept(true))
                                    .format('YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
            }

            return data;
        }

        if (nameFieldIncorrect === '') {
            displayResponseJson(res, 400, 'Nenhum campo foi preenchido!');

            return null;
        }

        displayResponseJson(res, 400, `Campo ${nameFieldIncorrect} não existe!`);

        return null;
    }
}

export default {
    register,
    profile,
    list,
    update,
    remove,
    changePassword,
    changeStatus
}