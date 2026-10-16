import { ApiError } from "../utils/ApiError.js"

export const errorHandler=((err, req, res, next) => {
    if (res.headersSent) {
        return next(err)
    }
    let error = err;
    if(err.name==="CastError"){
        error=new ApiError(400,`Invalid ${err.path} : ${err.value}`)
    }
    if(err.code===11000){
        const field=Object.keys(err.keyValue ||{})[0]
        error=new ApiError(409,field?`${field} already exists`:"Duplicate Value")
    }
    if(err.name==="ValidationError"){
        const messages = Object.values(err.errors).map((val) => val.message)
        error = new ApiError(400, messages.join(", "), messages)
    }
    const statusCode = error.statusCode || 500
    let message = error.message || "Something went wrong"
    if (statusCode >= 500) {
        console.error(err)   
        if (process.env.NODE_ENV === "production") {
        message = "Internal Server Error"
        }
    }    
res.status(statusCode).json({
    success: false,
    message,
    errors: error.errors || [],
    ...(process.env.NODE_ENV === "development" && {
        stack: error.stack,
        })
    })
})
