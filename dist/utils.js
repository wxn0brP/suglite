export function deepMerge(target, source) {
    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                if (!target[key]) {
                    target[key] = {};
                }
                deepMerge(target[key], source[key]);
            }
            else if (Array.isArray(source[key])) {
                target[key] = (target[key] || []).concat(source[key]);
            }
            else {
                target[key] = source[key];
            }
        }
    }
    return target;
}
