import serverless from "serverless-http";
import app from "../../api/app";

interface ServerlessRequest {
  body?: string | Buffer | any;
  [key: string]: any;
}

export const handler = serverless(app, {
  binary: false,
  request: (request: ServerlessRequest, event: any, context: any) => {
    if (event.body && typeof event.body === "string" && event.body.length > 0) {
      try {
        request.body = JSON.parse(event.body);
      } catch (e) {
        console.error("Failed to parse JSON body:", e);
        request.body = event.body;
      }
    } else {
      request.body = event.body;
    }
  },
});
