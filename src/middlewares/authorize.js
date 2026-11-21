import { permissions } from "../config/permissions.js"
import { ApiError } from "../utils/ApiError.js"

export function authorize(action) {
    return (req, res, next) => {
        if (!req.user) {
            throw new ApiError(401, "Authentication required")
        }
        const rolePermissions = permissions[req.user.role] ?? []
        if (rolePermissions.includes(`${action}:any`)) {
            req.permissionScope = "any"
        } 
        else if (rolePermissions.includes(`${action}:own`)) {
            req.permissionScope = "own"
        } 
        else {
            throw new ApiError(403, "You do not have permission to perform this action")
        }
        next()
    }
}