import { PrismaClient } from '@prisma/client';
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

import { dateFormatAccept } from '../utils/global';

const prisma = new PrismaClient();

const validateData = (value: any) => {
    if ((value === null || value === undefined) || (typeof value === 'string' && value.trim() === '')) return false;

    return true;
}

const validateName = (name: string) => {
    if (name.length < 2 || name.length > 100) return false;

    return true;
}

const validateUsername = (username: string) => {
    if (username.length < 4 || username.length > 25) return false;

    return true;
}

const validateEmail = (email: string) => {
    const regexEmail = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

    if (regexEmail.test(email)) return true;

    return false;
}

const validateBirthday = (date: any) => {
    const birthday = moment(date).utc().format('YYYY-MM-DD');
    const dateNow = moment().subtract(100, 'years').format('YYYY-MM-DD');

    if (!moment(birthday).isBefore(dateNow)) {
        return true;
    }

    return false;
}

const validatePassword = (password: string) => {
    const regexValidatePassword = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])(?!.*\s).{8,}$/;

    if (regexValidatePassword.test(password)) return true;
    
    return false;
}

const validatePermission = async (permission: string) => {
    const getIdPermission = await prisma.permissoes.findFirst({
        where: {
            nome: permission
        }
    });
    
    if (getIdPermission === null) return false;

    return true;
}

const validateDate = (date: any, validateBefore: boolean = false, dateCompare: any = null) => {
    if (date !== null) {
        const dateConverted = moment(date, dateFormatAccept(true));

        if (validateBefore) {
            let dateCompareConverted = moment();

            if (dateCompare !== null) dateCompareConverted = moment(dateCompare, dateFormatAccept(true));
            
            if (dateConverted.isValid() && dateCompareConverted.isValid()) {
                if (dateConverted.isSameOrAfter(dateCompareConverted)) return true;
            }

            return false;
        }

        if (dateConverted.isValid()) return true;
    }

    return false;
}

export {
    validateData,
    validateName,
    validateUsername,
    validateEmail,
    validateBirthday,
    validatePassword,
    validatePermission,
    validateDate
}