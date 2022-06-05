module.exports = {
  input: ["./tmp/**/*.{js,jsx}"],
  output: "./",
  options: {
    removeUnusedKeys: true,
    sort: true,
    func: {
      list: ["i18next.t", "i18n.t", "t", "__"],
      extensions: [".js", ".jsx"],
    },
    trans: {
      component: "Trans",
      i18nKey: "i18nKey",
      defaultsKey: "defaults",
      extensions: [".js", ".jsx"],
      fallbackKey: false,
    },
    lngs: ["en", "nl"],
    defaultLng: "en",
    defaultValue: "",
    ns: ['main', 'settings'],
    defaultNs: 'main',
    resource: {
      loadPath: "./resources/locales/{{lng}}/{{ns}}.json",
      savePath: "./resources/locales/{{lng}}/{{ns}}.json",
      jsonIndent: 2,
      lineEnding: "\n",
    },
    keySeparator: ".",
    pluralSeparator: "_",
    contextSeparator: "_",
    contextDefaultValues: [],
    interpolation: {
      prefix: "{{",
      suffix: "}}",
    },
  },
}