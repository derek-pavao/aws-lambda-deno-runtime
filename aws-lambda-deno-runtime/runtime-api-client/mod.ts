import { InitializationError } from "../errors.ts";

type LambdaEvent = Record<string, any> | Record<string, any>[] | string;

export class RuntimeApiClient {
  private runtimeEndpoint: string;

  constructor() {
    this.runtimeEndpoint = `http://${
      Deno.env.get("AWS_LAMBDA_RUNTIME_API")
    }/2018-06-01`;
  }

  public async getNextEvent(): Promise<
    { event: LambdaEvent; context: Record<string, any> }
  > {
    const res = await fetch(`${this.runtimeEndpoint}/runtime/invocation/next`, {
      signal: AbortSignal.timeout(900 * 1000),
    });
    const body = await this.getBodyFromResponse(res);
    const traceId = res.headers.get("Lambda-Runtime-Trace-Id");

    Deno.env.set("_X_AMZN_TRACE_ID", traceId!);

    return {
      event: body,
      context: {
        traceId,
        awsRequestId: res.headers.get("Lambda-Runtime-Aws-Request-Id"),
        invokedFunctionArn: res.headers.get(
          "Lambda-Runtime-Invoked-Function-Arn",
        ),
        clientContext: res.headers.get("Lambda-Runtime-Client-Context"),
        deadlineMs: res.headers.get("Lambda-Runtime-Deadline-Ms"),
        cognitoIdentity: res.headers.get("Lambda-Runtime-Cognito-Identity"),
      },
    };
  }

  public async finalizeEvent(
    status: "SUCCESS" | "FAILURE",
    requestId: string,
    response: any,
  ) {
    if (status === "SUCCESS") {
      const res = await fetch(
        `${this.runtimeEndpoint}/runtime/invocation/${requestId}/response`,
        {
          method: "POST",
          body: JSON.stringify(response),
        },
      );
    } else {
      await fetch(
        `${this.runtimeEndpoint}/runtime/invocation/${requestId}/error`,
        {
          method: "POST",
          body: JSON.stringify(response),
        },
      );
    }
  }

  public async reportInitializationError(e: Error | any) {
    const res = await fetch(`${this.runtimeEndpoint}/runtime/init/error`, {
      method: "POST",
      body: JSON.stringify({
        errorMessage: e.message,
        errorType: e.name,
        stackTrace: e.stack ? e.stack.split("\n") : [],
      }),
      headers: {
        "Lambda-Runtime-Function-Error-Type": e instanceof InitializationError
          ? e.type
          : "Runtime.UnknownReason",
      },
    });

    return await this.getBodyFromResponse(res);
  }

  private async getBodyFromResponse(response: Response): Promise<LambdaEvent> {
    try {
      return await response.json();
    } catch (e) {
      return await response.text();
    }
  }
}
