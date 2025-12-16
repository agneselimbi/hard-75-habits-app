// babel.config.cjs
module.exports = {
  presets: [
    ["@babel/preset-env", { targets: { node: "current" }, modules: "auto" }],
    // If you’re using React/JSX, uncomment:
    // "@babel/preset-react",
  ],
};
