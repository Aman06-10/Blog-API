import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { ApiError } from "./utils/ApiError.js"
import { errorHandler } from "./middlewares/errorsMiddleware.js"
import { globalLimiter, authLimiter } from "./middlewares/rateLimiters.js"
import auth from "./routes/authRoutes.js"
import posts from "./routes/postRoute.js"
import comments from "./routes/commentRoute.js"
const app = express()

if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1)
}

app.use(cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true
}))

app.get("/api/health", (req, res) => {
    res.json({ success: true, message: "Blog Api is running" })
})

app.use(globalLimiter)
app.use(express.json({ limit: "10kb" }))
app.use(cookieParser())

app.use("/api/auth", authLimiter, auth)
app.use("/api/posts", posts)
app.use("/api/comments", comments)

app.use((req, res, next) => {
    next(new ApiError(404, "Page Not Found"))
})

app.use(errorHandler)
export default app