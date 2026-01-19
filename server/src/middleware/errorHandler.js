export async function notFoundHandler(req, res, next) {
  const errorMessage = {
    message: "Not Found",
    status: 404,
  };
  res.status(404).json(errorMessage);
}

export async function errorHandler(err, req, res, next) {
  //Log error to console
  console.error(err.message);
  //Determine status code
  const code = err.status;
  var errorMessage;
  if (err.name === "ValidationError") {
    errorMessage = {
      message: err.message,
      status: 400,
    };
  } else if (err.name === "UnauthorizedError") {
    errorMessage = {
      message: "Unauthorized",
      status: 401,
    };
  } else {
    errorMessage = {
      message: err.message || "Internal Server Error",
      status: code || 500,
    };
  }
  res.status(errorMessage.status).json(errorMessage);
  next(err);
}
