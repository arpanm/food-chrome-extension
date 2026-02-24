const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = (env, { mode }) => {
  const isProd = mode === "production";

  return {
    mode,
    devtool: isProd ? false : "cheap-module-source-map",
    entry: {
      background: path.join(__dirname, "src/background/index.ts"),
      content: path.join(__dirname, "src/content/index.ts"),
      sidepanel: path.join(__dirname, "src/sidepanel/index.tsx"),
    },
    output: {
      path: path.join(__dirname, "dist"),
      filename: "[name].js",
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: "ts-loader",
          exclude: /node_modules|src\/server/,
        },
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader", "postcss-loader"],
        },
      ],
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx"],
      alias: {
        "@shared": path.resolve(__dirname, "src/shared"),
      },
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: "manifest.json", to: "manifest.json" },
          { from: "src/sidepanel/index.html", to: "sidepanel.html" },
          { from: "icons", to: "icons", noErrorOnMissing: true },
        ],
      }),
    ],
    optimization: {
      splitChunks: false,
    },
    performance: {
      hints: false,
    },
  };
};
