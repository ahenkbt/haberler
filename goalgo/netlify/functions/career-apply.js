const { createNetlifyHandler } = require("./_vercelAdapter.js");
const handler = require("../../api/career/apply.js");

exports.handler = createNetlifyHandler(handler);
