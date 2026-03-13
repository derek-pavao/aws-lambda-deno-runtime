import { AwsLambdaRuntime } from "@dotdeeka/aws-lambda-deno-runtime";
import _ from "lodash";

function basicHandler() {
  console.log(_.upperCase("Hello from Deno!"));
}

function basicHandler2() {
  console.log(_.upperCase("hello from Deno 2!"));
}

new AwsLambdaRuntime()
  .register("example-lambda.basicHandler", basicHandler)
  .register("example-lambda.basicHandler2", basicHandler2)
  .invoke();
