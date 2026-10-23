import { ApiError } from "../utils/ApiError.js"

function coreValidator(data, errors, required, allowed) {
    const keys = Object.keys(data)
    for (const key of keys) {
        if (!allowed.includes(key)) {
            errors.push(`${key} field is not allowed`)
        }
    }
    for (const key of required) {
        if (!(key in data)) {
            errors.push(`${key} field is required`)
        }
    }
    if ('username' in data) {
        if (typeof (data.username) !== "string") {
            errors.push("username must be a string")
        } else {
            const len = data.username.trim().length
            if (len < 3 || len > 50) {
                errors.push("username length must be between 3 and 50 characters")
            }
        }
    }
    if ("email" in data) {
        if (typeof data.email !== "string") {
            errors.push("email must be a string");
        } else if (data.email.trim().length > 254) {
            errors.push("email is too long");
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(data.email.trim())) {
                errors.push("invalid email");
            }
        }
    }
}
export function validateRegisterData(req, res, next) {
    const data = req.body
    if (data == null || typeof data !== "object" || Array.isArray(data)) {
        throw new ApiError(400, "username, email and password are required")
    }
    let errors = []
    const required = ['username', 'email', 'password']
    const allowed = ['username', 'email', 'password']
    coreValidator(data, errors, required, allowed)
    if ("password" in data) {
        if (typeof (data.password) !== "string") {
            errors.push("password must be a string")
        } else {
            const len = data.password.length
            if (len < 6 || len > 128) {
                errors.push("password length must be between 6 and 128 characters")
            }
        }
    }
    if (errors.length > 0) {
        throw new ApiError(400, "invalid register data", errors)
    }
    next()
}

export function validateLoginData(req, res, next) {
    const data = req.body
    if (data == null || typeof data !== "object" || Array.isArray(data)) {
        throw new ApiError(400, "email and password are required")
    }
    let errors = []
    const required = ['email', 'password']
    const allowed = ['email', 'password']
    coreValidator(data, errors, required, allowed)
    if ("password" in data) {
        if (typeof (data.password) !== "string") {
            errors.push("password must be a string")
        }
        else if (data.password.length === 0) {
            errors.push("password cannot be empty")
        }

    }
    if (errors.length > 0) {
        throw new ApiError(400, "invalid login data", errors)
    }
    next()
}