// Minimal typings for the parts of `hbs` we use (the package ships none).
declare module 'hbs' {
  const hbs: {
    registerPartials(directory: string): void;
  };
  export default hbs;
}
