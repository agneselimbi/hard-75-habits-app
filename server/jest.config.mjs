// jest.config.mjs
export default {
  testEnvironment: "node", // or "jsdom" for browser/React
  transform: {
    "^.+\\.jsx?$": "babel-jest",
  },
  extensionsToTreatAsEsm: [".jsx"],
};
