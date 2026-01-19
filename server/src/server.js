import config from "./config/config.js";
import app from "./app.js";

console.log("Config loaded:", config);
console.log("Port:", config.port);
console.log("Environment:", config.env);
console.log("JWT Expires:", config.jwt.expiresIn);

const port = config.port;
app.listen(port, () => console.log(`App is listening on port ${port}`));
