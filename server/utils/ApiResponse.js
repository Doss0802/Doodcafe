/**
 * Standardized API Response Helper
 */
class ApiResponse {
  static success(res, { statusCode = 200, message = 'Success', data = null, meta = {} }) {
    return res.status(statusCode).json({
      success: true,
      statusCode,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: res.req.id || null,
        ...meta,
      },
    });
  }

  static error(res, { statusCode = 500, message = 'Internal Server Error', errors = null }) {
    const response = {
      success: false,
      statusCode,
      message,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: res.req.id || null,
      },
    };
    if (errors) response.errors = errors;
    return res.status(statusCode).json(response);
  }
}

module.exports = ApiResponse;
