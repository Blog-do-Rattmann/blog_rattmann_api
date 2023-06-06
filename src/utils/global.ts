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

const validatePagination = (pagesParameter: string | undefined, quantityParameter: string | undefined): {
    pages: number;
    quantity: number;
} => {
    let pages = 0;
    let quantity = 10;
    
    if (quantityParameter !== undefined) quantity = Number(quantityParameter);

    if (pagesParameter !== undefined) {
        // Diminui o número da paginação e multiplica pela quantidade de linhas para listagem
        if (Number(pagesParameter) > 1) pages = (Number(pagesParameter) - 1) * quantity;
    }

    return { pages, quantity };
}

export {
    convertStringToBoolean,
    dateFormatAccept,
    validatePagination
}