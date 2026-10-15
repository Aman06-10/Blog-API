import app from "./app.js"
import { env } from "./config/env.js"
import { db } from "./config/db.js"

async function startServer(){
    await db();
    app.listen(env.PORT,()=>{
        console.log(`Sever is running on port ${env.PORT}`)
    })
}

startServer();