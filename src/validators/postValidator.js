import mongoose from "mongoose"
import { ApiError } from "../utils/ApiError.js"

const allowed = ['title', 'content', 'status', 'tags']
const allowedStatus = ['draft', 'published', 'archived']
const required = ['title', 'content']

function validate(data, errors) {
    const keys = Object.keys(data)
    for (const key of keys) {
        if (!allowed.includes(key)) {
            errors.push(`${key} field is not allowed`)
        }
    }
    if ("title" in data) {
        if (typeof data.title !== "string") {
            errors.push("title must be a string")
        } else {
            const len = data.title.trim().length
            if (len < 3 || len > 150) {
                errors.push("title length should be between 3 and 150")
            }
        }
    }
    if ("content" in data) {
        if (typeof data.content !== "string") {
            errors.push("content must be a string")
        } else if (data.content.trim().length < 10) {
            errors.push("content is too short")
        }
    }
    if ("status" in data) {
        if (typeof data.status !== "string") {
            errors.push("status must be a string");
        } else if (!allowedStatus.includes(data.status)) {
            errors.push('status can only be "draft", "published" or "archived"');
        }
    }
    if ("tags" in data) {
        if (!Array.isArray(data.tags)) {
            errors.push("tags must be an array");
        } else if (!data.tags.every(
            tag => typeof tag === "string" && tag.trim().length > 0
        )) {
            errors.push("tags must contain non-empty strings only");
        }
    }
}

export function validatePostData(req, res, next) {
    const data = req.body
    if (data == null || typeof data !== "object" || Array.isArray(data)) {
        throw new ApiError(400, "title and content are required")
    }
    let errors = []
    validate(data, errors)
    for (const key of required) {
        if (!(key in data)) {
            errors.push(`${key} field is required`)
        }
    }
    if (errors.length > 0) {
        throw new ApiError(400, "invalid post data", errors)
    }
    next()
}

export function validateUpdatePostData(req, res, next) {
    const data = req.body
    if (data == null || typeof data !== "object" || Array.isArray(data) || Object.keys(data).length === 0) {
        throw new ApiError(400, "Nothing to update")
    }
    let errors = []
    validate(data, errors)
    if (errors.length > 0) {
        throw new ApiError(400, "invalid post data", errors)
    }
    next()
}

export function validatePostId(req, res, next) {
    const postId = req.params.id
    const isValid = mongoose.Types.ObjectId.isValid(postId)
    if (!isValid) {
        throw new ApiError(400, "invalid post id")
    }
    next()
}