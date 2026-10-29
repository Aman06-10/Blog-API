export function normalizeTag(tag) {
    return tag.trim().toLowerCase()
}

export function normalizeTags(tags) {
    return [...new Set(tags.map(normalizeTag))]
}