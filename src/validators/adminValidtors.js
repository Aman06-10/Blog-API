import mongoose from "mongoose"
import { ApiError } from "../utils/ApiError.js"
import { permissions } from "../config/permissions.js"

export const ROLES = Object.keys(permissions)

export function validateUserId(req, res, next) {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError(400, "invalid user id")
    }
    next()
}

export function validateRoleData(req, res, next) {
    const data = req.body
    if (data == null || typeof data !== "object" || Array.isArray(data)) {
        throw new ApiError(400, "role is required")
    }
    const errors = []
    for (const key of Object.keys(data)) {
        if (key !== "role") errors.push(`${key} field is not allowed`)
    }
    if (!("role" in data)) {
        errors.push("role field is required")
    } else if (!ROLES.includes(data.role)) {
        errors.push(`role must be one of: ${ROLES.join(", ")}`)
    }
    if (errors.length > 0) {
        throw new ApiError(400, "invalid role data", errors)
    }
    next()
}

export function validateUserListQuery(req, res, next) {
    const errors = []
    for (const key of Object.keys(req.query)) {
        if (!["page", "limit", "role"].includes(key)) {
            errors.push(`${key} is not a valid query parameter`)
        }
    }
    if ("role" in req.query && !ROLES.includes(req.query.role)) {
        errors.push(`role must be one of: ${ROLES.join(", ")}`)
    }
    if (errors.length > 0) {
        throw new ApiError(400, "invalid query data", errors)
    }
    next()
}