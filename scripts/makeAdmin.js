import mongoose from "mongoose"
import { db } from "../src/config/db.js"
import {User} from "../src/models/userModel.js"

const email = process.argv[2]?.trim().toLowerCase()

if (!email) {
    console.log("Usage: npm run make-admin -- <email>")
    process.exit(1)
}

await db()

const user = await User.findOneAndUpdate(
    { email },
    { role: "admin" },
    { returnDocument: "after" }
)

if (!user) {
    console.log(`No user found with email ${email}`)
    process.exitCode = 1
} else {
    console.log(`${user.username} (${user.email}) is now an admin`)
}

await mongoose.disconnect()