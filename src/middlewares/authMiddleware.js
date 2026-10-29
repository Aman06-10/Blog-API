import { verifyToken } from "../services/authService.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/userModel.js"

export async function protect(req, res, next) {
    const token = req.cookies?.token
    if (!token) {
        throw new ApiError(401, "Unauthorized")
    }
    let decoded
    try {
        decoded = verifyToken(token)
    } catch (error) {
        throw new ApiError(401, "Unauthorized")
    }
    const user = await User.findById(decoded.id)
    if (!user) {
        throw new ApiError(401, "Unauthorized")
    }
    req.user = user
    next()
}

export async function optionalAuth(req, res, next) {
    const token = req.cookies?.token
    if (token) {        
        let decoded
        try {
            decoded = verifyToken(token)
        } catch (error) {
            // Invalid or expired token: continue as a guest.
        }
        if (decoded) {
            const user = await User.findById(decoded.id)
            if (user) {
                req.user = user
            }
        }
    }
    next()
}
