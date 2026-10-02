module.exports = new Proxy(
  {},
  {
    get() {
      return () => ({
        className: "",
        variable: "",
        style: { fontFamily: "" },
      });
    },
  },
);
