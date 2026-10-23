import express from "express"
import { register,login,logout,getMe } from "../controllers/authController.js"
import { protect } from "../middlewares/authMiddleware.js"
import { validateLoginData, validateRegisterData } from "../validators/authValidator.js"
const auth=express.Router()

auth.post('/login',validateLoginData,login)
auth.post('/register',validateRegisterData,register)
auth.post('/logout',logout)
auth.get('/me',protect,getMe)

export default auth;