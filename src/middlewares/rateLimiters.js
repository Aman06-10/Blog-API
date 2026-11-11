import rateLimit from "express-rate-limit"
import { ApiError } from "../utils/ApiError.js"

const isTest = process.env.NODE_ENV === "test"

const handler = (req, res, next) => {
    next(new ApiError(429, "Too many requests, please try again later"))
}

export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: isTest ? 100000 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler
})

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: isTest ? 100000 : 10,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    handler
})