import { verifyToken } from "../services/authService.js"
import { ApiError } from "../utils/ApiError.js"

export function protect(req, res, next){
    const token=req.cookies?.token
    if (!token) {
        throw new ApiError(401, "Unauthorized")
    }
    try {
        const decoded = verifyToken(token)
        req.user = decoded
    } catch (error) {
        throw new ApiError(401, "Unauthorized")
    }
    next()
}

export function optionalAuth(req,res,next){
    const token=req.cookies?.token
    if(token){
        try {
            const decoded=verifyToken(token)
            req.user=decoded
        } catch (error){
            /// Invalid or expired token: continue as a guest.
        }
    }
    next()
}

