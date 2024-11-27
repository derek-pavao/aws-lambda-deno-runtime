import { AwsLambdaRuntime } from "@dp/aws-lambda-deno-runtime";

function basicHandler() {
  console.log("Hello from Deno!");
}

function basicHandler2() {
  console.log("hello from Deno 2!");
}

new AwsLambdaRuntime()
    .register("example-lambda.basicHandler", basicHandler)
    .register("example-lambda.basicHandler2", basicHandler2)
    .invoke();
