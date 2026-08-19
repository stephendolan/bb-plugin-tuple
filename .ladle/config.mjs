/** @type {import("@ladle/react").UserConfig} */
export default {
  stories: ["components/**/*.stories.tsx"],
  defaultStory: "tuple--thread-drawer--state-matrix",
  viteConfig: "./.ladle/vite.config.ts",
  host: "0.0.0.0",
  addons: {
    theme: {
      defaultState: "dark",
    },
  },
};
