import moment from 'moment';

import { validateData } from '../utils/validate';

const adjustBirthday = (date: string) => {
    if (validateData(date)) {
        var splitDate = date.split('-');

        if (date.includes('/')) {
            splitDate = date.split('/');
        }

        let day = splitDate[0];
        let month = splitDate[1];
        let year = splitDate[2];

        if (Number(splitDate[1]) > 12) {
            month = splitDate[2];
        }

        if (splitDate[0].length === 4) {
            year = splitDate[0];
            day = splitDate[2];
        }

        const dateFinal = new Date(`${year}-${month}-${day}`);

        return dateFinal;
    }

    return false;
}

export {
    adjustBirthday
}