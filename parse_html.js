const fs = require('fs');
const content = fs.readFileSync('root.html', 'utf8');

// Find all matches of self.__next_f.push
const regex = /self\.__next_f\.push\(\[1,\s*"(.*?)"\]\)/g;
let match;
while ((match = regex.exec(content)) !== null) {
  let str = match[1];
  // Unescape string
  str = str.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
  console.log(str);
}
