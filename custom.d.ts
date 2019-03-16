// Allow importing of svg files
declare module "*.svg" {
  const content: any;
  export default content;
}
