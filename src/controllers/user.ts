import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

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

export default {
    register
}