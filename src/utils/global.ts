const convertStringToBoolean = (text: string) => {
    if (text === 'true') {
        return true;
    }

    return false;
}

const dateFormatAccept = (hasHours: boolean = false) => {
    let formats = [
        'DD/MM/YYYY',
        'DD-MM-YYYY',
        'YYYY-MM-DD'
    ];

    if (hasHours) {
        return formats.map(format => format += ' HH:mm:ss');
    }

    return formats;
}

export {
    convertStringToBoolean,
    dateFormatAccept
}