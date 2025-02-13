// app/api/baseten/route.ts
import { NextRequest } from "next/server";
import { S3 } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const s3 = new S3({
  endpoint: "https://s3.wasabisys.com",
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.WASABI_ACCESS_KEY!,
    secretAccessKey: process.env.WASABI_SECRET_KEY!,
  },
});

async function generatePresignedUrl(s3Url: string) {
  const bucket = s3Url.split("/")[3];
  const key = s3Url.split(`${bucket}/`)[1];
  return await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
    { expiresIn: 3600 }
  );
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = createRouteHandlerClient({ cookies });
    const authHeader = req.headers.get("authorization");
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(authHeader?.split(" ")[1]);

    if (error || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const body = await req.json();
    const { prompt, page_session_id } = body;

    // Log search
    const { data: searchLog } = await supabase
      .from("searches")
      .insert({
        session_id: page_session_id,
        user_id: user.id,
        prompt,
      })
      .select("id")
      .single();

    // Call Baseten
    const response = await fetch(
      "https://model-03yp9el3.api.baseten.co/development/predict",
      {
        method: "POST",
        headers: {
          Authorization: `Api-Key ${process.env.BASETEN_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body), // !!! TODO: unecessarily sending session_id in the body
      }
    );

    const data = await response.json();

    // Generate presigned URLs
    if (data.matches) {
      for (let match of data.matches) {
        match.presigned_url = await generatePresignedUrl(match.s3_url);
      }
    }

    return new Response(JSON.stringify({ ...data, search_id: searchLog.id }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
