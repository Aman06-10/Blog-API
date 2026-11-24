import express from "express"
import { protect } from "../middlewares/authMiddleware.js"
import { authorize } from "../middlewares/authorize.js"
import { validatePagination } from "../validators/paginationValidator.js"
import { validateUserId, validateRoleData, validateUserListQuery } from "../validators/adminValidator.js"
import { listUsers, changeRole } from "../controllers/adminController.js"

const admin = express.Router()

admin.get("/users", protect, authorize("user:read"), validateUserListQuery, validatePagination, listUsers)
admin.patch("/users/:id/role", protect, authorize("user:update-role"), validateUserId, validateRoleData, changeRole)

export default admin