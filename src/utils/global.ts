const convertStringToBoolean = (text: string) => {
    if (text === 'true') {
        return true;
    }

    return false;
}

export {
    convertStringToBoolean
}