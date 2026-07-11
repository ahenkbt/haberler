const { createNetlifyHandler } = require("./_vercelAdapter.js");
const handler = require("../../api/career/admin/applications/[id]/read.js");

exports.handler = createNetlifyHandler(handler);
