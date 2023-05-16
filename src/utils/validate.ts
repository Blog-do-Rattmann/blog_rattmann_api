import moment from 'moment';

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

const validateDate = (date: any) => {
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

export {
    validateData,
    validateName,
    validateUsername,
    validateEmail,
    validateDate,
    validatePassword
}