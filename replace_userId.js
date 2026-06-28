import fs from "fs";

let content = fs.readFileSync("server.ts", "utf-8");

// Replacements for GET and query userId
content = content.replace(/const userId = req\.query\.userId as string;\s*if \(\!userId\).*?;/g, 
  'const userId = resolveUid(req, res);\n      if (!userId) return;');

content = content.replace(/const userId = req\.query\.userId as string;/g, 
  'const userId = resolveUid(req, res);\n      if (!userId) return;');


// Replacements for DELETE/PUT with just userId
content = content.replace(/const { userId } = req\.body;\s*if \(\!userId\).*?;/g, 
  'const userId = resolveUid(req, res);\n      if (!userId) return;');

// Replacements for POST with userId combined with other fields
// e.g. const { userId, title, description } = req.body;
content = content.replace(/const { userId, (.*?) } = req\.body;/g, 
  'const userId = resolveUid(req, res);\n      if (!userId) return;\n      const { $1 } = req.body;');

// Replacements for requireFields checking for userId
// e.g. const missing = requireFields(req.body, ["title", "userId"]);
content = content.replace(/requireFields\(req\.body, \[(.*?), "userId"(.*?)\]\)/g, 
  'requireFields(req.body, [$1$2])');
content = content.replace(/requireFields\(req\.body, \["userId", (.*?)\]\)/g, 
  'requireFields(req.body, [$1])');

// A few specific ones like: const { message, contextData, userId, chatHistory, contents } = req.body;
// Above regex `const { userId, (.*?) } = req.body;` only works if userId is first.
// So let's handle `userId` anywhere in destructured req.body
content = content.replace(/const { (.*?)userId,?(.*?) } = req\.body;/g, (match, p1, p2) => {
  let fields = (p1 + p2).replace(/,\s*$/, '').replace(/^,\s*/, '').replace(/,\s*,/g, ',');
  return `const userId = resolveUid(req, res);\n      if (!userId) return;\n      const { ${fields} } = req.body;`;
});


fs.writeFileSync("server.ts", content);
console.log("Done.");
