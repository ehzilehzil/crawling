import * as ez from "./utils.ts";
import {MongoClient} from "npm:mongodb";



if (!await ez.is_tor_network_working([9050, 9060, 9070])) Deno.exit(1);

const client = new MongoClient(`${ez.env.MONGODB_LOCAL_URI}`);
await client.connect();
const db = client.db("marketmap");
const nice = db.collection("nice_remained");





const doc = await nice.findOne({});
console.log(doc);

await client.close();