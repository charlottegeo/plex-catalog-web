export const formatResolution = (resolution?: string): string => {
    if (!resolution) {
        return '';
    }

    switch (resolution.toLowerCase()) {
        case '4k':
        case '2160':
            return '4K';
        case '8k':
        case '4320':
            return '8K';
        default:
            if (!isNaN(parseInt(resolution, 10))) {
                return `${resolution}p`;
            }
            return resolution;
    }
}