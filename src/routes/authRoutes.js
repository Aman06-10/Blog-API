import express from "express"
import { register,login,logout,getMe } from "../controllers/authController.js"
import { protect } from "../middlewares/authMiddleware.js"
import { validateLoginData, validateRegisterData } from "../validators/authValidator.js"
import { loginLimiter,registerLimiter } from "../middlewares/rateLimiters.js"
const auth=express.Router()

auth.post('/login',loginLimiter,validateLoginData,login)
auth.post('/register',registerLimiter,validateRegisterData,register)
auth.post('/logout',logout)
auth.get('/me',protect,getMe)

export default auth;