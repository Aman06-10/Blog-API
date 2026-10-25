export function validatePagination(req, res, next) {
    const DEFAULT_LIMIT = 10
    const MAX_LIMIT = 50

    const page = Number(req.query.page)
    const limit = Number(req.query.limit)

    req.pagination = {
        page: Number.isInteger(page) && page >= 1 ? page : 1,
        limit: Number.isInteger(limit) && limit >= 1 ? Math.min(limit, MAX_LIMIT) : DEFAULT_LIMIT
    }
    next()
}