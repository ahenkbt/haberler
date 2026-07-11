const { createNetlifyHandler } = require("./_vercelAdapter.js");
const handler = require("../../api/career/admin/applications.js");

exports.handler = createNetlifyHandler(handler);
