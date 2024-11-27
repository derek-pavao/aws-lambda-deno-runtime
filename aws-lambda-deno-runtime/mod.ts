import { RuntimeApiClient } from "./runtime-api-client/mod.ts";

console.log("This is global code running in the runtime lib");

interface HandlerFn {
  (event: any, context: any): any;
}

export class AwsLambdaRuntime {
  private handlers: Map<string, HandlerFn> = new Map();

  private handlerName: string | undefined;
  private hasStartedUp = false;

  constructor(private runtimeClient = new RuntimeApiClient()) {
    console.log("This is code running in the runtime lib");
    this.handlerName = Deno.env.get("_HANDLER");

  }

  public register(identifier: string, handler: () => any) {
    try {
      this.handlers.set(identifier, handler);
      return this;
    } catch(error) {
      // need to call POST /runtime/invocation/${awsRequestId}/error here to report the error initializing the runtime
      this.runtimeClient.reportInitializationError(error);
      throw error;
    }

  }

  public async invoke() {
    const handler = this.handlers.get(this.handlerName!)!;

    if (!handler) {
      throw new Error(`No handler found for ${this.handlerName}`);
    }

    while (true) {
      const next = await this.runtimeClient.getNextEvent();

      console.log("Got next invocation", next);
      try {
        const result = await handler.call(this, next.event, next.context);
        await this.runtimeClient.finalizeEvent("SUCCESS", next.context.awsRequestId, result);
      } catch (error: unknown) {
        let errorResponse: {
          errorMessage: string;
          errorType: string;
          stackTrace?: string[];
        };

        if (error instanceof Error) {
          errorResponse = {
            errorMessage: error.message,
            errorType: error.constructor.name,
            stackTrace: error.stack?.split("\n") ?? [],
          }
        } else if (typeof error === "string") {
          errorResponse = {
            errorMessage: error,
            errorType: "UnknownError"
          }
        } else {
          errorResponse = {
            errorMessage: "Unknown error",
            errorType: "UnknownError",
          }
        }

        await this.runtimeClient.finalizeEvent("FAILURE", next.context.awsRequestId, errorResponse);
      }
    }
  }
}
