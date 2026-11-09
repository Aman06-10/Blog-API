import mongoose from "mongoose"
import { normalizeTag } from "../utils/tags.js"
const allowedSort = ["newest", "oldest"]
const allowedStatus = ["draft", "published", "archived"]
const isPlainString = (v) => typeof v === "string"
export const publicListKeys = ["tags", "author", "search", "sort", "page", "limit"]
export const mineKeys = ["tags", "search", "sort", "status", "page", "limit"]

export function validatePostQuery(allowedKeys) {
  return (req, res, next) => {
    const errors = []
    for (const key of Object.keys(req.query)) {
      if (!allowedKeys.includes(key)) errors.push(`${key} field is not allowed`)
    }
    const { tags, author, search, sort, status } = req.query
    const filters = {}
    if (tags !== undefined) {
      if (!isPlainString(tags)) {
        errors.push("tags must be a comma-separated string")
      } 
      else {
        const list = tags.split(",").map(normalizeTag).filter(Boolean)
        if (list.length === 0) errors.push("tags must not be empty")
        else if (list.length > 10) errors.push("tags can have at most 10 values")
        else filters.tags = [...new Set(list)]
      }
    }
    if (author !== undefined) {
      if (!isPlainString(author) || !mongoose.isValidObjectId(author)) {
        errors.push("author must be a valid id")
      } 
      else {
        filters.author = author
      }
    }
    if (search !== undefined) {
      if (!isPlainString(search)) {
        errors.push("search must be a string")
      } 
      else {
        const s = search.trim()
        if (s.length === 0 || s.length > 100) {
          errors.push("search length must be between 1 and 100 characters")
        } else {
          filters.search = s
        }
      }
    }
    if (sort !== undefined) {
      if (!isPlainString(sort) || !allowedSort.includes(sort)) {
        errors.push(`sort must be one of: ${allowedSort.join(", ")}`)
      } 
      else {
        filters.sort = sort
      }
    }
    if (status !== undefined) {
      if (!isPlainString(status) || !allowedStatus.includes(status)) {
        errors.push(`status must be one of: ${allowedStatus.join(", ")}`)
      } 
      else {
        filters.status = status
      }
    }
    if (errors.length > 0) {
      return res.status(400).json({success: false,message: "invalid query params", errors})
    }
    req.filters = filters
    next()
  }
}