import { randomBytes } from "node:crypto";
import { connectMongo, loadEnv } from "./_mongo.mjs";

loadEnv();

const { client, db } = await connectMongo();

try {
  const orders = db.collection("orders");
  const missing = await orders
    .find({
      $or: [
        { public_token: { $exists: false } },
        { public_token: null },
        { public_token: "" },
      ],
    })
    .project({ _id: 1, code: 1 })
    .toArray();

  let updated = 0;

  for (const order of missing) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const token = randomBytes(16).toString("base64url");
      try {
        const result = await orders.updateOne(
          { _id: order._id, $or: [{ public_token: { $exists: false } }, { public_token: null }, { public_token: "" }] },
          { $set: { public_token: token } },
        );
        if (result.modifiedCount === 1) updated += 1;
        break;
      } catch (error) {
        if (error?.code !== 11000 || attempt === 4) throw error;
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        ordersWithoutToken: missing.length,
        updated,
        remaining: await orders.countDocuments({
          $or: [
            { public_token: { $exists: false } },
            { public_token: null },
            { public_token: "" },
          ],
        }),
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
}
