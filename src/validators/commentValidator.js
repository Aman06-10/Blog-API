import mongoose from "mongoose"
import { ApiError } from "../utils/ApiError.js"

export function validateCommentData(req, res, next) {
    const data = req.body
    if (data == null || typeof data !== "object" || Array.isArray(data)) {
        throw new ApiError(400, "content is required")
    }
    let errors = []
    const keys = Object.keys(data)
    for (const key of keys) {
        if (key !== "content") {
            errors.push(`${key} field is not allowed`)
        }
    }
    if ('content' in data) {
        if (typeof (data.content) != "string") {
            errors.push("content must be string")
        } else {
            const len = data.content.trim().length
            if (len < 1 || len > 500) {
                errors.push("content length should be between 1 and 500")
            }
        }
    }
    else{
        errors.push("content field is required")
    }
    if (errors.length > 0) {
        throw new ApiError(400, "invalid comment Data", errors)
    }
    next()
}

export function validateCommentId(req, res, next) {
    const commentId = req.params.id
    const isValid = mongoose.Types.ObjectId.isValid(commentId)
    if (!isValid) {
        throw new ApiError(400, "invalid comment id")
    }
    next()
}