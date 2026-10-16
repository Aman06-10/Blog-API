import express from "express"
import { ApiError } from "./utils/ApiError.js"
import { errorHandler } from "./middlewares/errorsMiddleware.js"
const app=express()

app.use(express.json())

app.get('/api/health',(req,res)=>{
    res.json({success:true,message:"Blog Api is running"})
})

app.use((req,res,next)=>{
    next(new ApiError(404,"Page Not Found"))
})

app.use(errorHandler)
export default app