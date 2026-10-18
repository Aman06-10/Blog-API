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
        console.log(error)
        throw new ApiError(401, "Unauthorized")
    }
    next()
}


