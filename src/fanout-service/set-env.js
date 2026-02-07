const { name, version } = require("./package.json");


// Print environment variables as an inline command to be used in package.json script
console.log(
  `SERVICE_NAME=${name} SERVICE_VERSION=${version} OTEL_LOG_LEVEL=warn NODE_ENV=development`,
);
