import { registerUser,loginUser } from "../services/authService.js";
import { ApiError } from "../utils/ApiError.js";

export async function register(req, res) {
    const { user, token } = await registerUser(req.body)
    res.status(201)
        .cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000
        })
        .json({ success: true, message: "Registered successfully", data: user })
}

export async function login(req,res) {
    if(!req.body.email || !req.body.password){
        throw new ApiError(400,"Email and password are required")
    }
    const {user,token}=await loginUser(req.body)
    res.status(200)
       .cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000
        })
        .json({success:true, message:"Logged in successfully",data:user})
}

export function logout(req, res) {
    try {
        res.status(200)
            .clearCookie("token", {
                httpOnly: true,
                secure: false,
                sameSite: "lax"
            })
            .json({ success: true, message: "Logged Out Successfully" })
    } catch (error) {
        console.log(error)
        throw new ApiError(500,"Internal Server Error.")
    }
}

export function getMe(req,res){
    res.status(200).json({success:true , data:req.user})
}