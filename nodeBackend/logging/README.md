# Logging part

The logging system uses a tool that need to be installed. You can install it manually with the following commands:
- `npm i winston`

The key to hmac is store in the `.env` file as `ACCESS_TOKEN_SECRET`.

You can use the logger by simply importing it to your file.
```js
// User login 
const logger = require("./logger");

logger.info('User Connection: User connected ', { userID: '15516611', ip: '127.0.0.1' });
```

In the file `read-log.js`, you can change the output file, then launch it with: `node read-log.js`. It uses the key in `.enc` to check logs integrity.

### Infos

Each log entry is sanitized and analyzed before being added to the database.
Each log entry has a hash associated to it for check its integrity.
The sanitization step is used to to avoid log forgery, log injection, parsing issues or future data leaks.

Test and analyse are performed on logs to detect issue. 
Each log entry are check, we check for brute force attack or issue reaching endpoint.
