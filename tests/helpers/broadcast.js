const fs = require('fs');
const vm = require('vm');
module.exports = function load(names, extras = {}) {
  const context = vm.createContext({window: {}, URL, URLSearchParams, Date, console, ...extras});
  for (const name of names) {
    const file = `js/ibba/${name}.js`;
    if (fs.existsSync(file)) vm.runInContext(fs.readFileSync(file, 'utf8'), context, {filename: file});
  }
  return context;
};
