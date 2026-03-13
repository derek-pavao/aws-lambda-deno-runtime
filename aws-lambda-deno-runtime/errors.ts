export class InitializationError extends Error {
  constructor(
    msg: string,
    public type: "Runtime.NoSuchHandler" | "Runtime.UnknownReason",
  ) {
    super(msg);
  }
}

export class NoSuchHandlerError extends InitializationError {
  constructor(handlerName: string) {
    super(`No handler found for ${handlerName}`, "Runtime.NoSuchHandler");
  }
}
